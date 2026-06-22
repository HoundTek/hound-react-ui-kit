import React from 'react';

class BoxBuilder {
  constructor(path) {
    this._path = path;
    this._pathResolved = path.split('/');
    this._children = [];
    this._moveX = undefined;
    this._moveY = undefined;
    this._isInvalid = false;
    
    // 设置默认值：null 表示未设置，0 表示显式设置为 0
    this._minWidth = 0;
    this._maxWidth = Infinity;
    this._minHeight = 0;
    this._maxHeight = Infinity;
    this._defaultWidth = null;
    this._defaultHeight = null;
    
    // 显式声明标记
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

  children(childrenBox) {
    this._children = childrenBox;
    return this;
  }

  layout(direction) {
    this._layout = direction;
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

    // 分离固定项和非固定项
    const fixedSizes = [];
    const b = []; // 目标值
    const mins = []; // 最小值约束
    const maxs = []; // 最大值约束

    let fixedTotal = 0;
    let knownDefaultTotal = 0; // 显式声明的default值总和
    let unknownDefaultCount = 0; // 未声明default且没有min/max中值的数量

    // 第一次遍历：计算固定项、已知default总和和未知default数量
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

    // 情况1: 固定项总和已超过容器 → 错误
    if (fixedTotal > containerSize) {
      return { sizes: [], isValid: false, error: true };
    }

    const remainingSpace = containerSize - fixedTotal;
    const nonFixedCount = count - fixedSizes.filter(s => s !== null).length;

    // 情况2: 只有固定项 → 直接返回
    if (nonFixedCount === 0) {
      return { sizes: fixedSizes, isValid: true };
    }

    // 计算未声明default的项的默认值
    // 剩余空间 - 已知default总和 - 有min/max中值的项的中值总和
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

    // 计算可用于未知default项的空间
    const availableForUnknown = Math.max(0, remainingSpace - knownDefaultTotal - midValueTotal);
    const unknownDefaultValue = unknownDefaultCount > 0 ? availableForUnknown / unknownDefaultCount : 0;

    // 第二次遍历：计算每个非固定项的目标值
    let nonFixedIdx = 0;
    children.forEach(child => {
      if (!this._isFixed(child, dimension)) {
        const childMin = mins[nonFixedIdx];
        const childMax = maxs[nonFixedIdx];
        const hasDefault = this._hasDefault(child, dimension);
        const hasMinMax = this._hasExplicitMinMax(child, dimension);
        
        let targetValue;
        
        if (hasDefault) {
          // 显式声明了default
          targetValue = child[def];
        } else if (hasMinMax) {
          // 同时有min和max，取中值
          targetValue = (childMin + childMax) / 2;
        } else {
          // 使用剩余空间的平均值
          targetValue = unknownDefaultValue;
        }
        
        // 确保目标值在约束范围内
        targetValue = Math.max(childMin, Math.min(childMax, targetValue));
        b.push(targetValue);
        
        nonFixedIdx++;
      }
    });

    // 使用拉格朗日乘子法求解带约束的最小二乘问题
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

    // 合并固定项和非固定项
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
  }

  react() {
    this._isInvalid = false;

    let width = 'auto';
    let height = 'auto';
    let maxWidth = 'none';
    let maxHeight = 'none';
    let minWidth = 'none';
    let minHeight = 'none';
    let flexDirection = 'none';

    if (this._maxWidth !== undefined) {
      maxWidth = `${this._maxWidth}px`;
    }
    if (this._minWidth !== undefined) {
      minWidth = `${this._minWidth}px`;
    }
    if (this._defaultWidth !== null) {
      width = `${this._defaultWidth}px`;
    }

    if (this._maxHeight !== undefined) {
      maxHeight = `${this._maxHeight}px`;
    }
    if (this._minHeight !== undefined) {
      minHeight = `${this._minHeight}px`;
    }
    if (this._defaultHeight !== null) {
      height = `${this._defaultHeight}px`;
    }

    if (this._layout === 'horizontal') {
      flexDirection = 'row';
    } else if (this._layout === 'vertical') {
      flexDirection = 'column';
    }

    const isLockedX = this._moveX === false;
    const isLockedY = this._moveY === false;

    if (isLockedX && this._children.length > 0) {
      // 容器宽度：优先使用布局宽度，其次是父容器传递的宽度，最后使用视口宽度
      const containerWidth = this._isViewport ? window.innerWidth : 
                            (this._layoutWidth !== undefined ? this._layoutWidth : 
                             window.innerWidth);
      const result = this._calculateLayout(containerWidth, 'Width');
      if (!result.isValid) {
        this._isInvalid = true;
      } else {
        // 获取父容器传递的高度（用于水平布局的子元素）
        const parentHeight = this._layoutHeight !== undefined ? this._layoutHeight : 
                            (this._isViewport ? window.innerHeight : undefined);
        this._children.forEach((child, i) => {
          this._applyLayout(child, result.sizes[i], parentHeight);
        });
      }
    }

    if (isLockedY && this._children.length > 0) {
      // 容器高度：优先使用布局高度，其次是父容器传递的高度，最后使用视口高度
      const containerHeight = this._isViewport ? window.innerHeight : 
                             (this._layoutHeight !== undefined ? this._layoutHeight : 
                              window.innerHeight);
      const result = this._calculateLayout(containerHeight, 'Height');
      if (!result.isValid) {
        this._isInvalid = true;
      } else {
        // 获取父容器传递的宽度（用于垂直布局的子元素）
        const parentWidth = this._layoutWidth !== undefined ? this._layoutWidth : 
                           (this._isViewport ? window.innerWidth : undefined);
        this._children.forEach((child, i) => {
          this._applyLayout(child, parentWidth, result.sizes[i]);
        });
      }
    }

    let computedWidth = width;
    let computedHeight = height;

    if (this._isViewport) {
      computedWidth = '100vw';
      computedHeight = '100vh';
    } else {
      // 非视口容器，使用100%宽度和高度填充父容器
      if (computedWidth === 'auto') {
        computedWidth = '100%';
      }
      if (computedHeight === 'auto') {
        computedHeight = '100%';
      }
    }
    if (this._layoutWidth !== undefined) {
      computedWidth = `${this._layoutWidth}px`;
    }
    if (this._layoutHeight !== undefined) {
      computedHeight = `${this._layoutHeight}px`;
    }

    const style = {
      display: 'flex',
      flexDirection,
      backgroundColor: this._backgroundColor,
      width: computedWidth,
      height: computedHeight,
      maxWidth,
      maxHeight,
      minWidth,
      minHeight,
      alignSelf: 'stretch',
    };

    if (this._isViewport) {
      style.alignItems = 'stretch';
    } else if (this._layout === 'horizontal') {
      // 水平布局时，子元素高度应拉伸填充
      style.alignItems = 'stretch';
    } else if (this._layoutHeight !== undefined) {
      style.alignItems = 'flex-start';
    } else if (this._alignItems !== undefined) {
      style.alignItems = this._alignItems;
    }

    if (this._layoutHeight !== undefined) {
      style.height = `${this._layoutHeight}px`;
    }
    if (this._layoutWidth !== undefined) {
      style.width = `${this._layoutWidth}px`;
    }

    if (this._isInvalid) {
      style.backgroundColor = 'red';
    }

    Object.keys(style).forEach(key => {
      if (style[key] === undefined) {
        delete style[key];
      }
    });

    let content;
    if (this._isInvalid) {
      content = '错误';
    } else {
      content = this._children.map((child, index) => (
        <div key={this._pathResolved.join('-') + '-' + index}>
          {child.react()}
        </div>
      ));
    }

    return (
      <div className={this._pathResolved.join('-')} style={style}>
        <div className={"inner-" + this._pathResolved.join('-')} style={{
          width: "100%",
          height: "100%",
          display: 'flex',
          flexDirection,
        }}>
          {content}
        </div>
      </div>
    );
  }
}

export default BoxBuilder;
