/**
 * @file KitRuntime —— 组件库实例级运行时容器。
 *
 *        此前浮动窗口树、可操作窗口集合、三层容器 ref 注册表、拖拽会话、
 *        reflow 调度器与 Cell 实现注册表均为模块级全局单例，导致多实例
 *        （微前端 / 多 DataDag / 并行测试）互相污染、SSR 不可行。本模块把
 *        这些可变状态全部收敛进 KitRuntime 实例：
 *
 *        - `new DataDag()` 缺省使用全局默认 runtime（向后兼容）；
 *        - `new DataDag({ runtime: createRuntime() })` 获得完全隔离的运行时；
 *        - BoxBuilder / DataNode / Cell 挂载时从 DataNode 继承 runtime，
 *          渲染层经 `builder._runtime` 访问，不再触碰模块级状态。
 *
 *        浮动窗口树语义见 docs/floating-window-tree-design.md：树键为父窗口
 *        （null = 根 viewport），值为有序子窗口列表（尾部 = 最近聚焦/出现）。
 */
import { ReflowScheduler } from './box/scheduler';

/**
 * 实例级运行时。持有 reflow 调度器、浮动窗口树、可操作窗口集合、
 * 容器 ref 注册表、拖拽会话槽、Cell 实现注册表与结构变更订阅。
 */
class KitRuntime {
  constructor() {
    /** @type {ReflowScheduler} 本实例专属的 reflow 调度器 */
    this.scheduler = new ReflowScheduler();

    // === 浮动窗口树（见 floating-window-tree-design.md）===
    /** @type {Map<BoxBuilder|null, BoxBuilder[]>} 父窗口 → 有序子窗口列表（null = 根 viewport） */
    this._floatingTree = new Map();
    /** @type {Set<() => void>} 浮动层变化监听器 */
    this._floatingListeners = new Set();
    /**
     * 可操作窗口集合（遮罩唯一来源，null = 根 viewport）。
     * @type {Set<BoxBuilder|null>}
     */
    this._operableWindows = new Set([null]);

    // === 容器 ref 注册表（滚动同步 / 拖拽直写 DOM）===
    /** @type {Object<string, React.RefObject>} 路径 → 内容层容器 ref */
    this._contentRefs = {};
    /** @type {Object<string, Object<string, React.RefObject>>} 路径 → 层名 → 容器 ref */
    this._layerRefs = {};

    // === 拖拽会话槽（Edge/Corner/浮动窗口移动与缩放共用，全局互斥）===
    /** @type {Object|null} 当前拖拽会话；null = 空闲 */
    this.dragSession = null;

    // === Cell 实现注册表（主题组件级重写，kind → name → 组件）===
    /** @type {Map<string, Map<string, React.ComponentType>>} */
    this._impls = new Map();

    // === 结构变更订阅（fill/destroy/mount 等 Cell/Box 树结构变化）===
    /** @type {Set<() => void>} */
    this._structuralListeners = new Set();
  }

  // === 浮动窗口树 ===

  /**
   * 取某父窗口的子窗口列表（按需创建）
   * @param {BoxBuilder|null} parent 父窗口；null = 根 viewport
   * @returns {BoxBuilder[]} 有序子窗口列表
   */
  getFloatingChildren(parent) {
    if (!this._floatingTree.has(parent)) this._floatingTree.set(parent, []);
    return this._floatingTree.get(parent);
  }

  /** 注册浮动视口：挂到其父窗口 children 尾部（出现居上）并通知重渲染 */
  registerFloating(builder) {
    const list = this.getFloatingChildren(builder._floatingParent ?? null);
    if (!list.includes(builder)) {
      list.push(builder);
      this.notifyFloatingChange();
    }
  }

  /** 注销浮动视口（从其父窗口 children 移除）并通知重渲染 */
  unregisterFloating(builder) {
    const list = this._floatingTree.get(builder._floatingParent ?? null);
    if (!list) return;
    const idx = list.indexOf(builder);
    if (idx !== -1) {
      list.splice(idx, 1);
      this.notifyFloatingChange();
    }
  }

  /** 重挂浮动视口到新父窗口（child(parent) 改变父子关系时调用） */
  reparentFloating(builder, prevParent) {
    if (prevParent === (builder._floatingParent ?? null)) return;
    const prevList = this._floatingTree.get(prevParent);
    if (prevList) {
      const idx = prevList.indexOf(builder);
      if (idx !== -1) prevList.splice(idx, 1);
    }
    const list = this.getFloatingChildren(builder._floatingParent ?? null);
    if (!list.includes(builder)) list.push(builder);
    this.notifyFloatingChange();
  }

  /** 聚焦浮动视口（后聚焦居上）：移到其父窗口 children 尾部 */
  focusFloating(builder) {
    const list = this._floatingTree.get(builder._floatingParent ?? null);
    if (!list) return;
    const idx = list.indexOf(builder);
    if (idx === -1 || idx === list.length - 1) return;
    list.splice(idx, 1);
    list.push(builder);
    this.notifyFloatingChange();
  }

  /** 订阅浮动层变化 @returns {() => void} 取消订阅 */
  subscribeFloating(listener) {
    this._floatingListeners.add(listener);
    return () => this._floatingListeners.delete(listener);
  }

  /** 通知浮动层重渲染 */
  notifyFloatingChange() {
    this._floatingListeners.forEach(cb => cb());
  }

  /** 将 builder 加入可操作窗口集合（null = 根 viewport，恢复默认态） */
  setOperable(builder) {
    this._operableWindows.add(builder ?? null);
    this.notifyFloatingChange();
  }

  /** 将 builder 移出可操作窗口集合 */
  clearOperable(builder) {
    this._operableWindows.delete(builder ?? null);
    this.notifyFloatingChange();
  }

  /**
   * 计算浮动窗口在树中的深度（根级窗口为 0）
   * @param {BoxBuilder} builder
   * @returns {number}
   */
  static getWindowDepth(builder) {
    let depth = 0;
    let cur = builder;
    while (cur._floatingParent) { depth++; cur = cur._floatingParent; }
    return depth;
  }

  /**
   * 求有效可操作窗口：可操作集合中深度最大的可见浮动窗口；无则 null（根 viewport）
   * @returns {BoxBuilder|null}
   */
  getEffectiveOperable() {
    let best = null;
    let bestDepth = -1;
    for (const w of this._operableWindows) {
      if (w === null || !w._isFloatingViewport || w._visible === false) continue;
      const depth = KitRuntime.getWindowDepth(w);
      if (depth > bestDepth) { best = w; bestDepth = depth; }
    }
    return best;
  }

  /** 收集 builder 的可见子树（含自身） */
  collectVisibleSubtree(builder, out) {
    if (builder._visible === false) return;
    out.add(builder);
    for (const child of this.getFloatingChildren(builder)) {
      this.collectVisibleSubtree(child, out);
    }
  }

  /** 按树先序收集可见浮动窗口到数组 */
  collectPreOrder(parent, out) {
    for (const child of this.getFloatingChildren(parent)) {
      if (child._visible === false) continue;
      out.push(child);
      this.collectPreOrder(child, out);
    }
  }

  /**
   * 计算渲染序：树先序，但把"有效可操作窗口的可见子树"整体提升到末尾
   * （独占最高连续 z 区间，单一遮罩恰好压住所有非可操作窗口）
   * @returns {BoxBuilder[]}
   */
  buildRenderOrder() {
    const order = [];
    const operable = this.getEffectiveOperable();
    const operableSubtree = new Set();
    if (operable) this.collectVisibleSubtree(operable, operableSubtree);
    const walk = (parent) => {
      for (const child of this.getFloatingChildren(parent)) {
        if (child._visible === false || operableSubtree.has(child)) continue;
        order.push(child);
        walk(child);
      }
    };
    walk(null);
    if (operable) {
      order.push(operable);
      this.collectPreOrder(operable, order);
    }
    return order;
  }

  // === 容器 ref 注册表 ===

  /** 登记内容层容器 ref */
  registerContentRef(path, ref) { this._contentRefs[path] = ref; }

  /** 注销内容层容器 ref */
  unregisterContentRef(path) { delete this._contentRefs[path]; }

  /** 取内容层容器 ref */
  getContentRef(path) { return this._contentRefs[path]; }

  /** 登记某层容器 ref（'content'|'edge'|'corner'|'shell'|'effect'） */
  registerLayerRef(path, name, ref) {
    (this._layerRefs[path] || (this._layerRefs[path] = {}))[name] = ref;
  }

  /** 注销某层容器 ref */
  unregisterLayerRef(path, name) {
    const entry = this._layerRefs[path];
    if (!entry) return;
    delete entry[name];
    if (Object.keys(entry).length === 0) delete this._layerRefs[path];
  }

  /** 取某路径已注册的层容器 ref 集合 */
  getLayerRefs(path) { return this._layerRefs[path] || null; }

  // === Cell 实现注册表 ===

  /** 注册 Cell 实现（同 (kind, name) 后者覆盖） */
  registerImpl(kind, name, Component) {
    if (!this._impls.has(kind)) this._impls.set(kind, new Map());
    this._impls.get(kind).set(name, Component);
  }

  /** 按 (kind, name) 取实现组件；未注册返回 null */
  getImpl(kind, name) { return this._impls.get(kind)?.get(name) ?? null; }

  /** 判断某 kind 是否注册过指定实现 */
  hasImpl(kind, name) { return this._impls.get(kind)?.has(name) ?? false; }

  // === 结构变更订阅 ===

  /**
   * 订阅 Cell/Box 树结构变更（fill / mount / destroy / 覆盖）。
   * 渲染层（ContentLayer / CellRoot）据此重渲染，使结构变化对 React 可见。
   * @param {() => void} cb
   * @returns {() => void} 取消订阅
   */
  subscribeStructural(cb) {
    this._structuralListeners.add(cb);
    return () => this._structuralListeners.delete(cb);
  }

  /** 通知结构变更 */
  notifyStructural() {
    this._structuralListeners.forEach(cb => cb());
  }
}

/** @type {KitRuntime|null} 全局默认运行时（惰性创建） */
let _defaultRuntime = null;

/**
 * 创建一个完全隔离的运行时实例（多实例 / 测试 / SSR 场景）。
 * @returns {KitRuntime}
 */
function createRuntime() {
  return new KitRuntime();
}

/**
 * 取全局默认运行时。`new DataDag()`、独立 `new BoxBuilder(path)` 等
 * 未显式注入 runtime 的场景共享本实例（向后兼容行为）。
 * @returns {KitRuntime}
 */
function getDefaultRuntime() {
  if (!_defaultRuntime) _defaultRuntime = new KitRuntime();
  return _defaultRuntime;
}

/** dev 环境判定（构建产物中 vite 会替换 process.env.NODE_ENV） */
const isDev = typeof process === 'undefined' || !process.env || process.env.NODE_ENV !== 'production';

/**
 * dev 模式警告输出（生产静默）。
 * @param {string} scope 模块标识（如 '[Cell]'）
 * @param {string} message 警告内容
 */
function devWarn(scope, message) {
  if (isDev) console.warn(`${scope} ${message}`);
}

export { KitRuntime, createRuntime, getDefaultRuntime, isDev, devWarn };
