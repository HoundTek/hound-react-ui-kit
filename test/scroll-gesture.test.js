// @vitest-environment jsdom
/**
 * @file 滚动手势路由回归（scroll-damping.js 的 routeWheel）：
 *       一次滚动 = 一次手势，「静止」指**滚轮输入静止**（0.3s 内无新 wheel 事件，
 *       与页面/动画/滚动量是否静止无关）。
 * - 手势内**绝不换层**：滚轮没停就不往外层跳；归属层到底后仍在滚 → 过滚
 * - 过滚位移 = ln(1 + 累积输入)（累积输入 = 到底后被吞掉的滚轮位移），
 *   增量随累积递减（越拉越紧），0 处连续（触发那一下不跳变），滚轮静止后回弹归零
 * - 滚轮静止后新手势重新从光标处选层：已到底的层被跳过，自然交给外层
 * - 轴能力：非滚动方向（moveX/moveY 为 false）既不滚内容、也不产生过滚位移
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { attachScrollDamping, routeWheel, subscribeOverScroll } from '../src/core/box/scroll-damping';

/**
 * 造一个可滚容器：jsdom 不做布局，用 getter 冒充滚动尺寸。
 * @param {number} scrollHeight 内容高
 * @param {number} clientHeight 视口高
 * @param {HTMLElement} [parent] 父元素（用于造嵌套结构）
 * @param {boolean} [quantize] 是否模拟引擎把滚动偏移截断到整像素（真实浏览器
 *        就是这样：末段阻尼插值会被截断回原值，读不到目标位置）
 * @returns {HTMLElement} 容器元素
 */
function makeScroller(scrollHeight, clientHeight, parent, quantize) {
  const el = document.createElement('div');
  Object.defineProperty(el, 'scrollHeight', { get: () => scrollHeight, configurable: true });
  Object.defineProperty(el, 'clientHeight', { get: () => clientHeight, configurable: true });
  Object.defineProperty(el, 'scrollWidth', { get: () => 100, configurable: true });
  Object.defineProperty(el, 'clientWidth', { get: () => 100, configurable: true });
  if (quantize) {
    let top = 0;
    Object.defineProperty(el, 'scrollTop', {
      get: () => top,
      set: (v) => { top = Math.max(0, Math.floor(v)); },
      configurable: true,
    });
  }
  if (parent) parent.appendChild(el);
  else document.body.appendChild(el);
  return el;
}

/** 伪造一次 wheel 事件（routeWheel 只用事件身份与两个方法） */
const wheel = () => ({ preventDefault: vi.fn(), stopPropagation: vi.fn() });

/**
 * 造一个指定可滚范围的容器（宽/高都能滚，用于验证轴能力）
 * @param {{contentWidth?: number, viewWidth?: number, contentHeight?: number,
 *   viewHeight?: number}} size 内容尺寸与视口尺寸
 * @param {HTMLElement} [parent] 父元素（用于造嵌套结构）
 * @returns {HTMLElement} 容器元素
 */
function makeSized(size, parent) {
  const { contentWidth = 100, viewWidth = 100, contentHeight = 100, viewHeight = 100 } = size;
  const el = document.createElement('div');
  Object.defineProperty(el, 'scrollWidth', { get: () => contentWidth, configurable: true });
  Object.defineProperty(el, 'clientWidth', { get: () => viewWidth, configurable: true });
  Object.defineProperty(el, 'scrollHeight', { get: () => contentHeight, configurable: true });
  Object.defineProperty(el, 'clientHeight', { get: () => viewHeight, configurable: true });
  if (parent) parent.appendChild(el);
  else document.body.appendChild(el);
  return el;
}

/**
 * 读容器上的过滚位移（px）：从 transform: translate3d(...) 取主轴分量
 * @param {HTMLElement} el 容器
 * @returns {number} 过滚位移（0 = 无过滚）
 */
function overShift(el) {
  const m = /translate3d\(([^,]+),\s*([^,]+),\s*[^)]+\)/.exec(el.style.transform || '');
  if (!m) return 0;
  const x = parseFloat(m[1]);
  const y = parseFloat(m[2]);
  return Math.abs(y) >= Math.abs(x) ? y : x;
}

/**
 * 手势内推进时间：间隔 < 0.3s 的静止阈值，手势不会结束，同时让阻尼动画收敛
 * （16 帧 = 256ms 足以把一段增量收敛到目标并被收敛阈值吸附）
 * @param {number} [ms] 推进时间（默认 260ms）
 * @returns {void}
 */
function inGesture(ms = 260) {
  vi.advanceTimersByTime(ms);
}

/**
 * 滚轮静止：推进到超过 0.3s 静止阈值，让手势结束（顺带跑完过滚回弹）
 * @param {number} [ms] 推进时间（默认 800ms）
 * @returns {void}
 */
function stopWheel(ms = 800) {
  vi.advanceTimersByTime(ms);
}

/**
 * 在「手势保持」的前提下推进时间：单次静止超过 0.3s 手势会结束，
 * 这里用 < 0.3s 的间隔再发一次 wheel，模拟用户持续滚动。
 * @param {HTMLElement} el 收到事件的滚动容器
 * @param {number} dy 垂直增量
 * @param {number} ms 间隔（ms）
 * @returns {void}
 */
function scrollKeepAlive(el, dy, ms = 200) {
  vi.advanceTimersByTime(ms);
  routeWheel(el, 0, dy, wheel());
}

describe('滚动手势路由（一次滚动 = 一次手势）', () => {
  let inner;
  let outer;
  let innerCtl;
  let outerCtl;

  beforeEach(() => {
    vi.useFakeTimers();
    // 外层可滚 200px，内层可滚 60px
    outer = makeScroller(300, 100);
    inner = makeScroller(100, 40, outer);
    innerCtl = attachScrollDamping(inner);
    outerCtl = attachScrollDamping(outer);
  });

  afterEach(() => {
    innerCtl.dispose();
    outerCtl.dispose();
    inner.remove();
    outer.remove();
    vi.useRealTimers();
  });

  it('滚轮没停就不往外层跳：本层到底后转为过滚（对数拉力位移）', () => {
    const e1 = wheel();
    expect(routeWheel(inner, 0, 100, e1)).toBe(true);
    expect(e1.preventDefault).toHaveBeenCalled();
    expect(e1.stopPropagation).toHaveBeenCalled();

    inGesture();
    expect(inner.scrollTop).toBe(60);
    expect(outer.scrollTop).toBe(0);

    // 手势仍在继续（间隔 < 0.3s）：内层已到底 → 只过滚，外层仍不动
    routeWheel(inner, 0, 100, wheel());
    expect(Math.abs(overShift(inner))).toBeGreaterThan(2); // ln(101) ≈ 4.6（0 处连续、导数 1）
    expect(outer.scrollTop).toBe(0);
  });

  it('滚轮静止 0.3s 后再滚：新手势跳过已到底的内层，交给外层', () => {
    routeWheel(inner, 0, 100, wheel());
    inGesture();
    expect(inner.scrollTop).toBe(60);

    routeWheel(inner, 0, 100, wheel()); // 手势内到底：只过滚
    expect(Math.abs(overShift(inner))).toBeGreaterThan(2);

    stopWheel(); // 手势结束 + 过滚回弹
    expect(overShift(inner)).toBe(0);

    routeWheel(inner, 0, 100, wheel()); // 新手势：内层已到底被跳过 → 外层接管
    inGesture();
    expect(outer.scrollTop).toBeGreaterThan(50);
    expect(inner.scrollTop).toBe(60);
  });

  it('方向反转立即重新选层（外层接管后反转回内层）', () => {
    routeWheel(inner, 0, 100, wheel());
    stopWheel();
    expect(inner.scrollTop).toBe(60);

    routeWheel(inner, 0, 100, wheel());
    inGesture();
    expect(outer.scrollTop).toBeGreaterThan(50);

    routeWheel(inner, 0, -60, wheel()); // 反方向：内层可滚回则仍归内层
    inGesture();
    expect(inner.scrollTop).toBeLessThan(60);
  });
});

describe('滚动手势路由（多层嵌套逐层上移）', () => {
  let grand;
  let mid;
  let inner;
  let ctls;

  beforeEach(() => {
    vi.useFakeTimers();
    // 三层：外层可滚 900、中层 200、内层 60
    grand = makeScroller(1000, 100);
    mid = makeScroller(300, 100, grand);
    inner = makeScroller(100, 40, mid);
    ctls = [attachScrollDamping(inner), attachScrollDamping(mid), attachScrollDamping(grand)];
  });

  afterEach(() => {
    ctls.forEach(c => c.dispose());
    inner.remove();
    mid.remove();
    grand.remove();
    vi.useRealTimers();
  });

  it('连续手势只滚当前一层（到底过滚）；停一下再滚才逐层往上：内层 → 中层 → 外层', () => {
    // 一次连续手势：内层到底，中层、外层不动
    routeWheel(inner, 0, 300, wheel());
    inGesture();
    expect(inner.scrollTop).toBe(60);
    expect(mid.scrollTop).toBe(0);
    expect(grand.scrollTop).toBe(0);

    // 手势内继续滚：内层过滚，绝不换层
    routeWheel(inner, 0, 300, wheel());
    expect(Math.abs(overShift(inner))).toBeGreaterThan(2);
    expect(mid.scrollTop).toBe(0);
    stopWheel(); // 滚轮静止：手势结束 + 回弹

    // 新手势：内层已到底被跳过 → 中层到底（200），外层仍不动
    routeWheel(inner, 0, 300, wheel());
    inGesture();
    expect(inner.scrollTop).toBe(60);
    expect(mid.scrollTop).toBeGreaterThan(195);
    expect(grand.scrollTop).toBe(0);

    // 再停一下：中层也到底了 → 外层接管
    stopWheel();
    routeWheel(inner, 0, 300, wheel());
    inGesture();
    expect(grand.scrollTop).toBeGreaterThan(250);
  });
});

describe('滚动手势路由（到底后的过滚与回弹）', () => {
  let inner;
  let outer;
  let innerCtl;
  let outerCtl;

  beforeEach(() => {
    vi.useFakeTimers();
    outer = makeScroller(300, 100); // 外层可滚 200
    inner = makeScroller(100, 40, outer); // 内层可滚 60
    innerCtl = attachScrollDamping(inner);
    outerCtl = attachScrollDamping(outer);
  });

  afterEach(() => {
    innerCtl.dispose();
    outerCtl.dispose();
    expect(outer.style.transform).toBe('');
    inner.remove();
    outer.remove();
    vi.useRealTimers();
  });

  /**
   * 把两层都滚到底：内层到底 → 停一下（手势结束）→ 新手势交给外层 → 外层到底
   * @returns {void}
   */
  function scrollBothToBottom() {
    routeWheel(inner, 0, 100, wheel());
    stopWheel();
    expect(inner.scrollTop).toBe(60);

    routeWheel(inner, 0, 400, wheel()); // 内层已到底被跳过 → 外层目标钳到 200
    stopWheel(400); // 阻尼收敛到 200，同时手势结束
    expect(outer.scrollTop).toBeGreaterThan(199);
  }

  it('到底后继续滚：位移 = ln(1 + 累积输入)，增量递减，滚轮静止后回弹归零', () => {
    scrollBothToBottom();
    expect(overShift(inner)).toBe(0);

    // 光标在最内层：过滚落在最内层（该层已到底），页面也不滚 → 有过滚位移
    routeWheel(inner, 0, 100, wheel()); // 累积 100 → ln(101) ≈ 4.6（向下滚 → 内容上移）
    const first = -overShift(inner);
    expect(first).toBeGreaterThan(3.5);
    expect(first).toBeLessThan(6);

    // 同向继续拉：累积 200 → ln(201) ≈ 5.3，增量明显小于第一次（对数越拉越紧）
    routeWheel(inner, 0, 100, wheel());
    const second = -overShift(inner) - first;
    expect(second).toBeGreaterThan(0);
    expect(second).toBeLessThan(first);

    // 回弹只把位移还回去，不改变滚动位置
    stopWheel();
    expect(overShift(inner)).toBe(0);
    expect(inner.style.transform).toBe('');
    expect(inner.scrollTop).toBe(60);
    expect(outer.scrollTop).toBeGreaterThan(199);
  });

  it('过滚期间反向滚：手势立即重置，先抵消位移，余量再滚内容（不跳位）', () => {
    scrollBothToBottom();
    routeWheel(inner, 0, 100, wheel()); // 累积 100（位移 ≈ 4.6）
    expect(Math.abs(overShift(inner))).toBeGreaterThan(3.5);

    routeWheel(inner, 0, -150, wheel()); // 反向 150：100 抵消位移，剩 50 滚内容
    stopWheel();
    expect(overShift(inner)).toBe(0);
    expect(inner.scrollTop).toBeGreaterThan(5);
    expect(inner.scrollTop).toBeLessThan(15);
  });

  it('反向刚好抵消过滚位移时内容不动（不把"拉回来的力"也当成滚动）', () => {
    scrollBothToBottom();
    routeWheel(inner, 0, 100, wheel());
    expect(Math.abs(overShift(inner))).toBeGreaterThan(3.5);

    routeWheel(inner, 0, -100, wheel()); // 刚好抵消干净，余量为 0
    stopWheel();
    expect(overShift(inner)).toBe(0);
    expect(inner.scrollTop).toBe(60);
  });
});

describe('滚动手势路由（引擎量化滚动偏移的兜底）', () => {
  let inner;
  let outer;
  let innerCtl;
  let outerCtl;

  beforeEach(() => {
    vi.useFakeTimers();
    // 外层可滚 200px；内层可滚 27.6px（小数边界）且偏移被截断到整像素，
    // 也就是实际最多只到 27 —— 末段阻尼插值会一直读回 27（真实浏览器行为）
    outer = makeScroller(300, 100);
    inner = makeScroller(114, 86.4, outer, true);
    innerCtl = attachScrollDamping(inner);
    outerCtl = attachScrollDamping(outer);
  });

  afterEach(() => {
    innerCtl.dispose();
    outerCtl.dispose();
    inner.remove();
    outer.remove();
    vi.useRealTimers();
  });

  it('末段插值读不回目标时动画仍收敛；到底后过滚，静止后新手势才交给外层', () => {
    routeWheel(inner, 0, 100, wheel());
    scrollKeepAlive(inner, 100, 100); // 此时内层还没到底（仍在逼近 27）
    vi.advanceTimersByTime(200); // 内层收敛到可达的 27（而不是卡在无限 rAF）
    expect(inner.scrollTop).toBe(27);
    expect(outer.scrollTop).toBe(0);

    // 差 1px 内视为已到底：手势内继续滚 → 过滚，不换层
    const e2 = wheel();
    expect(routeWheel(inner, 0, 100, e2)).toBe(true);
    expect(e2.preventDefault).toHaveBeenCalled();
    expect(Math.abs(overShift(inner))).toBeGreaterThan(2);
    expect(outer.scrollTop).toBe(0);

    // 滚轮静止后新手势：内层已到底被跳过 → 外层
    stopWheel();
    expect(routeWheel(inner, 0, 100, wheel())).toBe(true);
    inGesture();
    expect(outer.scrollTop).toBeGreaterThan(50);
    expect(inner.scrollTop).toBe(27);
  });

  it('反方向仍归内层（端部容差只影响「已到底」的方向）', () => {
    routeWheel(inner, 0, 100, wheel());
    vi.advanceTimersByTime(800); // 滚到底 + 手势结束
    expect(inner.scrollTop).toBe(27);
    const e2 = wheel();
    expect(routeWheel(inner, 0, -60, e2)).toBe(true);
    vi.advanceTimersByTime(400);
    expect(inner.scrollTop).toBe(0);
    expect(outer.scrollTop).toBe(0);
  });
});

describe('滚动轴能力（非滚动方向的滚动一律不发生）', () => {
  let el;
  let ctl;

  beforeEach(() => {
    vi.useFakeTimers();
    // 两轴都有可滚余量（横向 200、纵向 200），但只允许纵向滚（moveX(false)）
    el = makeSized({ contentWidth: 300, viewWidth: 100, contentHeight: 300, viewHeight: 100 });
    ctl = attachScrollDamping(el, { x: false, y: true });
  });

  afterEach(() => {
    ctl.dispose();
    el.remove();
    vi.useRealTimers();
  });

  it('x 锁定的容器收到横向滚轮：不滚 scrollLeft、不出过滚位移、不消费事件', () => {
    const e = wheel();
    expect(routeWheel(el, 40, 0, e)).toBe(false);
    expect(e.preventDefault).not.toHaveBeenCalled();
    expect(e.stopPropagation).not.toHaveBeenCalled();
    expect(el.scrollLeft).toBe(0);
    expect(el.style.transform).toBe('');

    // 纵向照常滚动；纵向到底后继续滚才出过滚，横向输入始终被丢弃
    routeWheel(el, 0, 100, wheel());
    inGesture();
    expect(el.scrollTop).toBeGreaterThan(50);
    routeWheel(el, 0, 400, wheel());
    inGesture();
    expect(overShift(el)).toBe(0); // 增量被钳制到边界，位置滚到底才出过滚
    const e2 = wheel();
    expect(routeWheel(el, 40, 0, e2)).toBe(false);
    expect(el.scrollLeft).toBe(0);
    expect(el.style.transform).toBe('');
    stopWheel();
    expect(overShift(el)).toBe(0);
    expect(el.scrollLeft).toBe(0);
  });
});

describe('滚动归属（双轴锁定的容器不被滚动带动）', () => {
  let outer;
  let locked;
  let outerCtl;
  let lockedCtl;

  beforeEach(() => {
    vi.useFakeTimers();
    outer = makeSized({ contentHeight: 300, viewHeight: 100 }); // 外层可滚 200
    locked = makeSized({ contentHeight: 1000, viewHeight: 100 }, outer); // 自身可滚 900，但已锁定
    outerCtl = attachScrollDamping(outer);
    lockedCtl = attachScrollDamping(locked, { x: false, y: false });
  });

  afterEach(() => {
    lockedCtl.dispose();
    outerCtl.dispose();
    locked.remove();
    outer.remove();
    vi.useRealTimers();
  });

  it('光标在双轴锁定容器内滚动：归属交给外层，锁定容器既不滚也不位移', () => {
    routeWheel(locked, 0, 100, wheel());
    inGesture();
    expect(locked.scrollTop).toBe(0);
    expect(outer.scrollTop).toBeGreaterThan(50);

    stopWheel();
    expect(locked.scrollTop).toBe(0);
    expect(locked.style.transform).toBe('');
  });

  it('外层也到底后继续滚：过滚落在外层，锁定容器不被拽出位移（SplitCell 位置不错乱）', () => {
    routeWheel(locked, 0, 400, wheel()); // 外层目标钳到 200
    stopWheel(400);
    expect(outer.scrollTop).toBeGreaterThan(199);
    expect(locked.style.transform).toBe('');

    routeWheel(locked, 0, 100, wheel()); // 新手势：两层都到底 → 兜底过滚
    expect(Math.abs(overShift(outer))).toBeGreaterThan(2);
    expect(locked.style.transform).toBe('');

    stopWheel();
    expect(overShift(outer)).toBe(0);
    expect(outer.scrollTop).toBeGreaterThan(199);
    expect(locked.scrollTop).toBe(0);
  });
});

describe('过滚位移订阅（浮动滚动条按位移缩短滑块）', () => {
  let el;
  let ctl;
  let seen;

  beforeEach(() => {
    vi.useFakeTimers();
    el = makeSized({ contentHeight: 300, viewHeight: 100 });
    seen = [];
  });

  afterEach(() => {
    ctl?.dispose();
    el.remove();
    vi.useRealTimers();
  });

  it('先订阅后建控制器也生效：过滚广播与 transform 同值的位移，回弹归零时广播 0', () => {
    const unsubscribe = subscribeOverScroll(el, (v) => seen.push(v));
    ctl = attachScrollDamping(el);

    routeWheel(el, 0, 400, wheel()); // 滚到底（可滚 200）
    inGesture(290); // 阻尼收敛到底（仍在手势内：< 0.3s 静止阈值；1px 内即算到底）
    expect(el.scrollTop).toBeGreaterThan(199);

    routeWheel(el, 0, 100, wheel()); // 手势内到底 → 过滚，累积 100 → -ln(101) ≈ -4.6
    expect(seen.at(-1)).toBe(-4.6);
    expect(overShift(el)).toBe(-4.6);

    stopWheel(); // 滚轮静止 → 回弹归零
    expect(seen.at(-1)).toBe(0);
    expect(overShift(el)).toBe(0);

    unsubscribe();
  });

  it('订阅晚于控制器创建同样生效；取消订阅后不再收到广播', () => {
    ctl = attachScrollDamping(el);
    const unsubscribe = subscribeOverScroll(el, (v) => seen.push(v));

    ctl.addOver(0, 100);
    expect(seen).toEqual([-4.6]);

    ctl.rebound();
    vi.advanceTimersByTime(800);
    expect(seen.at(-1)).toBe(0);

    unsubscribe();
    const count = seen.length;
    ctl.addOver(0, 100);
    expect(seen.length).toBe(count);
  });
});
