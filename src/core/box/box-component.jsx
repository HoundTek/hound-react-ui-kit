/**
 * @file Box 三层 React 组件实现。ContentLayer 承担布局与子项渲染，
 *        EdgeLayer/CornerLayer 为绝对定位覆盖层，负责拖拽分界线与双轴交点。
 *        拖拽会话、浮动窗口树与滚动同步注册表等可变状态全部归属
 *        KitRuntime 实例（见 src/core/runtime.js），经 `builder._runtime`
 *        / `FloatingLayer` 的 runtime prop 访问，不再有模块级全局单例。
 *        尺寸变化的过渡呈现由主题特效系统（resize-effects）统一负责，
 *        本文件不再包含独立的 reflow 过渡动画。
 */
import React, { useState, useEffect, useRef, useCallback, useLayoutEffect, useContext } from 'react';
import { getDefaultRuntime } from '../runtime';
import FloatingScrollbar from './floating-scrollbar';
import { attachScrollDamping, routeWheel } from './scroll-damping';
import { useHoveredEdges } from './hovered-edges-context';
import { resolveContainerDrag, getDraggableEdgeId, commitContainerRatios, makeEdgeId } from './drag-resize';
import { ResizeEffectViewport } from '../theme/resize-effects';
import { useTheme } from '../theme/theme-react';
import { resolveBoxShape, resolveBoxPaint, cornerStyle, hexToRgba, elevationStyle } from '../theme/shape';

const styleSheet = `
  .drag-handle {
    /* 拖拽手柄默认透明：悬停/拖拽时由覆盖层按主题色上指示色（见 EdgeLayer/CornerLayer） */
    background: transparent;
    transition: background-color 0.15s ease;
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
  }
  /* 拖拽会话期间光标全局锁定（* + !important 压过子元素自身 cursor） */
  body.box-dragging-x, body.box-dragging-x * { cursor: e-resize !important; }
  body.box-dragging-y, body.box-dragging-y * { cursor: n-resize !important; }
  body.box-dragging-xy, body.box-dragging-xy * { cursor: move !important; }
  /* 浮动视口缩放会话光标：水平/垂直/对角，与移动的四向十字区分 */
  body.box-resizing-ew, body.box-resizing-ew * { cursor: ew-resize !important; }
  body.box-resizing-ns, body.box-resizing-ns * { cursor: ns-resize !important; }
  body.box-resizing-nwse, body.box-resizing-nwse * { cursor: nwse-resize !important; }
  body.box-resizing-nesw, body.box-resizing-nesw * { cursor: nesw-resize !important; }
  /* 浮动窗口入场动效（打开时淡入 + 轻微缩放）；窗口框架随焦点切换过渡。
     仅动 opacity/transform/box-shadow，不触碰尺寸与布局属性，避免干扰 reflow */
  @keyframes hk-floating-in {
    from { opacity: 0; transform: scale(.96); }
    to { opacity: 1; transform: scale(1); }
  }
  .floating-shell { animation: hk-floating-in .16s ease-out; }
  .floating-window { transition: box-shadow .18s ease, border-color .18s ease; }
  @media (prefers-reduced-motion: reduce) {
    .floating-shell { animation: none; }
    .floating-window { transition: none; }
  }
`;

if (typeof document !== 'undefined' && !document.getElementById('box-drag-styles')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'box-drag-styles';
  styleElement.textContent = styleSheet;
  document.head.appendChild(styleElement);
}

// === 辅助函数（纯计算，无 hook）===

// === 拖拽会话（runtime 级，Edge / Corner 共用）===
// session.targets: [{ container, dividerIndex, dim, axis, baseSizes }]
// axis 为 'x' 时鼠标横向位移驱动（竖直边，调 Width），为 'y' 时反之
// 会话槽存于 runtime.dragSession（null = 空闲），同一 runtime 内全局互斥

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
  const runtime = targets[0]?.container.runtime;
  if (!runtime || runtime.dragSession || targets.length === 0) return;
  event.preventDefault();
  event.stopPropagation();

  targets.forEach(t => {
    t.baseSizes = t.container._children.map(c => safeNum(c[`_layout${t.dim}`]));
    t.containerSize = safeNum(t.container._containerSize?.[t.dim.toLowerCase()]);
  });
  runtime.dragSession = { targets };
  hover.addHoveredEdges(edgeIds);

  const startX = event.clientX;
  const startY = event.clientY;
  const root = targets[0].container._root;
  // 拖拽期间光标全局锁定：Edge 单轴（x/y），Corner 双轴（xy）
  const cursorMode = targets.every(t => t.axis === targets[0].axis) ? targets[0].axis : 'xy';
  const unlockBody = lockBodyForDrag(`box-dragging-${cursorMode}`);

  const onMove = (ev) => {
    // 阻止原生拖选手势：Firefox/Safari 按住拖动时会强制光标回落为箭头
    //（Chrome 无此行为），需逐事件 preventDefault（见 lockBodyForDrag 注释）
    ev.preventDefault();
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
  };

  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    unlockBody();
    hover.removeHoveredEdges(edgeIds);
    runtime.dragSession = null;
    // 拖拽结束：更新尺寸分配比并触发一次正式 reflow
    targets.forEach(t => commitContainerRatios(t.container, t.dim));
  };

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

/**
 * 分界线实际可移动检查：目标容器主轴锁定（resolveDragTarget 已保证）之外，
 * 分界线两侧都须存在可伸缩子项（min !== max 且未禁用拖拽）；任一侧全部冻结
 * 时分界线位置不变（拖拽视觉无响应），覆盖层据此不渲染手柄
 * @param {{container: BoxBuilder, dividerIndex: number, dim: 'Width'|'Height'}} target 拖拽目标
 * @returns {boolean} 分界线是否可移动
 */
function isDividerMovable(target) {
  const children = target.container._children;
  const dimKey = target.dim;
  const flexible = children.map(c =>
    c._draggable !== false && c[`_min${dimKey}`] !== c[`_max${dimKey}`]);
  return flexible.slice(0, target.dividerIndex + 1).some(Boolean)
    && flexible.slice(target.dividerIndex + 1).some(Boolean);
}

/**
 * 把一条边解析为可拖拽且可移动的拖拽目标；不可拖拽或分界线无移动空间时返回 null
 * @param {BoxBuilder} rootBuilder 根 builder
 * @param {BoxBuilder} box 边所属 box
 * @param {'start'|'end'|'handle'} side 边类型
 * @returns {Object|null} 可拖拽目标（见 resolveDragTarget）
 */
function resolveMovableDragTarget(rootBuilder, box, side) {
  const target = resolveDragTarget(rootBuilder, box, side);
  return target && isDividerMovable(target) ? target : null;
}

/**
 * 把任意值安全转为有限数，非有限数返回 0
 * @param {*} v 输入值
 * @returns {number} 有限数值
 */
const safeNum = (v) => (typeof v === 'number' && !isNaN(v) && isFinite(v)) ? v : 0;

/**
 * 解析覆盖层显示开关的就近继承值：从本 box 沿父链上溯，取第一个显式设置
 *（true/false）的值；全链未设置时默认 false（Edge 覆盖层默认隐藏，
 * 需经 showEdges 显式开启；Corner 跟随 Edge 的显示开关，见 CornerLayer）。
 * @param {BoxBuilder} builder 当前层 builder
 * @param {'_showEdges'} key 开关字段名
 * @returns {boolean} 生效的显示开关
 */
function resolveOverlayVisible(builder, key) {
  let node = builder;
  while (node) {
    if (node[key] !== undefined) return node[key];
    node = node._parent;
  }
  return false;
}

/**
 * 子树显式开启检查：子树（含自身）是否存在显式开启（=== true）的节点。
 * 覆盖层继承值为隐藏时据此决定是否仍需递归渲染子层——子树深处的显式开启
 * 节点需要经递归到达。布局树规模为 UI 组件级（数十节点），DFS 开销可忽略。
 * @param {BoxBuilder} builder 子树根
 * @param {'_showEdges'} key 开关字段名
 * @returns {boolean} 子树内是否存在显式开启
 */
function subtreeOverlayEnabled(builder, key) {
  if (builder[key] === true) return true;
  return builder._children.some(c => subtreeOverlayEnabled(c, key));
}

// 光标锁定类 → 内联 cursor 值映射（与 styleSheet 中的类规则保持一致）
const CURSOR_BY_CLASS = {
  'box-dragging-x': 'e-resize',
  'box-dragging-y': 'n-resize',
  'box-dragging-xy': 'move',
  'box-resizing-ew': 'ew-resize',
  'box-resizing-ns': 'ns-resize',
  'box-resizing-nwse': 'nwse-resize',
  'box-resizing-nesw': 'nesw-resize',
};

/**
 * 拖拽会话的 body 级锁定：禁止文本选择（含 -webkit- 前缀兼容旧 Safari）、加
 * 光标锁定类、把 cursor 内联写到 <html> 与 <body>，并插入全屏光标护盾
 *（position:fixed 透明层），返回恢复函数。
 * 多层兜底的原因：Firefox/Safari 在按住拖动时会启动原生拖选/选中手势并把
 * 光标强制回落为箭头（mousemove 已逐事件 preventDefault，仍可能被引擎级
 * 行为覆盖，WebKit bug 53341）。护盾是鼠标下的事件目标，光标直接从护盾元素
 * 解析，任何引擎级回落都无法再覆盖；selectstart/dragstart 一并阻断，
 * 掐灭原生手势的启动源头。护盾期间 document 级 mousemove/mouseup 照常冒泡，
 * 拖拽逻辑不受影响。
 * @param {string} cursorClass 光标锁定类（box-dragging-* / box-resizing-*）
 * @returns {() => void} 恢复函数
 */
function lockBodyForDrag(cursorClass) {
  const cursor = CURSOR_BY_CLASS[cursorClass];
  const prevUserSelect = document.body.style.userSelect;
  const prevWebkitUserSelect = document.body.style.webkitUserSelect;
  const prevBodyCursor = document.body.style.cursor;
  const prevHtmlCursor = document.documentElement.style.cursor;
  document.body.style.userSelect = 'none';
  document.body.style.webkitUserSelect = 'none';
  document.body.classList.add(cursorClass);
  // 全屏光标护盾：拖拽期间鼠标始终悬于护盾上，光标由护盾的 cursor 样式决定
  let shield = null;
  if (cursor) {
    document.body.style.cursor = cursor;
    document.documentElement.style.cursor = cursor;
    shield = document.createElement('div');
    shield.style.cssText = `position:fixed;inset:0;z-index:99999;cursor:${cursor};background:transparent;`;
    document.body.appendChild(shield);
  }
  // 阻断原生选中/拖拽手势的启动（Safari/Firefox 按住拖动的光标回落源头）
  const blockNativeGesture = (e) => e.preventDefault();
  document.addEventListener('selectstart', blockNativeGesture);
  document.addEventListener('dragstart', blockNativeGesture);
  return () => {
    document.body.style.userSelect = prevUserSelect;
    document.body.style.webkitUserSelect = prevWebkitUserSelect;
    document.body.style.cursor = prevBodyCursor;
    document.documentElement.style.cursor = prevHtmlCursor;
    document.body.classList.remove(cursorClass);
    document.removeEventListener('selectstart', blockNativeGesture);
    document.removeEventListener('dragstart', blockNativeGesture);
    if (shield) shield.remove();
  };
}

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
  let minWidth = '0';
  let minHeight = '0';
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
    // 尺寸变化特效（freezeZoom）投影期间锁定视口布局尺寸：三层以冻结尺寸布局，
    // 由特效层 transform 缩放实时贴合当前窗口（GPU 合成，不触发 reflow），
    // reflow 追赶完成、特效交接后恢复 100vw/100vh 原生实时
    if (builder._frozenViewportSize) {
      computedWidth = `${builder._frozenViewportSize.width}px`;
      computedHeight = `${builder._frozenViewportSize.height}px`;
    } else {
      computedWidth = '100vw';
      computedHeight = '100vh';
    }
  } else if (builder._isFloatingViewport) {
    // 浮动视口：缩放后以显式尺寸为准并解除 CSS 固定约束（min/max 由拖拽逻辑在 JS 层应用）；
    // 未缩放时保持 fixed/default 显式值或 auto（内容撑开）。
    // freezeZoom 投影期（_frozenViewportSize 已设置）优先以冻结尺寸布局，视觉由
    // 特效层 transform 缩放实时贴合当前尺寸，避免与 _viewWidth 变化叠加双重缩放
    if (builder._frozenViewportSize) {
      computedWidth = `${builder._frozenViewportSize.width}px`;
      computedHeight = `${builder._frozenViewportSize.height}px`;
      maxWidth = 'none';
      // min-* 不支持 none（CSS 无效值），用 0 表示不设下限
      minWidth = '0';
      maxHeight = 'none';
      minHeight = '0';
    } else {
      if (builder._viewWidth != null) {
        computedWidth = `${builder._viewWidth}px`;
        maxWidth = 'none';
        // min-* 不支持 none（CSS 无效值），用 0 表示不设下限
        minWidth = '0';
      }
      if (builder._viewHeight != null) {
        computedHeight = `${builder._viewHeight}px`;
        maxHeight = 'none';
        minHeight = '0';
      }
    }
  } else {
    if (computedWidth === 'auto') computedWidth = '100%';
    if (computedHeight === 'auto') computedHeight = '100%';
  }
  if (!builder._isViewport && !builder._isFloatingViewport && builder._layoutWidth !== undefined) computedWidth = `${builder._layoutWidth}px`;
  if (!builder._isViewport && !builder._isFloatingViewport && builder._layoutHeight !== undefined) computedHeight = `${builder._layoutHeight}px`;

  const style = {
    display: 'flex',
    flexDirection,
    // 描边材质（material('outlined')）会给本层加 1px border；统一 border-box，
    // 让描边从尺寸内侧让位，不把内容挤出或撑大盒体（三层尺寸口径保持一致）
    boxSizing: 'border-box',
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
  // 内边距与子项间距（见 BoxBuilder#padding/#gap）：reflow 分配尺寸时已扣除，
  // 内容层经子项 margin 落位（in-flow margin 在 flex 中各引擎行为一致，且计入
  // 可滚动溢出区域），覆盖层经下方 offsets 绝对定位对齐，三层口径一致
  const pad = builder._padding || 0;
  const gap = builder._gap || 0;

  const getChildStyle = (child, index) => {
    // 尺寸一律由 reflow 精确分配，子项永远不许 flex 收缩：任何主轴/交叉轴
    // 收缩都会让 content 层子项小于 edge/corner 覆盖层（绝对定位，保持显式
    // 尺寸）而产生两层错位，同时把组件内容压扁。溢出应交给容器的滚动，
    // 而不是让子项变小。
    const s = {
      position: 'relative',
      flex: (builder._moveX === false && isHorizontal) || isGrid ? 'none' : undefined,
      flexShrink: 0,
      width: child._layoutWidth ? `${child._layoutWidth}px` : undefined,
      height: child._layoutHeight ? `${child._layoutHeight}px` : undefined,
    };
    if (!isGrid && (pad || gap)) {
      const last = index === builder._children.length - 1;
      // margin 顺序：上 右 下 左。首项靠前侧 pad、后续项靠前侧 gap，末项补后侧 pad
      s.margin = isHorizontal
        ? `${pad}px ${last ? pad : 0}px ${pad}px ${index === 0 ? pad : gap}px`
        : `${index === 0 ? pad : gap}px ${pad}px ${last ? pad : 0}px ${pad}px`;
    }
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
  // 浮动视口缩放期内容锚定（见 startFloatingResize）：把内容对齐到"所调整边缘
  // 的对边"（拖 W/N 时对侧为静止边），使主轴分配/取整产生的余量留在被调整的
  // 一侧，减少静止边在连续缩放中的抖动。布局方向决定主轴/交叉轴映射；交叉轴
  // 仅在所有子项都有显式交叉尺寸时切换（否则会由 stretch 退化为按内容收缩）。
  if (builder._isFloatingViewport && builder._resizeAnchor) {
    const { x, y } = builder._resizeAnchor;
    const toAlign = (v) => (v === 'end' ? 'flex-end' : v === 'start' ? 'flex-start' : undefined);
    const alignX = toAlign(x);
    const alignY = toAlign(y);
    const crossExplicit = builder._children.every(child => (flexDirection === 'column'
      ? child._layoutWidth != null
      : child._layoutHeight != null));
    if (flexDirection === 'column') {
      if (alignY) innerStyle.justifyContent = alignY;
      if (alignX && crossExplicit) innerStyle.alignItems = alignX;
    } else if (flexDirection === 'row') {
      if (alignX) innerStyle.justifyContent = alignX;
      if (alignY && crossExplicit) innerStyle.alignItems = alignY;
    }
  }
  // Grid：单元格按 gridMetrics 绝对定位（见 ContentLayer），不用 flex-wrap——
  // 浏览器的换行决策会与 reflow 过渡态（容器尺寸与 gridMetrics 短暂不一致）
  // 叠加产生闪烁。inner 尺寸撑到内容大小（含格间 gap 与两侧 padding），
  // frame 的 overflow:auto 才有滚动区域（由 _performGridLayout 保证，不留空底）
  if (isGrid && builder._gridMetrics) {
    const { cols, rows, cellW, cellH, rowMajor } = builder._gridMetrics;
    innerStyle.width = rowMajor ? '100%' : cols * cellW + (cols - 1) * gap + 2 * pad;
    innerStyle.height = rowMajor ? rows * cellH + (rows - 1) * gap + 2 * pad : '100%';
  }

  // 计算子节点偏移量（含容器内边距与子项间距：首项起始于 padding，
  // 相邻项之间隔 gap；与内容层子项 margin 口径一致）
  const offsets = builder._children.map(() => 0);
  let cumulative = pad;
  builder._children.forEach((child, i) => {
    offsets[i] = cumulative;
    cumulative += (isHorizontal ? safeNum(child._layoutWidth) : safeNum(child._layoutHeight)) + gap;
  });

  // 覆盖层滚动范围（主轴内容总尺寸）：覆盖层 inner 以此显式尺寸撑开滚动范围，
  // 不依赖"绝对定位子项撑大可滚动溢出区域"——各引擎对绝对定位后代是否计入
  // scrollable overflow 的实现不一致（内容层滚动范围由 in-flow 子项撑开，跨引擎
  // 一致），范围不一致时三层滚动位置相互钳制、分界线随滚动与内容错位。
  // Grid 的 inner 尺寸已在上方显式设置（含 gap/padding），无需此项
  const mainContentSize = !isGrid && builder._children.length > 0 ? cumulative - gap + pad : 0;

  // Grid 子节点的二维位置（供覆盖层递归定位；含格间 gap 与容器 padding）
  const positions = builder._children.map(() => null);
  if (isGrid && builder._gridMetrics) {
    const { cols, rows, cellW, cellH, rowMajor } = builder._gridMetrics;
    builder._children.forEach((child, i) => {
      positions[i] = rowMajor
        ? { left: pad + (i % cols) * (cellW + gap), top: pad + Math.floor(i / cols) * (cellH + gap) }
        : { left: pad + Math.floor(i / rows) * (cellW + gap), top: pad + (i % rows) * (cellH + gap) };
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
    mainContentSize,
    computedWidth,
    computedHeight,
  };
}

// === 滚动同步 / 层容器 ref 注册表 ===
// 注册表状态已下沉至 KitRuntime（runtime.registerContentRef / registerLayerRef 等），
// 本文件仅保留依赖注册表的 DOM 查找辅助函数。
// 层名：'content' | 'edge' | 'corner'（三层）+ 'shell'（包壳，FloatingWindow 登记）
// + 'effect'（特效包装层 resize-effect-layer，resize-effects.jsx 登记）

/**
 * 从已注册的 content 层 ref 向上查找浮动视口的定位容器（position: fixed 祖先）。
 * 用于拖拽移动/缩放时直接写 left/top，绕过 React 异步渲染。
 * @param {KitRuntime} runtime 所属运行时
 * @param {string} path builder 路径
 * @returns {HTMLElement|null} 定位容器 DOM 元素；未找到返回 null
 */
function getFloatingPositionEl(runtime, path) {
  const contentRef = runtime.getLayerRefs(path)?.content?.current;
  if (!contentRef) return null;
  let el = contentRef.parentElement;
  while (el && getComputedStyle(el).position !== 'fixed') el = el.parentElement;
  return el;
}

// === 工具函数（无 hook，纯计算）===

/**
 * 由内容层样式派生覆盖层样式：绝对定位、透明背景、不接收指针事件。
 * 覆盖层不可滚动（overflow hidden）：内容层是唯一滚动源，覆盖层经 transform
 * 镜像跟随（见 useBoxOverlayScroll），不做 scrollTop 镜像——各引擎 scroll
 * 事件时序不一（Firefox APZ 事件落后于画面、WebKit 事件不与渲染帧对齐），
 * 且程序化滚动大面积覆盖层在 WebKit 走主线程重绘，成本高
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
    overflowX: 'hidden',
    overflowY: 'hidden',
  };
}

/**
 * 覆盖层 inner 样式：主轴尺寸显式设为内容总尺寸，使覆盖层滚动范围与内容层
 * 结构一致（见 computeBuilderLayout 中 mainContentSize 注释）；交叉轴保持
 * 100%（与内容层口径相同）。尚未布局（0）时回退原 inner 样式
 * @param {Object} innerStyle 原 inner 样式
 * @param {number} mainContentSize 主轴内容总尺寸（px）
 * @param {boolean} isHorizontal 是否水平排列
 * @returns {Object} 覆盖层 inner 样式
 */
function getOverlayInnerStyle(innerStyle, mainContentSize, isHorizontal) {
  if (!mainContentSize) return innerStyle;
  return isHorizontal
    ? { ...innerStyle, width: mainContentSize }
    : { ...innerStyle, height: mainContentSize };
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

/**
 * 由主题 edge 指示条规范（materials.edgeIndicator，见 Theme#getEdgeIndicator）生成
 * 指示条样式：居中于命中区的细长条（MD3 指示条风格），颜色经主题颜色角色解析。
 * pointerEvents 必须为 none——指示条是命中区的子元素，若参与命中会成为事件目标、
 * cursor 解析为 default，悬停光标闪回箭头。
 * @param {boolean} horizontal 所在容器是否水平排列（水平容器的分界线为竖条）
 * @param {{color?: string, width?: number, opacity?: number, inset?: number}} spec 主题规范
 * @param {Theme|null} theme 当前主题
 * @returns {Object} 指示条样式
 */
function buildEdgeIndicatorStyle(horizontal, spec, theme) {
  const width = spec.width ?? 3;
  const inset = spec.inset ?? 4;
  const opacity = spec.opacity ?? 0.9;
  const resolved = theme?.resolveColor?.(spec.color) ?? spec.color
    ?? theme?.resolveColor?.('primary') ?? '#6750A4';
  const base = {
    position: 'absolute',
    borderRadius: width / 2,
    backgroundColor: resolved,
    opacity,
    pointerEvents: 'none',
  };
  return horizontal
    ? { ...base, left: '50%', top: inset, bottom: inset, width, transform: 'translateX(-50%)' }
    : { ...base, top: '50%', left: inset, right: inset, height: width, transform: 'translateY(-50%)' };
}

// === 自定义 Hooks ===

/**
 * useReflowSubscribe — 订阅 reflow 根完成通知，触发重渲染。
 * 订阅用 useLayoutEffect 注册（而非 useEffect）：useLayoutEffect 阶段 reflow
 * 完成通知发生时订阅已就绪，初始化 reflow 立即驱动本层重渲染，首帧 paint 前
 * 即为最终布局。若用 useEffect 注册，初始化 useLayoutEffect 里 reflow 通知时
 * 订阅尚未生效、forceUpdate 落空，首帧显示"未布局"中间态，只能等 ResizeObserver
 * 节流（250ms）reflow 才收敛 → 布局在屏上从外到内逐步变化。
 * reflow 同步完成后立即排队渲染：与同一同步栈内的其他状态更新（如 freezeZoom
 * 交接时的 setProj）一起被 React 批处理为一次 commit，保证"布局完全算完后整树
 * 原子上屏"（此前经 rAF 节流把渲染推迟到下一帧，settle 交接时出现"外层已更新、
 * 内层仍为旧版本"的闪烁帧，直接 forceUpdate 后两者同批 commit，无中间帧）。
 * @param {BoxBuilder} builder 当前层 builder
 */
function useReflowSubscribe(builder) {
  const [, forceUpdate] = useState(0);
  useLayoutEffect(() => {
    const handle = () => forceUpdate(n => n + 1);
    builder._subscribeReflowComplete(handle);
    return () => builder._unsubscribeReflowComplete(handle);
  }, [builder]);
}

/**
 * useStructuralSubscribe — 订阅 runtime 的结构变更通知（fill / mount / destroy /
 * single-slot 覆盖），使 Cell/Box 树的动态结构变化对 React 渲染可见。
 * 结构变化频率低（用户操作级），粗粒度全量重渲染即可保证正确性。
 * @param {BoxBuilder} builder 当前层 builder
 */
function useStructuralSubscribe(builder) {
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const unsubscribe = builder.runtime.subscribeStructural(() => forceUpdate(n => n + 1));
    return unsubscribe;
  }, [builder]);
}

/**
 * useBoxContent — ContentLayer 专用 hook，包含所有状态和副作用
 * 返回渲染所需的 ref 和 layout 计算结果
 */
function useBoxContent(builder) {
  const containerRef = useRef(null);
  const childRefs = useRef([]);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [viewportSize, setViewportSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  // 订阅 reflow 完成：布局数据更新后重渲染（见 useReflowSubscribe 注释）
  useReflowSubscribe(builder);

  const layout = computeBuilderLayout(builder);

  // 订阅结构变更：fill/mount/destroy 改变子 Box 列表时重渲染（见 runtime.subscribeStructural）
  useStructuralSubscribe(builder);

  // 注册容器 ref 供 edge/corner 层滚动同步；并登记到三层容器注册表（浮动缩放直接写 DOM）
  useEffect(() => {
    const rt = builder.runtime;
    rt.registerContentRef(builder._path, containerRef);
    rt.registerLayerRef(builder._path, 'content', containerRef);
    return () => {
      rt.unregisterContentRef(builder._path);
      rt.unregisterLayerRef(builder._path, 'content');
    };
  }, [builder._path]);

  // 滚动阻尼：wheel 增量累积为滚动目标，经 rAF 指数衰减平滑逼近（见 scroll-damping.js）。
  // 覆盖层经 scroll 事件镜像 transform，天然跟随阻尼动画；滚动链语义不变
  //（到边界的方向放行事件，冒泡到外层可滚容器）
  useEffect(() => {
    if (!containerRef.current) return;
    const damping = attachScrollDamping(containerRef.current);
    return () => damping.dispose();
  }, []);

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

  // reflow scheduler 根节点注册（viewport 与 floating-viewport 均为独立 reflow 根；
  // 调度器为 runtime 级实例，多实例互不干扰）
  useEffect(() => {
    if (builder._isViewport || builder._isFloatingViewport) {
      const scheduler = builder.runtime.scheduler;
      scheduler.registerRoot(builder);
      return () => scheduler.unregisterRoot(builder);
    }
  }, [builder]);

  // 容器/视口尺寸变化时触发 reflow
  useEffect(() => {
    // 投影期（freezeZoom 冻结缩放）：_containerSize 已由特效层接管为冻结尺寸，
    // 此处若用实时尺寸覆盖，节流 reflow 会把内容子项重排到实时尺寸，再被
    // transform 缩放 → 双重缩放（内容视觉 = real²/冻结 < 窗口，即"内容比边缘小"）。
    // 投影期跳过覆盖与 reflow，布局子项以冻结尺寸分配，视觉由特效层缩放承担。
    if (builder._frozenViewportSize) return;
    const width = builder._isViewport ? viewportSize.width : containerSize.width;
    const height = builder._isViewport ? viewportSize.height : containerSize.height;
    builder._containerSize = { width, height };
    builder._requestReflow();
  }, [containerSize, viewportSize]);

  // 初始化 reflow（useLayoutEffect：在浏览器 paint 前同步确定布局，首帧即最终布局）。
  // 此前为 useEffect + 浮窗/子层以占位 0 尺寸 reflow：首帧渲染"未布局"中间态，
  // 浮窗要等 ResizeObserver 节流（250ms）才布局、嵌套子层把父 reflow 写入的
  // _containerSize 覆盖为 0 再等 RO 涟漪逐层恢复 → 多层复杂布局在屏上从外到内
  // 逐步变化。useLayoutEffect 在 DOM 挂载后、paint 前执行，首帧即确定：
  // - 视口根：容器尺寸 = window 尺寸（挂载时同步已知）
  // - 嵌套子层：父 reflow 递归已写入有效 _containerSize 并完成自身布局，跳过
  // - 浮窗根：_containerSize 无效（初始 0）时用 DOM 实测兜底（fixed/auto 实际渲染值）
  useLayoutEffect(() => {
    if (builder._frozenViewportSize) return;
    const width = builder._isViewport ? viewportSize.width : builder._containerSize?.width;
    const height = builder._isViewport ? viewportSize.height : builder._containerSize?.height;
    // 非视口节点（嵌套子层）已有有效容器尺寸：父 reflow 已递归完成布局，跳过，
    // 避免用占位 0 覆盖 _containerSize 引发 RO 涟漪式的逐层重新布局
    if (!builder._isViewport && !builder._isFloatingViewport && width > 0 && height > 0) return;
    let w = width;
    let h = height;
    if (!w || !h) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        if (rect.width > 0) w = rect.width;
        if (rect.height > 0) h = rect.height;
      }
    }
    if (!w || !h) return; // 仍未知（容器尚未渲染出实际尺寸）：等 ResizeObserver 首测
    builder._containerSize = { width: w, height: h };
    builder._requestReflow();
    builder._performReflow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { containerRef, childRefs, layout };
}

/**
 * useBoxOverlayScroll — EdgeLayer / CornerLayer 共用 hook
 * 覆盖层（overflow: hidden，不滚动）经 transform 反向平移镜像内容层的滚动位置：
 * 内容层是唯一滚动源，scroll 事件经 rAF 合并后直写覆盖层 inner 的 transform。
 * 不做 scrollTop 镜像——各引擎 scroll 事件时序不一（Firefox APZ 事件落后于画面、
 * WebKit 事件不与渲染帧对齐），且程序化滚动大面积覆盖层在 WebKit 走主线程重绘；
 * transform 写入走合成器，四端成本与时序一致。镜像同时覆盖横纵两轴
 * （Corner 层交叉轴不再有错位问题）。
 * 覆盖层不滚动的代价是悬停分界线 handle 时滚轮不再命中滚动容器，
 * 由 wheel 转发补偿（可滚则消费并转发给内容层，不可滚方向放行保持滚动链）。
 * 另在内容容器尺寸变化时强制重新渲染（保持尺寸同步）
 */
function useBoxOverlayScroll(layerRef, builder) {
  // 订阅 reflow 完成：content 容器尺寸不变但内部偏移变化时，覆盖层同样重渲染，
  // 避免覆盖层与内容层错位（此前仅依赖下方 ResizeObserver，offset 变化不触发）
  useReflowSubscribe(builder);
  const [, forceUpdate] = useState(0);

  // transform 镜像（rAF 合并：一帧多个 scroll 事件只写一次）
  useEffect(() => {
    const contentRefObj = builder.runtime.getContentRef(builder._path);
    if (!contentRefObj?.current || !layerRef.current) return;
    const contentEl = contentRefObj.current;
    const layerEl = layerRef.current;

    let raf = null;
    const mirror = () => {
      raf = null;
      const inner = layerEl.firstElementChild;
      if (!inner) return;
      inner.style.transform = `translate(${-contentEl.scrollLeft}px, ${-contentEl.scrollTop}px)`;
    };
    const schedule = () => { if (raf === null) raf = requestAnimationFrame(mirror); };

    contentEl.addEventListener('scroll', schedule, { passive: true });
    mirror();

    return () => {
      contentEl.removeEventListener('scroll', schedule);
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, [builder._path, layerRef]);

  // wheel 转发：覆盖层不可滚，悬停 handle（pointer-events:auto）时滚轮转发给
  // 内容层。路由统一交给 routeWheel（见 scroll-damping.js）：一轮连续手势只
  // 服务一个可滚容器，到边界后原地吞掉，用户停顿后新手势才上移一层。
  // deltaMode 归一：Firefox 可能按行（1）/按页（2）给增量
  useEffect(() => {
    const contentRefObj = builder.runtime.getContentRef(builder._path);
    if (!contentRefObj?.current || !layerRef.current) return;
    const contentEl = contentRefObj.current;
    const layerEl = layerRef.current;

    const onWheel = (e) => {
      if (e.ctrlKey) return; // 触控板捏合缩放等手势放行
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? contentEl.clientHeight : 1;
      routeWheel(contentEl, e.deltaX * unit, e.deltaY * unit, e);
    };
    layerEl.addEventListener('wheel', onWheel, { passive: false });
    return () => layerEl.removeEventListener('wheel', onWheel);
  }, [builder._path, layerRef]);

  // 尺寸同步：观察内容容器尺寸变化时强制刷新
  useEffect(() => {
    const contentRefObj = builder.runtime.getContentRef(builder._path);
    if (!contentRefObj?.current) return;
    const ro = new ResizeObserver(() => {
      forceUpdate(n => n + 1);
    });
    ro.observe(contentRefObj.current);
    return () => ro.disconnect();
  }, [builder._path]);
}

// === 公共布局框架组件 ===
/**
 * 三层共用的布局框架。外层 div（容器，绑定 ref 与容器样式）包裹内层 div（inner，
 * 承载子项与布局方向），可选 wrapper 用于相对定位包裹；extra 渲染附加节点（如浮动滚动条）；
 * onContainerMouseDown 绑定到容器 div（用于浮动视口拖拽点移动）
 * @param {Object} props 组件属性
 * @param {React.RefObject} props.containerRef 容器 ref
 * @param {string} props.containerClassName 容器类名
 * @param {Object} props.containerStyle 容器样式
 * @param {string} props.innerClassName 内层类名
 * @param {Object} props.innerStyle 内层样式
 * @param {Object} [props.wrapperStyle] 外层包裹样式（提供时多套一层 div）
 * @param {React.ReactNode} props.children 子节点
 * @param {React.ReactNode} [props.extra] 附加节点
 * @param {Function} [props.onContainerMouseDown] 容器 mousedown 处理器
 * @returns {JSX.Element} 框架元素
 */
const BoxLayerFrame = ({ containerRef, containerClassName, containerStyle, innerClassName, innerStyle, wrapperStyle, children, extra, onContainerMouseDown }) => {
  const frame = (
    <div ref={containerRef} className={containerClassName} style={containerStyle} onMouseDown={onContainerMouseDown}>
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
 * Box 内容 builder 上下文：把内容所在的 box 提供给内容组件（含任意深度的子组件）。
 * ContentNode 渲染内容节点时以 Provider 提供 builder，子组件经 useContext 读取，
 * 无需构造期持有 builder 引用即可通过 builder._root 访问根
 * （如浮动视口关闭按钮定位宿主窗口）。同时经 cloneElement 向最外层内容元素
 * 附加 builder prop（对已有 props 如 Cell 内容组件的 cell 无影响）。
 */
const ContentBuilderContext = React.createContext(null);

/**
 * Box 自定义内容节点：为内容节点附加内容所在 box 的 builder。
 * 以 Provider 提供 builder（深度任意），并向最外层元素 cloneElement 注入 builder prop。
 * @param {Object} props 组件属性
 * @param {React.ReactNode} props.node 内容节点
 * @param {BoxBuilder} props.builder 内容所在的 box
 * @returns {React.ReactNode} 附加 builder 后的内容节点
 */
const ContentNode = ({ node, builder }) => (
  <ContentBuilderContext.Provider value={builder}>
    {React.isValidElement(node) ? React.cloneElement(node, { builder }) : node}
  </ContentBuilderContext.Provider>
);

/**
 * 内容层组件。承担实际布局：监听容器/视口尺寸变化触发 reflow，渲染子项。
 * 布局非法时渲染错误占位。视口根（viewport / floating-viewport）的三层整体由
 * 主题特效宿主（ResizeEffectViewport，挂于 CellRoot/FloatingLayer）包裹，
 * 尺寸变化特效（拉伸/缩小/模糊）作用于整个三层结构。
 * @param {Object} props 组件属性
 * @param {BoxBuilder} props.builder 当前层 builder
 * @returns {JSX.Element} 内容层元素
 */
const ContentLayer = ({ builder }) => {
  const { containerRef, childRefs, layout } = useBoxContent(builder);
  const { style, getChildStyle, isHorizontal, isGrid, offsets, positions, containerClassName, innerClassName, innerStyle } = layout;
  const theme = useTheme();

  // 形状与普适样式（见 docs/theme-shape-design.md）：主题形状描述 → 具体 CSS。
  // 形状（圆角/包裹层壳）与普适配置（材质/颜色角色/不透明度）在渲染时解析，
  // 主题切换经 ThemeProvider 触发重新解析；背景色优先级：裸色值 > 颜色角色
  const paintStyle = resolveBoxPaint(builder, theme);
  const { selfStyle: shapeStyle, shells } = resolveBoxShape(builder, theme);
  // 浮动视口根不自绘圆角：圆角由包壳（内缘裁剪）与定位容器框架（外缘边框）
  // 唯一承担。根盒若再带自身圆角，其 overflow 沿圆角裁剪子内容，与包壳裁剪
  // 不同径不同心，拐角形成月牙缝隙透出下层内容
  if (builder._isFloatingViewport) delete shapeStyle.borderRadius;

  const wrapperStyle = { position: 'relative' };

  // 拖拽点激活：本 box 标记为浮动视口拖拽点，且所在浮动视口有效可移动
  const isDragHandleActive =
    builder._isDragHandle && builder._root._isFloatingViewport && builder._root._effectiveMovable;

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

  // 本 box 设置了自定义内容（box.content()）时，内容优先于子 box 渲染（文档语义：
  // "设置后不再递归渲染子 Box 的内容层"），且内容在 frame（容器含背景色/滚动条）
  // 内渲染；否则渲染子 box 列表
  const childrenNode = builder._content
    ? <ContentNode node={builder._content} builder={builder} />
    : builder._children.map((child, index) => {
      // Grid 子节点按 gridMetrics 绝对定位（与覆盖层同一定位口径），
      // 不经浏览器 flex 换行；positions 为空（首次渲染）时回退主轴偏移
      const childStyle = isGrid
        ? getChildPositionStyle(getChildStyle(child, index), offsets[index], isHorizontal, positions[index])
        : getChildStyle(child, index);
      return (
        <div
          key={builder._pathResolved.join('-') + '-' + index}
          ref={el => { childRefs.current[index] = el; }}
          style={childStyle}
        >
          <ContentLayer builder={child} />
        </div>
      );
    });

  return (
    <BoxLayerFrame
      containerRef={containerRef}
      containerClassName={containerClassName}
      containerStyle={{ ...style, ...paintStyle, ...shapeStyle, ...(isDragHandleActive ? { cursor: 'move' } : null) }}
      innerClassName={innerClassName}
      innerStyle={innerStyle}
      wrapperStyle={wrapperStyle}
      onContainerMouseDown={isDragHandleActive ? (e) => startFloatingMove(builder._root, e) : undefined}
      extra={<>
        {builder._moveY === true && <FloatingScrollbar containerRef={containerRef} orientation="vertical" />}
        {builder._moveX === true && <FloatingScrollbar containerRef={containerRef} orientation="horizontal" />}
      </>}
    >
      {/* 包裹层壳（第 1 层起）：绝对定位内缩的视觉壳，先于内容渲染而位于内容之下 */}
      {shells.map(shell => <div key={`shape-shell-${shell.key}`} style={shell.style} />)}
      {childrenNode}
    </BoxLayerFrame>
  );
};

// ===========================================================================
//  第二层：边界（覆盖层，无布局干预）
// ===========================================================================
/**
 * 边覆盖层组件。绝对定位叠在内容层之上，渲染子项间的拖拽分界线（start/handle/end 边），
 * 按需递归渲染子层的边。无子项或布局未稳定时不渲染。滚动位置与内容层双向同步。
 * 覆盖层默认隐藏（showEdges 就近继承开启，见 resolveOverlayVisible）；只渲染实际
 * 可移动的分界线（主轴锁定且两侧存在可伸缩子项，见 isDividerMovable）；
 * 手柄命中区始终透明，悬停/拖拽时渲染主题定义的居中指示条（materials.edgeIndicator）。
 * @param {Object} props 组件属性
 * @param {BoxBuilder} props.builder 当前层 builder
 * @returns {JSX.Element|null} 边覆盖层元素；无可渲染内容时返回 null
 */
const EdgeLayer = ({ builder }) => {
  const edgeRef = useRef(null);
  const { hoveredEdges, addHoveredEdge, removeHoveredEdge, addHoveredEdges, removeHoveredEdges } = useHoveredEdges();
  const theme = useTheme();
  const layout = computeBuilderLayout(builder);
  const { style, isHorizontal, isGrid, offsets, positions, getChildStyle, containerClassName, innerClassName, innerStyle, mainContentSize } = layout;

  useBoxOverlayScroll(edgeRef, builder);
  // 登记到三层容器注册表（浮动缩放直接写 DOM）
  useEffect(() => {
    const rt = builder.runtime;
    rt.registerLayerRef(builder._path, 'edge', edgeRef);
    return () => rt.unregisterLayerRef(builder._path, 'edge');
  }, [builder._path]);

  // 无子节点或布局未稳定时跳过渲染
  if (builder._children.length === 0 || !builder._layoutValid) return null;

  // Edge 覆盖层默认隐藏（就近继承，见 resolveOverlayVisible）：隐藏时不渲染
  // 自身手柄，仅在子树内存在显式开启的深层节点时继续递归（见下方递归段）
  const showEdges = resolveOverlayVisible(builder, '_showEdges');
  // 悬停/拖拽高亮由主题定义（materials.edgeIndicator，见 Theme#getEdgeIndicator）：
  // 命中区（EDGE_SIZE）保持透明，仅渲染居中指示条子元素；非悬停完全透明
  const edgeIndicator = theme?.getEdgeIndicator?.() ?? null;

  const EDGE_SIZE = 10;
  // 子项间距（BoxBuilder#gap）：handle 手柄居中于相邻子项的间隙
  const gap = builder._gap || 0;

  // 主轴锁定（moveX/moveY === false）时本层分界线才可能拖拽（同 resolveDragTarget 的口径）；
  // 实际可移动还要求分界线两侧都存在可伸缩子项（见 isDividerMovable），
  // 任一侧全部冻结（fixed / 禁用拖拽）时分界线无法移动，不渲染手柄
  const dimKey = isHorizontal ? 'Width' : 'Height';
  const axisLocked = (isHorizontal ? builder._moveX : builder._moveY) === false;
  const flexible = builder._children.map(c =>
    c._draggable !== false && c[`_min${dimKey}`] !== c[`_max${dimKey}`]);
  const flexibleBefore = flexible.map((_, i) => flexible.slice(0, i + 1).some(Boolean));
  const flexibleAfter = flexible.map((_, i) => flexible.slice(i + 1).some(Boolean));
  const handleMovable = (index) => axisLocked && flexibleBefore[index] && flexibleAfter[index];

  // 鼠标按下：解析可拖拽目标并开启拖拽会话（不可拖则无操作）
  const handleEdgeMouseDown = (box, side, edgeId, e) => {
    if (e.button !== 0) return;
    const target = resolveMovableDragTarget(builder._root, box, side);
    if (!target) return;
    const ids = target.edgeId === edgeId ? [edgeId] : [edgeId, target.edgeId];
    startDragSession([target], ids, e, { addHoveredEdges, removeHoveredEdges });
  };

  /**
   * 渲染一条 start/end 边的拖拽手柄。start/end 边向外解析重合的 handle 边
   *（resolveDragTarget），解析不到可拖拽目标时不渲染（不产生不可用的手柄）
   * @param {BoxBuilder} box 边所属 box
   * @param {'start'|'end'} side 边类型
   * @param {boolean} isStart 是否为起始边
   * @param {number} offset 主轴偏移
   * @returns {JSX.Element|null} 边手柄元素；不可拖拽时返回 null
   */
  const renderEdge = (box, side, isStart, offset) => {
    if (!resolveMovableDragTarget(builder._root, box, side)) return null;
    const edgeId = makeEdgeId(box, side);
    const isHovered = hoveredEdges.has(edgeId);
    const depth = box._pathResolved.length;
    const s = {
      position: 'absolute',
      pointerEvents: 'auto',
      // 须高于 FloatingScrollbar 的 zIndex 1000：滚动条显示时（hover/滚动中）
      // 其条带与 box 右/下边缘重合，zIndex 低于它会吞掉边的按下事件
      zIndex: 1100 - depth,
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
        onMouseEnter={() => { if (!builder.runtime.dragSession) addHoveredEdge(edgeId); }}
        onMouseLeave={() => { if (!builder.runtime.dragSession) removeHoveredEdge(edgeId); }}
        onMouseDown={(e) => handleEdgeMouseDown(box, side, edgeId, e)}
      >
        {isHovered && edgeIndicator && (
          <div style={buildEdgeIndicatorStyle(isHorizontal, edgeIndicator, theme)} />
        )}
      </div>
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
    };
    if (isHorizontal) {
      const w = safeNum(box._layoutWidth);
      // 居中于相邻子项的间隙（gap）：子项末端 offset+w，下一子项起始再隔 gap
      s.left = offset + w + gap / 2 - EDGE_SIZE / 2;
      s.top = 0;
      s.width = EDGE_SIZE;
      s.height = '100%';
    } else {
      const h = safeNum(box._layoutHeight);
      s.top = offset + h + gap / 2 - EDGE_SIZE / 2;
      s.left = 0;
      s.width = '100%';
      s.height = EDGE_SIZE;
    }
    return (
      <div
        key={`edge-${box._path}-handle`}
        className={`drag-handle ${dirClass}`}
        style={s}
        onMouseEnter={() => { if (!builder.runtime.dragSession) addHoveredEdge(edgeId); }}
        onMouseLeave={() => { if (!builder.runtime.dragSession) removeHoveredEdge(edgeId); }}
        onMouseDown={(e) => handleEdgeMouseDown(box, 'handle', edgeId, e)}
      >
        {isHovered && edgeIndicator && (
          <div style={buildEdgeIndicatorStyle(isHorizontal, edgeIndicator, theme)} />
        )}
      </div>
    );
  };

  const childrenCount = builder._children.length;

  // 禁用拖拽：两相邻 box 均禁用则中间不产生 Edge；一级的 box 均禁用则两端也不产生 Edge
  const allDisabled = builder._children.every(c => c._draggable === false);
  const pairDisabled = (index) =>
    builder._children[index]._draggable === false && builder._children[index + 1]?._draggable === false;

  // 覆盖层隐藏（showEdges false）或 Grid（单元格等尺寸）时不产生本层 Edge；
  // 手柄仅在实际可移动（handleMovable，分界线两侧均有可伸缩子项）时渲染，
  // flatMap 内的 null（renderEdge 解析不到可拖拽目标）一并过滤
  const edgeHandles = (isGrid || !showEdges) ? [] : builder._children.flatMap((child, index) => {
    const isFirst = index === 0;
    const isLast = index === childrenCount - 1;
    const items = [];
    if (isFirst && !allDisabled) items.push(renderEdge(child, 'start', true, offsets[index]));
    if (!isLast && !pairDisabled(index) && handleMovable(index)) items.push(renderHandle(child, offsets[index]));
    if (isLast && !allDisabled) items.push(renderEdge(child, 'end', false, offsets[index]));
    return items;
  }).filter(Boolean);

  const overlayStyle = getOverlayStyle(style);

  return (
    <BoxLayerFrame
      containerRef={edgeRef}
      containerClassName={containerClassName}
      containerStyle={overlayStyle}
      innerClassName={innerClassName}
      innerStyle={getOverlayInnerStyle(innerStyle, mainContentSize, isHorizontal)}
    >
      {edgeHandles}
      {/* 递归：子节点的 EdgeLayer 定位到对应偏移处（Grid 为二维坐标）。
          本层可见时递归全部子层（子层各自就近继承解析）；本层隐藏时仅递归
          子树内存在显式开启（showEdges(true)）节点的子层，默认隐藏不递归 */}
      {builder._children.map((child, index) => {
        if (!showEdges && !subtreeOverlayEnabled(child, '_showEdges')) return null;
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
 * Corner 跟随 Edge 的显示开关（showEdges 就近继承，无独立 showCorners API）；
 * 角点仅在其关联的两条边都存在且均可拖拽时存在；角点自身永不绘制（命中区透明），
 * 悬停/拖拽角点时高亮其关联的两条边（经 hoveredEdges 联动 Edge 指示条）。
 * @param {Object} props 组件属性
 * @param {BoxBuilder} props.builder 当前层 builder
 * @returns {JSX.Element|null} 角覆盖层元素；无可渲染内容时返回 null
 */
const CornerLayer = ({ builder }) => {
  const cornerRef = useRef(null);
  const { addHoveredEdges, removeHoveredEdges } = useHoveredEdges();
  const layout = computeBuilderLayout(builder);
  const { style, isHorizontal, isGrid, offsets, positions, getChildStyle, containerClassName, innerClassName, innerStyle, mainContentSize } = layout;

  useBoxOverlayScroll(cornerRef, builder);
  // 登记到三层容器注册表（浮动缩放直接写 DOM）
  useEffect(() => {
    const rt = builder.runtime;
    rt.registerLayerRef(builder._path, 'corner', cornerRef);
    return () => rt.unregisterLayerRef(builder._path, 'corner');
  }, [builder._path]);

  // 无子节点或布局未稳定时跳过渲染
  if (builder._children.length === 0 || !builder._layoutValid) return null;

  // Corner 跟随 Edge 的显示开关（就近继承，同 Edge 层）：隐藏时不渲染自身角点，
  // 仅在子树内存在显式开启的深层节点时继续递归（见下方递归段）
  const showEdges = resolveOverlayVisible(builder, '_showEdges');

  const CORNER_SIZE = 12;
  // 子项间距（BoxBuilder#gap）：handle 侧角点居中于相邻子项的间隙
  const gap = builder._gap || 0;

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
      const target = resolveMovableDragTarget(builder._root, edgeBox, edgeSide);
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
   * 渲染一个角点手柄。角点是两条边的交点，仅当两条关联边都存在且均可拖拽
   *（resolveMovableDragTarget 命中）时才存在——单边可拖拽时交点退化为该边
   * 自身的端点，不产生角点。角点自身永不绘制（命中区透明），悬停/拖拽时
   * 经 hoveredEdges 联动高亮两条关联边
   * @param {BoxBuilder} box 主轴边所属 box
   * @param {'start'|'end'|'handle'} side 主轴边类型
   * @param {'top'|'bottom'|'left'|'right'} crossSide 交叉轴方向
   * @param {number} offset 主轴偏移
   * @returns {JSX.Element|null} 角点手柄元素；双边不齐时返回 null
   */
  const renderCorner = (box, side, crossSide, offset) => {
    const edges = getCornerEdges(box, side, crossSide);
    if (edges.length < 2
      || !edges.every(({ box: edgeBox, side: edgeSide }) => resolveMovableDragTarget(builder._root, edgeBox, edgeSide))) {
      return null;
    }
    const edgeIds = edges.map(e => e.id);
    const depth = box._pathResolved.length;
    const isHandle = side === 'handle';
    const s = {
      position: 'absolute',
      pointerEvents: 'auto',
      // 同 Edge：高于 FloatingScrollbar 的 1000，不被滚动条吞事件
      zIndex: 1200 - depth,
    };
    if (isHorizontal) {
      const w = safeNum(box._layoutWidth);
      s.width = isHandle ? CORNER_SIZE : CORNER_SIZE / 2;
      s.height = CORNER_SIZE / 2;
      // handle 侧角点居中于相邻子项的间隙（gap），start 侧贴齐子项起始
      s.left = side === 'start' ? offset : offset + w + gap / 2 - CORNER_SIZE / 2;
      s[crossSide] = 0;
    } else {
      const h = safeNum(box._layoutHeight);
      s.width = CORNER_SIZE / 2;
      s.height = isHandle ? CORNER_SIZE : CORNER_SIZE / 2;
      s.top = side === 'start' ? offset : offset + h + gap / 2 - CORNER_SIZE / 2;
      s[crossSide] = 0;
    }
    return (
      <div
        key={`corner-${box._path}-${side}-${crossSide}`}
        className="drag-handle drag-handle-horizontal drag-handle-vertical"
        style={s}
        onMouseEnter={() => { if (!builder.runtime.dragSession) addHoveredEdges(edgeIds); }}
        onMouseLeave={() => { if (!builder.runtime.dragSession) removeHoveredEdges(edgeIds); }}
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
  // 覆盖层隐藏（showEdges false）时同样不产生；renderCorner 返回的 null
  //（双边不齐或不可拖拽）在 flatMap 后过滤
  const cornerHandles = (builder._isViewport || isGrid || !showEdges) ? [] : builder._children.flatMap((child, index) => {
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
  }).filter(Boolean);

  const overlayStyle = getOverlayStyle(style);

  return (
    <BoxLayerFrame
      containerRef={cornerRef}
      containerClassName={containerClassName}
      containerStyle={overlayStyle}
      innerClassName={innerClassName}
      innerStyle={getOverlayInnerStyle(innerStyle, mainContentSize, isHorizontal)}
    >
      {cornerHandles}
      {/* 递归：子节点的 CornerLayer 定位到对应偏移处（Grid 为二维坐标）。
          本层可见时递归全部子层；本层隐藏时仅递归子树内存在显式开启
         （showEdges(true)）节点的子层，默认隐藏不递归 */}
      {builder._children.map((child, index) => {
        if (!showEdges && !subtreeOverlayEnabled(child, '_showEdges')) return null;
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

// ===========================================================================
//  浮动视口（FloatingViewport）：FloatingLayer 统一承载渲染
// ===========================================================================

// 浮动层样式常量：集中定义，不散落硬编码；最终由主题系统接管具体样式定义
// （设计约束见 docs/ui-kit-design-document.md「样式与主题系统」）
const DEFAULT_FLOATING_ZINDEX = 2000;
// 容器持有高于平铺层拖拽手柄（zIndex 1000~1200）的 z-index，创建独立层叠上下文：
// 保证浮动层与遮罩整体位于平铺层（含其 Edge/Corner 手柄）之上
const FLOATING_LAYER_STYLE = {
  position: 'fixed',
  inset: 0,
  zIndex: DEFAULT_FLOATING_ZINDEX,
  pointerEvents: 'none',
};
// 可操作窗口遮罩基础样式（z-index 由调用处按渲染序动态计算，见 getFloatingMaskStyle；
// 颜色/不透明度为主题普适配置——materials.mask，未声明时用缺省值）
const FLOATING_MASK_STYLE = {
  position: 'fixed',
  inset: 0,
  pointerEvents: 'auto',
};
const DEFAULT_MASK_COLOR = '#000000';
const DEFAULT_MASK_OPACITY = 0.45;

// === 浮动窗口树与可操作窗口 ===
// 树状态（浮动树 / 可操作集合 / 变化监听器）与注册、聚焦、渲染序计算已全部
// 下沉至 KitRuntime（见 src/core/runtime.js）：runtime.registerFloating /
// unregisterFloating / reparentFloating / focusFloating / subscribeFloating /
// notifyFloatingChange / setOperable / clearOperable / getFloatingChildren /
// getEffectiveOperable / buildRenderOrder。同一 runtime 内浮动窗口互见，
// 不同 runtime 完全隔离。

/** @type {number} 浮动视口缩放下限（px） */
const FLOAT_RESIZE_MIN = 24;

// === 浮动拖拽会话与 DOM 同步（移动/缩放共用）===

/**
 * 开启浮动拖拽会话：锁定全局光标与文本选择，注册 document mousemove/mouseup，
 * 结束时统一恢复并清理。移动与缩放共用本机制，避免各自重复样板代码。
 * @param {Object} opts 会话配置
 * @param {string} opts.cursorClass 会话期间 body 光标锁定类（box-dragging-xy / box-resizing-*）
 * @param {(ev: MouseEvent) => void} opts.onMove 移动回调（原生 mousemove 事件）
 * @param {() => void} [opts.onEnd] 结束回调（恢复光标后调用，用于清理会话期状态）
 */
function startFloatingDragSession({ cursorClass, onMove, onEnd }) {
  const unlockBody = lockBodyForDrag(cursorClass);
  const handleMove = (ev) => {
    // 同 startDragSession：逐事件 preventDefault，阻止 Firefox/Safari 原生
    // 拖选手势把光标强制回落为箭头
    ev.preventDefault();
    onMove(ev);
  };
  const handleUp = () => {
    document.removeEventListener('mousemove', handleMove);
    document.removeEventListener('mouseup', handleUp);
    unlockBody();
    onEnd?.();
  };
  document.addEventListener('mousemove', handleMove);
  document.addEventListener('mouseup', handleUp);
}

/**
 * 清除元素 CSS 尺寸约束（max/min）。浮动视口常以 fixedWidth/fixedHeight 声明，
 * 初始渲染 DOM 带 max=min=280px，仅写 width/height 会被旧 max 钳制
 * （getBoundingClientRect 不变），须先解除约束才能即时生效。
 * 注意：min-* 不支持 none（CSS 无效值，浏览器静默忽略），须用 0 表示不设下限；
 * max-* 用 none 表示不设上限。
 * @param {HTMLElement} el 目标元素
 */
function clearSizeConstraints(el) {
  el.style.maxWidth = 'none';
  el.style.minWidth = '0';
  el.style.maxHeight = 'none';
  el.style.minHeight = '0';
}

/**
 * 把浮动视口新尺寸直接写入三层容器 DOM（绕过 React 异步渲染），
 * 窗口边缘与内容边缘在当前事件帧内即与鼠标精确重合，不再滞后一帧。
 * 包壳尺寸由 applyFloatingShellToDom 单独直写（非投影期与三层同尺寸；
 * 投影期以视觉尺寸为准、与三层的冻结尺寸不同，见 applyFloatingEffectToDom）。
 * @param {BoxBuilder} root 浮动视口 builder
 * @param {number} w 新宽度
 * @param {number} h 新高度
 */
function applyFloatingSizeToDom(root, w, h) {
  const layerRefs = root.runtime.getLayerRefs(root._path);
  if (!layerRefs) return;
  const sizeW = `${w}px`;
  const sizeH = `${h}px`;
  ['content', 'edge', 'corner'].forEach(name => {
    const el = layerRefs[name]?.current;
    if (!el) return;
    el.style.width = sizeW;
    el.style.height = sizeH;
    clearSizeConstraints(el);
  });
}

/**
 * 把浮动视口包壳（floating-shell）尺寸直接写入 DOM（绕过 React 异步渲染）。
 * 包壳 overflow hidden 裁剪视觉边界外内容（edge/corner 拖拽手柄、投影放大
 * 溢出），缩放拖拽中须与三层同步更新，保证裁剪边界当前帧即与鼠标重合。
 * @param {BoxBuilder} root 浮动视口 builder
 * @param {number} w 新宽度
 * @param {number} h 新高度
 */
function applyFloatingShellToDom(root, w, h) {
  const shell = root.runtime.getLayerRefs(root._path)?.shell?.current;
  if (!shell) return;
  shell.style.width = `${w}px`;
  shell.style.height = `${h}px`;
  clearSizeConstraints(shell);
}

/**
 * 投影期（_frozenViewportSize 已设置）把浮动视口的视觉尺寸与投影缩放直接写入
 * DOM（绕过 React 异步渲染）：三层以冻结尺寸布局、由特效包装层（resize-effect-
 * layer）transform scale 放大到视觉尺寸。拖拽 W/N 侧时位置（left/top）已由
 * applyFloatingPositionToDom 即时直写，此处同步直写视觉宽度——否则视觉宽度
 * 滞后一帧（React 重渲染），对角（固定侧）随拖拽来回抖动。
 * 同步直写包壳尺寸，使投影期裁剪边界也与视觉重合。
 * @param {BoxBuilder} root 浮动视口 builder
 * @param {number} w 新宽度
 * @param {number} h 新高度
 */
function applyFloatingEffectToDom(root, w, h) {
  const layerRefs = root.runtime.getLayerRefs(root._path);
  if (!layerRefs) return;
  const frozen = root._frozenViewportSize;
  if (!frozen || !frozen.width || !frozen.height) return;
  const shell = layerRefs.shell?.current;
  if (shell) {
    shell.style.width = `${w}px`;
    shell.style.height = `${h}px`;
  }
  const el = layerRefs.effect?.current;
  if (!el) return;
  el.style.width = `${w}px`;
  el.style.height = `${h}px`;
  el.style.transform = `scale(${w / frozen.width}, ${h / frozen.height})`;
}

/**
 * 把浮动视口位置直接写入定位容器 DOM（绕过 React 异步渲染）。
 * 定位容器 left/top 恒等于 _posX/_posY，整对写入幂等安全。
 * @param {BoxBuilder} root 浮动视口 builder
 */
function applyFloatingPositionToDom(root) {
  const posEl = getFloatingPositionEl(root.runtime, root._path);
  if (!posEl) return;
  posEl.style.left = `${root._posX ?? 0}px`;
  posEl.style.top = `${root._posY ?? 0}px`;
}

/**
 * 同步浮动视口布局数据并立即 reflow：更新 _containerSize、标记整棵树后同步
 * 执行 reflow（拖拽期间没有 ResizeObserver 逐轮驱动），最后通知 FloatingLayer
 * 重渲染（React 状态收敛到与 DOM 一致）。
 * @param {BoxBuilder} root 浮动视口 builder
 * @param {number} w 新宽度
 * @param {number} h 新高度
 */
function syncFloatingSizeToBuilder(root, w, h) {
  root._containerSize = { width: w, height: h };
  markNeedsReflow(root);
  root._performReflow();
  root.runtime.notifyFloatingChange();
}

/**
 * 程序化窗口状态变更（最大化/最小化，见 BoxBuilder#toggleMaximize 等）后的
 * 同步收口：以当前视觉尺寸（_viewWidth/_viewHeight，缺省回退容器尺寸）更新
 * 容器尺寸、立即 reflow（不依赖 ResizeObserver），最后通知 FloatingLayer 重渲染。
 * @param {BoxBuilder} root 浮动视口 builder
 * @returns {void}
 */
function syncFloatingFrame(root) {
  const w = root._viewWidth ?? root._containerSize?.width;
  const h = root._viewHeight ?? root._containerSize?.height;
  if (w > 0 && h > 0) {
    root._containerSize = { width: w, height: h };
    markNeedsReflow(root);
    root._performReflow();
  }
  root.runtime.notifyFloatingChange();
}

/**
 * 纯计算：由拖拽方向与鼠标位移求浮动视口缩放后的尺寸与位置偏移。
 * 尺寸：E/S 侧增量为正、W/N 侧为负；先按 min/max 钳制尺寸，位置偏移取实际
 * 尺寸变化（W/N 侧按下时位置随尺寸变化，被钳制时同步停止，对侧边界保持不动）。
 * @param {Object} p 计算参数
 * @param {number} p.baseW 起始宽度
 * @param {number} p.baseH 起始高度
 * @param {number} p.dx 鼠标横向位移
 * @param {number} p.dy 鼠标纵向位移
 * @param {boolean} p.moveW 是否拖拽 W 侧
 * @param {boolean} p.moveE 是否拖拽 E 侧
 * @param {boolean} p.moveN 是否拖拽 N 侧
 * @param {boolean} p.moveS 是否拖拽 S 侧
 * @param {number} p.minW 宽度下限
 * @param {number} p.minH 高度下限
 * @param {number|undefined} p.maxW 宽度上限
 * @param {number|undefined} p.maxH 高度上限
 * @returns {{w: number, h: number, dPosX: number, dPosY: number}} 新尺寸与位置偏移
 */
function computeFloatingResize({ baseW, baseH, dx, dy, moveW, moveE, moveN, moveS, minW, minH, maxW, maxH }) {
  let w = baseW + (moveE ? dx : 0) - (moveW ? dx : 0);
  let h = baseH + (moveS ? dy : 0) - (moveN ? dy : 0);
  if (typeof maxW === 'number') w = Math.min(w, maxW);
  if (typeof maxH === 'number') h = Math.min(h, maxH);
  w = Math.max(w, minW);
  h = Math.max(h, minH);
  return { w, h, dPosX: baseW - w, dPosY: baseH - h };
}

/**
 * 启动浮动视口移动拖拽会话：在 dragHandle 拖拽点区域按下并拖动，
 * 沿鼠标位移更新浮动视口位置（posX/posY）
 * @param {BoxBuilder} root 浮动视口 builder
 * @param {React.MouseEvent} event 触发事件
 */
function startFloatingMove(root, event) {
  if (event.button !== 0 || root.runtime.dragSession) return;
  event.preventDefault();
  event.stopPropagation();
  const startX = event.clientX;
  const startY = event.clientY;
  const baseX = root._posX ?? 0;
  const baseY = root._posY ?? 0;
  startFloatingDragSession({
    cursorClass: 'box-dragging-xy',
    onMove: (ev) => {
      root._posX = baseX + ev.clientX - startX;
      root._posY = baseY + ev.clientY - startY;
      // 直接写定位容器 DOM（绕过 React 异步渲染），窗口在当前事件帧内即跟随鼠标
      applyFloatingPositionToDom(root);
      root.runtime.notifyFloatingChange();
    },
  });
}

/**
 * 启动浮动视口缩放拖拽会话：拖动边缘/角手柄沿鼠标位移更新浮动视口
 * 尺寸（_viewWidth/_viewHeight）。拖拽 W/N 侧时位置随实际尺寸变化同步更新
 *（右侧/下侧边界保持不动；尺寸被 min/max 钳制时位置也停止，避免窗口漂移）。
 * 缩放起始解除 fixed（min === max）的固定上限，使缩放生效。
 * 拖拽期间光标为对应调整方向（水平/垂直/对角），与移动（四向十字）区分。
 * @param {BoxBuilder} root 浮动视口 builder
 * @param {string} dir 手柄方向（可组合）：'n'/'s'/'e'/'w'/'ne'/'nw'/'se'/'sw'
 * @param {React.MouseEvent} event 触发事件
 */
function startFloatingResize(root, dir, event) {
  if (event.button !== 0 || root.runtime.dragSession) return;
  event.preventDefault();
  event.stopPropagation();
  // fixed 尺寸（min === max）的固定上下限会让缩放失效，缩放起始即解除两者：
  // 仅解除 max 会导致 min 仍钳制下限，无法缩小（fixedWidth(280) 时 minWidth=280
  // 阻止宽度低于 280）。解除后 min/max 回退为 FLOAT_RESIZE_MIN / 无上限
  // （见下方 minW/maxW 计算）；_explicit 标志同步清除，保持状态一致。
  if (root._minWidth === root._maxWidth && root._maxWidth != null) {
    root._maxWidth = undefined;
    root._minWidth = undefined;
    root._explicitMaxWidth = false;
    root._explicitMinWidth = false;
  }
  if (root._minHeight === root._maxHeight && root._maxHeight != null) {
    root._maxHeight = undefined;
    root._minHeight = undefined;
    root._explicitMaxHeight = false;
    root._explicitMinHeight = false;
  }
  const startX = event.clientX;
  const startY = event.clientY;
  const baseX = root._posX ?? 0;
  const baseY = root._posY ?? 0;
  const baseW = root._viewWidth != null ? root._viewWidth : safeNum(root._containerSize?.width);
  const baseH = root._viewHeight != null ? root._viewHeight : safeNum(root._containerSize?.height);
  const moveW = dir.includes('w');
  const moveE = dir.includes('e');
  const moveN = dir.includes('n');
  const moveS = dir.includes('s');
  // 缩放约束：仅"显式设置"的 min/max 参与钳制（_minWidth 构造默认 0、_maxWidth
  // 默认 Infinity，均视为未设置）。未显式设下限时回退 FLOAT_RESIZE_MIN，避免
  // 窗口被缩到 0（消失）；上限未显式设置时为 undefined（不钳制，可无限放大）
  const minW = root._explicitMinWidth && root._minWidth != null ? root._minWidth : FLOAT_RESIZE_MIN;
  const minH = root._explicitMinHeight && root._minHeight != null ? root._minHeight : FLOAT_RESIZE_MIN;
  const maxW = root._explicitMaxWidth && root._maxWidth != null ? root._maxWidth : undefined;
  const maxH = root._explicitMaxHeight && root._maxHeight != null ? root._maxHeight : undefined;
  // 缩放光标方向类：水平/垂直/对角（nwse 或 nesw），与移动的四向十字区分。
  // 对角映射：nw/se 角沿 NW-SE 对角线（nwse），ne/sw 角沿 NE-SW 对角线（nesw）
  const resizeDirClass =
    (moveW || moveE) && (moveN || moveS)
      ? (moveW === moveS ? 'box-resizing-nesw' : 'box-resizing-nwse')
      : moveW || moveE
        ? 'box-resizing-ew'
        : 'box-resizing-ns';
  // 缩放期间内容对齐锚点：所调整边缘的对边是静止边——拖 W/N 时把内容对齐到
  // E/S（flex-end），拖 E/S 时对齐到 W/N（flex-start），使静边区吸附内容、
  // 余量落在被拖拽的一侧，减少对边因连续缩放产生的抖动（布局层见
  // computeBuilderLayout 的 _resizeAnchor 处理）。会话结束清除并重渲染。
  root._resizeAnchor = {
    x: moveW ? 'end' : moveE ? 'start' : null,
    y: moveN ? 'end' : moveS ? 'start' : null,
  };
  root.runtime.notifyFloatingChange();
  startFloatingDragSession({
    cursorClass: resizeDirClass,
    onMove: (ev) => {
      const { w, h, dPosX, dPosY } = computeFloatingResize({
        baseW, baseH,
        dx: ev.clientX - startX,
        dy: ev.clientY - startY,
        moveW, moveE, moveN, moveS, minW, minH, maxW, maxH,
      });
      // 位置：W/N 侧按下时随实际尺寸变化（被钳制时同步停止，对侧边界保持不动）
      if (moveW) root._posX = baseX + dPosX;
      if (moveN) root._posY = baseY + dPosY;
      root._viewWidth = w;
      root._viewHeight = h;
      // freezeZoom 投影期（_frozenViewportSize 已设置）：三层由冻结尺寸锁定 +
      // transform 投影实时贴合（GPU 合成），不再直接写三层尺寸 / 同步 reflow——
      // 否则与锁定叠加造成双重缩放错位。位置直写保留；视觉尺寸与投影 scale 由
      // applyFloatingEffectToDom 同步直写特效包装层（否则 scale 更新经 React 重渲染
      // 滞后一帧，W/N 侧拖拽时对角随拖拽抖动），_viewWidth/_viewHeight 数据照常
      // 更新（FloatingLayer 重渲染与直写保持一致）
      if (root._frozenViewportSize) {
        applyFloatingPositionToDom(root);
        applyFloatingEffectToDom(root, w, h);
        root.runtime.notifyFloatingChange();
        return;
      }
      // 尺寸与位置直接写入 DOM（绕过 React 异步渲染），当前事件帧内即与鼠标精确重合
      applyFloatingSizeToDom(root, w, h);
      applyFloatingShellToDom(root, w, h);
      applyFloatingPositionToDom(root);
      // 容器尺寸同步更新并立即 reflow（不依赖异步调度），布局数据即时就绪
      syncFloatingSizeToBuilder(root, w, h);
    },
    onEnd: () => {
      // 缩放结束：清除内容对齐锚点，恢复默认对齐并触发重渲染
      root._resizeAnchor = null;
      root.runtime.notifyFloatingChange();
    },
  });
}

/**
 * 渲染浮动视口的缩放手柄（仅 resizable 时）。四边 + 四角共 8 个手柄，
 * 绝对定位于视口边缘，拖拽调整尺寸（角可双轴，边单轴）。
 * 手柄层级（zIndex 1300）高于内容三层（Content/Edge/Corner，zIndex ≤ 1200），
 * 确保始终位于浮层内容之上可交互。
 * @param {BoxBuilder} builder 浮动视口 builder
 * @returns {JSX.Element|null} 手柄集合；不可调整大小时返回 null
 */
function renderResizeHandles(builder) {
  if (!builder._resizable) return null;
  // 手柄命中区：边 5px（收窄，贴边细条）、角 10px（对角双轴抓取点）
  const handles = [
    { dir: 'n', style: { top: 0, left: 0, width: '100%', height: 5, cursor: 'ns-resize' } },
    { dir: 's', style: { bottom: 0, left: 0, width: '100%', height: 5, cursor: 'ns-resize' } },
    { dir: 'w', style: { top: 0, left: 0, height: '100%', width: 5, cursor: 'ew-resize' } },
    { dir: 'e', style: { top: 0, right: 0, height: '100%', width: 5, cursor: 'ew-resize' } },
    { dir: 'nw', style: { top: 0, left: 0, width: 10, height: 10, cursor: 'nwse-resize' } },
    { dir: 'ne', style: { top: 0, right: 0, width: 10, height: 10, cursor: 'nesw-resize' } },
    { dir: 'sw', style: { bottom: 0, left: 0, width: 10, height: 10, cursor: 'nesw-resize' } },
    { dir: 'se', style: { bottom: 0, right: 0, width: 10, height: 10, cursor: 'nwse-resize' } },
  ];
  return handles.map(h => (
    <div
      key={`float-resize-${h.dir}`}
      className="drag-handle floating-resize-handle"
      style={{ position: 'absolute', pointerEvents: 'auto', zIndex: 1300, ...h.style }}
      onMouseDown={(e) => startFloatingResize(builder, h.dir, e)}
    />
  ));
}

/**
 * 取浮动视口定位容器的样式：position: fixed + 屏幕坐标（left/top）+ 层级（z-index）。
 * 层级由系统按"父子窗口树 + 可操作窗口"动态分配（见 FloatingLayer 的树遍历与
 * zIndex 计算），不取作者的静态 zIndex 声明。
 * @param {BoxBuilder} builder 浮动视口 builder
 * @param {number} zIndex 系统分配的层级值
 * @returns {Object} 定位容器样式
 */
function getFloatingItemStyle(builder, zIndex) {
  return {
    position: 'fixed',
    left: builder._posX ?? 0,
    top: builder._posY ?? 0,
    zIndex,
    pointerEvents: 'auto',
  };
}

/**
 * 取浮动视口的当前视觉尺寸（回退链：显式 _viewWidth/_viewHeight → default →
 * fixed(min===max) → 实际渲染容器尺寸）。渲染期读取：缩放拖拽中 _viewWidth 已
 * 同步写入，FloatingLayer 重渲染即读到最新值；投影期（_frozenViewportSize 已
 * 设置）三层以冻结尺寸布局、特效层 transform 放大到视觉尺寸，包壳须按视觉尺寸
 * 裁剪（scale 放大后的内容正好填满）。
 * @param {BoxBuilder} builder 浮动视口 builder
 * @returns {{width: number|undefined, height: number|undefined}} 视觉尺寸；未知时 undefined（包壳随内容撑开）
 */
function getFloatingVisualSize(builder) {
  const width = builder._viewWidth ?? builder._defaultWidth
    ?? safeNum(builder._minWidth === builder._maxWidth ? builder._minWidth : null)
    ?? safeNum(builder._containerSize?.width) ?? 0;
  const height = builder._viewHeight ?? builder._defaultHeight
    ?? safeNum(builder._minHeight === builder._maxHeight ? builder._minHeight : null)
    ?? safeNum(builder._containerSize?.height) ?? 0;
  return {
    width: width > 0 ? width : undefined,
    height: height > 0 ? height : undefined,
  };
}

/**
 * 取可操作窗口遮罩的样式：全屏 + 层级由调用处传入。
 * 遮罩与各浮动视口同级参与层叠比较，恰好压住所有非可操作窗口，
 * 又不遮挡可操作窗口及其子窗口链（见 FloatingLayer 的渲染序推导）。
 * 颜色与不透明度取主题普适配置（materials.mask / 颜色角色 'mask'），未声明用缺省值。
 * @param {number} zIndex 遮罩层级（= 可操作子树最低成员的 zIndex - 1）
 * @param {Theme|null} theme 当前主题
 * @returns {Object} 遮罩样式
 */
function getFloatingMaskStyle(zIndex, theme) {
  const spec = theme?.getMask();
  const color = spec?.color ?? theme?.resolveColor('mask') ?? DEFAULT_MASK_COLOR;
  const opacity = spec?.opacity ?? DEFAULT_MASK_OPACITY;
  const rgba = hexToRgba(color, opacity);
  return {
    ...FLOATING_MASK_STYLE,
    zIndex,
    backgroundColor: rgba || color,
    ...(rgba ? {} : { opacity }),
  };
}

/** @type {string} 非焦点窗口边框缺省色（主题未声明 windowFrame 时） */
const DEFAULT_FRAME_COLOR = '#CAC4D0';
/** @type {string} 焦点窗口边框缺省色 */
const DEFAULT_FOCUSED_FRAME_COLOR = '#79747E';

/**
 * 取浮动窗口框架样式（边框 + 阴影，区分焦点/非焦点窗口）。
 * 取值取主题普适配置（materials.windowFrame，见 Theme#getWindowFrame），
 * 未声明用内建缺省；阴影档走 MD3 elevation 表（shape.js ELEVATIONS）。
 * 框架画在浮动窗口的定位容器上（不占用三层内容的布局尺寸，border-box 下
 * 包壳不被边框压缩）。
 * @param {Theme|null} theme 当前主题
 * @param {boolean} focused 是否为焦点窗口（渲染序最顶）
 * @returns {Object} 框架样式片段（border + boxShadow）
 */
function getWindowFrameStyle(theme, focused) {
  const spec = theme?.getWindowFrame?.() ?? {};
  const width = spec.borderWidth ?? 1;
  const colorRole = (focused ? spec.focusedBorderColor : spec.borderColor) ?? spec.borderColor;
  const color = theme?.resolveColor?.(colorRole) ?? colorRole
    ?? (focused ? DEFAULT_FOCUSED_FRAME_COLOR : DEFAULT_FRAME_COLOR);
  const level = focused ? (spec.focusedElevation ?? 3) : (spec.elevation ?? 1);
  return { border: `${width}px solid ${color}`, ...elevationStyle(level) };
}

/**
 * 浮动视口关闭按钮（Box 层通用内容组件）。渲染 ✕ 按钮，点击关闭宿主浮动视口。
 * 经 BoxBuilder.content() 注入浮动视口的任意子 Box（如标题栏）即可生效；builder
 * 由 ContentNode 经 Context 注入（任意深度可读，指向内容所在的 box，其 _root 即
 * 浮动视口根），也可显式传入 builder prop 覆盖。Cell 层 CloseButtonCell 内部复用
 * 本组件（经 fill 嵌入插槽），关闭按钮视觉与逻辑单点收敛于本组件。
 * @param {Object} props 组件属性
 * @param {BoxBuilder} [props.builder] 内容所在的 box（显式传入时优先于 Context）
 * @returns {JSX.Element} 关闭按钮元素
 */
function FloatingCloseButton({ builder }) {
  const [hovered, setHovered] = useState(false);
  const injected = useContext(ContentBuilderContext);
  const theme = useTheme();
  const root = (builder || injected)?._root;
  if (!root?._isFloatingViewport) return null;
  // 颜色取主题颜色角色（danger / on-primary），圆角随主题圆角类型；未声明用缺省值
  const danger = theme?.resolveColor('danger') ?? 'rgba(200, 60, 60, 0.9)';
  const onPrimary = theme?.resolveColor('on-primary') ?? '#ffffff';
  return (
    <button
      type="button"
      aria-label="close"
      onClick={() => root.close()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 20, height: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: 'none', cursor: 'pointer',
        fontSize: 12, lineHeight: 1, padding: 0, userSelect: 'none',
        ...cornerStyle(theme?.getCornerType() || 'g1', 4),
        color: hovered ? onPrimary : 'rgba(255, 255, 255, 0.9)',
        backgroundColor: hovered ? danger : 'rgba(0, 0, 0, 0.28)',
      }}
    >
      {/* SVG 固定几何叉号（跨浏览器一致，不用 ✕ 文本字形） */}
      <svg width="12" height="12" viewBox="0 0 24 24" style={{ display: 'block' }} aria-hidden="true">
        <path
          d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

/**
 * 焦点陷阱（a11y，见 docs/improvement-plan.md 阶段 3 第一批）：
 * Tab / Shift+Tab 在容器内可聚焦元素间循环；容器内无可聚焦元素时焦点回容器自身。
 * @param {HTMLElement} containerEl 陷阱容器
 * @param {KeyboardEvent} e Tab 键事件
 */
const FOCUSABLE_SELECTOR = 'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';
function trapFocus(containerEl, e) {
  if (!containerEl) return;
  const items = [...containerEl.querySelectorAll(FOCUSABLE_SELECTOR)]
    .filter((el) => el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement);
  if (items.length === 0) { e.preventDefault(); containerEl.focus(); return; }
  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement;
  if (e.shiftKey && (active === first || !containerEl.contains(active))) {
    e.preventDefault(); last.focus();
  } else if (!e.shiftKey && (active === last || !containerEl.contains(active))) {
    e.preventDefault(); first.focus();
  }
}

/**
 * 单个浮动视口窗口：定位容器（position: fixed）+ 包壳（floating-shell）。
 * 包壳以视觉尺寸渲染、overflow hidden 裁剪边界外内容（edge/corner 拖拽手柄、
 * 投影放大溢出），保证任何内容不"支出"窗口视觉边界。缩放手柄在包壳内（包壳
 * 随视觉尺寸变化，手柄始终贴合视觉四角）。包壳尺寸在缩放拖拽中由
 * applyFloatingShellToDom/applyFloatingEffectToDom 直写 DOM 与鼠标同步。
 * 窗口内任意位置按下（捕获阶段）即触发聚焦（后聚焦居上）；关闭按钮不再由
 * 本层硬编码渲染，改由通用关闭按钮组件（FloatingCloseButton）经内容机制注入
 *（Box 层 content / Cell 层 CloseButtonCell）。
 * 窗口框架（边框 + 阴影，区分焦点/非焦点）画在定位容器上：border-box 下
 * 不占用三层内容的布局尺寸；圆角与包壳对齐（同一形状规范）。
 * @param {Object} props
 * @param {BoxBuilder} props.builder 浮动视口根 builder
 * @param {number} props.zIndex 系统分配的层级值
 * @param {boolean} [props.focused] 是否为焦点窗口（渲染序最顶）
 * @returns {JSX.Element} 浮动窗口元素
 */
function FloatingWindow({ builder, zIndex, focused }) {
  const shellRef = useRef(null);
  const itemRef = useRef(null);
  useEffect(() => {
    const rt = builder.runtime;
    rt.registerLayerRef(builder._path, 'shell', shellRef);
    return () => rt.unregisterLayerRef(builder._path, 'shell');
  }, [builder]);
  // a11y：窗口出现（挂载）即获得焦点；键盘可达（tabIndex=-1 可编程聚焦）
  useEffect(() => {
    itemRef.current?.focus({ preventScroll: true });
  }, []);
  const isOperable = builder.runtime.isOperable(builder);
  const theme = useTheme();
  const visual = getFloatingVisualSize(builder);
  // 包壳圆角随主题形状描述（浮动视口根的层规范/形状），overflow 裁剪与圆角对齐
  const { selfStyle: shellShape } = resolveBoxShape(builder, theme);
  const outerShape = { ...shellShape };
  const frameWidth = (theme?.getWindowFrame?.() ?? {}).borderWidth ?? 1;
  // 同心圆角对齐：定位容器带 borderWidth 边框时，包壳圆角内缩边框宽度——
  // 边框内缘曲线（radius − borderWidth，CSS 自动同心）与包壳裁剪边界贴合，
  // 拐角不错位；胶囊等大半径值（≥1000px）不调整
  const shellRadius = shellShape.borderRadius;
  if (frameWidth > 0 && typeof shellRadius === 'string' && shellRadius.endsWith('px')) {
    const r = parseFloat(shellRadius);
    if (isFinite(r) && r < 1000) {
      shellShape.borderRadius = `${Math.max(0, r - frameWidth)}px`;
    }
  }
  const shellStyle = {
    position: 'relative',
    overflow: 'hidden',
    ...shellShape,
    ...(visual.width !== undefined ? { width: visual.width } : {}),
    ...(visual.height !== undefined ? { height: visual.height } : {}),
  };
  const itemStyle = {
    ...getFloatingItemStyle(builder, zIndex),
    ...getWindowFrameStyle(theme, !!focused),
    // 定位容器圆角取形状规范原值（外缘曲线），包壳取内缩值（上方已调整）
    ...outerShape,
  };
  return (
    <div
      ref={itemRef}
      className="floating-window"
      style={itemStyle}
      role="dialog"
      aria-modal={isOperable ? true : undefined}
      tabIndex={-1}
      onMouseDownCapture={() => {
        builder.runtime.focusFloating(builder);
        itemRef.current?.focus({ preventScroll: true });
      }}
      onKeyDown={(e) => {
        // Esc 关闭：closable 窗口或可操作（模态）窗口；非模态面板不响应。
        // Tab 在可操作（模态）窗口内形成焦点循环
        if (e.key === 'Escape') {
          if (builder._closable || isOperable) { e.stopPropagation(); builder.close(); }
        } else if (e.key === 'Tab' && isOperable) {
          trapFocus(itemRef.current, e);
        }
      }}
    >
      <div className="floating-shell" ref={shellRef} style={shellStyle}>
        <ResizeEffectViewport builder={builder}>
          <ContentLayer builder={builder} />
          <EdgeLayer builder={builder} />
          <CornerLayer builder={builder} />
        </ResizeEffectViewport>
        {renderResizeHandles(builder)}
      </div>
    </div>
  );
}

/**
 * 浮动层组件：统一承载渲染所有浮动视口。
 * - 容器 position: fixed 铺满可视区域且 pointer-events: none，不拦截主内容交互
 * - 层级管理（父子窗口树 + 可操作窗口，见 docs/floating-window-tree-design.md）：
 *   浮动窗口树 _floatingTree 按"父在下、子在上、同层后出现/聚焦居上"组织。
 *   渲染序 = 树先序遍历，可操作子树整体提升到末尾（独占最高连续 z 区间），
 *   zIndex 从 2000 + 1 起按渲染序递增分配
 * - 遮罩完全由可操作窗口决定：仅当有效可操作窗口为浮动窗口时绘制单一全屏遮罩，
 *   层级 = 可操作子树最低成员的 zIndex - 1，恰好压住所有非可操作窗口、
 *   又不挡可操作窗口及其子窗口链；可操作窗口 = 根 viewport 时无遮罩
 * - 已关闭（close()）的浮动视口及其子树不渲染
 * - 每个浮动视口渲染为独立窗口（FloatingWindow：定位容器 + 包壳），内部复用
 *   完整三层渲染（Content/Edge/Corner）；三层整体被 ResizeEffectViewport（主题
 *   尺寸变化特效壳）包裹，浮层尺寸变化时三层同步参与特效（拉伸/缩小/模糊），
 *   包壳以视觉尺寸裁剪，边界外内容不"支出"窗口
 * @param {Object} props
 * @param {KitRuntime} [props.runtime] 所属运行时；缺省取全局默认 runtime。
 *   多实例场景为每个 runtime 各挂载一个 FloatingLayer
 * @returns {JSX.Element|null} 浮动层元素；无浮动视口时返回 null
 */
const FloatingLayer = ({ runtime = null }) => {
  const rt = runtime || getDefaultRuntime();
  const [, forceUpdate] = useState(0);
  // 订阅后立即强制刷新一次：补齐订阅生效前已发生的通知
  //（如与打开方在同一提交内挂载时，打开方的 effect 先于本订阅执行）
  useEffect(() => {
    const unsubscribe = rt.subscribeFloating(() => forceUpdate(n => n + 1));
    forceUpdate(n => n + 1);
    return unsubscribe;
  }, [rt]);
  const theme = useTheme();
  const order = rt.buildRenderOrder();
  if (order.length === 0) return null;
  // zIndex 按渲染序步进 2 分配（2001, 2003, ...）：窗口占奇数，遮罩取可操作窗口 z - 1
  // 的偶数位，严格介于"最后一个非可操作窗口"与"可操作子树首个成员"之间，避免层叠平局
  const zByPath = new Map();
  let nextZ = DEFAULT_FLOATING_ZINDEX + 1;
  order.forEach(b => { zByPath.set(b._path, nextZ); nextZ += 2; });
  // 遮罩层级 = 可操作子树最低成员（即可操作窗口自身）的 zIndex - 1
  const operable = rt.getEffectiveOperable();
  const maskZ = operable ? zByPath.get(operable._path) - 1 : null;
  // 焦点窗口 = 渲染序最顶（后聚焦/出现居上 + 可操作子树提升的终点）：
  // 框架样式（边框 + 阴影）按焦点态取 focused* 值，与非焦点窗口区分
  const topPath = order.length > 0 ? order[order.length - 1]._path : null;
  return (
    <div style={FLOATING_LAYER_STYLE} data-hk-scope="">
      {maskZ !== null && <div style={getFloatingMaskStyle(maskZ, theme)} />}
      {order.map(b => (
        <FloatingWindow key={b._path} builder={b} zIndex={zByPath.get(b._path)} focused={b._path === topPath} />
      ))}
    </div>
  );
};

export { ContentLayer, EdgeLayer, CornerLayer, FloatingLayer, FloatingCloseButton, applyFloatingSizeToDom, syncFloatingFrame };
