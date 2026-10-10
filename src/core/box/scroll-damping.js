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

/** @type {WeakMap<HTMLElement, {addDelta: Function, dispose: Function}>} 各滚动容器的阻尼控制器 */
const _controllers = new WeakMap();

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
    if (addDelta(e.deltaX * unit, e.deltaY * unit)) {
      // 已消费：阻断默认滚动与冒泡（事件冒泡会穿过外层容器，不阻断则
      // 嵌套可滚盒被外层重复消费——滚动链只认最内层可滚容器）
      e.preventDefault();
      e.stopPropagation();
    }
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
