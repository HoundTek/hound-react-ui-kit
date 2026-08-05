/**
 * @file Box 三层 React 组件实现。ContentLayer 承担布局与子项渲染，
 *        EdgeLayer/CornerLayer 为绝对定位覆盖层，负责拖拽分界线与双轴交点。
 *        模块级维护拖拽会话、滚动同步注册表与动画监听，跨组件共享。
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { reflowScheduler, animateReflow, pickAnimatable } from './scheduler';
import FloatingScrollbar from './floating-scrollbar';
import { useHoveredEdges } from './hovered-edges-context';
import { resolveContainerDrag, getDraggableEdgeId, commitContainerRatios, makeEdgeId } from './drag-resize';

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
  /* 拖拽会话期间光标全局锁定（* + !important 压过子元素自身 cursor） */
  body.box-dragging-x, body.box-dragging-x * { cursor: e-resize !important; }
  body.box-dragging-y, body.box-dragging-y * { cursor: n-resize !important; }
  body.box-dragging-xy, body.box-dragging-xy * { cursor: move !important; }
`;

if (typeof document !== 'undefined' && !document.getElementById('box-drag-styles')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'box-drag-styles';
  styleElement.textContent = styleSheet;
  document.head.appendChild(styleElement);
}

// === 辅助函数（纯计算，无 hook）===
let _animCount = 0;
const _animListeners = new Set();

/**
 * 订阅 reflow 动画状态变化（开始/结束计数变化时触发）
 * @param {() => void} listener 监听回调
 * @returns {() => void} 取消订阅函数
 */
function subscribeToAnimChanges(listener) {
  _animListeners.add(listener);
  return () => _animListeners.delete(listener);
}

/**
 * 通知所有动画状态监听者
 */
function _notifyAnimListeners() {
  _animListeners.forEach(cb => cb());
}

// === 拖拽会话（模块级，Edge / Corner 共用）===
// session.targets: [{ container, dividerIndex, dim, axis, baseSizes }]
// axis 为 'x' 时鼠标横向位移驱动（竖直边，调 Width），为 'y' 时反之
let _dragSession = null;

/**
 * 标记整棵 builder 树需要 reflow（拖拽期间替代 ResizeObserver 的逐轮驱动）
 * @param {BoxBuilder} builder 起始节点
 */
function markNeedsReflow(builder) {
  builder._needsReflow = true;
  builder._children.forEach(markNeedsReflow);
}

/**
 * 把一条边解析为可拖拽目标
 * handle 边直接在所属容器拖拽；start/end 边先向外解析重合的 handle 边
 * 容器主轴非锁定（可滚动或未设置）时不可拖，返回 null
 * @param {BoxBuilder} rootBuilder 根 builder（用于按路径解析重合边）
 * @param {BoxBuilder} box 边所属 box
 * @param {'start'|'end'|'handle'} side 边类型
 * @returns {{container: BoxBuilder, dividerIndex: number, dim: 'Width'|'Height', axis: 'x'|'y', edgeId: string}|null}
 *   可拖拽目标；不可拖拽返回 null
 */
function resolveDragTarget(rootBuilder, box, side) {
  let targetBox = box;
  let edgeId = makeEdgeId(box, side);
  if (side !== 'handle') {
    const resolvedId = getDraggableEdgeId(box, side);
    if (!resolvedId) return null;
    const resolvedPath = resolvedId.slice(0, resolvedId.lastIndexOf(':'));
    const segments = resolvedPath.replace(/^@/, '').split('/').filter(Boolean);
    let node = rootBuilder;
    for (let i = rootBuilder._pathResolved.length; i < segments.length; i++) {
      node = node?._childrenMap.get(segments[i]);
    }
    if (!node) return null;
    targetBox = node;
    edgeId = resolvedId;
  }
  const container = targetBox._parent;
  if (!container) return null;
  const containerHorizontal = container._layout === 'horizontal';
  const dim = containerHorizontal ? 'Width' : 'Height';
  if (container[containerHorizontal ? '_moveX' : '_moveY'] !== false) return null;
  return {
    container,
    dividerIndex: container._children.indexOf(targetBox),
    dim,
    axis: containerHorizontal ? 'x' : 'y',
    edgeId,
  };
}

/**
 * 开启拖拽会话：记录起始快照，注册全局 mousemove/mouseup，
 * 移动时按就近原则重分配尺寸并同步 reflow，结束时提交比例并触发正式 reflow
 * @param {Array} targets resolveDragTarget 返回的目标数组
 * @param {string[]} edgeIds 需高亮的边 id 列表
 * @param {React.MouseEvent} event 触发事件
 * @param {{addHoveredEdges: Function, removeHoveredEdges: Function}} hover 悬停状态操作接口
 */
function startDragSession(targets, edgeIds, event, hover) {
  if (_dragSession || targets.length === 0) return;
  event.preventDefault();
  event.stopPropagation();

  targets.forEach(t => {
    t.baseSizes = t.container._children.map(c => safeNum(c[`_layout${t.dim}`]));
    t.containerSize = safeNum(t.container._containerSize?.[t.dim.toLowerCase()]);
  });
  _dragSession = { targets };
  hover.addHoveredEdges(edgeIds);

  const startX = event.clientX;
  const startY = event.clientY;
  const root = targets[0].container._root;
  const prevUserSelect = document.body.style.userSelect;
  document.body.style.userSelect = 'none';
  // 拖拽期间光标全局锁定：Edge 单轴（x/y），Corner 双轴（xy）
  const cursorMode = targets.every(t => t.axis === targets[0].axis) ? targets[0].axis : 'xy';
  const cursorClass = `box-dragging-${cursorMode}`;
  document.body.classList.add(cursorClass);

  const onMove = (ev) => {
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;
    targets.forEach(t => {
      const delta = t.axis === 'x' ? dx : dy;
      const sizes = resolveContainerDrag(t.container._children, t.dividerIndex, delta, t.dim, t.baseSizes, t.containerSize);
      t.container._children.forEach((c, i) => {
        c[`_layout${t.dim}`] = sizes[i];
      });
      // 记录实际比例，使 reflow 复现当前尺寸并同步子层级
      commitContainerRatios(t.container, t.dim, false);
    });
    // reflow 级联依赖各 builder 自身的 _needsReflow（平时由 ResizeObserver 逐轮置位），
    // 拖拽期间没有这轮驱动，手动标记整棵树后同步执行，保证嵌套子层交叉轴尺寸即时跟随
    markNeedsReflow(root);
    root._performReflow();
    _notifyAnimListeners();
  };

  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    document.body.style.userSelect = prevUserSelect;
    document.body.classList.remove(cursorClass);
    hover.removeHoveredEdges(edgeIds);
    _dragSession = null;
    // 拖拽结束：更新尺寸分配比并触发一次正式 reflow
    targets.forEach(t => commitContainerRatios(t.container, t.dim));
  };

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

/**
 * 把任意值安全转为有限数，非有限数返回 0
 * @param {*} v 输入值
 * @returns {number} 有限数值
 */
const safeNum = (v) => (typeof v === 'number' && !isNaN(v) && isFinite(v)) ? v : 0;

/**
 * 由 builder 计算内容层/覆盖层所需的布局样式与子项定位信息
 * @param {BoxBuilder} builder 当前层 builder
 * @returns {{
 *   style: Object, flexDirection: string, isHorizontal: boolean, isGrid: boolean,
 *   getChildStyle: Function, offsets: number[], positions: Array<Object|null>,
 *   containerClassName: string, innerClassName: string, innerStyle: Object,
 *   computedWidth: string|number, computedHeight: string|number
 * }} 布局相关样式与定位信息
 */
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
  const isGrid = !!builder._grid;

  const getChildStyle = (child) => {
    const s = {
      position: 'relative',
      flex: (builder._moveX === false && isHorizontal) || isGrid ? 'none' : undefined,
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
  // Grid：单元格按 gridMetrics 绝对定位（见 ContentLayer），不用 flex-wrap——
  // 浏览器的换行决策会与 reflow 过渡态（容器尺寸与 gridMetrics 短暂不一致）
  // 叠加产生闪烁。inner 尺寸撑到内容大小，frame 的 overflow:auto 才有滚动区域
  // （rows*cellH ≥ height、cols*cellW ≥ width 由 _performGridLayout 保证，不留空底）
  if (isGrid && builder._gridMetrics) {
    const { cols, rows, cellW, cellH, rowMajor } = builder._gridMetrics;
    innerStyle.width = rowMajor ? '100%' : cols * cellW;
    innerStyle.height = rowMajor ? rows * cellH : '100%';
  }

  // 计算子节点偏移量
  const offsets = builder._children.map(() => 0);
  let cumulative = 0;
  builder._children.forEach((child, i) => {
    offsets[i] = cumulative;
    cumulative += isHorizontal ? safeNum(child._layoutWidth) : safeNum(child._layoutHeight);
  });

  // Grid 子节点的二维位置（供覆盖层递归定位）
  const positions = builder._children.map(() => null);
  if (isGrid && builder._gridMetrics) {
    const { cols, rows, cellW, cellH, rowMajor } = builder._gridMetrics;
    builder._children.forEach((child, i) => {
      positions[i] = rowMajor
        ? { left: (i % cols) * cellW, top: Math.floor(i / cols) * cellH }
        : { left: Math.floor(i / rows) * cellW, top: (i % rows) * cellH };
    });
  }

  return {
    style,
    flexDirection,
    isHorizontal,
    isGrid,
    getChildStyle,
    offsets,
    positions,
    containerClassName,
    innerClassName,
    innerStyle,
    computedWidth,
    computedHeight,
  };
}

// === 滚动同步注册表（模块级，跨组件共享） ===
const _contentRefRegistry = {};

/**
 * 登记内容层容器 ref，供覆盖层（Edge/Corner）双向同步滚动
 * @param {string} path builder 路径
 * @param {React.RefObject} ref 容器 ref
 */
function registerContentRef(path, ref) {
  _contentRefRegistry[path] = ref;
}

/**
 * 注销内容层容器 ref
 * @param {string} path builder 路径
 */
function unregisterContentRef(path) {
  delete _contentRefRegistry[path];
}

/**
 * 取内容层容器 ref
 * @param {string} path builder 路径
 * @returns {React.RefObject|undefined} 容器 ref
 */
function getContentRef(path) {
  return _contentRefRegistry[path];
}

// === 工具函数（无 hook，纯计算）===

/**
 * 由内容层样式派生覆盖层样式：绝对定位、透明背景、不接收指针事件
 * @param {Object} style 内容层样式
 * @returns {Object} 覆盖层样式
 */
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

/**
 * 计算子项在覆盖层中的绝对定位样式。Grid 用二维 position；其余按主轴 offset 一维排列
 * @param {Object} childStyle 子项基础样式（取 width/height）
 * @param {number} offset 主轴累计偏移
 * @param {boolean} isHorizontal 是否水平排列
 * @param {{left: number, top: number}|null} position Grid 二维坐标；非 Grid 时为 null
 * @returns {Object} 绝对定位样式对象
 */
function getChildPositionStyle(childStyle, offset, isHorizontal, position) {
  if (position) {
    return {
      position: 'absolute',
      left: position.left,
      top: position.top,
      width: childStyle.width || 'auto',
      height: childStyle.height || 'auto',
    };
  }
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

    const onStart = () => { _animCount++; _notifyAnimListeners(); };
    const onFinish = () => {
      _animCount--;
      _notifyAnimListeners();
    };


    const el = containerRef.current;
    if (el) {
      const currAnimatable = pickAnimatable(style);
      if (!_dragSession) animateReflow(el, containerPrevStyle.current, currAnimatable, onStart, onFinish);
      containerPrevStyle.current = currAnimatable;
    }
    builder._children.forEach((child, index) => {
      const childEl = childRefs.current[index];
      if (!childEl) return;
      const childStyle = getChildStyle(child);
      const currAnimatable = pickAnimatable(childStyle);
      const prev = childPrevStyles.current.get(index) || {};
      if (!_dragSession) animateReflow(childEl, prev, currAnimatable, onStart, onFinish);
      childPrevStyles.current.set(index, currAnimatable);
    });
  });

  return { containerRef, childRefs, layout };
}

/**
 * useBoxOverlayScroll — EdgeLayer / CornerLayer 共用 hook
 * 双向同步覆盖层与内容层的滚动位置，
 * 并在内容容器尺寸变化时强制重新渲染（保持尺寸同步）
 */
function useBoxOverlayScroll(layerRef, builder) {
  const [, forceUpdate] = useState(0);

  // 双向滚动同步
  useEffect(() => {
    const contentRefObj = getContentRef(builder._path);
    if (!contentRefObj?.current || !layerRef.current) return;
    const contentEl = contentRefObj.current;
    const layerEl = layerRef.current;

    let syncing = false;

    const syncToLayer = () => {
      if (syncing) return;
      syncing = true;
      layerEl.scrollTop = contentEl.scrollTop;
      layerEl.scrollLeft = contentEl.scrollLeft;
      syncing = false;
    };

    const syncToContent = () => {
      if (syncing) return;
      syncing = true;
      contentEl.scrollTop = layerEl.scrollTop;
      contentEl.scrollLeft = layerEl.scrollLeft;
      syncing = false;
    };

    contentEl.addEventListener('scroll', syncToLayer, { passive: true });
    layerEl.addEventListener('scroll', syncToContent, { passive: true });
    syncToLayer();

    return () => {
      contentEl.removeEventListener('scroll', syncToLayer);
      layerEl.removeEventListener('scroll', syncToContent);
    };
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
  // 动画状态变化时强制刷新（隐藏/显示 Edge/Corner）
  useEffect(() => {
    return subscribeToAnimChanges(() => forceUpdate(n => n + 1));
  }, []);
}

// === 公共布局框架组件 ===
/**
 * 三层共用的布局框架。外层 div（容器，绑定 ref 与容器样式）包裹内层 div（inner，
 * 承载子项与布局方向），可选 wrapper 用于相对定位包裹；extra 渲染附加节点（如浮动滚动条）
 * @param {Object} props 组件属性
 * @param {React.RefObject} props.containerRef 容器 ref
 * @param {string} props.containerClassName 容器类名
 * @param {Object} props.containerStyle 容器样式
 * @param {string} props.innerClassName 内层类名
 * @param {Object} props.innerStyle 内层样式
 * @param {Object} [props.wrapperStyle] 外层包裹样式（提供时多套一层 div）
 * @param {React.ReactNode} props.children 子节点
 * @param {React.ReactNode} [props.extra] 附加节点
 * @returns {JSX.Element} 框架元素
 */
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
/**
 * 内容层组件。承担实际布局：监听容器/视口尺寸变化触发 reflow，渲染子项，
 * 并对 reflow 产生的尺寸变化做过渡动画。布局非法时渲染错误占位。
 * @param {Object} props 组件属性
 * @param {BoxBuilder} props.builder 当前层 builder
 * @returns {JSX.Element} 内容层元素
 */
const ContentLayer = ({ builder }) => {
  const { containerRef, childRefs, layout } = useBoxContent(builder);
  const { style, getChildStyle, isHorizontal, isGrid, offsets, positions, containerClassName, innerClassName, innerStyle } = layout;

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
        // Grid 子节点按 gridMetrics 绝对定位（与覆盖层同一定位口径），
        // 不经浏览器 flex 换行；positions 为空（首次渲染）时回退主轴偏移
        const childStyle = isGrid
          ? getChildPositionStyle(getChildStyle(child), offsets[index], isHorizontal, positions[index])
          : getChildStyle(child);
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
/**
 * 边覆盖层组件。绝对定位叠在内容层之上，渲染子项间的拖拽分界线（start/handle/end 边），
 * 按需递归渲染子层的边。无子项或布局未稳定时不渲染。滚动位置与内容层双向同步。
 * @param {Object} props 组件属性
 * @param {BoxBuilder} props.builder 当前层 builder
 * @returns {JSX.Element|null} 边覆盖层元素；无可渲染内容时返回 null
 */
const EdgeLayer = ({ builder }) => {
  const edgeRef = useRef(null);
  const { hoveredEdges, addHoveredEdge, removeHoveredEdge, addHoveredEdges, removeHoveredEdges } = useHoveredEdges();
  const layout = computeBuilderLayout(builder);
  const { style, isHorizontal, isGrid, offsets, positions, getChildStyle, containerClassName, innerClassName, innerStyle } = layout;

  useBoxOverlayScroll(edgeRef, builder);

  // 无子节点或布局未稳定时跳过渲染
  if (builder._children.length === 0 || !builder._layoutValid) return null;

  // _showChildOverlays 为 false 时本层 Edge 完全不渲染（含自身分界线与递归子层）
  if (builder._showChildOverlays === false) return null;

  const EDGE_SIZE = 10;
  const EDGE_COLOR = 'rgba(255, 100, 50, 0.7)';

  // 鼠标按下：解析可拖拽目标并开启拖拽会话（不可拖则无操作）
  const handleEdgeMouseDown = (box, side, edgeId, e) => {
    if (e.button !== 0) return;
    const target = resolveDragTarget(builder._root, box, side);
    if (!target) return;
    const ids = target.edgeId === edgeId ? [edgeId] : [edgeId, target.edgeId];
    startDragSession([target], ids, e, { addHoveredEdges, removeHoveredEdges });
  };

  /**
   * 渲染一条 start/end 边的拖拽手柄
   * @param {BoxBuilder} box 边所属 box
   * @param {'start'|'end'} side 边类型
   * @param {boolean} isStart 是否为起始边
   * @param {number} offset 主轴偏移
   * @returns {JSX.Element} 边手柄元素
   */
  const renderEdge = (box, side, isStart, offset) => {
    const edgeId = makeEdgeId(box, side);
    const isHovered = hoveredEdges.has(edgeId);
    const depth = box._pathResolved.length;
    const s = {
      position: 'absolute',
      pointerEvents: 'auto',
      // 须高于 FloatingScrollbar 的 zIndex 1000：滚动条显示时（hover/滚动中）
      // 其条带与 box 右/下边缘重合，zIndex 低于它会吞掉边的按下事件
      zIndex: 1100 - depth,
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
        onMouseEnter={() => { if (!_dragSession) addHoveredEdge(edgeId); }}
        onMouseLeave={() => { if (!_dragSession) removeHoveredEdge(edgeId); }}
        onMouseDown={(e) => handleEdgeMouseDown(box, side, edgeId, e)}
      />
    );
  };

  /**
   * 渲染相邻子项之间的 handle 拖拽手柄
   * @param {BoxBuilder} box 左侧/上侧的 box
   * @param {number} offset 主轴偏移
   * @returns {JSX.Element} handle 手柄元素
   */
  const renderHandle = (box, offset) => {
    const edgeId = makeEdgeId(box, 'handle');
    const isHovered = hoveredEdges.has(edgeId);
    const depth = box._pathResolved.length;
    const dirClass = isHorizontal ? 'drag-handle-horizontal' : 'drag-handle-vertical';
    const s = {
      position: 'absolute',
      pointerEvents: 'auto',
      // 同 renderEdge：高于 FloatingScrollbar 的 1000，不被滚动条吞事件
      zIndex: 1100 - depth,
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
        onMouseEnter={() => { if (!_dragSession) addHoveredEdge(edgeId); }}
        onMouseLeave={() => { if (!_dragSession) removeHoveredEdge(edgeId); }}
        onMouseDown={(e) => handleEdgeMouseDown(box, 'handle', edgeId, e)}
      />
    );
  };

  const childrenCount = builder._children.length;

  // 禁用拖拽：两相邻 box 均禁用则中间不产生 Edge；一级的 box 均禁用则两端也不产生 Edge
  const allDisabled = builder._children.every(c => c._draggable === false);
  const pairDisabled = (index) =>
    builder._children[index]._draggable === false && builder._children[index + 1]?._draggable === false;

  // Grid 单元格等尺寸，自身不产生 Edge，但仍需递归渲染子层的 Edge
  const edgeHandles = isGrid ? [] : builder._children.flatMap((child, index) => {
    const isFirst = index === 0;
    const isLast = index === childrenCount - 1;
    const items = [];
    if (isFirst && !allDisabled) items.push(renderEdge(child, 'start', true, offsets[index]));
    if (!isLast && !pairDisabled(index)) items.push(renderHandle(child, offsets[index]));
    if (isLast && !allDisabled) items.push(renderEdge(child, 'end', false, offsets[index]));
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
      {/* 递归：子节点的 EdgeLayer 定位到对应偏移处（Grid 为二维坐标） */}
      {/* _showChildOverlays 为 false 时不递归渲染子层 Edge，隐藏下一级拖拽手柄 */}
      {builder._showChildOverlays && builder._children.map((child, index) => {
        const childStyle = getChildStyle(child);
        const posStyle = getChildPositionStyle(childStyle, offsets[index], isHorizontal, positions[index]);
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
/**
 * 角覆盖层组件。渲染主轴边与交叉轴边相交的角点，按下时同时解析两条相交边为
 * 可拖拽目标，实现双轴同步调整。根 viewport 与 Grid 层不产生角点，但仍递归子层。
 * @param {Object} props 组件属性
 * @param {BoxBuilder} props.builder 当前层 builder
 * @returns {JSX.Element|null} 角覆盖层元素；无可渲染内容时返回 null
 */
const CornerLayer = ({ builder }) => {
  const cornerRef = useRef(null);
  const { hoveredEdges, addHoveredEdges, removeHoveredEdges } = useHoveredEdges();
  const layout = computeBuilderLayout(builder);
  const { style, isHorizontal, isGrid, offsets, positions, getChildStyle, containerClassName, innerClassName, innerStyle } = layout;

  useBoxOverlayScroll(cornerRef, builder);

  // 无子节点或布局未稳定时跳过渲染
  if (builder._children.length === 0 || !builder._layoutValid) return null;

  // _showChildOverlays 为 false 时本层 Corner 完全不渲染（含自身角点与递归子层）
  if (builder._showChildOverlays === false) return null;

  const CORNER_SIZE = 12;
  const CORNER_COLOR = 'rgba(255, 50, 100, 0.8)';

  // 返回 [{ id, box, side }]，悬停用 id，拖拽用 box/side 解析目标
  /**
   * 收集角点关联的边：当前层主轴边 + 沿交叉轴向外解析到的重合边
   * @param {BoxBuilder} box 主轴边所属 box
   * @param {'start'|'end'|'handle'} side 主轴边类型
   * @param {'top'|'bottom'|'left'|'right'} crossSide 交叉轴方向
   * @returns {Array<{id: string, box: BoxBuilder, side: string}>} 关联边列表
   */
  const getCornerEdges = (box, side, crossSide) => {
    const edges = [{ id: makeEdgeId(box, side), box, side }];

    const isStartSide = (isHorizontal && crossSide === 'top') || (!isHorizontal && crossSide === 'left');
    // 只有交叉轴上的滚动会让 Corner 与外层 Edge 错位（当前层 horizontal 时交叉轴为竖直方向）
    const crossScrollKey = isHorizontal ? '_moveY' : '_moveX';

    // 该层内容在主轴（方向不同的层，其主轴即 Corner 的交叉轴）上是否填满到 box 末端
    const isFilledToEnd = (container) => {
      const dimKey = isHorizontal ? 'height' : 'width';
      const layoutKey = isHorizontal ? '_layoutHeight' : '_layoutWidth';
      const boxSize = safeNum(container._containerSize?.[dimKey]);
      const contentSize = container._children.reduce((sum, c) => sum + safeNum(c[layoutKey]), 0);
      return Math.abs(contentSize - boxSize) <= Math.max(1, container._children.length);
    };

    // 从当前层开始逐层往外跳，停止时最后的候选 Edge 入选
    let candidate = null;
    let childLevel = box;
    let containerLevel = childLevel?._parent;

    while (containerLevel) {
      const childIndex = containerLevel._children.indexOf(childLevel);
      const isFirst = childIndex === 0;
      const isLast = childIndex === containerLevel._children.length - 1;
      // 排列方向是否与当前级相同（无 _layout 视为 vertical，与各层渲染口径一致）
      const sameDir = (containerLevel._layout === 'horizontal') === isHorizontal;

      if (!sameDir) {
        // 方向不同：childLevel 在交叉方向上的边界处必有一条垂直 Edge
        const atBoundary = isStartSide ? isFirst : isLast;
        if (atBoundary) {
          // Corner 同时落在这一层自己的边缘上：成为候选
          candidate = { box: childLevel, side: isStartSide ? 'start' : 'end' };
          // 朝 end 侧时若内容未填满到 box 末端，Corner 撞不到这一层的边边，停止
          if (!isStartSide && !isFilledToEnd(containerLevel)) break;
        } else {
          // 不在边缘：handle Edge 入选，停止
          candidate = isStartSide
            ? { box: containerLevel._children[childIndex - 1], side: 'handle' }
            : { box: childLevel, side: 'handle' };
          break;
        }
      }

      // 这一层在交叉轴上滚动开启时，Corner 与外层 Edge 不再重合，停止
      if (containerLevel[crossScrollKey] === true) break;
      // 往外跳一层
      childLevel = containerLevel;
      containerLevel = containerLevel._parent;
    }

    if (candidate) edges.push({ id: makeEdgeId(candidate.box, candidate.side), ...candidate });
    return edges;
  };

  /**
   * 取角点关联边的 id 列表
   * @param {BoxBuilder} box 主轴边所属 box
   * @param {'start'|'end'|'handle'} side 主轴边类型
   * @param {'top'|'bottom'|'left'|'right'} crossSide 交叉轴方向
   * @returns {string[]} 关联边 id 列表
   */
  const getCornerEdgeIds = (box, side, crossSide) => getCornerEdges(box, side, crossSide).map(e => e.id);

  // 鼠标按下：Corner 的两条相交边各自解析为可拖拽目标，双轴同时调整
  /**
   * 角点按下处理：两条相交边各自解析为可拖拽目标，合并高亮 id 后开启拖拽会话
   * @param {BoxBuilder} box 主轴边所属 box
   * @param {'start'|'end'|'handle'} side 主轴边类型
   * @param {'top'|'bottom'|'left'|'right'} crossSide 交叉轴方向
   * @param {string[]} edgeIds 关联边 id 列表
   * @param {React.MouseEvent} e 触发事件
   */
  const handleCornerMouseDown = (box, side, crossSide, edgeIds, e) => {
    if (e.button !== 0) return;
    const targets = [];
    const highlightIds = [];
    getCornerEdges(box, side, crossSide).forEach(({ box: edgeBox, side: edgeSide }) => {
      const target = resolveDragTarget(builder._root, edgeBox, edgeSide);
      if (target) {
        targets.push(target);
        if (!highlightIds.includes(target.edgeId)) highlightIds.push(target.edgeId);
      }
    });
    if (targets.length === 0) return;
    edgeIds.forEach(id => {
      if (!highlightIds.includes(id)) highlightIds.push(id);
    });
    startDragSession(targets, highlightIds, e, { addHoveredEdges, removeHoveredEdges });
  };

  /**
   * 渲染一个角点手柄
   * @param {BoxBuilder} box 主轴边所属 box
   * @param {'start'|'end'|'handle'} side 主轴边类型
   * @param {'top'|'bottom'|'left'|'right'} crossSide 交叉轴方向
   * @param {number} offset 主轴偏移
   * @returns {JSX.Element} 角点手柄元素
   */
  const renderCorner = (box, side, crossSide, offset) => {
    const edgeIds = getCornerEdgeIds(box, side, crossSide);
    const isHovered = edgeIds.some(e => hoveredEdges.has(e));
    const depth = box._pathResolved.length;
    const isHandle = side === 'handle';
    const s = {
      position: 'absolute',
      pointerEvents: 'auto',
      // 同 Edge：高于 FloatingScrollbar 的 1000，不被滚动条吞事件
      zIndex: 1200 - depth,
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
        onMouseEnter={() => { if (!_dragSession) addHoveredEdges(edgeIds); }}
        onMouseLeave={() => { if (!_dragSession) removeHoveredEdges(edgeIds); }}
        onMouseDown={(e) => handleCornerMouseDown(box, side, crossSide, edgeIds, e)}
      />
    );
  };

  const childrenCount = builder._children.length;

  // 禁用拖拽：两相邻 box 均禁用则中间不产生 Corner；一级的 box 均禁用则两端也不产生 Corner
  const allDisabled = builder._children.every(c => c._draggable === false);
  const pairDisabled = (index) =>
    builder._children[index]._draggable === false && builder._children[index + 1]?._draggable === false;

  // 根 box（viewport）的子 box 的 Edge 两端无 Corner，Grid 单元格等尺寸不产生 Corner，
  // 但仍需递归渲染子层的 Corner
  const cornerHandles = (builder._isViewport || isGrid) ? [] : builder._children.flatMap((child, index) => {
    const isFirst = index === 0;
    const isLast = index === childrenCount - 1;
    const corners = [];
    if (isHorizontal) {
      if (isFirst && !allDisabled) {
        corners.push(renderCorner(child, 'start', 'top', offsets[index]));
        corners.push(renderCorner(child, 'start', 'bottom', offsets[index]));
      }
      if (!isLast && !pairDisabled(index)) {
        corners.push(renderCorner(child, 'handle', 'top', offsets[index]));
        corners.push(renderCorner(child, 'handle', 'bottom', offsets[index]));
      }
      if (isLast && !allDisabled) {
        corners.push(renderCorner(child, 'end', 'top', offsets[index]));
        corners.push(renderCorner(child, 'end', 'bottom', offsets[index]));
      }
    } else {
      if (isFirst && !allDisabled) {
        corners.push(renderCorner(child, 'start', 'left', offsets[index]));
        corners.push(renderCorner(child, 'start', 'right', offsets[index]));
      }
      if (!isLast && !pairDisabled(index)) {
        corners.push(renderCorner(child, 'handle', 'left', offsets[index]));
        corners.push(renderCorner(child, 'handle', 'right', offsets[index]));
      }
      if (isLast && !allDisabled) {
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
      {/* 递归：子节点的 CornerLayer 定位到对应偏移处（Grid 为二维坐标） */}
      {/* _showChildOverlays 为 false 时不递归渲染子层 Corner，隐藏下一级拖拽手柄 */}
      {builder._showChildOverlays && builder._children.map((child, index) => {
        const childStyle = getChildStyle(child);
        const posStyle = getChildPositionStyle(childStyle, offsets[index], isHorizontal, positions[index]);
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
