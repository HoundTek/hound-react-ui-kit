/**
 * @file 滚动阻尼。拦截内容层容器的 wheel 事件，把离散的滚轮增量累积为滚动
 *        目标位置，经 rAF 指数衰减动画平滑逼近（阻尼感）；覆盖层经 scroll
 *        事件镜像 transform，天然跟随阻尼动画，无需额外同步。
 *
 * 语义约束（手势级路由）：
 * - **一次滚动 = 一次手势**：从首个 wheel 事件到**滚轮输入静止**（无新 wheel 事件）
 *   达 0.3s 为一个手势；这里的「静止」只指**滚轮静止**，与页面是否静止、动画是否
 *   收敛、滚动量是否变化无关。手势开始时以**光标所在处为起点**沿父链向上选定
 *   「滚动归属层」（内向外第一个当前方向还能滚的容器，已到底的层被跳过）
 * - 手势期间增量只交给当前的归属层，**手势内绝不换层**：该层在本方向上**到底**后
 *   仍继续滚，就转为**过度滚动**（见下）——滚轮没停就不往外层跳，免得多滚一下
 *   就整块界面跳到外层。滚轮静止（手势结束）后，用户再次滚动时才重新从光标处
 *   选层，已经到底的层被跳过、自然交给更外层
 * - 到底后的**过滚位移由「累积输入」的对数映射得到**：`位移 = ln(1 + 累积输入)`
 *   （累积输入 = 到底后被吞掉的滚轮位移，带符号）。对数的增量随累积递减，所以
 *   越拉越紧、大输入也只有缓慢增长（不需要硬上限）；位移在 0 处连续、导数 1，
 *   触发过滚时不会跳出一大段。位移写容器 transform、方向与正常滚动同向。
 *   滚轮静止后指数回弹归零；反方向滚动先把过滚位移抵消回 0，余量再滚内容
 * - **只在本层允许滚动的轴上滚**：controller 带轴能力（x/y，由 Box 的
 *   moveX/moveY 决定），非滚动方向的滚轮输入既不滚内容、也不产生过滚位移
 *   （否则一个"双轴锁定"的容器会被横/纵向滚轮拽得离开原位）
 * - 手势结束（滚轮静止 0.3s）后手势重置，用户再次滚动才重新从光标处选层
 *   （内层又能滚时回到内层）
 * - 方向反转视为新手势（立即重新选层）
 * - 外部滚动源（滚动条拖拽、键盘、程序化滚动、覆盖层直写）经 scroll 事件检测，
 *   动画目标立即重新对齐实际位置，不与外部写入拉扯
 * - deltaMode 归一：Firefox 可能按行（1）/按页（2）给出增量，统一折算为 px
 */

/** 每帧向目标逼近的比例（指数衰减系数；越大越跟手，越小阻尼越重） */
const DAMPING_FACTOR = 0.28;
/** 收敛阈值（px）：与目标的剩余距离小于该值时吸附到目标并停止动画 */
const SETTLE_EPSILON = 0.5;
/** 端部容差（px）：距边界不足该值即视为「已到底」——引擎把滚动偏移量化到
 *  整/半像素，钳制值可能读回比 scrollHeight - clientHeight 小 1px 以内 */
const EDGE_EPSILON = 1;
/** 手势静止阈值（ms）：**滚轮输入**静止（无新 wheel 事件）达 0.3s 即手势结束——
 *  与页面/动画/滚动量是否静止无关：用户停手就算一次滚动结束，再次滚动才重新选层 */
const GESTURE_IDLE_MS = 300;
/** 过滚映射系数：视觉位移 = 系数 × ln(1 + 累积输入)。累积输入是「到底后被吞掉的
 *  滚轮位移」，对数让增量随累积递减——越拉越紧，且没有硬上限。
 *  取 1 就是公式原样（在 0 处导数为 1、位移从 0 连续长出，触发过滚的那一下不会
 *  突然跳出一大段）；调大等于放大位移，同时也会放大起手那一下的跳变 */
const OVERSCROLL_LOG_SCALE = 1;
/** 过滚回弹系数：每帧向 0 逼近的比例（指数衰减） */
const OVERSCROLL_REBOUND = 0.16;
/** 过滚回弹收敛阈值（px）：小于该值直接归零并清除 transform */
const OVERSCROLL_EPSILON = 0.5;

/** @type {WeakMap<HTMLElement, Object>} 各滚动容器的阻尼控制器（结构见 createController） */
const _controllers = new WeakMap();

/** @type {WeakMap<HTMLElement, Set<Function>>} 过滚位移订阅（浮动滚动条滑块缩短用） */
const _overSubscribers = new WeakMap();

/**
 * 订阅容器过滚位移的变化（浮动滚动条据此按比例缩短滑块，见 floating-scrollbar.jsx）。
 * 以容器元素为键：先订阅、后建控制器也生效（滚动条与内容层的挂载顺序无关）。
 * @param {HTMLElement} el 滚动容器
 * @param {Function} fn 回调，入参为过滚视觉位移（px，带符号；0 = 不在过滚）
 * @returns {Function} 取消订阅
 */
export function subscribeOverScroll(el, fn) {
  if (!el || typeof fn !== 'function') return () => {};
  let set = _overSubscribers.get(el);
  if (!set) {
    set = new Set();
    _overSubscribers.set(el, set);
  }
  set.add(fn);
  return () => {
    set.delete(fn);
    if (set.size === 0) _overSubscribers.delete(el);
  };
}

/**
 * 广播某容器当前的过滚位移
 * @param {HTMLElement} el 滚动容器
 * @param {number} offset 过滚视觉位移（px，带符号；0 = 不在过滚）
 * @returns {void}
 */
function emitOver(el, offset) {
  const set = _overSubscribers.get(el);
  if (set) set.forEach((fn) => fn(offset));
}

/**
 * 最近一次已路由的原生 wheel 事件（同一事件在冒泡链路上只路由一次：
 * 最内层监听已完成向上查找，外层容器若仍收到同事件不应重复消费）。
 */
const _routing = { lastEvent: null };

/**
 * 当前滚动手势：归属层控制器 + 方向。owner 为 null 表示手势已结束，
 * 下一次 wheel 事件将重新选层。
 * - axis/dir：最近一次输入的主轴与方向（符号），用于识别反转
 * - timer：停手检测定时器（见 scheduleGestureEnd）
 */
const _gesture = { owner: null, axis: null, dir: 0, timer: null };

/** 结束当前手势（清除归属层与定时器），下次输入重新选层 */
function endGesture() {
  if (_gesture.timer !== null) {
    clearTimeout(_gesture.timer);
    _gesture.timer = null;
  }
  const owner = _gesture.owner;
  _gesture.owner = null;
  _gesture.axis = null;
  _gesture.dir = 0;
  _routing.lastEvent = null;
  // 滚轮静止即手势结束：残留的过滚位移开始回弹归零
  if (owner) owner.rebound();
}

/**
 * 重置「滚轮静止」计时：每次有效 wheel 输入都重新计时，0.3s 内没有新输入即结束手势。
 * 只看输入，不看动画是否收敛（阻尼动画还没走完也没关系，手势照样结束）。
 */
function scheduleGestureEnd() {
  if (_gesture.timer !== null) clearTimeout(_gesture.timer);
  _gesture.timer = setTimeout(() => {
    _gesture.timer = null;
    endGesture();
  }, GESTURE_IDLE_MS);
}

/**
 * 从给定容器沿父链向上找当前方向还能滚的最近一层（跳过已到底的层）。
 * 只在**手势起点**调用：起点是收到 wheel 事件的最内层容器（事件沿冒泡链先到达
 * 它），因此天然以「光标所在的最内层嵌套滚动区」为准；已经到底的层被跳过，
 * 于是「内层滚完了、停下来再滚」时新手势会直接交给外层。
 * @param {HTMLElement} el 起点容器
 * @param {number} dx 水平增量（px）
 * @param {number} dy 垂直增量（px）
 * @returns {Object|null} 归属层控制器；无可用层返回 null
 */
function findGestureOwner(el, dx, dy) {
  let node = el;
  while (node && node.nodeType === 1) {
    const damping = _controllers.get(node);
    if (damping && damping.canConsume(dx, dy)) return damping;
    node = node.parentElement;
  }
  return null;
}

/**
 * 页面（浏览器原生滚动链）在这个方向上还能滚吗？
 * 能滚就放行（例如在浮层面板里把列表滚到底后，滚轮接着滚页面），
 * 只有页面也到头了（或页面根本不滚）才轮到「过滚」表达"到头了还在滚"。
 * @param {number} dx 水平增量（px）
 * @param {number} dy 垂直增量（px）
 * @returns {boolean} 页面是否还能滚
 */
function pageCanScroll(dx, dy) {
  const root = document.scrollingElement || document.documentElement;
  if (!root) return false;
  const maxTop = Math.max(0, root.scrollHeight - root.clientHeight);
  const maxLeft = Math.max(0, root.scrollWidth - root.clientWidth);
  if (dy > 0 && root.scrollTop < maxTop - EDGE_EPSILON) return true;
  if (dy < 0 && root.scrollTop > EDGE_EPSILON) return true;
  if (dx > 0 && root.scrollLeft < maxLeft - EDGE_EPSILON) return true;
  if (dx < 0 && root.scrollLeft > EDGE_EPSILON) return true;
  return false;
}

/**
 * 输入的主轴
 * @param {number} dx 水平增量（px）
 * @param {number} dy 垂直增量（px）
 * @returns {'x'|'y'} 主轴
 */
function axisOf(dx, dy) {
  return Math.abs(dy) >= Math.abs(dx) ? 'y' : 'x';
}

/**
 * 容器在该轴上是否真有可滚动溢出（内容比视口大）。
 * 过滚兜底只认真滚动区域：没有溢出的容器（如文字 Cell 的内容盒）本身"无处可滚"，
 * 对它做视觉位移就是肉眼可见的跳变
 * @param {HTMLElement} el 容器
 * @param {'x'|'y'} axis 轴
 * @returns {boolean} 是否为可滚动溢出的区域
 */
function hasOverflow(el, axis) {
  const size = axis === 'y'
    ? el.scrollHeight - el.clientHeight
    : el.scrollWidth - el.clientWidth;
  return size > EDGE_EPSILON;
}

/**
 * 手势起点找不到「本方向还能滚」的容器时的过滚目标：
 * - 页面原生滚动链在这个方向上还能滚 → null（放行，交给浏览器）
 * - 页面也到头了（或页面不滚）→ 返回光标所在的最内层**在该轴上允许滚动、且真有
 *   可滚溢出**的容器（对它做过滚）。双轴锁定（moveX/moveY 皆为 false）与
 *   "内容本来就装得下"的容器都不在候选内——否则它们会被滚轮拽出位移
 *   （如 SplitCell 的分界线边缘错位、文字 Cell 整体跳一下）
 * @param {HTMLElement} el 收到 wheel 事件的最内层容器
 * @param {number} dx 水平增量（px）
 * @param {number} dy 垂直增量（px）
 * @returns {Object|null} 过滚目标控制器；无可用目标返回 null
 */
function overFallbackOwner(el, dx, dy) {
  if (pageCanScroll(dx, dy)) return null;
  const axis = axisOf(dx, dy);
  let node = el;
  while (node && node.nodeType === 1) {
    const damping = _controllers.get(node);
    if (damping && damping.allows(axis) && hasOverflow(damping.el, axis)) return damping;
    node = node.parentElement;
  }
  return null;
}

/**
 * 滚轮路由（内容层与覆盖层转发共用）。语义：任何时刻只滚动一个容器，
 * **手势内绝不换层**（滚轮没停就不往外层跳）。
 * - 手势开始时（或方向反转）：沿父链取第一个「当前方向还能滚」的容器为归属层，
 *   已到底的层被跳过；一个可滚层都没有时，页面也到头了就取光标处最内层容器
 *   做过滚，页面还能滚则放行（交给浏览器原生滚动链）
 * - 手势进行中：增量只交给当前归属层。该层在本方向上**已经到底**时不再换层，
 *   而是转成过度滚动（见 createController 的 addOver：对数拉力 + 静止回弹）——
 *   这样"到头了还在滚"有明确的物理反馈，而不是多滚一下就整块界面跳到外层
 * - 滚轮静止（0.3s 无输入）手势结束，用户再次滚动时重新从光标处选层
 * @param {HTMLElement} el 收到事件的滚动容器（或覆盖层转发到的内容容器）
 * @param {number} dx 水平增量（px，已归一化）
 * @param {number} dy 垂直增量（px，已归一化）
 * @param {WheelEvent} event 原生事件
 * @returns {boolean} 是否消费该增量（调用方无需再处理事件）
 */
export function routeWheel(el, dx, dy, event) {
  if (!el || !event || (!dx && !dy)) return false;
  // 同一原生事件在冒泡链路上只路由一次（最内层已完成向上查找）
  if (_routing.lastEvent === event) return false;
  _routing.lastEvent = event;

  // 方向反转 = 新手势：立即丢弃旧归属层并重新选层。主轴切换只在当前归属层不允许
  // 该轴时才算新手势（触控板斜向滚动的主动轴漂移不该打断手势、更不该换层）
  const axis = axisOf(dx, dy);
  const dir = axis === 'y' ? Math.sign(dy) : Math.sign(dx);
  if (_gesture.owner && (
    (_gesture.dir !== dir && dir !== 0)
    || (_gesture.axis !== axis && !_gesture.owner.allows(axis))
  )) {
    endGesture();
    _routing.lastEvent = event;
  }

  if (!_gesture.owner) {
    _gesture.owner = findGestureOwner(el, dx, dy) || overFallbackOwner(el, dx, dy);
  }
  // 记录本次输入的主轴与方向：反转判定以上一次输入为基准
  _gesture.axis = axis;
  _gesture.dir = dir;
  const owner = _gesture.owner;
  if (!owner) return false;
  if (owner.canConsume(dx, dy)) {
    owner.addDelta(dx, dy);
  } else if (!owner.addOver(dx, dy)) {
    // 本层在该轴上不允许滚动（moveX/moveY 为 false）：不滚内容、不做位移，
    // 也不吞事件——放行给外层容器/浏览器（同一事件允许外层重新路由）
    endGesture();
    _routing.lastEvent = null;
    return false;
  }
  // 本层在本方向已到底（实际位置贴边）：手势内不换层，转为过度滚动
  // （对数拉力 + 滚轮静止后回弹）；想往外层滚，得先停一下滚轮再滚
  event.preventDefault();
  event.stopPropagation();
  scheduleGestureEnd();
  return true;
}

/**
 * 归一化并按手势路由一次原生 wheel 事件。内容层自身监听与浮动滚动条转发共用
 * （滚动条挂在该容器的 wrapper 上、不在容器内，见 BoxLayerFrame 的 extra 说明）。
 * @param {HTMLElement} el 滚动容器
 * @param {WheelEvent} event 原生 wheel 事件
 * @returns {boolean} 是否消费该事件
 */
export function routeWheelEvent(el, event) {
  if (!el || !event || event.ctrlKey) return false; // 触控板捏合缩放等手势放行
  const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? el.clientHeight : 1;
  return routeWheel(el, event.deltaX * unit, event.deltaY * unit, event);
}

/**
 * 为滚动容器创建阻尼控制器
 * @param {HTMLElement} el 滚动容器（内容层容器）
 * @param {{x?: boolean, y?: boolean}} [axes] 本层允许滚动的轴（由 Box 的
 *   moveX/moveY 决定）；缺省两轴都允许。非滚动方向的输入既不滚也不过滚
 * @returns {{el: HTMLElement, addDelta: Function, addOver: Function, rebound: Function,
 *   canConsume: Function, allows: Function, dispose: Function}} 控制器
 */
function createController(el, axes) {
  // 轴能力可运行时更新（Box 的 moveX/moveY 可能在 reflow 后被改）
  const cap = { allowX: axes ? axes.x !== false : true, allowY: axes ? axes.y !== false : true };
  const allowX = () => cap.allowX;
  const allowY = () => cap.allowY;
  const state = {
    targetTop: el.scrollTop,
    targetLeft: el.scrollLeft,
    raf: null,
    // 本控制器最近一次写入（或认可）的位置：scroll 事件位置与之不符即外部滚动
    lastTop: el.scrollTop,
    lastLeft: el.scrollLeft,
    // 过滚（过度滚动）：纯视觉位移，不动 scrollTop 与布局
    // overAcc = 到底后被吞掉的滚轮位移（带符号累积：正 = 想继续往后滚）；
    // 视觉位移由它经对数映射得到（见 overOffset），不用另存一份位移
    overAcc: 0,
    overAxis: 'y',
    overRaf: null,
    // 容器原有的 inline transform（过滚结束后原样还回去）
    overBase: el.style.transform || '',
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
    const beforeTop = el.scrollTop;
    const beforeLeft = el.scrollLeft;
    write(
      Math.abs(dLeft) < SETTLE_EPSILON ? state.targetLeft : beforeLeft + dLeft * DAMPING_FACTOR,
      Math.abs(dTop) < SETTLE_EPSILON ? state.targetTop : beforeTop + dTop * DAMPING_FACTOR,
    );
    // 引擎会把滚动偏移量化（整/半像素）：末段插值写可能被截断回原值，位置
    // 不再靠近目标却仍差一截——继续 rAF 会永远不收敛，手势也就永不结束
    // （表现为滚到边界后再滚不上移、卡在同一层）。此时先直落目标（目标本身
    // 是钳制后的合法值），仍到不了就把目标对齐实际位置并收手，保证静止判定成立
    if (el.scrollTop === beforeTop && el.scrollLeft === beforeLeft) {
      write(state.targetLeft, state.targetTop);
      if (el.scrollTop === beforeTop) state.targetTop = beforeTop;
      if (el.scrollLeft === beforeLeft) state.targetLeft = beforeLeft;
      return;
    }
    state.raf = requestAnimationFrame(tick);
  };

  const ensureRaf = () => {
    if (state.raf === null) state.raf = requestAnimationFrame(tick);
  };

  /**
   * 累积输入 → 视觉位移：`-sign(acc) × ln(1 + |acc|)`（见 OVERSCROLL_LOG_SCALE）。
   * 对数让增量随累积递减（越拉越紧、大输入也只有缓慢增长），在 0 处连续且导数
   * 为 1 —— 触发过滚那一下不会突然跳出一大段；位移方向与正常滚动同向
   * （向下滚时内容继续上移，translateY 为负）。
   * @param {number} acc 到底后被吞掉的滚轮位移（带符号累积）
   * @returns {number} 视觉位移（px）
   */
  const overOffset = (acc) => (acc === 0
    ? 0
    : -Math.sign(acc) * OVERSCROLL_LOG_SCALE * Math.log(1 + Math.abs(acc)));

  /**
   * 视觉位移 → 累积输入（对数映射的反函数）：回弹时两者一一对应，
   * 回弹途中的新输入从当前位移继续拉，不会跳位。
   * @param {number} offset 视觉位移（px）
   * @returns {number} 对应的累积输入
   */
  const overAccFrom = (offset) => (offset === 0
    ? 0
    : -Math.sign(offset) * (Math.exp(Math.abs(offset) / OVERSCROLL_LOG_SCALE) - 1));

  /** 把过滚位移写到容器 transform（纯视觉：不改布局、不改 scrollTop） */
  const applyOver = () => {
    const v = Math.round(overOffset(state.overAcc) * 10) / 10;
    // 广播给订阅方（浮动滚动条按同一位移缩短滑块；0 表示已回到原位）
    emitOver(el, v);
    if (v === 0) {
      el.style.transform = state.overBase;
      return;
    }
    el.style.transform = state.overAxis === 'y'
      ? `translate3d(0, ${v}px, 0)`
      : `translate3d(${v}px, 0, 0)`;
  };

  /** 停止回弹动画（新的滚轮输入到来时由输入接管位移） */
  const cancelRebound = () => {
    if (state.overRaf !== null) cancelAnimationFrame(state.overRaf);
    state.overRaf = null;
  };

  /**
   * 过滚（内部：本层在本方向已到底、滚轮却还在滚）：把增量累积成**带拉力的
   * 视觉位移**。位移由累积输入的对数映射得到——增量递减、越拉越紧，大输入
   * 也只有缓慢增长（到"拉不动"只剩张力），且不影响布局、仍算「已到底」。
   * 只在本层允许滚动的轴上累积：落在禁用轴的输入直接丢弃（不滚也不过滚）。
   * @param {number} dx 水平增量（px）
   * @param {number} dy 垂直增量（px）
   * @returns {boolean} 是否消费该增量
   */
  const addOver = (dx, dy) => {
    cancelRebound();
    const preferY = Math.abs(dy) >= Math.abs(dx);
    let axis = null;
    let delta = 0;
    if (preferY) {
      if (allowY() && dy) { axis = 'y'; delta = dy; }
      else if (allowX() && dx) { axis = 'x'; delta = dx; }
    } else {
      if (allowX() && dx) { axis = 'x'; delta = dx; }
      else if (allowY() && dy) { axis = 'y'; delta = dy; }
    }
    if (!axis) return false; // 非滚动方向：不消费（放给外层/浏览器）
    if (state.overAcc !== 0 && state.overAxis !== axis) {
      // 已在一个轴上拉出位移：换轴先把这个轴的位移还回去，再按新轴累积
      state.overAcc = 0;
    }
    state.overAxis = axis;
    state.overAcc += delta;
    applyOver();
    return true;
  };

  /**
   * 过滚回弹：滚轮静止（手势结束）后把过滚位移指数衰减回 0，并还原容器 transform。
   * 每帧同时把累积输入按反函数写回，保证「回弹途中的新输入」从当前位移继续拉。
   * @returns {void}
   */
  const rebound = () => {
    let offset = overOffset(state.overAcc);
    if (offset === 0 || state.overRaf !== null) return;
    const step = () => {
      offset *= 1 - OVERSCROLL_REBOUND;
      if (Math.abs(offset) < OVERSCROLL_EPSILON) {
        state.overAcc = 0;
        state.overRaf = null;
        applyOver();
        return;
      }
      state.overAcc = overAccFrom(offset);
      applyOver();
      state.overRaf = requestAnimationFrame(step);
    };
    state.overRaf = requestAnimationFrame(step);
  };

  /**
   * 把滚动增量累积进阻尼目标（按边界钳制）并启动动画。
   * 是否已到边界由 routeWheel 用 canConsume 判定（本方法只负责钳制与动画）。
   * 过滚未回弹时，输入先用于拉动过滚：同向继续拉、反向先抵消、越过 0 的余量
   * 再滚内容（避免带着视觉位移一开始滚就"跳位"）。
   * @param {number} dx 水平增量（px）
   * @param {number} dy 垂直增量（px）
   * @returns {boolean} 本层是否消费了增量
   */
  const addDelta = (dx, dy) => {
    cancelRebound();
    // 非滚动方向的增量直接丢弃：不滚内容、不进过滚（否则横滚轮能把竖排容器拖歪）
    let mx = allowX() ? dx : 0;
    let my = allowY() ? dy : 0;
    if (!mx && !my) return false;
    if (state.overAcc !== 0) {
      const axis = Math.abs(my) >= Math.abs(mx) ? 'y' : 'x';
      const delta = axis === 'y' ? my : mx;
      const next = state.overAcc + delta;
      if (next !== 0 && Math.sign(next) === Math.sign(state.overAcc)) {
        // 同向：继续拉过滚（不进内容）
        state.overAcc = next;
        applyOver();
        return true;
      }
      // 反向抵消完位移：余量继续滚内容（不丢增量）
      state.overAcc = 0;
      applyOver();
      if (axis === 'y') { my = next; mx = 0; } else { mx = next; my = 0; }
      if (!mx && !my) return true;
    }
    const maxTop = Math.max(0, el.scrollHeight - el.clientHeight);
    const maxLeft = Math.max(0, el.scrollWidth - el.clientWidth);
    const nextTop = Math.min(Math.max(state.targetTop + my, 0), maxTop);
    const nextLeft = Math.min(Math.max(state.targetLeft + mx, 0), maxLeft);
    const consumed = (my !== 0 && nextTop !== state.targetTop)
      || (mx !== 0 && nextLeft !== state.targetLeft);
    state.targetTop = nextTop;
    state.targetLeft = nextLeft;
    if (consumed) ensureRaf();
    return consumed;
  };

  /**
   * 本层在给定方向上是否还能滚。判定用**实际滚动位置**（不是阻尼目标）：
   * 手势起点与「手势内到底后上移一层」都用它——位置所见即所得，方向反转时
   * 同样适用。距端部不足 EDGE_EPSILON 视为已到底——引擎把偏移量化到整/半像素，
   * 钳制后的极限读数可能比 scrollHeight - clientHeight 小 1px 以内，否则
   * 「已经到底」的层会被误判成还能滚，把后面的增量一直接住。
   * 只认本层允许滚动的轴：非滚动方向永远返回 false（不滚、不过滚、不抢归属）。
   * @param {number} dx 水平增量（px）
   * @param {number} dy 垂直增量（px）
   * @returns {boolean} 是否还能消费该方向增量
   */
  const canConsume = (dx, dy) => {
    const maxTop = Math.max(0, el.scrollHeight - el.clientHeight);
    const maxLeft = Math.max(0, el.scrollWidth - el.clientWidth);
    if (allowY()) {
      if (dy > 0 && el.scrollTop < maxTop - EDGE_EPSILON) return true;
      if (dy < 0 && el.scrollTop > EDGE_EPSILON) return true;
    }
    if (allowX()) {
      if (dx > 0 && el.scrollLeft < maxLeft - EDGE_EPSILON) return true;
      if (dx < 0 && el.scrollLeft > EDGE_EPSILON) return true;
    }
    return false;
  };

  /**
   * 本层是否允许在该轴上滚（过滚目标筛选与路由用）
   * @param {'x'|'y'} axis 轴
   * @returns {boolean} 是否允许
   */
  const allows = (axis) => (axis === 'y' ? allowY() : allowX());

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

  const onWheel = (e) => routeWheelEvent(el, e);

  el.addEventListener('wheel', onWheel, { passive: false });
  el.addEventListener('scroll', onScroll, { passive: true });

  const controller = {
    // 归属层容器元素（手势起点按光标所在处筛选可滚层时用）
    el,
    addDelta,
    addOver,
    rebound,
    canConsume,
    allows,
    /**
     * 更新本层允许滚动的轴（Box 的 moveX/moveY 变化后调用）
     * @param {{x?: boolean, y?: boolean}} next 轴能力
     * @returns {void}
     */
    setAxes(next) {
      if (!next) return;
      cap.allowX = next.x !== false;
      cap.allowY = next.y !== false;
    },
    dispose() {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('scroll', onScroll);
      if (state.raf !== null) cancelAnimationFrame(state.raf);
      cancelRebound();
      state.overAcc = 0;
      applyOver(); // 还原容器原有 transform
      _controllers.delete(el);
      // 归属层被销毁时手势随即失效，避免路由到已卸载的容器
      if (_gesture.owner === controller) endGesture();
    },
  };
  _controllers.set(el, controller);
  return controller;
}

/**
 * 为滚动容器挂上阻尼（幂等：同一元素复用既有控制器）
 * @param {HTMLElement} el 滚动容器
 * @param {{x?: boolean, y?: boolean}} [axes] 本层允许滚动的轴（由 Box 的
 *   moveX/moveY 决定）；缺省两轴都允许
 * @returns {Object} 阻尼控制器（见 createController）
 */
export function attachScrollDamping(el, axes) {
  const existing = _controllers.get(el);
  if (existing) {
    if (axes) existing.setAxes(axes);
    return existing;
  }
  return createController(el, axes);
}

/**
 * 取滚动容器已挂接的阻尼控制器（供覆盖层 wheel 转发路由到阻尼目标）
 * @param {HTMLElement} el 滚动容器
 * @returns {Object|undefined} 控制器；未挂接返回 undefined
 */
export function getScrollDamping(el) {
  return _controllers.get(el);
}
