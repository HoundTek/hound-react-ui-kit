import React, { useState, useEffect, useRef } from 'react';
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

const BoxComponent = ({ builder }) => {
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
  const { hoveredEdges, addHoveredEdge, removeHoveredEdge, addHoveredEdges, removeHoveredEdges } = useHoveredEdges();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  useEffect(() => {
    if (builder._isViewport) {
      reflowScheduler.registerRoot(builder);
      return () => {
        reflowScheduler.unregisterRoot(builder);
      };
    }
  }, [builder]);

  useEffect(() => {
    const width = builder._isViewport ? viewportSize.width : containerSize.width;
    const height = builder._isViewport ? viewportSize.height : containerSize.height;

    builder._containerSize = { width, height };
    builder._requestReflow();
  }, [containerSize, viewportSize]);

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
      height: builder._isViewport ? viewportSize.height : containerSize.height
    };
    builder._performReflow();

    return () => {
      builder._onReflowComplete = null;
    };
  }, []);

  let width = 'auto';
  let height = 'auto';
  let maxWidth = 'none';
  let maxHeight = 'none';
  let minWidth = 'none';
  let minHeight = 'none';
  let flexDirection = 'none';

  if (builder._maxWidth !== undefined) {
    maxWidth = `${builder._maxWidth}px`;
  }
  if (builder._minWidth !== undefined) {
    minWidth = `${builder._minWidth}px`;
  }
  if (builder._defaultWidth !== null) {
    width = `${builder._defaultWidth}px`;
  }

  if (builder._maxHeight !== undefined) {
    maxHeight = `${builder._maxHeight}px`;
  }
  if (builder._minHeight !== undefined) {
    minHeight = `${builder._minHeight}px`;
  }
  if (builder._defaultHeight !== null) {
    height = `${builder._defaultHeight}px`;
  }

  if (builder._layout === 'horizontal') {
    flexDirection = 'row';
  } else if (builder._layout === 'vertical') {
    flexDirection = 'column';
  }

  let computedWidth = width;
  let computedHeight = height;

  if (builder._isViewport) {
    computedWidth = '100vw';
    computedHeight = '100vh';
  } else {
    if (computedWidth === 'auto') {
      computedWidth = '100%';
    }
    if (computedHeight === 'auto') {
      computedHeight = '100%';
    }
  }
  if (!builder._isViewport && builder._layoutWidth !== undefined) {
    computedWidth = `${builder._layoutWidth}px`;
  }
  if (!builder._isViewport && builder._layoutHeight !== undefined) {
    computedHeight = `${builder._layoutHeight}px`;
  }

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

  if (builder._isViewport) {
    style.alignItems = 'stretch';
  } else if (builder._layout === 'horizontal') {
    style.alignItems = 'stretch';
  } else if (builder._layoutHeight !== undefined) {
    style.alignItems = 'flex-start';
  } else if (builder._alignItems !== undefined) {
    style.alignItems = builder._alignItems;
  }

  if (!builder._layoutValid) {
    style.backgroundColor = 'red';
  }

  Object.keys(style).forEach(key => {
    if (style[key] === undefined) {
      delete style[key];
    }
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

  let content;
  if (!builder._layoutValid) {
    content = '错误';
  } else {
    const EDGE_SIZE = 10;
    const CORNER_SIZE = 12;
    const EDGE_COLOR = 'rgba(255, 100, 50, 0.7)';
    const CORNER_COLOR = 'rgba(255, 50, 100, 0.8)';

    const safeNum = (v) => (typeof v === 'number' && !isNaN(v) && isFinite(v)) ? v : 0;

    const makeEdgeId = (box, side) => `${box._path}:${side}`;

    const getCornerEdgeIds = (box, side, crossSide, isHorizontal) => {
      const ids = [makeEdgeId(box, side)];

      const parent = box._parent;
      if (!parent || !parent._parent) return ids;

      const grandParent = parent._parent;
      const parentIndex = grandParent._children.indexOf(parent);
      const parentIsFirst = parentIndex === 0;
      const parentIsLast = parentIndex === grandParent._children.length - 1;

      const isStartSide = (isHorizontal && crossSide === 'top') || (!isHorizontal && crossSide === 'left');

      if (isStartSide) {
        if (parentIsFirst) {
          ids.push(makeEdgeId(parent, 'start'));
        } else {
          const prevSibling = grandParent._children[parentIndex - 1];
          ids.push(makeEdgeId(prevSibling, 'handle'));
        }
      } else {
        if (parentIsLast) {
          ids.push(makeEdgeId(parent, 'end'));
        } else {
          ids.push(makeEdgeId(parent, 'handle'));
        }
      }

      return ids;
    };

    const renderEdge = (box, side, isStart, offset) => {
      const edgeId = makeEdgeId(box, side);
      const isHovered = hoveredEdges.has(edgeId);
      const depth = box._pathResolved.length;

      const style = {
        position: 'absolute',
        pointerEvents: 'auto',
        zIndex: 100 + depth,
        backgroundColor: isHovered ? EDGE_COLOR : undefined,
      };

      if (isHorizontal) {
        const w = safeNum(box._layoutWidth);
        style.left = isStart ? offset : offset + w - EDGE_SIZE / 2;
        style.top = 0;
        style.width = EDGE_SIZE / 2;
        style.height = '100%';
      } else {
        const h = safeNum(box._layoutHeight);
        style.top = isStart ? offset : offset + h - EDGE_SIZE / 2;
        style.left = 0;
        style.width = '100%';
        style.height = EDGE_SIZE / 2;
      }

      const dirClass = isHorizontal ? 'drag-handle-horizontal' : 'drag-handle-vertical';

      return (
        <div
          key={`edge-${box._path}-${side}`}
          className={`drag-handle ${dirClass}`}
          style={style}
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

      const style = {
        position: 'absolute',
        pointerEvents: 'auto',
        zIndex: 100 + depth,
        backgroundColor: isHovered ? EDGE_COLOR : undefined,
      };

      if (isHorizontal) {
        const w = safeNum(box._layoutWidth);
        style.left = offset + w - EDGE_SIZE / 2;
        style.top = 0;
        style.width = EDGE_SIZE;
        style.height = '100%';
      } else {
        const h = safeNum(box._layoutHeight);
        style.top = offset + h - EDGE_SIZE / 2;
        style.left = 0;
        style.width = '100%';
        style.height = EDGE_SIZE;
      }

      return (
        <div
          key={`edge-${box._path}-handle`}
          className={`drag-handle ${dirClass}`}
          style={style}
          onMouseEnter={() => addHoveredEdge(edgeId)}
          onMouseLeave={() => removeHoveredEdge(edgeId)}
        />
      );
    };

    const renderCorner = (box, side, crossSide, offset) => {
      const edgeIds = getCornerEdgeIds(box, side, crossSide, isHorizontal);
      const isHovered = edgeIds.some(e => hoveredEdges.has(e));
      const depth = box._pathResolved.length;
      const isHandle = side === 'handle';

      const style = {
        position: 'absolute',
        pointerEvents: 'auto',
        zIndex: 200 + depth,
        backgroundColor: isHovered ? CORNER_COLOR : undefined,
      };

      if (isHorizontal) {
        const w = safeNum(box._layoutWidth);
        style.width = isHandle ? CORNER_SIZE : CORNER_SIZE / 2;
        style.height = CORNER_SIZE / 2;
        if (side === 'start') {
          style.left = offset;
        } else {
          style.left = offset + w - CORNER_SIZE / 2;
        }
        style[crossSide] = 0;
      } else {
        const h = safeNum(box._layoutHeight);
        style.width = CORNER_SIZE / 2;
        style.height = isHandle ? CORNER_SIZE : CORNER_SIZE / 2;
        if (side === 'start') {
          style.top = offset;
        } else {
          style.top = offset + h - CORNER_SIZE / 2;
        }
        style[crossSide] = 0;
      }

      return (
        <div
          key={`corner-${box._path}-${side}-${crossSide}`}
          className="drag-handle drag-handle-horizontal drag-handle-vertical"
          style={style}
          onMouseEnter={() => addHoveredEdges(edgeIds)}
          onMouseLeave={() => removeHoveredEdges(edgeIds)}
        />
      );
    };

    content = (() => {
      const childrenCount = builder._children.length;

      let cumulative = 0;
      const offsets = builder._children.map(child => {
        const offset = cumulative;
        cumulative += isHorizontal ? safeNum(child._layoutWidth) : safeNum(child._layoutHeight);
        return offset;
      });

      // 第一层：Box 内容
      const contentLayer = builder._children.map((child, index) => {
        const childStyle = getChildStyle(child);
        return (
          <div
            key={builder._pathResolved.join('-') + '-' + index}
            ref={el => { childRefs.current[index] = el; }}
            style={childStyle}
          >
            {child._content || child.react()}
          </div>
        );
      });

      // 第二层：边界
      const edgeLayer = builder._children.flatMap((child, index) => {
        const isFirst = index === 0;
        const isLast = index === childrenCount - 1;
        const edges = [];

        if (isFirst) {
          edges.push(renderEdge(child, 'start', true, offsets[index]));
        }
        if (!isLast) {
          edges.push(renderHandle(child, offsets[index]));
        }
        if (isLast) {
          edges.push(renderEdge(child, 'end', false, offsets[index]));
        }
        return edges;
      });

      // 第三层：节点（仅嵌套层渲染，最外层无上层交叉边界）
      const cornerLayer = builder._parent ? builder._children.flatMap((child, index) => {
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
      }) : [];

      return (
        <>
          {contentLayer}
          {edgeLayer}
          {cornerLayer}
        </>
      );
    })();
  }

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

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={containerRef}
        className={builder._pathResolved.join('-')}
        style={{ ...style }}
      >
        <div
          className={"inner-" + builder._pathResolved.join('-')}
          style={{
            width: "100%",
            height: "100%",
            display: 'flex',
            flexDirection,
            position: 'relative'
          }}
        >
          {content}
        </div>
      </div>
      {builder._moveY === true && <FloatingScrollbar containerRef={containerRef} orientation="vertical" />}
      {builder._moveX === true && <FloatingScrollbar containerRef={containerRef} orientation="horizontal" />}
    </div>
  );
};

export default BoxComponent;
