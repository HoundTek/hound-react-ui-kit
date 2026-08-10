/**
 * @file 尺寸变化特效（Resize Effects）注册表与实现。
 *
 * 声明式 API：主题以 `{ type, ...params }` 描述尺寸变化时呈现的特效，
 * 注册表按 type 解析为具体实现组件。实现方式自由——每个特效实现是一个
 * React 组件，可使用任意技术（transform / CSS filter / WAAPI / canvas / …），
 * 统一接收 `{ builder, spec, children }` 契约（children 为视口的三层渲染：
 * ContentLayer / EdgeLayer / CornerLayer，全部参与特效）。
 *
 * 特效宿主挂在视口根（viewport / floating-viewport）的"三层包装层"：
 * - 页面视口由 CellRoot 挂载，浮动视口由 FloatingLayer 挂载（ResizeEffectViewport）
 * - 真实尺寸由宿主自计算：视口 = window 尺寸（监听 resize）；
 *   浮动视口 = _viewWidth/_viewHeight（经 FloatingLayer 重渲染驱动刷新）
 *
 * 呈现机制（stretch / blur / freezeZoom 共用"拉伸缩放四角对齐"）：
 * 尺寸变化瞬间，当前屏上内容立即以 transform scale 整体投影到新尺寸（GPU 合成、
 * 零 reflow、四角实时对齐窗口），保证画面连续不撕裂；真实布局 reflow 在投影期
 * 计算，完成后把屏上的拉伸原子替换为新布局（scale 还原 1），无中间帧。
 *
 * 各特效的呈现差异（仅"何时追赶真实布局"不同）：
 * - stretch 拉伸：不冻结——真实布局实时计算，reflow 就绪（下一帧）立即交接，
 *   无 settleDelay 防抖；复杂布局实时上屏，resize 期间始终保持拉伸贴合窗口
 * - blur 模糊：拉伸 + 模糊。追赶时机同 stretch，尺寸变化期间三层整体模糊
 *   （CSS filter 遮盖布局重排细节），尺寸稳定 settleDelay 后平滑恢复清晰
 * - freezeZoom 冻结缩放：布局冻结在最近一次真实尺寸（_frozenViewportSize 锁定
 *   三层布局尺寸），投影期不触发 reflow；JS reflow 仅在尺寸稳定 settleDelay 后
 *   追赶一次精确布局并交接。适用于布局复杂（reflow 超过帧预算）的场景；
 *   布局轻量时 stretch 即可实时。
 *
 * 未识别特效类型时解析为 null（降级为无特效），保证主题与渲染层的可演进性。
 */
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { flushSync } from 'react-dom';
import { useTheme } from './theme-react';
import { applyFloatingSizeToDom, registerLayerRef, unregisterLayerRef } from '../box/box-component';

/** 结算延迟（ms）：模糊特效在尺寸停止变化后多久恢复清晰 */
const DEFAULT_SETTLE_DELAY = 250;

/** 把任意值安全转为有限数，非有限数返回 0 */
const safeNum = (v) => (typeof v === 'number' && !isNaN(v) && isFinite(v)) ? v : 0;

/**
 * 登记特效包装层（.resize-effect-layer）的 ref：供 startFloatingResize 投影期经
 * applyFloatingEffectToDom 直写视觉尺寸与投影缩放（绕过 React 异步渲染，避免
 * W/N 侧拖拽时视觉宽度滞后一帧导致对角随拖拽抖动）。仅浮动视口需要——页面
 * 视口无包壳、尺寸由窗口 resize 驱动，不参与浮窗拖拽直写链路。
 * @param {BoxBuilder} builder 视口根 builder
 * @returns {React.RefObject} 特效包装层 ref
 */
function useEffectLayerRef(builder) {
  const effectRef = useRef(null);
  useEffect(() => {
    if (!builder._isFloatingViewport) return;
    registerLayerRef(builder._path, 'effect', effectRef);
    return () => unregisterLayerRef(builder._path, 'effect');
  }, [builder]);
  return effectRef;
}

/**
 * 浮动视口的当前真实渲染尺寸（回退链）：
 * 1. _viewWidth/_viewHeight：缩放中/后由 startFloatingResize 同步写入
 * 2. _defaultWidth/_defaultHeight：defaultWidth/defaultHeight 设定
 * 3. fixedWidth/fixedHeight：min===max 时取该固定值——fixedWidth 只设 min/max
 *    不设 default（见 box.jsx），不显式回退则首帧得到 0
 * 4. _containerSize：实际渲染尺寸（内容撑开的 auto 尺寸）
 * 5. 0：全部缺失（如 auto 浮窗首帧 _containerSize 尚未初始化）
 * 首帧必须返回真实初始布局尺寸：freezeZoom 以首帧值为冻结基准（frozenRef），
 * 若为 0 会导致首拖投影把三层冻结为 0x0、scale=Infinity（非法被浏览器忽略），
 * 首拖期间内容不可见。
 * @param {BoxBuilder} builder 浮动视口根 builder
 * @returns {{width: number, height: number}} 真实尺寸
 */
function computeFloatingRealSize(builder) {
  const width = builder._viewWidth ?? builder._defaultWidth
    ?? safeNum(builder._minWidth === builder._maxWidth ? builder._minWidth : null)
    ?? safeNum(builder._containerSize?.width) ?? 0;
  const height = builder._viewHeight ?? builder._defaultHeight
    ?? safeNum(builder._minHeight === builder._maxHeight ? builder._minHeight : null)
    ?? safeNum(builder._containerSize?.height) ?? 0;
  return { width, height };
}

/**
 * 取视口根的真实尺寸并随其变化更新：
 * - viewport：window 尺寸（监听 resize），经 state 中转驱动重渲染
 * - floating-viewport：直接在渲染期间读取 _viewWidth/_viewHeight（由 startFloatingResize
 *   在 notifyFloatingChange 前写入，FloatingLayer 重渲染带动本组件重渲染，读取即最新值）。
 *   不经 state 中转——避免 effect 异步延迟导致渲染期间拿到 stale 值（stale 值会
 *   覆盖 startFloatingResize 同步写入的正确 _containerSize，进入投影时也可能用
 *   旧尺寸算 scale 导致异常放大）。
 *   未缩放时经 computeFloatingRealSize 回退 default/fixed 设定，保证初始即有效。
 * @param {BoxBuilder} builder 视口根 builder
 * @returns {{width: number, height: number}} 真实尺寸
 */
function useViewportRealSize(builder) {
  const isViewport = !!builder._isViewport;
  const isFloating = !!builder._isFloatingViewport;
  const compute = () => (isViewport
    ? { width: window.innerWidth, height: window.innerHeight }
    : computeFloatingRealSize(builder));
  const [realSize, setRealSize] = useState(compute);

  useEffect(() => {
    if (!isViewport) return;
    const onResize = () => setRealSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [isViewport]);

  // 浮动视口：FloatingLayer 在 notifyFloatingChange 后重渲染，本组件随之重渲染，
  // 渲染期间直接读取 _viewWidth/_viewHeight 即最新值（见 return），无需 state 中转。
  // 保留 effect 维持 hooks 调用顺序一致，但不做操作。
  useEffect(() => {
    if (!isFloating) return;
  }, [isFloating, builder._viewWidth, builder._viewHeight]);

  if (isFloating) {
    return computeFloatingRealSize(builder);
  }
  return realSize;
}

/**
 * 投影 + 实时追赶 hook（stretch / blur 共用）。
 *
 * 呈现与 freezeZoom 相同的"拉伸缩放四角对齐"方式：尺寸变化瞬间，当前屏上内容
 * 立即以 transform scale 整体投影到新尺寸（GPU 合成、零 reflow），四角实时对齐
 * 窗口。与 freezeZoom 的区别是**移除冻结**：不把布局冻结等待 settleDelay 防抖，
 * 而是让真实布局实时计算——尺寸变化后下一帧（rAF）即用最新真实尺寸同步 reflow，
 * 并把拉伸的**基准原子推进到新布局**（见追赶）。
 *
 * 追赶的"一段连续拉伸"：追赶只推进基准（frozenRef）、**保持投影不解除**——若
 * 追赶把 scale 清除回 1（解除投影），拖拽中画面每步跳变回真实布局，一段连续
 * 拉伸被切成很多段脉冲（可感知的分段感）；保持投影则画面始终是"最新就绪布局
 * 的拉伸"，基准推进时内容无缝切换为新布局拉伸，鼠标继续移动时 scale 从新基准
 * 连续增长——整个调整过程是一段连续的拉伸，且布局数据实时刷新（即用户描述的
 * "一旦就绪可上屏，就把当前屏上的拉伸换成新的拉伸"）。
 *
 * 追赶的原子性：追赶在 rAF 回调内同步完成"解除锁定 → 以最新尺寸 reflow → 基准
 * 推进 → 重新锁定三层到新基准 → 保持投影（scale ≈ 1）"，全程无异步窗口；
 * setProj 触发重渲染在同一渲染周期内读到"新布局 + scale ≈ 1"，paint 前完成，
 * 无中间态。追赶同时更新 prevRef（变化基线），使交接后的重渲染 effect 检测
 * unchanged，不再空转一轮投影。
 *
 * 与 freezeZoom 的实现差异仅在追赶时机与投影结束方式：freezeZoom 用
 * setTimeout(settleDelay) 防抖追赶一次并解除投影；本 hook 用 rAF 无防抖追赶
 * （每次尺寸变化排一次，进行中不重复），且追赶保持投影（仅推进基准）。
 *
 * 注意：进入投影的冻结 reflow 用冻结尺寸（frozenRef 基准）同步执行，与
 * freezeZoom 一致——保证三层布局 = 冻结基准，投影 scale 后正好 = 当前尺寸。
 * 浮动视口在投影期由 startFloatingResize 自动让位（见其 _frozenViewportSize
 * 分支），实时性由投影承担。
 *
 * @param {BoxBuilder} builder 视口 builder
 * @param {{width: number, height: number}} realSize 视口真实尺寸
 * @returns {{projecting: boolean, scale: {sx: number, sy: number}}} 投影状态与缩放比例
 */
function useStretchProjection(builder, realSize) {
  const [proj, setProj] = useState({ scale: { sx: 1, sy: 1 }, projecting: false });
  // 布局当前物理尺寸（权威基准，同步更新）：初始为初始真实尺寸（初始布局尺寸）。
  // 追赶 reflow 完成时同步更新——布局物理尺寸变了基准就必须立即跟着变，
  // 否则其后尺寸变化会用旧基准算 scale，导致异常放大
  const frozenRef = useRef({ width: realSize.width, height: realSize.height });
  const prevRef = useRef({ w: realSize.width, h: realSize.height });
  const projectingRef = useRef(false);
  const rafRef = useRef(null);

  // 卸载清理：取消挂起追赶、恢复视口布局（防泄漏导致布局永久锁定）
  useEffect(() => () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    if (builder._frozenViewportSize) builder._frozenViewportSize = null;
  }, [builder]);

  // 真实尺寸变化 → 投影 + 排实时追赶。用 useLayoutEffect（而非 useEffect）：
  // 在浏览器 paint 前同步完成"冻结锁定 + 投影 scale 更新"，使 resize 驱动的
  // 中间渲染帧不被绘制，用户只看到"冻结内容 + 实时缩放"的最终帧
  useLayoutEffect(() => {
    if (realSize.width === 0 || realSize.height === 0) return;
    const prev = prevRef.current;
    prevRef.current = { w: realSize.width, h: realSize.height };
    const changed = Math.abs(prev.w - realSize.width) > 0.5 || Math.abs(prev.h - realSize.height) > 0.5;
    if (!changed) return;

    // 进入投影（若尚未在投影中）：锁定三层布局为冻结尺寸（_frozenViewportSize
    // 供 computeBuilderLayout 读取），并同步写 _containerSize + DOM 直写三层
    // 尺寸 + 同步 reflow——DOM 直写保证当前事件帧内三层即冻结（不被"三层仍以
    // 新尺寸渲染、再被 transform 缩放"的双重缩放错位），同步 reflow 更新布局
    // 数据并触发三层重渲染收敛到锁定尺寸
    if (!projectingRef.current) {
      projectingRef.current = true;
      // 基准有效性兜底：auto 撑开浮窗首帧 realSize 为 0（_viewWidth 未定、
      // _containerSize 尚未初始化）时 frozenRef 仍是初始 {0,0}，此时以当前真实
      // 尺寸为冻结基准——否则冻结 0x0 + scale=Infinity（非法被浏览器忽略），
      // 首拖期间内容不可见、投影失效
      if (!isFinite(frozenRef.current.width) || !isFinite(frozenRef.current.height)
        || frozenRef.current.width === 0 || frozenRef.current.height === 0) {
        frozenRef.current = { width: realSize.width, height: realSize.height };
      }
      builder._frozenViewportSize = { width: frozenRef.current.width, height: frozenRef.current.height };
      builder._containerSize = { width: frozenRef.current.width, height: frozenRef.current.height };
      applyFloatingSizeToDom(builder, frozenRef.current.width, frozenRef.current.height);
      builder._requestReflow();
      builder._performReflow();
    }
    // 投影：scale 以权威基准 frozenRef 计算（布局物理尺寸），与 realSize 实时对齐
    setProj({
      scale: {
        sx: realSize.width / frozenRef.current.width,
        sy: realSize.height / frozenRef.current.height,
      },
      projecting: true,
    });

    // 实时追赶（无防抖）：下一帧以最新真实尺寸同步 reflow 并**原子推进基准**。
    // 每次尺寸变化只排一次（追赶进行中不再重复排队）；追赶执行时直读最新尺寸
    //（viewport = window 实时值，floating = _viewWidth/_viewHeight），避免用
    // 排队时捕获的旧尺寸追赶导致滞后一帧
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        // 直读最新真实尺寸并统一为 {w, h} 字段（computeFloatingRealSize 返回
        // {width, height}——字段名不匹配会把基准推进为 undefined，scale 计算
        // 变 NaN 被浏览器忽略，投影冻结在首帧）
        const readLatest = () => {
          const r = builder._isViewport
            ? { width: window.innerWidth, height: window.innerHeight }
            : computeFloatingRealSize(builder);
          return { w: r.width, h: r.height };
        };
        const latest = readLatest();
        // 追赶：解除锁定 → 以最新真实尺寸同步 reflow（真实布局就绪）→ 基准推进
        // 到最新尺寸 → 重新锁定三层到新基准（DOM 直写保证当前帧三层即新基准，
        // 不被"旧基准布局 + 新 scale"双重缩放）。**保持投影不解除**——把 scale
        // 清除回 1 会让拖拽中画面每步跳变回真实布局，一段连续拉伸被切成很多段
        // 脉冲；保持投影则画面始终是"最新布局的拉伸"，内容无缝切换、鼠标继续
        // 移动时 scale 从新基准连续增长（一段连续拉伸 + 布局实时刷新）
        builder._frozenViewportSize = null;
        builder._containerSize = { width: latest.w, height: latest.h };
        builder._requestReflow();
        builder._performReflow();
        frozenRef.current = { width: latest.w, height: latest.h };
        builder._frozenViewportSize = { width: latest.w, height: latest.h };
        builder._containerSize = { width: latest.w, height: latest.h };
        applyFloatingSizeToDom(builder, latest.w, latest.h);
        prevRef.current = latest;
        // 保持投影：scale 以新基准计算（此刻 ≈ 1，画面即新布局本身；鼠标继续
        // 移动则从新基准连续增长）
        const latestReal = readLatest();
        // flushSync 强制同步渲染：追赶帧内三层容器与子元素布局一次更新到位。
        // 若用异步 setProj，追赶帧会先显示"新容器尺寸（直写） + 旧子元素布局"
        //（子元素要等下一帧 React 渲染才更新），随后子元素跳变到新布局——
        // 内容右/底边缘每步 ±8px 抖动（freezeZoom 投影期布局冻结不 reflow，
        // 故丝滑；stretch 实时追赶必须让布局切换与渲染同帧原子完成）
        flushSync(() => {
          setProj({
            scale: {
              sx: latestReal.w / latest.w,
              sy: latestReal.h / latest.h,
            },
            projecting: true,
          });
        });
      });
    }
  }, [realSize.width, realSize.height, builder]);

  return { projecting: proj.projecting, scale: proj.scale };
}

/**
 * 投影包装层的公共样式：投影期以真实尺寸作为布局盒（三层按冻结尺寸布局、
 * 整体 transform 缩放后正好填满布局盒——frozen*scale === real），transformOrigin
 * 0 0（左上角锚定），四角随尺寸变化实时对齐；用真实尺寸而非冻结尺寸作布局盒，
 * 是为让特效壳之外的兄弟元素（浮窗缩放手柄/关闭按钮，相对浮窗定位容器绝对
 * 定位）始终落在视觉四角（real 角）而非冻结角，页面与浮窗的投影呈现保持一致。
 * 非投影期 transform: scale(1)（恒等）+ 尺寸自适应，与"直接渲染三层"视觉等价。
 * @param {{projecting: boolean, scale: {sx: number, sy: number}}} proj 投影状态
 * @param {{width: number, height: number}} realSize 视口真实尺寸
 * @returns {Object} 包装层 style
 */
function makeProjectionStyle(proj, realSize) {
  return {
    position: 'relative',
    left: 0,
    top: 0,
    width: proj.projecting ? realSize.width : undefined,
    height: proj.projecting ? realSize.height : undefined,
    transform: proj.projecting
      ? `scale(${proj.scale.sx}, ${proj.scale.sy})`
      : 'scale(1)',
    transformOrigin: '0 0',
    // 合成器提示：投影层提升为独立合成层，逐帧缩放不阻塞主线程
    willChange: 'transform',
  };
}

/**
 * 拉伸特效：投影 + 实时追赶（见 useStretchProjection）。
 * 与 freezeZoom 相同的"拉伸缩放四角对齐"呈现方式，但移除冻结——真实布局实时
 * 计算，reflow 就绪（下一帧）立即把当前屏上的拉伸替换为新布局（无 settleDelay
 * 防抖）。复杂布局实时上屏，resize 期间内容始终保持拉伸贴合窗口、不撕裂。
 * @param {Object} props 组件属性
 * @param {BoxBuilder} props.builder 视口 builder
 * @param {Object} props.spec 特效参数（当前无参数）
 * @param {React.ReactNode} props.children 视口三层渲染
 * @returns {JSX.Element} 特效包装元素
 */
function StretchResizeEffect({ builder, spec, children }) {
  const realSize = useViewportRealSize(builder);
  const proj = useStretchProjection(builder, realSize);
  const effectRef = useEffectLayerRef(builder);
  return (
    <div ref={effectRef} className="resize-effect-layer" style={makeProjectionStyle(proj, realSize)}>
      {children}
    </div>
  );
}

/**
 * 模糊特效（拉伸 + 模糊）：呈现同 stretch（投影四角对齐 + 实时追赶），尺寸变化
 * 期间三层整体模糊（CSS filter 遮盖布局重排细节），尺寸稳定 settleDelay 后平滑
 * 恢复清晰。filter 走合成器（will-change），不阻塞主线程。
 * @param {Object} props 组件属性
 * @param {BoxBuilder} props.builder 视口 builder
 * @param {Object} props.spec 特效参数（blur 模糊强度 px、settleDelay）
 * @param {React.ReactNode} props.children 视口三层渲染
 * @returns {JSX.Element} 特效包装元素
 */
function BlurResizeEffect({ builder, spec, children }) {
  const realSize = useViewportRealSize(builder);
  const proj = useStretchProjection(builder, realSize);
  const effectRef = useEffectLayerRef(builder);
  const [blurred, setBlurred] = useState(false);
  const timerRef = useRef(null);
  const prevRef = useRef({ w: realSize.width, h: realSize.height });
  const settleDelay = spec.settleDelay ?? DEFAULT_SETTLE_DELAY;

  // 尺寸变化期间置模糊，尺寸稳定 settleDelay 后恢复清晰
  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = { w: realSize.width, h: realSize.height };
    if (realSize.width === 0 || realSize.height === 0) return;
    const unchanged = Math.abs(prev.w - realSize.width) <= 0.5 && Math.abs(prev.h - realSize.height) <= 0.5;
    if (unchanged) return;
    setBlurred(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setBlurred(false), settleDelay);
  }, [realSize.width, realSize.height, settleDelay]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const amount = spec.blur ?? 8;
  const baseStyle = makeProjectionStyle(proj, realSize);
  return (
    // 包裹层走正常流（position: relative）：浮动视口定位容器按它撑开尺寸
    <div
      ref={effectRef}
      className="resize-effect-layer"
      style={{
        ...baseStyle,
        filter: blurred ? `blur(${amount}px)` : 'none',
        transition: blurred ? 'none' : 'filter 250ms ease',
        willChange: 'transform, filter',
      }}
    >
      {children}
    </div>
  );
}

/**
 * 冻结缩放特效（freezeZoom）：尺寸变化期间布局冻结 + transform 投影实时响应。
 *
 * 机制（双轨响应：实时层 = GPU 合成，精确层 = JS reflow 追赶）：
 * - 真实尺寸变化时布局冻结在最近一次布局物理尺寸（frozenRef，权威基准），三层以
 *   冻结尺寸布局（_frozenViewportSize 锁定，见 computeBuilderLayout 分支），
 *   包装层用 transform: scale(real/frozen) 把冻结布局实时投影到当前尺寸——
 *   transform 走 GPU 合成器、不触发 reflow，四角实时对齐、零延迟
 * - 尺寸稳定 settleDelay 后 JS 追赶一次精确 reflow（_containerSize = 真实尺寸），
 *   reflow 同步完成后**立即**更新 frozenRef 并解除投影（页面恢复 100vw/100vh、
 *   浮动视口恢复 _viewWidth/_viewHeight），无缝无闪烁
 * - 基准用 ref 而非 state：追赶 reflow 同步执行、frozenRef 同步更新，杜绝
 *   setProj 异步 commit 窗口内后续尺寸变化用旧基准计算 scale 导致的异常放大
 * - 进入投影时除 _frozenViewportSize 外同步 DOM 直写三层尺寸 + 同步 reflow：
 *   DOM 直写保证当前事件帧内三层即冻结（不被"三层仍以新尺寸渲染 + transform
 *   缩放"双重缩放），同步 reflow 触发三层重渲染收敛到锁定尺寸
 * - 页面视口与浮动视口统一生效：浮动视口拖拽（startFloatingResize）在投影期
 *   自动让位于投影（见其 onMove 的 _frozenViewportSize 分支），实时性由投影承担；
 *   非投影期保持原有"同步 reflow + DOM 直写"实时路径
 *
 * 与 stretch/blur 的区别：stretch/blur 依赖逐帧 reflow 追赶，reflow 超过帧预算
 * 时会掉帧；freezeZoom 在 reflow 慢时仍保证实时（GPU 缩放不阻塞主线程）。
 * @param {Object} props 组件属性
 * @param {BoxBuilder} props.builder 视口 builder
 * @param {Object} props.spec 特效参数（settleDelay：尺寸稳定后多久追赶精确布局）
 * @param {React.ReactNode} props.children 视口三层渲染
 * @returns {JSX.Element} 特效包装元素
 */
function FreezeZoomResizeEffect({ builder, spec, children }) {
  const realSize = useViewportRealSize(builder);
  const settleDelay = spec.settleDelay ?? DEFAULT_SETTLE_DELAY;
  const effectRef = useEffectLayerRef(builder);
  const [proj, setProj] = useState({ scale: 1, projecting: false });
  // 布局当前物理尺寸（权威基准，同步更新）：初始为初始真实尺寸（初始布局尺寸）。
  // 追赶 reflow 完成时同步更新——布局物理尺寸变了基准就必须立即跟着变，
  // 否则其后尺寸变化会用旧基准算 scale，导致异常放大
  const frozenRef = useRef({ width: realSize.width, height: realSize.height });
  const prevRef = useRef({ w: realSize.width, h: realSize.height });
  const timerRef = useRef(null);
  const projectingRef = useRef(false);

  // 真实尺寸变化 → 更新投影；稳定 settleDelay 后追赶一次精确 reflow 并交接。
  // 用 useLayoutEffect（而非 useEffect）：在浏览器 paint 前同步完成"冻结锁定 +
  // 投影 scale 更新"，使 resize 驱动的中间渲染帧（旧 scale 配新尺寸 / 新尺寸未冻结）
  // 不被绘制，用户只看到"冻结内容 + 实时缩放"的最终帧。真窗口（window resize 事件）
  // 与伪窗口（拖拽同步链路）因此表现一致——否则真窗口每帧先绘制一帧"内容未冻结 /
  // 比例滞后"的中间态，内容与窗口边缘短暂错位（用户所见"真窗口缩放不正常"）。
  useLayoutEffect(() => {
    if (realSize.width === 0 || realSize.height === 0) return;
    const prev = prevRef.current;
    prevRef.current = { w: realSize.width, h: realSize.height };
    const changed = Math.abs(prev.w - realSize.width) > 0.5 || Math.abs(prev.h - realSize.height) > 0.5;
    if (!changed) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      // 追赶：解除锁定 → 以当前真实尺寸同步 reflow（布局精确）→ 基准同步更新
      // （布局物理尺寸即真实尺寸）→ 解除投影。全程同步完成，无异步基准窗口
      builder._frozenViewportSize = null;
      builder._containerSize = { width: realSize.width, height: realSize.height };
      builder._requestReflow();
      builder._performReflow();
      frozenRef.current = { width: realSize.width, height: realSize.height };
      projectingRef.current = false;
      setProj({ scale: 1, projecting: false });
    }, settleDelay);

    // 进入投影：锁定三层布局为冻结尺寸（_frozenViewportSize 供 computeBuilderLayout
    // 读取），并同步写 _containerSize + DOM 直写三层尺寸 + 同步 reflow——
    // DOM 直写保证当前事件帧内三层即冻结（不被"三层仍以新尺寸渲染、再被
    // transform 缩放"的双重缩放错位），同步 reflow 更新布局数据并触发三层重渲染
    if (!projectingRef.current) {
      projectingRef.current = true;
      // 基准有效性兜底：auto 撑开浮窗首帧 realSize 为 0（_viewWidth 未定、
      // _containerSize 尚未初始化）时 frozenRef 仍是初始 {0,0}，此时以当前真实
      // 尺寸为冻结基准——否则冻结 0x0 + scale=Infinity（非法被浏览器忽略），
      // 首拖期间内容不可见、投影失效
      if (!isFinite(frozenRef.current.width) || !isFinite(frozenRef.current.height)
        || frozenRef.current.width === 0 || frozenRef.current.height === 0) {
        frozenRef.current = { width: realSize.width, height: realSize.height };
      }
      builder._frozenViewportSize = { width: frozenRef.current.width, height: frozenRef.current.height };
      builder._containerSize = { width: frozenRef.current.width, height: frozenRef.current.height };
      applyFloatingSizeToDom(builder, frozenRef.current.width, frozenRef.current.height);
      builder._requestReflow();
      builder._performReflow();
    }
    // 投影：scale 以权威基准 frozenRef 计算（布局物理尺寸），与 realSize 实时对齐
    setProj(prevProj => ({
      scale: {
        sx: realSize.width / frozenRef.current.width,
        sy: realSize.height / frozenRef.current.height,
      },
      projecting: true,
    }));
  }, [realSize.width, realSize.height, builder, settleDelay]);

  // 卸载清理：取消挂起追赶定时器，恢复视口布局（防泄漏导致布局永久锁定）
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (builder._frozenViewportSize) builder._frozenViewportSize = null;
  }, [builder]);

  // 投影包装层恒存在（统一元素类型、同一位置），投影切换仅改 transform 与尺寸，
  // 三层子树不被 React 卸载重挂载——否则重挂载会重跑三层初始化 effect，用实时
  // 尺寸覆盖 _containerSize 造成双重缩放（内容按实时尺寸布局再被缩放），且丢失
  // 滚动位置等内部状态。样式由 makeProjectionStyle 统一（投影期真实尺寸布局盒 +
  // transform 缩放四角对齐，非投影期恒等缩放 + 尺寸自适应）
  return (
    <div ref={effectRef} className="resize-effect-layer" style={makeProjectionStyle(proj, realSize)}>
      {children}
    </div>
  );
}

/** 特效注册表：type → 实现组件。新增特效类型在此登记即可被主题声明式引用 */
const resizeEffectRegistry = {
  stretch: StretchResizeEffect,
  blur: BlurResizeEffect,
  freezeZoom: FreezeZoomResizeEffect,
};

/**
 * 把主题声明的特效描述解析为 { spec, Component }；未识别类型返回 null（降级为无特效）
 * @param {Object|null} spec 特效描述（{ type, ...params }）
 * @returns {{spec: Object, Component: Function}|null} 解析结果
 */
function resolveResizeEffect(spec) {
  if (!spec || typeof spec !== 'object' || !spec.type) return null;
  const Component = resizeEffectRegistry[spec.type];
  if (!Component) return null;
  return { spec, Component };
}

/**
 * 特效宿主：把解析后的特效描述渲染为对应实现组件，包裹视口三层。
 * @param {Object} props 组件属性
 * @param {BoxBuilder} props.builder 视口 builder
 * @param {{spec: Object, Component: Function}} props.effect 已解析的特效
 * @param {React.ReactNode} props.children 视口三层渲染
 * @returns {JSX.Element} 特效包装元素
 */
function ResizeEffectHost({ builder, effect, children }) {
  const { spec, Component } = effect;
  return <Component builder={builder} spec={spec}>{children}</Component>;
}

/**
 * 视口根特效包装组件：按当前主题的声明式描述解析尺寸变化特效并包裹三层。
 * 仅视口根（viewport / floating-viewport）挂载；无特效/未识别类型时原样渲染三层。
 * @param {Object} props 组件属性
 * @param {BoxBuilder} props.builder 视口根 builder
 * @param {React.ReactNode} props.children 视口三层渲染
 * @returns {JSX.Element} 三层元素（有特效时被特效包装）
 */
function ResizeEffectViewport({ builder, children }) {
  const theme = useTheme();
  const isRoot = builder._isViewport || builder._isFloatingViewport;
  const effect = isRoot && theme ? resolveResizeEffect(theme.getResizeEffect()) : null;
  if (!effect) return children;
  return <ResizeEffectHost builder={builder} effect={effect}>{children}</ResizeEffectHost>;
}

export {
  DEFAULT_SETTLE_DELAY,
  resizeEffectRegistry,
  resolveResizeEffect,
  ResizeEffectHost,
  ResizeEffectViewport,
};
