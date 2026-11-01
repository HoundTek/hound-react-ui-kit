/**
 * @file 浮动滚动条组件。为 Box 容器提供悬浮显示、可拖拽滑块、可点击轨道的
 *        自定义滚动条，支持垂直/水平两个方向，按需显示（悬停/滚动中）。
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { attachScrollDamping, routeWheelEvent, subscribeOverScroll } from './scroll-damping';

/** 滑块粗细（px） */
const BAR_SIZE = 6;
/** 滑块最小长度（px） */
const MIN_THUMB = 28;
/** 轨道上下/左右内边距（px） */
const INSET = 12;
/** 过滚时滑块最多缩短自身长度的比例（再多就看不出这是滑块了） */
const OVER_SHRINK_MAX_RATIO = 0.5;

/**
 * 过滚期间滑块的绘制长度：只缩长度，缩短量与过滚位移同尺度（内容每移 1px，
 * 滑块长度缩 track/main px），最多缩掉自身一半，且不短于 MIN_THUMB ——
 * 过滚是"到头了还在滚"的视觉表达，滑块变短像被拉长的内容挤住，
 * 回弹后长度自动复原（位置由 resolveThumbShift 决定）
 * @param {number} baseSize 基准滑块长度（轨道尺度，见 useScrollTracking）
 * @param {{mainSize: number, trackSize: number}} metrics 视口尺寸与轨道尺寸
 * @param {number} overShift 容器过滚视觉位移（px，带符号；0 = 不在过滚）
 * @returns {number} 绘制长度（px）
 */
function resolveDrawThumbSize(baseSize, metrics, overShift) {
  const { mainSize, trackSize } = metrics;
  const shrinkPx = mainSize > 0 ? Math.abs(overShift) * (trackSize / mainSize) : 0;
  return Math.max(
    Math.min(baseSize, MIN_THUMB),
    baseSize - Math.min(baseSize * OVER_SHRINK_MAX_RATIO, shrinkPx),
  );
}

/**
 * 过滚期间滑块相对基准位置的位移（**末端固定**）：过滚方向指向的那一端保持
 * 不动，滑块从另一端缩短。
 * - `overShift < 0`：越过末端（向下/向右拉到尽头，内容朝负方向位移）→ 末端贴住
 *   轨道末端，起点后移「缩短量」
 * - `overShift > 0`：越过起点（向上/向左拉到尽头）→ 起点不动，末端前移
 * （起点一动滑块就会离开轨道末端，看起来像"滚动条没到头"）
 * @param {number} baseSize 基准滑块长度
 * @param {number} drawSize 过滚后的绘制长度（resolveDrawThumbSize）
 * @param {number} overShift 容器过滚视觉位移（px，带符号；0 = 不在过滚）
 * @returns {number} 相对基准位置的位移（px，与滚动条方向同轴）
 */
function resolveThumbShift(baseSize, drawSize, overShift) {
  const shrink = baseSize - drawSize;
  return shrink > 0 && overShift < 0 ? shrink : 0;
}

/**
 * 滚动跟踪 hook。监听容器滚动与尺寸变化，计算滑块位置/大小、是否有滚动、是否滚动中，
 * 并订阅容器的过滚位移（过滚时滑块按比例缩短，过滚方向的那一端固定不动）
 * @param {React.RefObject<HTMLElement>} containerRef 容器 ref
 * @param {boolean} isVertical 是否垂直方向
 * @returns {{
 *   thumbPos: number, thumbSize: number, drawnThumbSize: number, thumbShift: number,
 *   hasScroll: boolean, isScrolling: boolean, thumbSizeRef: React.MutableRefObject<number>
 * }} 滑块位置/基准大小/绘制大小/过滚位移、滚动状态及滑块大小 ref（供拖拽时读取最新值）
 */
function useScrollTracking(containerRef, isVertical) {
  const [thumbPos, setThumbPos] = useState(0);
  const [thumbSize, setThumbSize] = useState(MIN_THUMB);
  const [hasScroll, setHasScroll] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  // 容器当前过滚视觉位移（px，带符号）：由 scroll-damping 广播（0 = 不在过滚）
  const [overShift, setOverShift] = useState(0);
  const thumbSizeRef = useRef(MIN_THUMB);
  // 视口/轨道尺寸（state 而非 ref：绘制时要用，不能在渲染阶段读 ref）
  const [metrics, setMetrics] = useState({ mainSize: 0, trackSize: 0 });
  const scrollTimerRef = useRef(null);
  const rafRef = useRef(null);

  /**
   * 依据容器当前 scroll 位置与内容/视口尺寸刷新滑块位置/大小与 hasScroll
   */
  const update = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const mainSize = isVertical ? el.clientHeight : el.clientWidth;
    const scrollSize = isVertical ? el.scrollHeight : el.scrollWidth;
    const trackSize = mainSize - 2 * INSET;
    // 轨道容不下滑块（容器过矮/过窄）时视为不可滚动：不渲染滚动条——否则
    // 过约束的轨道/滑块几何会溢出容器，撑大祖先滚动框的可滚动区域
    //（如 logs 盒变矮时滑块撑大 workspace/content 的 scrollHeight，
    //  内容层可滚而覆盖层不可滚，三层错位）
    const canScroll = scrollSize > mainSize && trackSize > 0;
    setHasScroll(canScroll);
    if (canScroll) {
      setMetrics(prev => (prev.mainSize === mainSize && prev.trackSize === trackSize
        ? prev
        : { mainSize, trackSize }));
      const pos = isVertical ? el.scrollTop : el.scrollLeft;
      // 滑块尺寸不超过轨道：轨道短于 MIN_THUMB 时滑块填满轨道（thumbPos 恒 0）
      const newThumbSize = Math.min(trackSize, Math.max(MIN_THUMB, (mainSize / scrollSize) * trackSize));
      const trackSpace = trackSize - newThumbSize;
      const maxScroll = scrollSize - mainSize;
      const newThumbPos = (pos / maxScroll) * trackSpace;
      thumbSizeRef.current = newThumbSize;
      setThumbSize(newThumbSize);
      setThumbPos(newThumbPos);
    } else {
      setMetrics(prev => (prev.mainSize === 0 && prev.trackSize === 0 ? prev : { mainSize: 0, trackSize: 0 }));
    }
  }, [containerRef, isVertical]);

  // 订阅过滚位移：过滚时内容被"拉长"，滑块按同一位移按比例缩短（见 resolveDrawThumbSize）
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    return subscribeOverScroll(el, setOverShift);
  }, [containerRef]);

  // 绘制长度：基准长度按过滚位移缩短；位移则按"末端固定"把缩短量补到起点
  //（overShift < 0 = 越过末端，滑块末端贴住轨道末端，起点后移缩短量）
  const drawnThumbSize = resolveDrawThumbSize(thumbSize, metrics, overShift);
  const thumbShift = resolveThumbShift(thumbSize, drawnThumbSize, overShift);

  /**
   * 滚动事件处理：置为滚动中，刷新滑块；停止滚动 1s 后复位。
   * update 经 rAF 合并（一帧多个 scroll 事件至多一次 setState/重渲染）——
   * 触控板滚动事件可达 60–120Hz，逐事件更新在 WebKit 主线程上叠加成卡顿
   */
  const handleScroll = useCallback(() => {
    setIsScrolling(true);
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => setIsScrolling(false), 1000);
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        update();
      });
    }
  }, [update]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    update();
    el.addEventListener('scroll', handleScroll, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', handleScroll);
      ro.disconnect();
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [containerRef, handleScroll, update]);

  return { thumbPos, thumbSize, drawnThumbSize, thumbShift, hasScroll, isScrolling, thumbSizeRef };
}

/**
 * 浮动滚动条组件。按容器悬停/滚动中状态显示，支持滑块拖拽与轨道点击跳转。
 * 过滚（容器视觉位移）期间滑块按比例缩短而位置不变——见 useScrollTracking。
 * @param {Object} props 组件属性
 * @param {React.RefObject<HTMLElement>} props.containerRef 监听的容器 ref
 * @param {'vertical'|'horizontal'} [props.orientation='vertical'] 方向
 * @returns {JSX.Element} 滚动条元素
 */
const FloatingScrollbar = ({ containerRef, orientation = 'vertical' }) => {
  const isVertical = orientation === 'vertical';
  const { thumbPos, drawnThumbSize, thumbShift, hasScroll, isScrolling, thumbSizeRef } = useScrollTracking(containerRef, isVertical);

  const [containerHovered, setContainerHovered] = useState(false);
  const [barHovered, setBarHovered] = useState(false);
  const [thumbActive, setThumbActive] = useState(false);
  const dragging = useRef(false);
  const dragStart = useRef({ pos: 0, scroll: 0 });
  const barRef = useRef(null);
  const thumbRef = useRef(null);
  const show = (containerHovered || barHovered || thumbActive || isScrolling) && hasScroll;

  // 滚动条挂在容器的 wrapper 上（不在容器内，见 BoxLayerFrame 的 extra 说明）：
  // 指针落在滚动条上时滚轮事件不会冒泡到容器，这里把它转发给容器的阻尼路由，
  // 滚动条与内容层的滚动语义保持一致。依赖 hasScroll：容器可滚后才真正渲染出
  // 滚动条（首次挂载时 barRef 还是 null，不能只挂一次）
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const onWheel = (e) => routeWheelEvent(containerRef.current, e);
    bar.addEventListener('wheel', onWheel, { passive: false });
    return () => bar.removeEventListener('wheel', onWheel);
  }, [containerRef, hasScroll]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onEnter = () => setContainerHovered(true);
    const onLeave = () => setContainerHovered(false);
    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [containerRef]);

  /**
   * 滑块拖拽起始：记录起始指针位置与滚动量，注册全局 mousemove/mouseup，
   * 移动时按轨道/内容尺寸比换算为容器滚动位置
   * @param {React.MouseEvent} e 拖拽起始事件
   */
  const startDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const el = containerRef.current;
    if (!el) return;
    dragging.current = true;

    if (isVertical) {
      dragStart.current = { pos: e.clientY, scroll: el.scrollTop };
    } else {
      dragStart.current = { pos: e.clientX, scroll: el.scrollLeft };
    }

    const onMove = (moveEvent) => {
      if (!dragging.current || !el) return;
      const currentPos = isVertical ? moveEvent.clientY : moveEvent.clientX;
      const delta = currentPos - dragStart.current.pos;
      const trackSize = isVertical
        ? el.clientHeight - 2 * INSET
        : el.clientWidth - 2 * INSET;
      // 滑块填满轨道时无可拖行程（ratio 分母为 0），不移动
      const trackSpace = trackSize - thumbSizeRef.current;
      if (trackSpace <= 0) return;
      const ratio = isVertical
        ? (el.scrollHeight - el.clientHeight) / trackSpace
        : (el.scrollWidth - el.clientWidth) / trackSpace;

      if (isVertical) {
        el.scrollTop = dragStart.current.scroll + delta * ratio;
      } else {
        el.scrollLeft = dragStart.current.scroll + delta * ratio;
      }
    };

    const onUp = () => {
      dragging.current = false;
      setThumbActive(false);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    setThumbActive(true);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [containerRef, isVertical, thumbSizeRef]);

  /**
   * 轨道点击：将点击位置换算为容器滚动位置（跳转），随后自动进入拖拽模式，
   * 便于点击后继续拖动滑块
   * @param {React.MouseEvent} e 点击事件
   */
  const handleTrackClick = useCallback((e) => {
    if (e.target === thumbRef.current) return;
    const el = containerRef.current;
    if (!el || !hasScroll) return;

    if (isVertical) {
      const rect = el.getBoundingClientRect();
      const trackSize = el.clientHeight - 2 * INSET;
      const clickY = e.clientY - rect.top - INSET;
      el.scrollTop = Math.max(0, (clickY / trackSize) * (el.scrollHeight - el.clientHeight));
    } else {
      const rect = el.getBoundingClientRect();
      const trackSize = el.clientWidth - 2 * INSET;
      const clickX = e.clientX - rect.left - INSET;
      el.scrollLeft = Math.max(0, (clickX / trackSize) * (el.scrollWidth - el.clientWidth));
    }

    // 点击后自动进入拖拽模式
    dragging.current = true;
    if (isVertical) {
      dragStart.current = { pos: e.clientY, scroll: el.scrollTop };
    } else {
      dragStart.current = { pos: e.clientX, scroll: el.scrollLeft };
    }

    const onMove = (moveEvent) => {
      if (!dragging.current || !el) return;
      const currentPos = isVertical ? moveEvent.clientY : moveEvent.clientX;
      const delta = currentPos - dragStart.current.pos;
      const trackSize = isVertical
        ? el.clientHeight - 2 * INSET
        : el.clientWidth - 2 * INSET;
      // 滑块填满轨道时无可拖行程（ratio 分母为 0），不移动
      const trackSpace = trackSize - thumbSizeRef.current;
      if (trackSpace <= 0) return;
      const ratio = isVertical
        ? (el.scrollHeight - el.clientHeight) / trackSpace
        : (el.scrollWidth - el.clientWidth) / trackSpace;

      if (isVertical) {
        el.scrollTop = dragStart.current.scroll + delta * ratio;
      } else {
        el.scrollLeft = dragStart.current.scroll + delta * ratio;
      }
    };

    const onUp = () => {
      dragging.current = false;
      setThumbActive(false);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    setThumbActive(true);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [containerRef, isVertical, hasScroll, thumbSizeRef]);

  // 不可滚动（含容器过矮/过窄容不下轨道与滑块）时不渲染——见
  // useScrollTracking：过约束几何即使不可见也会溢出容器，
  // 撑大祖先滚动框的可滚动区域，导致三层滚动范围不一致
  if (!hasScroll) return null;

  const barStyle = {
    position: 'absolute',
    zIndex: 1000,
    pointerEvents: show ? 'auto' : 'none',
    opacity: show ? 1 : 0,
    transition: 'opacity 0.18s ease',
    ...(isVertical
      ? {
          top: INSET,
          right: 2,
          bottom: INSET,
          width: BAR_SIZE + 4,
          cursor: 'pointer',
        }
      : {
          bottom: 2,
          left: INSET,
          right: INSET,
          height: BAR_SIZE + 4,
          cursor: 'pointer',
        }),
  };

  const trackStyle = {
    position: 'absolute',
    borderRadius: BAR_SIZE / 2,
    backgroundColor: 'rgba(0,0,0,0.08)',
    ...(isVertical
      ? {
          top: 2,
          bottom: 2,
          left: 2,
          right: 2,
        }
      : {
          left: 2,
          right: 2,
          top: 2,
          bottom: 2,
        }),
  };

  const thumbStyle = {
    position: 'absolute',
    borderRadius: BAR_SIZE / 2,
    backgroundColor: thumbActive
      ? 'rgba(0,0,0,0.55)'
      : 'rgba(0,0,0,0.32)',
    transition: 'background-color 0.12s ease',
    // 长度用过滚缩短后的 drawnThumbSize；位移 = 实际滚动量 + 过滚"末端固定"补偿
    //（越过末端时末端贴住轨道末端、起点后移缩短量）
    ...(isVertical
      ? {
          left: 2,
          width: BAR_SIZE,
          height: drawnThumbSize,
          transform: `translateY(${thumbPos + thumbShift}px)`,
        }
      : {
          top: 2,
          height: BAR_SIZE,
          width: drawnThumbSize,
          transform: `translateX(${thumbPos + thumbShift}px)`,
        }),
  };

  return (
    <div
      ref={barRef}
      style={barStyle}
      onMouseDown={handleTrackClick}
      onMouseEnter={() => setBarHovered(true)}
      onMouseLeave={() => setBarHovered(false)}
    >
      <div style={trackStyle} />
      <div
        ref={thumbRef}
        style={thumbStyle}
        onMouseDown={startDrag}
        onMouseEnter={() => !dragging.current && setThumbActive(true)}
        onMouseLeave={() => !dragging.current && setThumbActive(false)}
      />
    </div>
  );
};

/**
 * 视图内滚动区域：为 Cell 视图的内部滚动子区域（聊天消息区、标签页内容区、
 * 抽屉正文、下拉列表等——设计上须独立于 Box 层滚动的区域）提供与 Box 内容层
 * 一致的滚动体验：浮动滚动条（悬停/滚动中显示）+ 滚轮阻尼。
 * 结构：wrapper（position:relative，尺寸由 style 决定）→ 滚动容器（承载
 * 内容与滚动）+ 浮动滚动条（锚定 wrapper）。
 * @param {Object} props 组件属性
 * @param {Object} [props.style] wrapper 样式（须给出尺寸约束，如 flex:1 + minHeight:0；
 *   内容自适应高度场景可不传，滚动容器经 scrollStyle 的 maxHeight 限高）
 * @param {Object} [props.scrollStyle] 滚动容器附加样式（padding、maxHeight 等）
 * @param {'vertical'|'horizontal'} [props.orientation='vertical'] 滚动方向
 * @param {React.ReactNode} props.children 滚动内容
 * @returns {JSX.Element} 滚动区域元素
 */
const ViewScrollArea = ({ style, scrollStyle, orientation = 'vertical', children }) => {
  const scrollRef = useRef(null);
  const isVertical = orientation === 'vertical';
  // 滚轮阻尼：与 Box 内容层同一阻尼机制（见 scroll-damping.js）。
  // 本区域只沿 orientation 方向滚：交叉轴输入既不滚内容也不产生过滚位移
  useEffect(() => {
    if (!scrollRef.current) return;
    const damping = attachScrollDamping(scrollRef.current, {
      x: !isVertical,
      y: isVertical,
    });
    return () => damping.dispose();
  }, [isVertical]);
  return (
    <div style={{ position: 'relative', ...style }}>
      <div
        ref={scrollRef}
        style={{
          ...(style ? { position: 'absolute', inset: 0 } : null),
          overflowY: isVertical ? 'auto' : 'hidden',
          overflowX: isVertical ? 'hidden' : 'auto',
          ...scrollStyle,
        }}
      >
        {children}
      </div>
      <FloatingScrollbar containerRef={scrollRef} orientation={orientation} />
    </div>
  );
};

export { ViewScrollArea, resolveDrawThumbSize, resolveThumbShift };
export default FloatingScrollbar;
