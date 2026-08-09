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
 * 即时跟随机制（stretch / shrinkToFit / blur 共用）：
 * - 真实尺寸一变，布局立即切换到新尺寸（"一旦原页面更新就换"），无冻结、无防抖
 * - 响应速度经 web 技巧优化：
 *   - 立即写 `builder._containerSize`（廉价、不触发布局），尺寸相关逻辑即时正确；
 *   - reflow 以 requestAnimationFrame 合并：每帧至多执行一次，快速连续变化时
 *     避免重复 reflow 造成的布局抖动（layout thrash）；
 *   - 特效层走 transform / filter 合成（GPU 合成器），不阻塞主线程布局
 *
 * 各特效的呈现差异：
 * - stretch 拉伸 / shrinkToFit 缩小至适合：共用即时跟随实现——原始布局响应
 *   足够快时两者没有差异；仅当原始布局响应慢（reflow 耗时超过一帧）时，
 *   两者的呈现才可能出现分化（本阶段两者实现一致）
 * - blur 模糊：拉伸 + 模糊。布局即时跟随（同 stretch），尺寸变化期间三层整体
 *   模糊（CSS filter 遮盖布局重排细节），尺寸稳定 settleDelay 后平滑恢复清晰
 *
 * 未识别特效类型时解析为 null（降级为无特效），保证主题与渲染层的可演进性。
 */
import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from './theme-react';

/** 结算延迟（ms）：模糊特效在尺寸停止变化后多久恢复清晰 */
const DEFAULT_SETTLE_DELAY = 250;

/**
 * 取视口根的真实尺寸并随其变化更新：
 * - viewport：window 尺寸（监听 resize）
 * - floating-viewport：_viewWidth/_viewHeight（拖拽更新后 FloatingLayer 重渲染带动本组件，
 *   effect 依赖比较最新值刷新 state）
 * @param {BoxBuilder} builder 视口根 builder
 * @returns {{width: number, height: number}} 真实尺寸
 */
function useViewportRealSize(builder) {
  const isViewport = !!builder._isViewport;
  const isFloating = !!builder._isFloatingViewport;
  const compute = () => (isViewport
    ? { width: window.innerWidth, height: window.innerHeight }
    : { width: builder._viewWidth ?? 0, height: builder._viewHeight ?? 0 });
  const [realSize, setRealSize] = useState(compute);

  useEffect(() => {
    if (!isViewport) return;
    const onResize = () => setRealSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [isViewport]);

  useEffect(() => {
    if (!isFloating) return;
    const r = compute();
    setRealSize(prev => (r.width === prev.width && r.height === prev.height ? prev : r));
  }, [isFloating, builder._viewWidth, builder._viewHeight]);

  return realSize;
}

/**
 * 即时跟随 hook（stretch / shrinkToFit / blur 共用）：真实尺寸一变，布局立即
 * 切换到新尺寸（无冻结、无防抖）。响应速度优化：
 * - 立即写 _containerSize（廉价、无布局），使尺寸相关逻辑即时正确；
 * - reflow 以 rAF 合并到每帧一次：快速连续变化时避免重复 reflow 的布局抖动，
 *   reflow 在绘制前执行，视觉仍即时跟随（最多滞后一帧）。
 * @param {BoxBuilder} builder 视口 builder
 * @param {{width: number, height: number}} realSize 视口真实尺寸
 */
function useImmediateFollow(builder, realSize) {
  const rafRef = useRef(null);

  useEffect(() => {
    if (realSize.width === 0 || realSize.height === 0) return;
    // 立即写容器尺寸（廉价）：布局计算前尺寸逻辑即可读到最新真实尺寸
    builder._containerSize = { width: realSize.width, height: realSize.height };
    // rAF 合并：已有挂起的 reflow 则复用（以最新尺寸执行），每帧至多一次
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      builder._requestReflow();
      builder._performReflow();
    });
  }, [builder, realSize.width, realSize.height]);

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, [builder]);
}

/**
 * 拉伸特效：即时跟随，不做冻结/缩放/防抖。
 * 真实尺寸一变，布局立即切换到新尺寸（"一旦原页面更新就换"），内容始终以
 * 当前真实尺寸的布局呈现，与真实尺寸变化同步完成。
 * @param {Object} props 组件属性
 * @param {BoxBuilder} props.builder 视口 builder
 * @param {Object} props.spec 特效参数（当前无参数）
 * @param {React.ReactNode} props.children 视口三层渲染
 * @returns {JSX.Element} 三层元素（原样渲染，仅接管 reflow 时机）
 */
function StretchResizeEffect({ builder, spec, children }) {
  const realSize = useViewportRealSize(builder);
  useImmediateFollow(builder, realSize);
  return children;
}

/**
 * 缩小至适合特效：与拉伸共用即时跟随实现。原始布局响应足够快时两者没有差异；
 * 仅当原始布局响应慢（reflow 耗时超过一帧）时，两者的呈现才可能出现分化
 * （本阶段两者实现一致，分化留待后续演进）。
 */
const ShrinkToFitResizeEffect = StretchResizeEffect;

/**
 * 模糊特效（拉伸 + 模糊）：布局即时跟随（同 stretch），尺寸变化期间三层整体
 * 模糊（CSS filter 遮盖布局重排细节），尺寸稳定 settleDelay 后平滑恢复清晰。
 * filter 走合成器（will-change），不阻塞主线程。
 * @param {Object} props 组件属性
 * @param {BoxBuilder} props.builder 视口 builder
 * @param {Object} props.spec 特效参数（blur 模糊强度 px、settleDelay）
 * @param {React.ReactNode} props.children 视口三层渲染
 * @returns {JSX.Element} 特效包装元素
 */
function BlurResizeEffect({ builder, spec, children }) {
  const realSize = useViewportRealSize(builder);
  useImmediateFollow(builder, realSize);
  const [blurred, setBlurred] = useState(false);
  const timerRef = useRef(null);
  const prevRef = useRef({ w: realSize.width, h: realSize.height });
  const settleDelay = spec.settleDelay ?? DEFAULT_SETTLE_DELAY;

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

  // 真实尺寸未知（如浮动视口首帧 _viewWidth 未定）时不包裹、不模糊，直接渲染三层
  if (realSize.width === 0 || realSize.height === 0) return children;

  const amount = spec.blur ?? 8;
  return (
    // 包裹层走正常流（position: relative）：浮动视口定位容器按它撑开尺寸
    <div
      style={{
        position: 'relative',
        left: 0,
        top: 0,
        width: realSize.width,
        height: realSize.height,
        filter: blurred ? `blur(${amount}px)` : 'none',
        transition: blurred ? 'none' : 'filter 250ms ease',
        // 合成器提示：模糊层提升为独立合成层，动画不阻塞主线程
        willChange: 'filter',
      }}
    >
      {children}
    </div>
  );
}

/** 特效注册表：type → 实现组件。新增特效类型在此登记即可被主题声明式引用 */
const resizeEffectRegistry = {
  stretch: StretchResizeEffect,
  shrinkToFit: ShrinkToFitResizeEffect,
  blur: BlurResizeEffect,
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
