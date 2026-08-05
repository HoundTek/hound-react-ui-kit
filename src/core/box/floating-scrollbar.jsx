/**
 * @file 浮动滚动条组件。为 Box 容器提供悬浮显示、可拖拽滑块、可点击轨道的
 *        自定义滚动条，支持垂直/水平两个方向，按需显示（悬停/滚动中）。
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';

/** 滑块粗细（px） */
const BAR_SIZE = 6;
/** 滑块最小长度（px） */
const MIN_THUMB = 28;
/** 轨道上下/左右内边距（px） */
const INSET = 12;

/**
 * 滚动跟踪 hook。监听容器滚动与尺寸变化，计算滑块位置/大小、是否有滚动、是否滚动中
 * @param {React.RefObject<HTMLElement>} containerRef 容器 ref
 * @param {boolean} isVertical 是否垂直方向
 * @returns {{
 *   thumbPos: number, thumbSize: number, hasScroll: boolean,
 *   isScrolling: boolean, thumbSizeRef: React.MutableRefObject<number>
 * }} 滑块位置、大小、滚动状态及滑块大小 ref（供拖拽时读取最新值）
 */
function useScrollTracking(containerRef, isVertical) {
  const [thumbPos, setThumbPos] = useState(0);
  const [thumbSize, setThumbSize] = useState(MIN_THUMB);
  const [hasScroll, setHasScroll] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const thumbSizeRef = useRef(MIN_THUMB);
  const scrollTimerRef = useRef(null);

  /**
   * 依据容器当前 scroll 位置与内容/视口尺寸刷新滑块位置/大小与 hasScroll
   */
  const update = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    if (isVertical) {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const canScroll = scrollHeight > clientHeight;
      setHasScroll(canScroll);
      if (canScroll) {
        const trackSize = clientHeight - 2 * INSET;
        const newThumbSize = Math.max(MIN_THUMB, (clientHeight / scrollHeight) * trackSize);
        const trackSpace = trackSize - newThumbSize;
        const maxScroll = scrollHeight - clientHeight;
        const newThumbPos = (scrollTop / maxScroll) * trackSpace;
        thumbSizeRef.current = newThumbSize;
        setThumbSize(newThumbSize);
        setThumbPos(newThumbPos);
      }
    } else {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      const canScroll = scrollWidth > clientWidth;
      setHasScroll(canScroll);
      if (canScroll) {
        const trackSize = clientWidth - 2 * INSET;
        const newThumbSize = Math.max(MIN_THUMB, (clientWidth / scrollWidth) * trackSize);
        const trackSpace = trackSize - newThumbSize;
        const maxScroll = scrollWidth - clientWidth;
        const newThumbPos = (scrollLeft / maxScroll) * trackSpace;
        thumbSizeRef.current = newThumbSize;
        setThumbSize(newThumbSize);
        setThumbPos(newThumbPos);
      }
    }
  }, [containerRef, isVertical]);

  /**
   * 滚动事件处理：置为滚动中，刷新滑块；停止滚动 1s 后复位
   */
  const handleScroll = useCallback(() => {
    setIsScrolling(true);
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => setIsScrolling(false), 1000);
    update();
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
    };
  }, [containerRef, handleScroll, update]);

  return { thumbPos, thumbSize, hasScroll, isScrolling, thumbSizeRef };
}

/**
 * 浮动滚动条组件。按容器悬停/滚动中状态显示，支持滑块拖拽与轨道点击跳转
 * @param {Object} props 组件属性
 * @param {React.RefObject<HTMLElement>} props.containerRef 监听的容器 ref
 * @param {'vertical'|'horizontal'} [props.orientation='vertical'] 方向
 * @returns {JSX.Element} 滚动条元素
 */
const FloatingScrollbar = ({ containerRef, orientation = 'vertical' }) => {
  const isVertical = orientation === 'vertical';
  const { thumbPos, thumbSize, hasScroll, isScrolling, thumbSizeRef } = useScrollTracking(containerRef, isVertical);

  const [containerHovered, setContainerHovered] = useState(false);
  const [barHovered, setBarHovered] = useState(false);
  const [thumbActive, setThumbActive] = useState(false);
  const dragging = useRef(false);
  const dragStart = useRef({ pos: 0, scroll: 0 });
  const thumbRef = useRef(null);
  const show = (containerHovered || barHovered || thumbActive || isScrolling) && hasScroll;

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
      const ratio = isVertical
        ? (el.scrollHeight - el.clientHeight) / (trackSize - thumbSizeRef.current)
        : (el.scrollWidth - el.clientWidth) / (trackSize - thumbSizeRef.current);

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
      const ratio = isVertical
        ? (el.scrollHeight - el.clientHeight) / (trackSize - thumbSizeRef.current)
        : (el.scrollWidth - el.clientWidth) / (trackSize - thumbSizeRef.current);

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
    ...(isVertical
      ? {
          left: 2,
          width: BAR_SIZE,
          height: thumbSize,
          transform: `translateY(${thumbPos}px)`,
        }
      : {
          top: 2,
          height: BAR_SIZE,
          width: thumbSize,
          transform: `translateX(${thumbPos}px)`,
        }),
  };

  return (
    <div
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

export default FloatingScrollbar;
