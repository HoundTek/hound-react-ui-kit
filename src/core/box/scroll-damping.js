/**
 * @file 滚动阻尼。拦截内容层容器的 wheel 事件，把离散的滚轮增量累积为滚动
 *        目标位置，经 rAF 指数衰减动画平滑逼近（阻尼感）；覆盖层经 scroll
 *        事件镜像 transform，天然跟随阻尼动画，无需额外同步。
 *
 * 语义约束：
 * - 滚动链保持：目标位置到达滚动边界后，该方向的增量不再消费（返回 false），
 *   调用方放行事件（不 preventDefault），沿 DOM 冒泡到外层可滚容器
 * - 外部滚动源（滚动条拖拽、键盘、程序化滚动、覆盖层直写）经 scroll 事件检测，
 *   动画目标立即重新对齐实际位置，不与外部写入拉扯
 * - deltaMode 归一：Firefox 可能按行（1）/按页（2）给出增量，统一折算为 px
 */

/** 每帧向目标逼近的比例（指数衰减系数；越大越跟手，越小阻尼越重） */
const DAMPING_FACTOR = 0.28;
/** 收敛阈值（px）：与目标的剩余距离小于该值时吸附到目标并停止动画 */
const SETTLE_EPSILON = 0.5;
/**
 * 手势间隔（ms）：两次 wheel 事件间隔超过该时长视为新手势。
 * 嵌套滚动链的语义：一次连续手势只服务一个可滚容器；容器滚到边界后
 * 继续滚动（含惯性）只在原地吞掉，不冒泡到外层；用户停顿后重新滚动的
 * 新一轮手势才允许上移一层——每轮手势最多滚动一个区域。
 */
const GESTURE_GAP_MS = 280;

/** @type {WeakMap<HTMLElement, {addDelta: Function, dispose: Function}>} 各滚动容器的阻尼控制器 */
const _controllers = new WeakMap();

/**
 * 当前滚动手势（模块级共享，所有滚动容器与覆盖层转发共用一份）。
 * owner 为本轮手势唯一服务的容器；lastEvent 用于同一原生事件在冒泡链路中
 * 只判定一次手势归属。
 */
const _gesture = { owner: null, axis: null, dir: 0, lastTime: 0, lastEvent: null };

/**
 * 容器在指定轴上朝 dir 方向是否还能滚动（1px 容差吸收取整差异）。
 * @param {HTMLElement} el 容器
 * @param {'x'|'y'} axis 轴
 * @param {number} dir 方向：1 向后（下/右）、-1 向前（上/左）
 * @returns {boolean} 是否可滚
 */
function canScroll(el, axis, dir) {
  if (!el || el.nodeType !== 1) return false;
  const max = axis === 'y'
    ? el.scrollHeight - el.clientHeight
    : el.scrollWidth - el.clientWidth;
  if (max <= 1) return false;
  const pos = axis === 'y' ? el.scrollTop : el.scrollLeft;
  return dir > 0 ? pos < max - 1 : pos > 1;
}

/**
 * 从 start 沿父链向上查找最近的可滚容器（只找到第一个，保证"一层滚动"）。
 * @param {HTMLElement|null} start 起点（不含自身之前已判定过的容器）
 * @param {'x'|'y'} axis 轴
 * @param {number} dir 方向
 * @returns {HTMLElement|null} 最近的可滚容器；没有返回 null
 */
function findScrollable(start, axis, dir) {
  let node = start;
  while (node && node.nodeType === 1) {
    if (_controllers.has(node) && canScroll(node, axis, dir)) return node;
    node = node.parentElement;
  }
  return null;
}

/**
 * 滚轮手势路由（内容层与覆盖层转发共用）。语义：
 * - 以光标所在的最内层可滚容器为准；该层在当前方向上已到边界时，本轮手势
 *   只上移一层（滚动下一个外层容器），且只滚动这一个区域
 * - 一轮手势（相邻 wheel 事件间隔 < GESTURE_GAP_MS 且方向不变）始终服务同一
 *   容器；该容器滚到边界后的剩余增量全部吞掉（preventDefault + stopPropagation），
 *   不会在同一轮手势里连锁滚动外层
 * - 用户停顿后重新滚动，才开始新一轮手势，允许再上移一层
 * @param {HTMLElement} el 收到事件的滚动容器（或覆盖层转发到的内容容器）
 * @param {number} dx 水平增量（px，已归一化）
 * @param {number} dy 垂直增量（px，已归一化）
 * @param {WheelEvent} event 原生事件
 * @returns {boolean} 是否消费该增量（调用方无需再处理事件）
 */
export function routeWheel(el, dx, dy, event) {
  if (!el || !event || !dx && !dy) return false;
  const axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
  const delta = axis === 'x' ? dx : dy;
  if (!delta) return false;
  const dir = delta > 0 ? 1 : -1;
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();

  // 同一原生事件在冒泡链路上只判定一次手势归属（lastEvent 去重）
  if (_gesture.lastEvent !== event) {
    _gesture.lastEvent = event;
    const fresh = !_gesture.owner
      || now - _gesture.lastTime > GESTURE_GAP_MS
      || _gesture.axis !== axis
      || _gesture.dir !== dir;
    if (fresh) {
      _gesture.owner = canScroll(el, axis, dir) ? el : findScrollable(el.parentElement, axis, dir);
      _gesture.axis = axis;
      _gesture.dir = dir;
    }
    _gesture.lastTime = now;
  }

  const owner = _gesture.owner;
  // 本轮手势只服务 owner 一层；链路中的其他容器放行（让事件继续冒泡到 owner）
  if (!owner || owner !== el) return false;
  if (!canScroll(el, axis, dir)) {
    // 已到边界：吞掉剩余增量，阻断浏览器原生滚动链，等待用户停顿后新手势
    event.preventDefault();
    event.stopPropagation();
    return true;
  }
  const damping = _controllers.get(el);
  if (!damping) return false;
  if (!damping.addDelta(dx, dy)) {
    // 阻尼目标已顶到边界（实测位置仍在收敛途中）：同样吞掉剩余增量，
    // 否则事件冒泡会让浏览器原生滚动链跳跃多层
    event.preventDefault();
    event.stopPropagation();
    return true;
  }
  event.preventDefault();
  event.stopPropagation();
  return true;
}

/**
 * 为滚动容器创建阻尼控制器
 * @param {HTMLElement} el 滚动容器（内容层容器）
 * @returns {{addDelta: (dx: number, dy: number) => boolean, dispose: () => void}} 控制器
 */
function createController(el) {
  const state = {
    targetTop: el.scrollTop,
    targetLeft: el.scrollLeft,
    raf: null,
    // 本控制器最近一次写入（或认可）的位置：scroll 事件位置与之不符即外部滚动
    lastTop: el.scrollTop,
    lastLeft: el.scrollLeft,
  };

  const write = (left, top) => {
    el.scrollLeft = left;
    el.scrollTop = top;
    // 写后读回实际值（浏览器可能取整/钳制），作为下一次外部检测的基准
    state.lastLeft = el.scrollLeft;
    state.lastTop = el.scrollTop;
  };

  const tick = () => {
    state.raf = null;
    const dTop = state.targetTop - el.scrollTop;
    const dLeft = state.targetLeft - el.scrollLeft;
    if (Math.abs(dTop) < SETTLE_EPSILON && Math.abs(dLeft) < SETTLE_EPSILON) {
      write(state.targetLeft, state.targetTop);
      return;
    }
    write(
      Math.abs(dLeft) < SETTLE_EPSILON ? state.targetLeft : el.scrollLeft + dLeft * DAMPING_FACTOR,
      Math.abs(dTop) < SETTLE_EPSILON ? state.targetTop : el.scrollTop + dTop * DAMPING_FACTOR,
    );
    state.raf = requestAnimationFrame(tick);
  };

  const ensureRaf = () => {
    if (state.raf === null) state.raf = requestAnimationFrame(tick);
  };

  /**
   * 把滚动增量累积进阻尼目标（按边界钳制）并启动动画。
   * @param {number} dx 水平增量（px）
   * @param {number} dy 垂直增量（px）
   * @returns {boolean} 增量是否被消费（容器在增量方向上仍可滚动）；
   *   false 时调用方应放行事件以保持滚动链
   */
  const addDelta = (dx, dy) => {
    const maxTop = Math.max(0, el.scrollHeight - el.clientHeight);
    const maxLeft = Math.max(0, el.scrollWidth - el.clientWidth);
    const nextTop = Math.min(Math.max(state.targetTop + dy, 0), maxTop);
    const nextLeft = Math.min(Math.max(state.targetLeft + dx, 0), maxLeft);
    const consumed = (dy !== 0 && nextTop !== state.targetTop)
      || (dx !== 0 && nextLeft !== state.targetLeft);
    if (!consumed) return false;
    state.targetTop = nextTop;
    state.targetLeft = nextLeft;
    ensureRaf();
    return true;
  };

  // 外部滚动源改变位置（scroll 事件位置与本控制器写入基准不符）时，
  // 把阻尼目标对齐到实际位置，避免动画回拉外部滚动
  const onScroll = () => {
    if (Math.abs(el.scrollTop - state.lastTop) > SETTLE_EPSILON
      || Math.abs(el.scrollLeft - state.lastLeft) > SETTLE_EPSILON) {
      state.targetTop = el.scrollTop;
      state.targetLeft = el.scrollLeft;
      state.lastTop = el.scrollTop;
      state.lastLeft = el.scrollLeft;
    }
  };

  const onWheel = (e) => {
    if (e.ctrlKey) return; // 触控板捏合缩放等手势放行
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? el.clientHeight : 1;
    // 手势路由（见 routeWheel）：一次连续手势只服务一个可滚容器，
    // 到边界后原地吞掉，用户停顿后的新手势才允许上移一层
    routeWheel(el, e.deltaX * unit, e.deltaY * unit, e);
  };

  el.addEventListener('wheel', onWheel, { passive: false });
  el.addEventListener('scroll', onScroll, { passive: true });

  const controller = {
    addDelta,
    dispose() {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('scroll', onScroll);
      if (state.raf !== null) cancelAnimationFrame(state.raf);
      _controllers.delete(el);
    },
  };
  _controllers.set(el, controller);
  return controller;
}

/**
 * 为滚动容器挂上阻尼（幂等：同一元素复用既有控制器）
 * @param {HTMLElement} el 滚动容器
 * @returns {{addDelta: Function, dispose: Function}} 阻尼控制器
 */
export function attachScrollDamping(el) {
  return _controllers.get(el) ?? createController(el);
}

/**
 * 取滚动容器已挂接的阻尼控制器（供覆盖层 wheel 转发路由到阻尼目标）
 * @param {HTMLElement} el 滚动容器
 * @returns {{addDelta: Function, dispose: Function}|undefined} 控制器；未挂接返回 undefined
 */
export function getScrollDamping(el) {
  return _controllers.get(el);
}
