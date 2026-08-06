/**
 * @file DataTree 实现。DataNode 同时作为数据存储位置与子节点容器，
 *        统一了"文件"与"文件夹"的概念。
 *
 * 路径支持：
 * - 绝对路径：`@/foo/bar`，从根节点起定位
 * - 相对路径：`./foo`、`../foo`、无前缀（按 `./` 处理）
 * - 命名锚点：`@name`、`@name/sub`，通过 `@` 后非 `/` 与绝对路径区分
 *
 * 引用节点（ref）：类似文件系统软链接，指向树中另一节点。
 * - 支持跨分支引用、多级引用（ref 指向 ref）
 * - 循环引用不破坏结构：解析时检测已访问集合，遇环返回 null
 * - ref 节点的 getData/setData/subscribe 透明委托给最终目标
 *
 * 通知策略：仅本节点 setData 触发本节点订阅者；子节点变更不冒泡到父。
 */

/** DataTree 节点解析时用于循环检测的最大 ref 跟随深度。 */
const MAX_REF_DEPTH = 1024;

/**
 * DataTree 节点。可同时持有数据（key-value）与子节点。
 */
class DataNode {
  /**
   * @param {string} name 节点段名（根节点为空串）
   * @param {DataNode|null} parent 父节点；根节点为 null
   */
  constructor(name, parent = null) {
    this._name = name;
    this._parent = parent;
    this._children = new Map();
    this._data = new Map();
    this._subscribers = new Set();
    /** @type {boolean} 是否为引用节点（ref 软链接） */
    this._isRef = false;
    /** @type {string|null} 引用目标路径；非引用节点为 null */
    this._refTargetPath = null;
    /** @type {string|null} 命名锚点名（不含 `@` 前缀）；null 表示未命名 */
    this._anchor = null;
    /** @type {Map<string, DataNode>|null} 锚点注册表：仅根节点持有，子节点为 null */
    this._anchors = parent ? null : new Map();
  }

  // === 基础属性 ===

  /** 节点段名 */
  get name() { return this._name; }

  /** 父节点；根节点返回 null */
  get parent() { return this._parent; }

  /** 是否为根节点 */
  get isRoot() { return this._parent === null; }

  /** 是否为引用节点 */
  get isRef() { return this._isRef; }

  /** 命名锚点名（不含 `@` 前缀）；未命名返回 null */
  get anchor() { return this._anchor; }

  /**
   * 节点绝对路径。根节点返回 `@`，否则返回 `@/seg1/seg2/...`。
   * 与 Cell 的路径口径一致：`@` 开头为绝对路径。
   * @returns {string} 绝对路径
   */
  get path() {
    if (this.isRoot) return '@';
    const segments = [];
    let node = this;
    while (node && !node.isRoot) {
      segments.unshift(node._name);
      node = node._parent;
    }
    return '@/' + segments.join('/');
  }

  /**
   * 沿 _parent 链上溯到根节点
   * @returns {DataNode} 根节点
   */
  get root() {
    let node = this;
    while (node._parent) node = node._parent;
    return node;
  }

  // === 子节点管理 ===

  /**
   * 创建或获取同名子节点。已存在则返回已有节点（建树幂等）
   * @param {string} name 子节点段名
   * @returns {DataNode} 子节点
   */
  createChild(name) {
    if (this._children.has(name)) return this._children.get(name);
    const child = new DataNode(name, this);
    this._children.set(name, child);
    return child;
  }

  /**
   * 创建一个引用子节点，指向 targetPath 指定的节点。类似于文件系统软链接。
   * 若同名的引用已存在且目标一致，幂等返回；否则覆盖为新的引用。
   * @param {string} name 子节点段名
   * @param {string} targetPath 目标路径（绝对/相对/命名锚点）
   * @returns {DataNode} 引用节点
   */
  createRefChild(name, targetPath) {
    const existing = this._children.get(name);
    if (existing && existing._isRef && existing._refTargetPath === targetPath) {
      return existing;
    }
    const ref = new DataNode(name, this);
    ref._isRef = true;
    ref._refTargetPath = targetPath;
    this._children.set(name, ref);
    return ref;
  }

  /**
   * 取子节点（原始节点，不跟随 ref）。不存在返回 undefined。
   * 如需跟随 ref，请使用 resolve(path)。
   * @param {string} name 子节点段名
   * @returns {DataNode|undefined}
   */
  getChild(name) {
    return this._children.get(name);
  }

  /**
   * 是否存在同名子节点
   * @param {string} name 子节点段名
   * @returns {boolean}
   */
  hasChild(name) {
    return this._children.has(name);
  }

  // === 命名锚点 ===

  /**
   * 设置命名锚点。设置后可通过 `@<anchorName>` 或 `@<anchorName>/sub` 引用本节点。
   * 重复设置会覆盖旧锚点名（旧名从注册表移除）。
   * @param {string} anchorName 锚点标识符（不含 `@`）；传空串或 null 取消锚点
   * @returns {DataNode} self（链式）
   */
  setAnchor(anchorName) {
    const root = this.root;
    if (this._anchor) {
      root._anchors.delete(this._anchor);
      this._anchor = null;
    }
    if (anchorName) {
      this._anchor = anchorName;
      root._anchors.set(anchorName, this);
    }
    return this;
  }

  // === 数据读写 ===

  /**
   * 取本节点（或 ref 最终目标）上某字段的值。
   * ref 节点透明委托给最终目标节点。
   * @param {string} key 字段名
   * @returns {*} 字段值；不存在返回 undefined
   */
  getData(key) {
    if (this._isRef) {
      const target = this._followRefs(this, new Set());
      return target ? target.getData(key) : undefined;
    }
    return this._data.get(key);
  }

  /**
   * 设置本节点（或 ref 最终目标）字段值。值变化（Object.is 比较）时通知订阅者。
   * ref 节点透明委托给最终目标节点。
   * @param {string} key 字段名
   * @param {*} value 字段值
   * @returns {DataNode} self（链式）
   */
  setData(key, value) {
    if (this._isRef) {
      const target = this._followRefs(this, new Set());
      if (target) target.setData(key, value);
      return this;
    }
    const prev = this._data.get(key);
    if (Object.is(prev, value)) return this;
    this._data.set(key, value);
    this._notify(key, value, prev);
    return this;
  }

  /**
   * 直接写入字段值，跳过订阅通知。用于初始化默认值（构造期尚无订阅者，
   * 触发通知是无意义的额外开销，且语义上"默认值"不应被视为"变更"）
   * @param {string} key 字段名
   * @param {*} value 字段值
   */
  _initData(key, value) {
    if (this._isRef) {
      const target = this._followRefs(this, new Set());
      if (target) target._initData(key, value);
      return;
    }
    this._data.set(key, value);
  }

  // === 订阅 ===

  /**
   * 订阅本节点（或 ref 最终目标）的数据变更。回调收到 {node, key, value, prev}。
   * ref 节点订阅最终目标，但 payload 中的 node 重写为 ref 自身，
   * 使订阅者在身份比较时可使用订阅时拿到的 ref 节点。
   * @param {(payload: {node: DataNode, key: string, value: *, prev: *}) => void} callback
   * @returns {() => void} 取消订阅函数
   */
  subscribe(callback) {
    if (this._isRef) {
      const target = this._followRefs(this, new Set());
      if (!target) return () => {};
      const self = this;
      return target.subscribe((payload) => {
        callback({ ...payload, node: self });
      });
    }
    this._subscribers.add(callback);
    return () => this._subscribers.delete(callback);
  }

  /**
   * 取消订阅
   * @param {Function} callback 之前注册的回调
   */
  unsubscribe(callback) {
    if (this._isRef) return;
    this._subscribers.delete(callback);
  }

  /**
   * 通知本节点所有订阅者字段值变更
   * @param {string} key 变更字段
   * @param {*} value 新值
   * @param {*} prev 旧值
   * @private
   */
  _notify(key, value, prev) {
    const payload = { node: this, key, value, prev };
    this._subscribers.forEach(cb => cb(payload));
  }

  // === 路径解析 ===

  /**
   * 按路径定位节点。支持：
   * - `@` 根节点
   * - `@/foo/bar` 绝对路径
   * - `@name` 命名锚点（`@` 后非 `/`）
   * - `@name/sub` 命名锚点 + 子路径
   * - `.` 当前节点
   * - `..` 父节点
   * - `./foo`、`../foo`、`foo`（无前缀按 `./` 处理）相对路径
   *
   * 解析过程中遇到的引用节点会被透明跟随（含多级引用），并通过已访问集合
   * 检测循环引用，遇环返回 null。
   * @param {string} path 路径字符串
   * @returns {DataNode|null} 命中节点（已跟随 ref 的最终真实节点）；不可达返回 null
   */
  resolve(path) {
    return this._resolveInternal(path, new Set());
  }

  /**
   * 内部解析方法，与 resolve() 行为一致，但可复用已访问集合以跨层检测循环引用。
   * @param {string} path 路径字符串
   * @param {Set<DataNode>} visited 已访问的 ref 节点集合
   * @returns {DataNode|null}
   * @private
   */
  _resolveInternal(path, visited) {
    if (typeof path !== 'string' || path === '') {
      return this._followRefs(this, visited);
    }
    if (path === '.') return this._followRefs(this, visited);
    if (path === '..') {
      const real = this._followRefs(this, visited);
      const p = real ? real._parent : null;
      return p ? this._followRefs(p, visited) : null;
    }
    if (path === '@') return this._followRefs(this.root, visited);

    // 命名锚点：@name 或 @name/sub（`@` 后非 `/`）
    if (path.startsWith('@') && !path.startsWith('@/')) {
      const rest = path.slice(1);
      const slashIdx = rest.indexOf('/');
      const anchorName = slashIdx === -1 ? rest : rest.slice(0, slashIdx);
      const subPath = slashIdx === -1 ? '' : rest.slice(slashIdx + 1);
      const anchorNode = this.root._anchors.get(anchorName);
      if (!anchorNode) return null;
      const realAnchor = this._followRefs(anchorNode, visited);
      if (!realAnchor) return null;
      if (!subPath) return realAnchor;
      return this._walk(realAnchor, subPath.split('/'), visited);
    }

    // 绝对路径：@/foo/bar
    if (path.startsWith('@/')) {
      return this._walk(this.root, path.slice(2).split('/'), visited);
    }

    // 相对路径：./ ../ 或无前缀（无前缀按 ./ 处理）
    const stripped = path.startsWith('./') ? path.slice(2)
                    : path.startsWith('../') ? path
                    : path;
    return this._walk(this, stripped.split('/'), visited);
  }

  /**
   * 从 startNode 起，按段数组逐段定位。每取到一个子节点后跟随其 ref 链。
   * @param {DataNode} startNode 起始节点
   * @param {string[]} segments 段数组
   * @param {Set<DataNode>} visited 已访问 ref 集合（循环检测）
   * @returns {DataNode|null}
   * @private
   */
  _walk(startNode, segments, visited) {
    let node = this._followRefs(startNode, visited);
    if (!node) return null;
    for (const seg of segments) {
      if (seg === '' || seg === '.') continue;
      if (seg === '..') {
        node = node ? node._parent : null;
        if (!node) return null;
        continue;
      }
      node = node ? node.getChild(seg) : null;
      if (!node) return null;
      node = this._followRefs(node, visited);
      if (!node) return null;
    }
    return node;
  }

  /**
   * 跟随节点的 ref 链至最终真实节点。多级引用逐级解析目标路径；
   * 同一 ref 节点二次访问视为循环引用，返回 null。
   * @param {DataNode} node 起始节点（可能是 ref）
   * @param {Set<DataNode>} visited 已访问 ref 集合
   * @returns {DataNode|null} 最终真实节点；遇环或目标不可达返回 null
   * @private
   */
  _followRefs(node, visited) {
    let current = node;
    let depth = 0;
    while (current && current._isRef) {
      if (visited.has(current)) return null; // 循环引用
      if (depth++ > MAX_REF_DEPTH) return null; // 深度保护
      visited.add(current);
      // ref 目标路径以 ref 的父节点为基准解析相对路径（软链接语义）
      const base = current._parent || current.root;
      current = base._resolveInternal(current._refTargetPath, visited);
    }
    return current;
  }
}

/**
 * DataTree 容器。持有一个根节点，提供根节点的访问与全局路径解析。
 */
class DataDag {
  constructor() {
    this._rootNode = new DataNode('', null);
  }

  /** 根节点 */
  get _root() { return this._rootNode; }

  /**
   * 从根节点解析绝对路径或命名锚点
   * @param {string} path 绝对路径（如 `@/page/header`）或命名锚点（如 `@userProfile`）
   * @returns {DataNode|null}
   */
  resolve(path) {
    return this._rootNode.resolve(path);
  }

  /**
   * 按锚点名取节点
   * @param {string} anchorName 锚点标识符（不含 `@`）
   * @returns {DataNode|undefined}
   */
  getAnchor(anchorName) {
    return this._rootNode._anchors.get(anchorName);
  }
}

export { DataNode, DataDag };
