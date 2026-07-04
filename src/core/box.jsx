import React, { useState, useEffect, useRef, useMemo } from 'react';

const styleSheet = `
  .drag-handle {
    z-index: 100;
    background: rgba(100, 150, 255, 0.5);
  }
  .drag-handle-horizontal {
    cursor: e-resize;
  }
  .drag-handle-vertical {
    cursor: n-resize;
  }
  .drag-handle-horizontal.drag-handle-vertical {
    cursor: move;
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
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [viewportSize, setViewportSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

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

  let isInvalid = false;
  
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

  const isHorizontal = builder._layout === 'horizontal';
  const isVertical = builder._layout === 'vertical';

  const isLockedX = builder._moveX === false;
  const isLockedY = builder._moveY === false;

  const cWidth = builder._isViewport ? viewportSize.width : containerSize.width;
  const cHeight = builder._isViewport ? viewportSize.height : containerSize.height;

  if (isHorizontal && isLockedX && builder._children.length > 0 && cWidth > 0) {
    const result = builder._calculateLayout(cWidth, 'Width');
    if (!result.isValid) {
      isInvalid = true;
    } else {
      builder._children.forEach((child, i) => {
        child._layoutWidth = result.sizes[i];
      });
    }
  }

  if (isVertical && isLockedY && builder._children.length > 0 && cHeight > 0) {
    const result = builder._calculateLayout(cHeight, 'Height');
    if (!result.isValid) {
      isInvalid = true;
    } else {
      builder._children.forEach((child, i) => {
        child._layoutHeight = result.sizes[i];
      });
    }
  }

  if (isHorizontal && isLockedY && builder._children.length > 0) {
    const parentHeight = cHeight > 0 ? cHeight : 
                         (builder._minHeight === builder._maxHeight ? builder._minHeight : builder._defaultHeight);
    if (parentHeight > 0) {
      builder._children.forEach(child => {
        child._layoutHeight = parentHeight;
      });
    }
  }

  if (isVertical && isLockedX && builder._children.length > 0) {
    const parentWidth = cWidth > 0 ? cWidth : 
                        (builder._minWidth === builder._maxWidth ? builder._minWidth : builder._defaultWidth);
    if (parentWidth > 0) {
      builder._children.forEach(child => {
        child._layoutWidth = parentWidth;
      });
    }
  }

  const isFreeX = builder._moveX === true;
  const isFreeY = builder._moveY === true;

  const parentLockedX = builder._parent && builder._parent._moveX === false;
  const parentLockedY = builder._parent && builder._parent._moveY === false;

  if (isHorizontal && isFreeX && builder._children.length > 0) {
    const result = builder._calculateFreeLayout('Width');
    let totalWidth = 0;
    builder._children.forEach((child, i) => {
      if (child._layoutWidth === undefined) {
        child._layoutWidth = result.sizes[i];
      }
      totalWidth += child._layoutWidth;
    });
    if (!builder._isViewport && !parentLockedX && builder._layoutWidth === undefined) {
      builder._layoutWidth = totalWidth;
    }
  }

  if (isVertical && isFreeY && builder._children.length > 0) {
    const result = builder._calculateFreeLayout('Height');
    let totalHeight = 0;
    builder._children.forEach((child, i) => {
      if (child._layoutHeight === undefined) {
        child._layoutHeight = result.sizes[i];
      }
      totalHeight += child._layoutHeight;
    });
    if (!builder._isViewport && !parentLockedY && builder._layoutHeight === undefined) {
      builder._layoutHeight = totalHeight;
    }
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

  if (isInvalid) {
    style.backgroundColor = 'red';
  }

  Object.keys(style).forEach(key => {
    if (style[key] === undefined) {
      delete style[key];
    }
  });

  let content;
  if (isInvalid) {
    content = '错误';
  } else {
    const dim = builder._layout === 'horizontal' ? 'Width' : 'Height';
    
    const isHorizontal = builder._layout === 'horizontal';
    
    const renderEdgeHandle = (position) => {
      const isStart = position === 'start';
      const size = isHorizontal ? 'width' : 'height';
      const crossSize = isHorizontal ? 'height' : 'width';
      const crossPos = isHorizontal ? 'top' : 'left';
      const directionClass = isHorizontal ? 'drag-handle-horizontal' : 'drag-handle-vertical';
      
      const edgeSize = 5;
      
      const style = {
        position: 'absolute',
        [crossPos]: 0,
        [size]: edgeSize,
        [crossSize]: '100%',
      };
      
      if (isHorizontal) {
        style[isStart ? 'left' : 'right'] = 0;
      } else {
        style[isStart ? 'top' : 'bottom'] = 0;
      }
      
      return (
        <div
          className={`drag-handle ${directionClass}`}
          style={style}
        />
      );
    };
    
    content = builder._children.map((child, index) => {
      const isFirst = index === 0;
      const isLast = index === builder._children.length - 1;
      
      const childWidth = child._layoutWidth;
      const childHeight = child._layoutHeight;
      
      return (
        <div 
          key={builder._pathResolved.join('-') + '-' + index}
          style={{ 
            position: 'relative', 
            flex: builder._moveX === false && isHorizontal ? 'none' : undefined,
            width: childWidth ? `${childWidth}px` : undefined,
            height: childHeight ? `${childHeight}px` : undefined,
          }}
        >
          {isFirst && renderEdgeHandle('start')}
          {child._content || child.react()}
          {!isLast && child._renderDragHandle ? child._renderDragHandle() : null}
          {isLast && renderEdgeHandle('end')}
        </div>
      );
    });
  }

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

class BoxBuilder {
  constructor(path) {
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
    const min = `_min${dimension}`;
    const max = `_max${dimension}`;
    const def = `_default${dimension}`;

    if (this._children.length === 0) {
      return { sizes: [], isValid: true };
    }

    const children = this._children;
    const count = children.length;

    const fixedSizes = [];
    const b = [];
    const mins = [];
    const maxs = [];

    let fixedTotal = 0;
    let knownDefaultTotal = 0;
    let unknownDefaultCount = 0;

    children.forEach(child => {
      if (this._isFixed(child, dimension)) {
        fixedSizes.push(child[min]);
        fixedTotal += child[min];
      } else {
        fixedSizes.push(null);
        const childMin = this._getMin(child, dimension);
        const childMax = this._getMax(child, dimension);
        const hasDefault = this._hasDefault(child, dimension);
        const hasMinMax = this._hasExplicitMinMax(child, dimension);
        
        mins.push(childMin);
        maxs.push(childMax);
        
        if (hasDefault) {
          knownDefaultTotal += child[def];
        } else if (!hasMinMax) {
          unknownDefaultCount++;
        }
      }
    });

    if (fixedTotal > containerSize) {
      return { sizes: [], isValid: false, error: true };
    }

    const remainingSpace = containerSize - fixedTotal;
    const nonFixedCount = count - fixedSizes.filter(s => s !== null).length;

    if (nonFixedCount === 0) {
      return { sizes: fixedSizes, isValid: true };
    }

    let midValueTotal = 0;
    
    children.forEach(child => {
      if (!this._isFixed(child, dimension) && !this._hasDefault(child, dimension)) {
        const childMin = this._getMin(child, dimension);
        const childMax = this._getMax(child, dimension);
        if (this._hasExplicitMinMax(child, dimension)) {
          const mid = (childMin + childMax) / 2;
          midValueTotal += mid;
        }
      }
    });

    const availableForUnknown = Math.max(0, remainingSpace - knownDefaultTotal - midValueTotal);
    const unknownDefaultValue = unknownDefaultCount > 0 ? availableForUnknown / unknownDefaultCount : 0;

    let nonFixedIdx = 0;
    children.forEach(child => {
      if (!this._isFixed(child, dimension)) {
        const childMin = mins[nonFixedIdx];
        const childMax = maxs[nonFixedIdx];
        const hasDefault = this._hasDefault(child, dimension);
        const hasMinMax = this._hasExplicitMinMax(child, dimension);
        
        let targetValue;
        
        if (hasDefault && child[max] !== Infinity) {
          targetValue = child[def];
        } else if (hasMinMax) {
          targetValue = (childMin + childMax) / 2;
        } else {
          targetValue = unknownDefaultValue;
        }
        
        targetValue = Math.max(childMin, Math.min(childMax, targetValue));
        b.push(targetValue);
        
        nonFixedIdx++;
      }
    });

    let lambdaMin = Infinity;
    let lambdaMax = -Infinity;
    
    for (let i = 0; i < b.length; i++) {
      const effectiveMax = maxs[i] === Infinity ? 1e10 : maxs[i];
      const effectiveMin = mins[i] === -Infinity ? -1e10 : mins[i];
      
      lambdaMin = Math.min(lambdaMin, b[i] - effectiveMax);
      lambdaMax = Math.max(lambdaMax, b[i] - effectiveMin);
    }

    const computeTotal = (lam) => {
      let total = 0;
      for (let i = 0; i < b.length; i++) {
        const val = b[i] - lam;
        total += Math.max(mins[i], Math.min(maxs[i], val));
      }
      return total;
    };

    const minPossible = computeTotal(lambdaMax);
    const maxPossible = computeTotal(lambdaMin);

    if (remainingSpace < minPossible || remainingSpace > maxPossible) {
      return { sizes: [], isValid: false, error: true };
    }

    for (let iter = 0; iter < 80; iter++) {
      const lamMid = (lambdaMin + lambdaMax) / 2;
      const total = computeTotal(lamMid);
      
      if (total > remainingSpace) {
        lambdaMin = lamMid;
      } else {
        lambdaMax = lamMid;
      }
    }

    const lamOpt = (lambdaMin + lambdaMax) / 2;
    const nonFixedSizes = [];
    
    for (let i = 0; i < b.length; i++) {
      const val = b[i] - lamOpt;
      nonFixedSizes.push(Math.max(mins[i], Math.min(maxs[i], val)));
    }

    const sizes = [];
    let nonFixedIdx2 = 0;
    
    for (let i = 0; i < count; i++) {
      if (fixedSizes[i] !== null) {
        sizes.push(fixedSizes[i]);
      } else {
        sizes.push(nonFixedSizes[nonFixedIdx2++]);
      }
    }

    return { sizes, isValid: true };
  }

  _applyLayout(child, width, height) {
    child._layoutWidth = width;
    child._layoutHeight = height;
    child._notify();
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

  _renderDragHandles() {
    return null;
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
      
      return (
        <div
          className={`drag-handle ${directionClass}`}
          style={{
            position: 'absolute',
            [pos]: handlePos,
            [crossPos]: 0,
            [size]: handleSize,
            [crossSize]: '100%',
            // animation: width height 0.3s ease-in-out
            // transition: 'width 0.3s ease-in-out, height 1s ease-in-out',
          }}
        />
      );
    }
    return null;
  }

  react() {
    return <BoxComponent builder={this} />;
  }
  
}

export default BoxBuilder;
