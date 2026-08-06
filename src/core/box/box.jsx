/**
 * @file Box 布局构建器。BoxBuilder 以链式 API 描述一棵可嵌套的布局树，
 *        负责尺寸约束建模与 reflow 计算；React 渲染由 box-component 中的三层组件承担。
 */
import React from 'react';
import { Reflowable, reflowScheduler } from './scheduler';
import { ContentLayer, EdgeLayer, CornerLayer, registerFloating } from './box-component';

/**
 * Box 布局构建器。继承 Reflowable 获得 reflow 调度能力，通过链式方法配置尺寸约束、
 * 排列方向、滚动开关等属性，最终由 reactContent/reactEdge/reactCorner 产出三层 React 元素。
 * 路径以 `@` 开头表示绝对路径（如 `@demo/header/logo`），`_pathResolved` 为去掉前缀后的段数组。
 */
class BoxBuilder extends Reflowable {
  /**
   * @param {string} path Box 路径，`@` 开头为绝对路径，用 `/` 分隔层级
   */
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

    /** @type {boolean} 布局标记是否有效（reflow 后重置） */
    this._layoutValid = true;
    /** @type {{width: number, height: number}} 容器实际尺寸（视口取可视区域，其余由 ResizeObserver 提供） */
    this._containerSize = { width: 0, height: 0 };
    /** @type {boolean} 是否显示下一级子 Box 的 Edge/Corner 覆盖层 */
    this._showChildOverlays = true;
    /** @type {boolean} 是否为浮动视口（脱离主布局树，悬浮于页面上层） */
    this._isFloatingViewport = false;
    /** @type {number|null} 浮动视口距可视区域左边缘的位置（px）；null 表示未指定（默认 0） */
    this._posX = null;
    /** @type {number|null} 浮动视口距可视区域上边缘的位置（px）；null 表示未指定（默认 0） */
    this._posY = null;
    /** @type {number|null} 浮动视口层级；null 表示使用默认浮动层级 */
    this._zIndex = null;
    /** @type {boolean} 是否为模态浮动视口（FloatingLayer 统一绘制全屏遮罩） */
    this._modal = false;
  }

  /**
   * 设置最大宽度（标记为显式设置）
   * @param {number} width 最大宽度（px）
   * @returns {BoxBuilder} self（链式调用）
   */
  maxWidth(width) {
    this._maxWidth = width;
    this._explicitMaxWidth = true;
    return this;
  }

  /**
   * 设置最大高度（标记为显式设置）
   * @param {number} height 最大高度（px）
   * @returns {BoxBuilder} self（链式调用）
   */
  maxHeight(height) {
    this._maxHeight = height;
    this._explicitMaxHeight = true;
    return this;
  }

  /**
   * 设置最小宽度（标记为显式设置）
   * @param {number} width 最小宽度（px）
   * @returns {BoxBuilder} self（链式调用）
   */
  minWidth(width) {
    this._minWidth = width;
    this._explicitMinWidth = true;
    return this;
  }

  /**
   * 设置最小高度（标记为显式设置）
   * @param {number} height 最小高度（px）
   * @returns {BoxBuilder} self（链式调用）
   */
  minHeight(height) {
    this._minHeight = height;
    this._explicitMinHeight = true;
    return this;
  }

  /**
   * 设置默认宽度（reflow 时的目标尺寸，未指定 min/max 时作为初始值）
   * @param {number} width 默认宽度（px）
   * @returns {BoxBuilder} self（链式调用）
   */
  defaultWidth(width) {
    this._defaultWidth = width;
    return this;
  }

  /**
   * 设置默认高度（reflow 时的目标尺寸，未指定 min/max 时作为初始值）
   * @param {number} height 默认高度（px）
   * @returns {BoxBuilder} self（链式调用）
   */
  defaultHeight(height) {
    this._defaultHeight = height;
    return this;
  }

  /**
   * 固定宽度：等价于 maxWidth(w).minWidth(w)
   * @param {number} width 固定宽度（px）
   * @returns {BoxBuilder} self（链式调用）
   */
  fixedWidth(width) {
    return this.maxWidth(width).minWidth(width);
  }

  /**
   * 固定高度：等价于 maxHeight(h).minHeight(h)
   * @param {number} height 固定高度（px）
   * @returns {BoxBuilder} self（链式调用）
   */
  fixedHeight(height) {
    return this.maxHeight(height).minHeight(height);
  }

  /**
   * 设置背景色
   * @param {string} color CSS 颜色值
   * @returns {BoxBuilder} self（链式调用）
   */
  backgroundColor(color) {
    this._backgroundColor = color;
    return this;
  }

  /**
   * 设置该 Box 的自定义内容（React 节点）；设置后不再递归渲染子 Box 的内容层
   * @param {React.ReactNode} content 自定义内容
   * @returns {BoxBuilder} self（链式调用）
   */
  content(content) {
    this._content = content;
    return this;
  }

  /**
   * 设置子 Box 列表，建立父子关系与按段名索引的 childrenMap
   * @param {BoxBuilder[]} childrenBox 子 Box 数组
   * @returns {BoxBuilder} self（链式调用）
   */
  children(childrenBox) {
    this._children = childrenBox;
    this._children.forEach((child, index) => {
      child._parent = this;
      this._childrenMap.set(child._pathResolved[child._pathResolved.length - 1], child);
    });
    return this;
  }

  /**
   * 根节点：沿 _parent 链上溯求值（建树顺序不影响正确性）
   * @returns {BoxBuilder} 根 BoxBuilder
   */
  get _root() {
    let node = this;
    while (node._parent) node = node._parent;
    return node;
  }

  /**
   * 按路径取相对节点。支持 `.`（自身）、`..`（父级）、`@`（根）及 `/` 分隔的段名
   * @param {string} path 相对/绝对路径
   * @returns {BoxBuilder|null} 命中节点；不存在返回 null
   */
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

  /**
   * 设置排列方向
   * @param {'horizontal'|'vertical'} layoutType 排列方向
   * @returns {BoxBuilder} self（链式调用）
   */
  layout(layoutType) {
    this._layout = layoutType;
    return this;
  }

  /**
   * 设置交叉轴对齐方式（透传到 React 层 alignItems）
   * @param {string} alignment CSS align-items 值
   * @returns {BoxBuilder} self（链式调用）
   */
  alignItems(alignment) {
    this._alignItems = alignment;
    return this;
  }

  /**
   * 设置 X 轴滚动开关。true=自由滚动（内容可超出容器）、false=锁定（容器尺寸约束子项）、undefined=未设置
   * @param {boolean} allow 是否允许滚动
   * @returns {BoxBuilder} self（链式调用）
   */
  moveX(allow) {
    this._moveX = allow;
    return this;
  }

  /**
   * 设置 Y 轴滚动开关。true=自由滚动、false=锁定、undefined=未设置
   * @param {boolean} allow 是否允许滚动
   * @returns {BoxBuilder} self（链式调用）
   */
  moveY(allow) {
    this._moveY = allow;
    return this;
  }

  /**
   * 设置该 Box 是否可拖拽调整尺寸（false 时其相邻分界线不产生拖拽手柄）
   * @param {boolean} allow 是否可拖拽
   * @returns {BoxBuilder} self（链式调用）
   */
  draggable(allow) {
    this._draggable = allow;
    return this;
  }

  /**
   * 设置是否显示下一级子 Box 的 Edge 与 Corner 覆盖层（拖拽手柄）。
   * false 时本 Box 的 EdgeLayer/CornerLayer 不再递归渲染子层，子层的拖拽手柄全部隐藏。
   * 本 Box 自身的分界线（直接子项间的 Edge/Corner）不受影响。
   * @param {boolean} show 是否显示下一级覆盖层
   * @returns {BoxBuilder} self（链式调用）
   */
  showChildOverlays(show) {
    this._showChildOverlays = show;
    return this;
  }

  /**
   * 标记为视口根节点（尺寸取 100vw/100vh，并向 reflowScheduler 注册为 reflow 根）
   * @returns {BoxBuilder} self（链式调用）
   */
  viewport() {
    this._isViewport = true;
    return this;
  }

  /**
   * 标记为浮动视口（reflow 根；与 viewport() 互斥）。浮动视口脱离主布局树，
   * 以屏幕坐标悬浮于页面上层，位置/尺寸/层级独立指定，并由 FloatingLayer 统一渲染。
   * 调用即注册到浮动注册表，触发 FloatingLayer 重新渲染。
   * @returns {BoxBuilder} self（链式调用）
   */
  floatingViewport() {
    this._isFloatingViewport = true;
    registerFloating(this);
    return this;
  }

  /**
   * 设置浮动视口距可视区域左边缘的位置（px）
   * @param {number} x 水平位置（px）
   * @returns {BoxBuilder} self（链式调用）
   */
  posX(x) {
    this._posX = x;
    return this;
  }

  /**
   * 设置浮动视口距可视区域上边缘的位置（px）
   * @param {number} y 垂直位置（px）
   * @returns {BoxBuilder} self（链式调用）
   */
  posY(y) {
    this._posY = y;
    return this;
  }

  /**
   * 设置浮动视口层级（默认高于主内容）
   * @param {number} z 层级值（z-index）
   * @returns {BoxBuilder} self（链式调用）
   */
  zIndex(z) {
    this._zIndex = z;
    return this;
  }

  /**
   * 标记为模态浮动视口：FloatingLayer 统一绘制全屏遮罩，阻塞下层交互
   * @returns {BoxBuilder} self（链式调用）
   */
  modal() {
    this._modal = true;
    return this;
  }

  /**
   * 启用网格布局，按最小单元格尺寸自动排列子项
   * @param {number} minCellWidth 最小单元格宽（px）
   * @param {number} minCellHeight 最小单元格高（px）
   * @returns {BoxBuilder} self（链式调用）
   */
  grid(minCellWidth, minCellHeight) {
    this._grid = { minCellWidth, minCellHeight };
    return this;
  }

  /**
   * 取子项在指定维度上的最小尺寸
   * @param {BoxBuilder} child 子项
   * @param {'Width'|'Height'} dimension 维度
   * @returns {number} 最小尺寸
   */
  _getMin(child, dimension) {
    return child[`_min${dimension}`];
  }

  /**
   * 取子项在指定维度上的最大尺寸
   * @param {BoxBuilder} child 子项
   * @param {'Width'|'Height'} dimension 维度
   * @returns {number} 最大尺寸
   */
  _getMax(child, dimension) {
    return child[`_max${dimension}`];
  }

  /**
   * 取子项在指定维度上的默认尺寸
   * @param {BoxBuilder} child 子项
   * @param {'Width'|'Height'} dimension 维度
   * @returns {number|null} 默认尺寸；未设置返回 null
   */
  _getDefault(child, dimension) {
    return child[`_default${dimension}`];
  }

  /**
   * 子项在指定维度上是否设置了默认尺寸
   * @param {BoxBuilder} child 子项
   * @param {'Width'|'Height'} dimension 维度
   * @returns {boolean} 是否设置默认尺寸
   */
  _hasDefault(child, dimension) {
    return child[`_default${dimension}`] !== null;
  }

  /**
   * 子项在指定维度上是否同时显式设置了 min 与 max
   * @param {BoxBuilder} child 子项
   * @param {'Width'|'Height'} dimension 维度
   * @returns {boolean} 是否显式设置了 min 与 max
   */
  _hasExplicitMinMax(child, dimension) {
    const minKey = `_explicitMin${dimension}`;
    const maxKey = `_explicitMax${dimension}`;
    return child[minKey] === true && child[maxKey] === true;
  }

  /**
   * 子项在指定维度上是否为固定尺寸（min === max）
   * @param {BoxBuilder} child 子项
   * @param {'Width'|'Height'} dimension 维度
   * @returns {boolean} 是否固定尺寸
   */
  _isFixed(child, dimension) {
    const min = child[`_min${dimension}`];
    const max = child[`_max${dimension}`];
    return min === max;
  }

  /**
   * 锁定主轴上的布局计算：在给定容器尺寸下，按 min/max/default/ratio 求解
   * 各子项尺寸（min/max 守恒，非固定项按比例/默认/中值分配，剩余空间用 λ 二分拟合）
   * @param {number} containerSize 容器在主轴上的尺寸
   * @param {'Width'|'Height'} dimension 维度
   * @returns {{sizes: number[], isValid: boolean, error?: boolean}} 各子项尺寸数组与合法性
   */
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

  /**
   * 自由滚动主轴上的布局计算：不受容器尺寸约束，各子项按
   * default > (min+max)/2 > min > max > 0 的优先级取目标尺寸
   * @param {'Width'|'Height'} dimension 维度
   * @returns {{sizes: number[], isValid: boolean}} 各子项尺寸数组（恒为合法）
   */
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

  /**
   * 执行网格布局：按 minCellWidth/minCellHeight 计算行列数与单元格尺寸，
   * 结果写入 _gridMetrics 并设置各子项的 _layoutWidth/_layoutHeight
   * @param {number} width 容器宽
   * @param {number} height 容器高
   */
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

  /**
   * 执行 reflow：根据当前 _containerSize、_layout、_moveX/_moveY 与 _grid，
   * 分支到网格/锁定主轴/锁定交叉轴/自由滚动等计算路径，写出各子项的
   * _layoutWidth/_layoutHeight 与 _containerSize，再递归子项；完成后回调通知。
   */
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

  /**
   * 渲染该 Box 的默认 React 元素（等价于内容层）
   * @returns {JSX.Element} 内容层元素
   */
  react() {
    return this.reactContent();
  }

  /**
   * 渲染内容层（承担实际布局与子项渲染）
   * @returns {JSX.Element} ContentLayer 元素
   */
  reactContent() {
    return <ContentLayer builder={this} />;
  }

  /**
   * 渲染边覆盖层（拖拽分界线，无布局干预，仅绝对定位叠在内容层之上）
   * @returns {JSX.Element} EdgeLayer 元素
   */
  reactEdge() {
    return <EdgeLayer builder={this} />;
  }

  /**
   * 渲染角覆盖层（双轴交点，仅嵌套层渲染）
   * @returns {JSX.Element} CornerLayer 元素
   */
  reactCorner() {
    return <CornerLayer builder={this} />;
  }
}

export default BoxBuilder;
