import React from 'react';
import { Reflowable, reflowScheduler } from './scheduler';
import { ContentLayer, EdgeLayer, CornerLayer } from './box-component';

class BoxBuilder extends Reflowable {
  constructor(path) {
    super();
    this._path = path;
    this._pathResolved = path.replace(/^@/, '').split('/').filter(Boolean);
    this._children = [];
    this._childrenMap = new Map();
    this._childrenMap.set('.', this);
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
    this._children.forEach((child, index) => {
      child._parent = this;
      this._childrenMap.set(child._pathResolved[child._pathResolved.length - 1], child);
    });
    return this;
  }

  // 根节点沿 _parent 链上溯求值（建树顺序不影响正确性）
  get _root() {
    let node = this;
    while (node._parent) node = node._parent;
    return node;
  }

  get(path) {
    if (path === '.') return this;
    if (path === '..') return this._parent || null;
    if (path === '@') return this._root;

    const parts = path.split('/').filter(p => p !== '');
    let node = this;
    for (const part of parts) {
      if (part === '.') continue;
      if (part === '..') {
        node = node._parent;
      } else if (part === '@') {
        node = node._root;
      } else {
        node = node._childrenMap.get(part);
      }
      if (!node) return null;
    }
    return node;
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

  draggable(allow) {
    this._draggable = allow;
    return this;
  }

  viewport() {
    this._isViewport = true;
    return this;
  }

  grid(minCellWidth, minCellHeight) {
    this._grid = { minCellWidth, minCellHeight };
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
        const childRatio = child[`_ratio${dimension}`];
        const hasRatio = typeof childRatio === 'number';
        const ratioTarget = hasRatio ? childRatio * containerSize : null;
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
          ratioTarget,
          b: 0,
        });

        if (hasRatio) {
          knownDefaultTotal += ratioTarget;
        } else if (hasDefault) {
          knownDefaultTotal += childDefault;
        } else if (!hasMinMax) {
          unknownDefaultCount++;
        }

        if (!hasRatio && !hasDefault && hasMinMax) {
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

      if (nf.ratioTarget !== null) {
        targetValue = nf.ratioTarget;
      } else if (nf.hasDefault && nf.max !== Infinity) {
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
      // 未填满时目标值不再被 max 覆盖：全部非固定 child 都带有拖拽记录的比例时，
      // 按比例目标分配（钳在 min/max 内），保留拖拽结果；否则维持全分 max
      const allRatio = nonFixed.every(nf => nf.ratioTarget !== null);
      for (let i = 0; i < count; i++) {
        if (fixedSizes[i] !== null) {
          sizes[i] = fixedSizes[i];
        } else {
          const nf = nonFixed[nonFixedIdx++];
          sizes[i] = allRatio ? Math.max(nf.min, Math.min(nf.max, nf.ratioTarget)) : nf.max;
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

  _performGridLayout(width, height) {
    const { minCellWidth, minCellHeight } = this._grid;
    const n = this._children.length;
    // 排列方向由 box 决定：horizontal（或未定义）→ 行优先；vertical → 列优先
    const rowMajor = this._layout !== 'vertical';

    let cols, rows, cellW, cellH;
    if (rowMajor) {
      // 每行 ⌊W/w⌋ 个单元格并平分宽度；行平分高度，不足最小高度时溢出滚动
      cols = Math.max(1, Math.floor(width / minCellWidth));
      cellW = width / cols;
      rows = Math.max(1, Math.ceil(n / cols));
      cellH = height / rows;
      if (cellH < minCellHeight) cellH = minCellHeight;
    } else {
      // 每列 ⌊H/h⌋ 个单元格并平分高度；列平分宽度，不足最小宽度时溢出滚动
      rows = Math.max(1, Math.floor(height / minCellHeight));
      cellH = height / rows;
      cols = Math.max(1, Math.ceil(n / rows));
      cellW = width / cols;
      if (cellW < minCellWidth) cellW = minCellWidth;
    }

    this._gridMetrics = { cols, rows, cellW, cellH, rowMajor };
    this._children.forEach(child => {
      child._layoutWidth = cellW;
      child._layoutHeight = cellH;
    });
  }

  _performReflow() {
    if (!this._needsReflow) return;
    this._needsReflow = false;

    const isGrid = !!this._grid;
    const isHorizontal = this._layout === 'horizontal';
    const isVertical = this._layout === 'vertical';
    const isLockedX = this._moveX === false;
    const isLockedY = this._moveY === false;

    const { width, height } = this._containerSize;
    let isValid = true;

    if (isGrid && this._children.length > 0 && width > 0 && height > 0) {
      this._performGridLayout(width, height);
    }

    if (!isGrid && isHorizontal && isLockedX && this._children.length > 0 && width > 0) {
      const result = this._calculateLayout(width, 'Width');
      if (!result.isValid) {
        isValid = false;
      } else {
        this._children.forEach((child, i) => {
          child._layoutWidth = result.sizes[i];
        });
      }
    }

    if (!isGrid && isVertical && isLockedY && this._children.length > 0 && height > 0) {
      const result = this._calculateLayout(height, 'Height');
      if (!result.isValid) {
        isValid = false;
      } else {
        this._children.forEach((child, i) => {
          child._layoutHeight = result.sizes[i];
        });
      }
    }

    if (!isGrid && isHorizontal && isLockedY && this._children.length > 0) {
      const parentHeight = height > 0 ? height :
                           (this._minHeight === this._maxHeight ? this._minHeight : this._defaultHeight);
      if (parentHeight > 0) {
        this._children.forEach(child => {
          child._layoutHeight = parentHeight;
        });
      }
    }

    if (!isGrid && isVertical && isLockedX && this._children.length > 0) {
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

    if (!isGrid && isHorizontal && isFreeX && this._children.length > 0) {
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

    if (!isGrid && isVertical && isFreeY && this._children.length > 0) {
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
    return this.reactContent();
  }

  reactContent() {
    return <ContentLayer builder={this} />;
  }

  reactEdge() {
    return <EdgeLayer builder={this} />;
  }

  reactCorner() {
    return <CornerLayer builder={this} />;
  }
}

export default BoxBuilder;
