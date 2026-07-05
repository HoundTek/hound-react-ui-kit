import React, { useState, useEffect, useRef } from 'react';
import { Reflowable, reflowScheduler, animateReflow, pickAnimatable } from './scheduler';

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
    <div
      ref={containerRef}
      className={builder._pathResolved.join('-')}
      style={{ ...style, position: 'relative' }}
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
  );
};

class BoxBuilder extends Reflowable {
  constructor(path) {
    super();
    this._path = path;
    this._pathResolved = path.split('/');
    this._children = [];
    this._moveX = undefined;
    this._moveY = undefined;

    this._minWidth = 0;
    this._maxWidth = Infinity;
    this._minHeight = 0;
    this._maxHeight = Infinity;
    this._defaultWidth = null;
    this._defaultHeight = null;

    this._explicitMinWidth = false;
    this._explicitMaxWidth = false;
    this._explicitMinHeight = false;
    this._explicitMaxHeight = false;

    this._layoutValid = true;
    this._containerSize = { width: 0, height: 0 };
  }

  maxWidth(width) {
    this._maxWidth = width;
    this._explicitMaxWidth = true;
    return this;
  }

  maxHeight(height) {
    this._maxHeight = height;
    this._explicitMaxHeight = true;
    return this;
  }

  minWidth(width) {
    this._minWidth = width;
    this._explicitMinWidth = true;
    return this;
  }

  minHeight(height) {
    this._minHeight = height;
    this._explicitMinHeight = true;
    return this;
  }

  defaultWidth(width) {
    this._defaultWidth = width;
    return this;
  }

  defaultHeight(height) {
    this._defaultHeight = height;
    return this;
  }

  fixedWidth(width) {
    return this.maxWidth(width).minWidth(width);
  }

  fixedHeight(height) {
    return this.maxHeight(height).minHeight(height);
  }

  backgroundColor(color) {
    this._backgroundColor = color;
    return this;
  }

  content(content) {
    this._content = content;
    return this;
  }

  children(childrenBox) {
    this._children = childrenBox;
    this._children.forEach(child => {
      child._parent = this;
    });
    return this;
  }

  layout(layoutType) {
    this._layout = layoutType;
    return this;
  }

  alignItems(alignment) {
    this._alignItems = alignment;
    return this;
  }

  moveX(allow) {
    this._moveX = allow;
    return this;
  }

  moveY(allow) {
    this._moveY = allow;
    return this;
  }

  viewport() {
    this._isViewport = true;
    return this;
  }

  _getMin(child, dimension) {
    return child[`_min${dimension}`];
  }

  _getMax(child, dimension) {
    return child[`_max${dimension}`];
  }

  _getDefault(child, dimension) {
    return child[`_default${dimension}`];
  }

  _hasDefault(child, dimension) {
    return child[`_default${dimension}`] !== null;
  }

  _hasExplicitMinMax(child, dimension) {
    const minKey = `_explicitMin${dimension}`;
    const maxKey = `_explicitMax${dimension}`;
    return child[minKey] === true && child[maxKey] === true;
  }

  _isFixed(child, dimension) {
    const min = child[`_min${dimension}`];
    const max = child[`_max${dimension}`];
    return min === max;
  }

  _calculateLayout(containerSize, dimension) {
    const minKey = `_min${dimension}`;
    const maxKey = `_max${dimension}`;
    const defKey = `_default${dimension}`;
    const explicitMinKey = `_explicitMin${dimension}`;
    const explicitMaxKey = `_explicitMax${dimension}`;

    if (this._children.length === 0) {
      return { sizes: [], isValid: true };
    }

    const children = this._children;
    const count = children.length;

    const fixedSizes = new Array(count);
    const nonFixed = [];
    let fixedTotal = 0;
    let knownDefaultTotal = 0;
    let unknownDefaultCount = 0;
    let midValueTotal = 0;

    for (let i = 0; i < count; i++) {
      const child = children[i];
      const childMin = child[minKey];
      const childMax = child[maxKey];

      if (childMin === childMax) {
        fixedSizes[i] = childMin;
        fixedTotal += childMin;
      } else {
        fixedSizes[i] = null;
        const childDefault = child[defKey];
        const hasDefault = childDefault !== null;
        const hasMinMax = child[explicitMinKey] === true && child[explicitMaxKey] === true;
        const mid = (childMin + childMax) / 2;

        nonFixed.push({
          min: childMin,
          max: childMax,
          default: childDefault,
          hasDefault,
          hasMinMax,
          b: 0,
        });

        if (hasDefault) {
          knownDefaultTotal += childDefault;
        } else if (!hasMinMax) {
          unknownDefaultCount++;
        }

        if (!hasDefault && hasMinMax) {
          midValueTotal += mid;
        }
      }
    }

    if (fixedTotal > containerSize) {
      return { sizes: [], isValid: false, error: true };
    }

    const remainingSpace = containerSize - fixedTotal;
    const nonFixedCount = nonFixed.length;

    if (nonFixedCount === 0) {
      return { sizes: fixedSizes, isValid: true };
    }

    const availableForUnknown = Math.max(0, remainingSpace - knownDefaultTotal - midValueTotal);
    const unknownDefaultValue = unknownDefaultCount > 0 ? availableForUnknown / unknownDefaultCount : 0;

    for (let i = 0; i < nonFixedCount; i++) {
      const nf = nonFixed[i];
      let targetValue;

      if (nf.hasDefault && nf.max !== Infinity) {
        targetValue = nf.default;
      } else if (nf.hasMinMax) {
        targetValue = (nf.min + nf.max) / 2;
      } else {
        targetValue = unknownDefaultValue;
      }

      nf.b = Math.max(nf.min, Math.min(nf.max, targetValue));
    }

    let lambdaMin = Infinity;
    let lambdaMax = -Infinity;

    for (let i = 0; i < nonFixedCount; i++) {
      const nf = nonFixed[i];
      const effectiveMax = nf.max === Infinity ? 1e10 : nf.max;
      const effectiveMin = nf.min === -Infinity ? -1e10 : nf.min;

      lambdaMin = Math.min(lambdaMin, nf.b - effectiveMax);
      lambdaMax = Math.max(lambdaMax, nf.b - effectiveMin);
    }

    const computeTotal = (lam) => {
      let total = 0;
      for (let i = 0; i < nonFixedCount; i++) {
        const nf = nonFixed[i];
        const val = nf.b - lam;
        total += Math.max(nf.min, Math.min(nf.max, val));
      }
      return total;
    };

    const minPossible = computeTotal(lambdaMax);
    const maxPossible = computeTotal(lambdaMin);

    if (remainingSpace < minPossible) {
      return { sizes: [], isValid: false, error: true };
    }

    if (remainingSpace > maxPossible) {
      const sizes = new Array(count);
      let nonFixedIdx = 0;
      for (let i = 0; i < count; i++) {
        if (fixedSizes[i] !== null) {
          sizes[i] = fixedSizes[i];
        } else {
          sizes[i] = nonFixed[nonFixedIdx++].max;
        }
      }
      return { sizes, isValid: true };
    }

    const LAMBDA_EPSILON = 1;

    while (lambdaMax - lambdaMin > LAMBDA_EPSILON) {
      const lamMid = (lambdaMin + lambdaMax) / 2;
      const total = computeTotal(lamMid);

      if (total > remainingSpace) {
        lambdaMin = lamMid;
      } else {
        lambdaMax = lamMid;
      }
    }

    const lamOpt = (lambdaMin + lambdaMax) / 2;
    const sizes = new Array(count);
    let nonFixedIdx = 0;

    for (let i = 0; i < count; i++) {
      if (fixedSizes[i] !== null) {
        sizes[i] = fixedSizes[i];
      } else {
        const nf = nonFixed[nonFixedIdx++];
        const val = nf.b - lamOpt;
        sizes[i] = Math.max(nf.min, Math.min(nf.max, val));
      }
    }

    return { sizes, isValid: true };
  }

  _calculateFreeLayout(dimension) {
    const sizes = [];
    const min = `_min${dimension}`;
    const max = `_max${dimension}`;
    const def = `_default${dimension}`;
    const explicitMin = `_explicitMin${dimension}`;
    const explicitMax = `_explicitMax${dimension}`;

    this._children.forEach(child => {
      let size;

      if (this._hasDefault(child, dimension)) {
        size = child[def];
      } else if (this._hasExplicitMinMax(child, dimension)) {
        size = (child[min] + child[max]) / 2;
      } else if (child[explicitMin]) {
        size = child[min];
      } else if (child[explicitMax]) {
        size = child[max];
      } else {
        size = 0;
      }

      sizes.push(size);
    });

    return { sizes, isValid: true };
  }

  _renderDragHandle() {
    if (this._parent && this._parent._layout) {
      const isHorizontal = this._parent._layout === 'horizontal';
      const pos = isHorizontal ? 'right' : 'bottom';
      const size = isHorizontal ? 'width' : 'height';
      const crossSize = isHorizontal ? 'height' : 'width';
      const crossPos = isHorizontal ? 'top' : 'left';
      const directionClass = isHorizontal ? 'drag-handle-horizontal' : 'drag-handle-vertical';

      const handleSize = 10;
      const handlePos = -handleSize / 2;
      const cornerSize = 12;

      const children = [];

      children.push(
        <div
          key="edge"
          className={`drag-handle ${directionClass}`}
          style={{
            position: 'absolute',
            [pos]: handlePos,
            [crossPos]: 0,
            [size]: handleSize,
            [crossSize]: '100%',
          }}
        />
      );

      children.push(
        <div
          key="corner-start"
          className={`drag-handle drag-handle-horizontal drag-handle-vertical`}
          style={{
            position: 'absolute',
            [pos]: -cornerSize / 2,
            [crossPos]: 0,
            width: isHorizontal ? cornerSize : cornerSize / 2,
            height: isHorizontal ? cornerSize / 2 : cornerSize,
          }}
        />
      );

      children.push(
        <div
          key="corner-end"
          className={`drag-handle drag-handle-horizontal drag-handle-vertical`}
          style={{
            position: 'absolute',
            [pos]: -cornerSize / 2,
            [isHorizontal ? 'bottom' : 'right']: 0,
            width: isHorizontal ? cornerSize : cornerSize / 2,
            height: isHorizontal ? cornerSize / 2 : cornerSize,
          }}
        />
      );

      return <>{children}</>;
    }
    return null;
  }

  _performReflow() {
    if (!this._needsReflow) return;
    this._needsReflow = false;

    const isHorizontal = this._layout === 'horizontal';
    const isVertical = this._layout === 'vertical';
    const isLockedX = this._moveX === false;
    const isLockedY = this._moveY === false;

    const { width, height } = this._containerSize;
    let isValid = true;

    if (isHorizontal && isLockedX && this._children.length > 0 && width > 0) {
      const result = this._calculateLayout(width, 'Width');
      if (!result.isValid) {
        isValid = false;
      } else {
        this._children.forEach((child, i) => {
          child._layoutWidth = result.sizes[i];
        });
      }
    }

    if (isVertical && isLockedY && this._children.length > 0 && height > 0) {
      const result = this._calculateLayout(height, 'Height');
      if (!result.isValid) {
        isValid = false;
      } else {
        this._children.forEach((child, i) => {
          child._layoutHeight = result.sizes[i];
        });
      }
    }

    if (isHorizontal && isLockedY && this._children.length > 0) {
      const parentHeight = height > 0 ? height :
                           (this._minHeight === this._maxHeight ? this._minHeight : this._defaultHeight);
      if (parentHeight > 0) {
        this._children.forEach(child => {
          child._layoutHeight = parentHeight;
        });
      }
    }

    if (isVertical && isLockedX && this._children.length > 0) {
      const parentWidth = width > 0 ? width :
                          (this._minWidth === this._maxWidth ? this._minWidth : this._defaultWidth);
      if (parentWidth > 0) {
        this._children.forEach(child => {
          child._layoutWidth = parentWidth;
        });
      }
    }

    const isFreeX = this._moveX === true;
    const isFreeY = this._moveY === true;
    const parentLockedX = this._parent && this._parent._moveX === false;
    const parentLockedY = this._parent && this._parent._moveY === false;

    if (isHorizontal && isFreeX && this._children.length > 0) {
      const result = this._calculateFreeLayout('Width');
      let totalWidth = 0;
      this._children.forEach((child, i) => {
        if (child._layoutWidth === undefined) {
          child._layoutWidth = result.sizes[i];
        }
        totalWidth += child._layoutWidth;
      });
      if (!this._isViewport && !parentLockedX && this._layoutWidth === undefined) {
        this._layoutWidth = totalWidth;
      }
    }

    if (isVertical && isFreeY && this._children.length > 0) {
      const result = this._calculateFreeLayout('Height');
      let totalHeight = 0;
      this._children.forEach((child, i) => {
        if (child._layoutHeight === undefined) {
          child._layoutHeight = result.sizes[i];
        }
        totalHeight += child._layoutHeight;
      });
      if (!this._isViewport && !parentLockedY && this._layoutHeight === undefined) {
        this._layoutHeight = totalHeight;
      }
    }

    this._layoutValid = isValid;

    this._children.forEach(child => {
      child._containerSize = {
        width: child._layoutWidth || width,
        height: child._layoutHeight || height,
      };
      child._performReflow();
    });

    this._notifyReflowComplete();
  }

  react() {
    return <BoxComponent builder={this} />;
  }
}

export default BoxBuilder;
