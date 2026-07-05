import React, { useState, useEffect, useRef } from 'react';
import { reflowScheduler, animateReflow, pickAnimatable } from '../box/scheduler';
import FloatingScrollbar from './floating-scrollbar';

const styleSheet = `
  .drag-handle {
    z-index: 100;
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
    z-index: 200;
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
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [viewportSize, setViewportSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });
  const [, forceUpdate] = useState(0);

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
    const renderEdgeHandle = (position) => {
      const isStart = position === 'start';
      const size = isHorizontal ? 'width' : 'height';
      const crossSize = isHorizontal ? 'height' : 'width';
      const crossPos = isHorizontal ? 'top' : 'left';
      const directionClass = isHorizontal ? 'drag-handle-horizontal' : 'drag-handle-vertical';

      const edgeSize = 10;

      const handleStyle = {
        position: 'absolute',
        [crossPos]: 0,
        [size]: edgeSize / 2,
        [crossSize]: '100%',
        pointerEvents: 'auto',
      };

      if (isHorizontal) {
        handleStyle[isStart ? 'left' : 'right'] = 0;
      } else {
        handleStyle[isStart ? 'top' : 'bottom'] = 0;
      }

      const cornerSize = 12;
      const children = [];

      children.push(
        <div
          key="edge"
          className={`drag-handle ${directionClass}`}
          style={handleStyle}
        />
      );

      if (isHorizontal) {
        children.push(
          <div
            key="corner-top"
            className={`drag-handle drag-handle-horizontal drag-handle-vertical`}
            style={{
              position: 'absolute',
              [isStart ? 'left' : 'right']: 0,
              top: 0,
              width: cornerSize / 2,
              height: cornerSize / 2,
              pointerEvents: 'auto',
            }}
          />
        );
        children.push(
          <div
            key="corner-bottom"
            className={`drag-handle drag-handle-horizontal drag-handle-vertical`}
            style={{
              position: 'absolute',
              [isStart ? 'left' : 'right']: 0,
              bottom: 0,
              width: cornerSize / 2,
              height: cornerSize / 2,
              pointerEvents: 'auto',
            }}
          />
        );
      } else {
        children.push(
          <div
            key="corner-left"
            className={`drag-handle drag-handle-horizontal drag-handle-vertical`}
            style={{
              position: 'absolute',
              [isStart ? 'top' : 'bottom']: 0,
              left: 0,
              width: cornerSize / 2,
              height: cornerSize / 2,
              pointerEvents: 'auto',
            }}
          />
        );
        children.push(
          <div
            key="corner-right"
            className={`drag-handle drag-handle-horizontal drag-handle-vertical`}
            style={{
              position: 'absolute',
              [isStart ? 'top' : 'bottom']: 0,
              right: 0,
              width: cornerSize / 2,
              height: cornerSize / 2,
              pointerEvents: 'auto',
            }}
          />
        );
      }

      return <>{children}</>;
    };

    content = builder._children.map((child, index) => {
      const isFirst = index === 0;
      const isLast = index === builder._children.length - 1;

      const childStyle = getChildStyle(child);

      return (
        <div
          key={builder._pathResolved.join('-') + '-' + index}
          ref={el => { childRefs.current[index] = el; }}
          style={childStyle}
        >
          {isFirst && renderEdgeHandle('start')}
          {child._content || child.react()}
          {!isLast && child._renderDragHandle ? child._renderDragHandle() : null}
          {isLast && renderEdgeHandle('end')}
        </div>
      );
    });
  }

  useEffect(() => {
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
