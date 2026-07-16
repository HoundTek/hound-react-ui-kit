import React, { useState, useEffect, useRef, useCallback } from 'react';
import { reflowScheduler, animateReflow, pickAnimatable } from './scheduler';
import FloatingScrollbar from './floating-scrollbar';
import { useHoveredEdges } from './hovered-edges-context';

const styleSheet = `
  .drag-handle {
    background: rgba(100, 150, 255, 0.5);
    pointer-events: auto;
  }
  .drag-handle-horizontal {
    cursor: e-resize;
  }
  .drag-handle-vertical {
    cursor: n-resize;
  }
  .drag-handle-horizontal.drag-handle-vertical {
    cursor: move;
    background: rgba(255, 100, 150, 0.6);
  }
`;

if (typeof document !== 'undefined' && !document.getElementById('box-drag-styles')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'box-drag-styles';
  styleElement.textContent = styleSheet;
  document.head.appendChild(styleElement);
}

// === 辅助函数（纯计算，无 hook）===

const safeNum = (v) => (typeof v === 'number' && !isNaN(v) && isFinite(v)) ? v : 0;

function computeBuilderLayout(builder) {
  let width = 'auto';
  let height = 'auto';
  let maxWidth = 'none';
  let maxHeight = 'none';
  let minWidth = 'none';
  let minHeight = 'none';
  let flexDirection = 'none';

  if (builder._maxWidth !== undefined) maxWidth = `${builder._maxWidth}px`;
  if (builder._minWidth !== undefined) minWidth = `${builder._minWidth}px`;
  if (builder._defaultWidth !== null) width = `${builder._defaultWidth}px`;
  if (builder._maxHeight !== undefined) maxHeight = `${builder._maxHeight}px`;
  if (builder._minHeight !== undefined) minHeight = `${builder._minHeight}px`;
  if (builder._defaultHeight !== null) height = `${builder._defaultHeight}px`;

  if (builder._layout === 'horizontal') flexDirection = 'row';
  else if (builder._layout === 'vertical') flexDirection = 'column';

  let computedWidth = width;
  let computedHeight = height;
  if (builder._isViewport) {
    computedWidth = '100vw';
    computedHeight = '100vh';
  } else {
    if (computedWidth === 'auto') computedWidth = '100%';
    if (computedHeight === 'auto') computedHeight = '100%';
  }
  if (!builder._isViewport && builder._layoutWidth !== undefined) computedWidth = `${builder._layoutWidth}px`;
  if (!builder._isViewport && builder._layoutHeight !== undefined) computedHeight = `${builder._layoutHeight}px`;

  const style = {
    display: 'flex',
    flexDirection,
    backgroundColor: builder._backgroundColor,
    width: computedWidth,
    height: computedHeight,
    maxWidth,
    maxHeight,
    minWidth,
    minHeight,
    alignSelf: 'stretch',
    overflowX: 'auto',
    overflowY: 'auto',
  };

  if (builder._isViewport) style.alignItems = 'stretch';
  else if (builder._layout === 'horizontal') style.alignItems = 'stretch';
  else if (builder._layoutHeight !== undefined) style.alignItems = 'flex-start';
  else if (builder._alignItems !== undefined) style.alignItems = builder._alignItems;

  if (!builder._layoutValid) style.backgroundColor = 'red';

  Object.keys(style).forEach(key => {
    if (style[key] === undefined) delete style[key];
  });

  const isHorizontal = builder._layout === 'horizontal';

  const getChildStyle = (child) => {
    const s = {
      position: 'relative',
      flex: builder._moveX === false && isHorizontal ? 'none' : undefined,
      width: child._layoutWidth ? `${child._layoutWidth}px` : undefined,
      height: child._layoutHeight ? `${child._layoutHeight}px` : undefined,
    };
    Object.keys(s).forEach(key => {
      if (s[key] === undefined) delete s[key];
    });
    return s;
  };

  const containerClassName = builder._pathResolved.join('-');
  const innerClassName = "inner-" + containerClassName;
  const innerStyle = {
    width: "100%",
    height: "100%",
    display: 'flex',
    flexDirection,
    position: 'relative',
  };

  // 计算子节点偏移量
  const offsets = builder._children.map(() => 0);
  let cumulative = 0;
  builder._children.forEach((child, i) => {
    offsets[i] = cumulative;
    cumulative += isHorizontal ? safeNum(child._layoutWidth) : safeNum(child._layoutHeight);
  });

  return {
    style,
    flexDirection,
    isHorizontal,
    getChildStyle,
    offsets,
    containerClassName,
    innerClassName,
    innerStyle,
    computedWidth,
    computedHeight,
  };
}

// === 滚动同步注册表（模块级，跨组件共享） ===
const _contentRefRegistry = {};

function registerContentRef(path, ref) {
  _contentRefRegistry[path] = ref;
}

function unregisterContentRef(path) {
  delete _contentRefRegistry[path];
}

function getContentRef(path) {
  return _contentRefRegistry[path];
}

// === 工具函数（无 hook，纯计算）===

function getOverlayStyle(style) {
  return {
    ...style,
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'transparent',
    pointerEvents: 'none',
  };
}

function getChildPositionStyle(childStyle, offset, isHorizontal) {
  return isHorizontal
    ? { position: 'absolute', left: offset, top: 0, width: childStyle.width || 'auto', height: '100%' }
    : { position: 'absolute', top: offset, left: 0, height: childStyle.height || 'auto', width: '100%' };
}

// === 自定义 Hooks ===

/**
 * useBoxContent — ContentLayer 专用 hook，包含所有状态和副作用
 * 返回渲染所需的 ref 和 layout 计算结果
 */
function useBoxContent(builder) {
  const containerRef = useRef(null);
  const containerPrevStyle = useRef({});
  const childRefs = useRef([]);
  const childPrevStyles = useRef(new Map());
  const isFirstRender = useRef(true);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [viewportSize, setViewportSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });
  const [, forceUpdate] = useState(0);

  const layout = computeBuilderLayout(builder);
  const { style, getChildStyle } = layout;

  // 注册容器 ref 供 edge/corner 层滚动同步
  useEffect(() => {
    registerContentRef(builder._path, containerRef);
    return () => unregisterContentRef(builder._path);
  }, [builder._path]);

  // window resize 监听
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ResizeObserver 监听容器尺寸
  useEffect(() => {
    if (!containerRef.current || builder._isViewport) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [builder._isViewport]);

  // reflow scheduler 根节点注册
  useEffect(() => {
    if (builder._isViewport) {
      reflowScheduler.registerRoot(builder);
      return () => reflowScheduler.unregisterRoot(builder);
    }
  }, [builder]);

  // 容器/视口尺寸变化时触发 reflow
  useEffect(() => {
    const width = builder._isViewport ? viewportSize.width : containerSize.width;
    const height = builder._isViewport ? viewportSize.height : containerSize.height;
    builder._containerSize = { width, height };
    builder._requestReflow();
  }, [containerSize, viewportSize]);

  // 初始化 reflow
  useEffect(() => {
    let scheduled = false;
    const handleReflowComplete = () => {
      if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(() => {
          scheduled = false;
          forceUpdate(n => n + 1);
        });
      }
    };
    builder._onReflowComplete = handleReflowComplete;
    builder._containerSize = {
      width: builder._isViewport ? viewportSize.width : containerSize.width,
      height: builder._isViewport ? viewportSize.height : containerSize.height,
    };
    builder._performReflow();
    return () => { builder._onReflowComplete = null; };
  }, []);

  // 容器动画
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const el = containerRef.current;
    if (el) {
      const currAnimatable = pickAnimatable(style);
      animateReflow(el, containerPrevStyle.current, currAnimatable);
      containerPrevStyle.current = currAnimatable;
    }
    builder._children.forEach((child, index) => {
      const childEl = childRefs.current[index];
      if (!childEl) return;
      const childStyle = getChildStyle(child);
      const currAnimatable = pickAnimatable(childStyle);
      const prev = childPrevStyles.current.get(index) || {};
      animateReflow(childEl, prev, currAnimatable);
      childPrevStyles.current.set(index, currAnimatable);
    });
  });

  return { containerRef, childRefs, layout };
}

/**
 * useBoxOverlayScroll — EdgeLayer / CornerLayer 共用 hook
 * 将覆盖层容器的 scrollTop/scrollLeft 同步到内容层，
 * 并在内容容器尺寸变化时强制重新渲染（保持尺寸同步）
 */
function useBoxOverlayScroll(layerRef, builder) {
  const [, forceUpdate] = useState(0);

  // 滚动同步
  useEffect(() => {
    const contentRefObj = getContentRef(builder._path);
    if (!contentRefObj?.current || !layerRef.current) return;
    const contentEl = contentRefObj.current;
    const layerEl = layerRef.current;
    const handler = () => {
      layerEl.scrollTop = contentEl.scrollTop;
      layerEl.scrollLeft = contentEl.scrollLeft;
    };
    contentEl.addEventListener('scroll', handler, { passive: true });
    handler();
    return () => contentEl.removeEventListener('scroll', handler);
  }, [builder._path, layerRef]);

  // 尺寸同步：观察内容容器尺寸变化时强制刷新
  useEffect(() => {
    const contentRefObj = getContentRef(builder._path);
    if (!contentRefObj?.current) return;
    const ro = new ResizeObserver(() => {
      forceUpdate(n => n + 1);
    });
    ro.observe(contentRefObj.current);
    return () => ro.disconnect();
  }, [builder._path]);
}

// === 公共布局框架组件 ===
const BoxLayerFrame = ({ containerRef, containerClassName, containerStyle, innerClassName, innerStyle, wrapperStyle, children, extra }) => {
  const frame = (
    <div ref={containerRef} className={containerClassName} style={containerStyle}>
      <div className={innerClassName} style={{ ...innerStyle }}>
        {children}
      </div>
      {extra}
    </div>
  );
  return wrapperStyle ? <div style={wrapperStyle}>{frame}</div> : frame;
};

// ===========================================================================
//  第一层：Box 内容
// ===========================================================================
const ContentLayer = ({ builder }) => {
  const { containerRef, childRefs, layout } = useBoxContent(builder);
  const { style, getChildStyle, containerClassName, innerClassName, innerStyle } = layout;

  const wrapperStyle = { position: 'relative' };

  if (!builder._layoutValid) {
    return (
      <BoxLayerFrame
        containerRef={containerRef}
        containerClassName={containerClassName}
        containerStyle={{ ...style }}
        innerClassName={innerClassName}
        innerStyle={innerStyle}
        wrapperStyle={wrapperStyle}
      >
        <div>错误</div>
      </BoxLayerFrame>
    );
  }

  return (
    <BoxLayerFrame
      containerRef={containerRef}
      containerClassName={containerClassName}
      containerStyle={{ ...style }}
      innerClassName={innerClassName}
      innerStyle={innerStyle}
      wrapperStyle={wrapperStyle}
      extra={<>
        {builder._moveY === true && <FloatingScrollbar containerRef={containerRef} orientation="vertical" />}
        {builder._moveX === true && <FloatingScrollbar containerRef={containerRef} orientation="horizontal" />}
      </>}
    >
      {builder._children.map((child, index) => {
        const childStyle = getChildStyle(child);
        return (
          <div
            key={builder._pathResolved.join('-') + '-' + index}
            ref={el => { childRefs.current[index] = el; }}
            style={childStyle}
          >
            {child._content || <ContentLayer builder={child} />}
          </div>
        );
      })}
    </BoxLayerFrame>
  );
};

// ===========================================================================
//  第二层：边界（覆盖层，无布局干预）
// ===========================================================================
const EdgeLayer = ({ builder }) => {
  const edgeRef = useRef(null);
  const { hoveredEdges, addHoveredEdge, removeHoveredEdge } = useHoveredEdges();
  const layout = computeBuilderLayout(builder);
  const { style, isHorizontal, offsets, getChildStyle, containerClassName, innerClassName, innerStyle } = layout;

  // 对无子节点的 builder 不渲染
  if (builder._children.length === 0 || !builder._layoutValid) return null;

  useBoxOverlayScroll(edgeRef, builder);

  const EDGE_SIZE = 10;
  const EDGE_COLOR = 'rgba(255, 100, 50, 0.7)';

  const makeEdgeId = (box, side) => `${box._path}:${side}`;

  const renderEdge = (box, side, isStart, offset) => {
    const edgeId = makeEdgeId(box, side);
    const isHovered = hoveredEdges.has(edgeId);
    const depth = box._pathResolved.length;
    const s = {
      position: 'absolute',
      pointerEvents: 'auto',
      zIndex: 100 - depth,
      backgroundColor: isHovered ? EDGE_COLOR : undefined,
    };
    if (isHorizontal) {
      const w = safeNum(box._layoutWidth);
      s.left = isStart ? offset : offset + w - EDGE_SIZE / 2;
      s.top = 0;
      s.width = EDGE_SIZE / 2;
      s.height = '100%';
    } else {
      const h = safeNum(box._layoutHeight);
      s.top = isStart ? offset : offset + h - EDGE_SIZE / 2;
      s.left = 0;
      s.width = '100%';
      s.height = EDGE_SIZE / 2;
    }
    const dirClass = isHorizontal ? 'drag-handle-horizontal' : 'drag-handle-vertical';
    return (
      <div
        key={`edge-${box._path}-${side}`}
        className={`drag-handle ${dirClass}`}
        style={s}
        onMouseEnter={() => addHoveredEdge(edgeId)}
        onMouseLeave={() => removeHoveredEdge(edgeId)}
      />
    );
  };

  const renderHandle = (box, offset) => {
    const edgeId = makeEdgeId(box, 'handle');
    const isHovered = hoveredEdges.has(edgeId);
    const depth = box._pathResolved.length;
    const dirClass = isHorizontal ? 'drag-handle-horizontal' : 'drag-handle-vertical';
    const s = {
      position: 'absolute',
      pointerEvents: 'auto',
      zIndex: 100 - depth,
      backgroundColor: isHovered ? EDGE_COLOR : undefined,
    };
    if (isHorizontal) {
      const w = safeNum(box._layoutWidth);
      s.left = offset + w - EDGE_SIZE / 2;
      s.top = 0;
      s.width = EDGE_SIZE;
      s.height = '100%';
    } else {
      const h = safeNum(box._layoutHeight);
      s.top = offset + h - EDGE_SIZE / 2;
      s.left = 0;
      s.width = '100%';
      s.height = EDGE_SIZE;
    }
    return (
      <div
        key={`edge-${box._path}-handle`}
        className={`drag-handle ${dirClass}`}
        style={s}
        onMouseEnter={() => addHoveredEdge(edgeId)}
        onMouseLeave={() => removeHoveredEdge(edgeId)}
      />
    );
  };

  const childrenCount = builder._children.length;

  const edgeHandles = builder._children.flatMap((child, index) => {
    const isFirst = index === 0;
    const isLast = index === childrenCount - 1;
    const items = [];
    if (isFirst) items.push(renderEdge(child, 'start', true, offsets[index]));
    if (!isLast) items.push(renderHandle(child, offsets[index]));
    if (isLast) items.push(renderEdge(child, 'end', false, offsets[index]));
    return items;
  });

  const overlayStyle = getOverlayStyle(style);

  return (
    <BoxLayerFrame
      containerRef={edgeRef}
      containerClassName={containerClassName}
      containerStyle={overlayStyle}
      innerClassName={innerClassName}
      innerStyle={innerStyle}
    >
      {edgeHandles}
      {/* 递归：子节点的 EdgeLayer 定位到对应偏移处 */}
      {builder._children.map((child, index) => {
        const childStyle = getChildStyle(child);
        const posStyle = getChildPositionStyle(childStyle, offsets[index], isHorizontal);
        return (
          <div key={`edge-child-${builder._pathResolved.join('-')}-${index}`} style={posStyle}>
            <EdgeLayer builder={child} />
          </div>
        );
      })}
    </BoxLayerFrame>
  );
};

// ===========================================================================
//  第三层：节点（覆盖层，仅嵌套层渲染）
// ===========================================================================
const CornerLayer = ({ builder }) => {
  const cornerRef = useRef(null);
  const { hoveredEdges, addHoveredEdges, removeHoveredEdges } = useHoveredEdges();
  const layout = computeBuilderLayout(builder);
  const { style, isHorizontal, offsets, getChildStyle, containerClassName, innerClassName, innerStyle } = layout;

  // 没子节点或布局无效，不渲染
  if (builder._children.length === 0 || !builder._layoutValid) return null;

  useBoxOverlayScroll(cornerRef, builder);

  const CORNER_SIZE = 12;
  const CORNER_COLOR = 'rgba(255, 50, 100, 0.8)';

  const makeEdgeId = (box, side) => `${box._path}:${side}`;

  const getCornerEdgeIds = (box, side, crossSide) => {
    const ids = [makeEdgeId(box, side)];

    // 往上找到排列方向变化的边界，再回退一层作为容器
    let childLevel = box._parent;
    let containerLevel = childLevel?._parent;
    if (containerLevel && childLevel._layout === (isHorizontal ? 'horizontal' : 'vertical')) {
      let diffAncestor = containerLevel;
      let diffChild = childLevel;
      while (diffAncestor && diffAncestor._layout === (isHorizontal ? 'horizontal' : 'vertical')) {
        diffChild = diffAncestor;
        diffAncestor = diffAncestor._parent;
      }
      if (!diffAncestor) return ids;
      childLevel = diffChild;
      containerLevel = diffAncestor;
    }

    if (!containerLevel) return ids;

    const childIndex = containerLevel._children.indexOf(childLevel);
    const isFirst = childIndex === 0;
    const isLast = childIndex === containerLevel._children.length - 1;
    const isStartSide = (isHorizontal && crossSide === 'top') || (!isHorizontal && crossSide === 'left');
    if (isStartSide) {
      if (isFirst) ids.push(makeEdgeId(childLevel, 'start'));
      else ids.push(makeEdgeId(containerLevel._children[childIndex - 1], 'handle'));
    } else {
      if (isLast) ids.push(makeEdgeId(childLevel, 'end'));
      else ids.push(makeEdgeId(childLevel, 'handle'));
    }
    return ids;
  };

  const renderCorner = (box, side, crossSide, offset) => {
    const edgeIds = getCornerEdgeIds(box, side, crossSide);
    const isHovered = edgeIds.some(e => hoveredEdges.has(e));
    const depth = box._pathResolved.length;
    const isHandle = side === 'handle';
    const s = {
      position: 'absolute',
      pointerEvents: 'auto',
      zIndex: 200 - depth,
      backgroundColor: isHovered ? CORNER_COLOR : undefined,
    };
    if (isHorizontal) {
      const w = safeNum(box._layoutWidth);
      s.width = isHandle ? CORNER_SIZE : CORNER_SIZE / 2;
      s.height = CORNER_SIZE / 2;
      s.left = side === 'start' ? offset : offset + w - CORNER_SIZE / 2;
      s[crossSide] = 0;
    } else {
      const h = safeNum(box._layoutHeight);
      s.width = CORNER_SIZE / 2;
      s.height = isHandle ? CORNER_SIZE : CORNER_SIZE / 2;
      s.top = side === 'start' ? offset : offset + h - CORNER_SIZE / 2;
      s[crossSide] = 0;
    }
    return (
      <div
        key={`corner-${box._path}-${side}-${crossSide}`}
        className="drag-handle drag-handle-horizontal drag-handle-vertical"
        style={s}
        onMouseEnter={() => addHoveredEdges(edgeIds)}
        onMouseLeave={() => removeHoveredEdges(edgeIds)}
      />
    );
  };

  const childrenCount = builder._children.length;

  const cornerHandles = builder._children.flatMap((child, index) => {
    const isFirst = index === 0;
    const isLast = index === childrenCount - 1;
    const corners = [];
    if (isHorizontal) {
      if (isFirst) {
        corners.push(renderCorner(child, 'start', 'top', offsets[index]));
        corners.push(renderCorner(child, 'start', 'bottom', offsets[index]));
      }
      if (!isLast) {
        corners.push(renderCorner(child, 'handle', 'top', offsets[index]));
        corners.push(renderCorner(child, 'handle', 'bottom', offsets[index]));
      }
      if (isLast) {
        corners.push(renderCorner(child, 'end', 'top', offsets[index]));
        corners.push(renderCorner(child, 'end', 'bottom', offsets[index]));
      }
    } else {
      if (isFirst) {
        corners.push(renderCorner(child, 'start', 'left', offsets[index]));
        corners.push(renderCorner(child, 'start', 'right', offsets[index]));
      }
      if (!isLast) {
        corners.push(renderCorner(child, 'handle', 'left', offsets[index]));
        corners.push(renderCorner(child, 'handle', 'right', offsets[index]));
      }
      if (isLast) {
        corners.push(renderCorner(child, 'end', 'left', offsets[index]));
        corners.push(renderCorner(child, 'end', 'right', offsets[index]));
      }
    }
    return corners;
  });

  const overlayStyle = getOverlayStyle(style);

  return (
    <BoxLayerFrame
      containerRef={cornerRef}
      containerClassName={containerClassName}
      containerStyle={overlayStyle}
      innerClassName={innerClassName}
      innerStyle={innerStyle}
    >
      {cornerHandles}
      {/* 递归：子节点的 CornerLayer 定位到对应偏移处 */}
      {builder._children.map((child, index) => {
        const childStyle = getChildStyle(child);
        const posStyle = getChildPositionStyle(childStyle, offsets[index], isHorizontal);
        return (
          <div key={`corner-child-${builder._pathResolved.join('-')}-${index}`} style={posStyle}>
            <CornerLayer builder={child} />
          </div>
        );
      })}
    </BoxLayerFrame>
  );
};

export { ContentLayer, EdgeLayer, CornerLayer };
