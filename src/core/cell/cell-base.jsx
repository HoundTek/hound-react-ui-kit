/**
 * @file CellBase —— 所有 Cell 类型的基类。Cell 在 Box 之上封装出可复用组件。
 *
 * 架构（Phase 3：多 Slot + 多挂载）：
 *   - 构造（描述）：声明 Schema、Box 配方、Slot 定义、内容组件，不创建 DataNode/Box
 *   - 挂载数据（一次）：_mountData(parentNode) 创建 DataNode + Slot 数据节点 + 应用 Schema 默认值
 *   - 挂载 Box（每挂载点）：_mountBox() 重放配方、创建 Slot 子 Box、注入内容、级联子 Cell
 *   - 填充 Slot：fill(slotName, cells) 自动挂载子 Cell 的数据与 Box
 *
 * 多 Slot：
 *   - defineSlot(name, config) 声明命名插槽，创建独立数据节点（路径加一层）与子 Box
 *   - 默认插槽 _default 不加路径层级（向后兼容 Phase 1/2）
 *   - fill(name, cells) 接收 Cell 实例，自动挂载
 *
 * 多挂载：
 *   - 同一 Cell 实例可多次 fill 到不同位置，共享同一 DataNode
 *   - 每个挂载点独立创建 Box 子树（重放配方）
 *   - 级联：父新建挂载时为已有 slot children 各创建子挂载；fill 时为每个父挂载创建子挂载
 *
 * Cell 类型作者通过继承 CellBase，在构造函数中配置 Box 结构、声明 Schema、
 * 定义 Slot、注入内容组件。页面作者仅实例化 Cell 类型、fill slots、读写数据。
 */
import React from 'react';
import BoxBuilder from '../box/box';
import { CellRoot } from './cell-react';

/** Slot 配置中映射到 Box 方法的键名 */
const SLOT_BOX_CONFIG_KEYS = [
  'fixedWidth', 'fixedHeight', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
  'defaultWidth', 'defaultHeight', 'layout', 'moveX', 'moveY',
  'backgroundColor', 'alignItems', 'draggable', 'showChildOverlays',
];

class CellBaseBuilder {
  /**
   * @param {string} id Cell 标识，作为数据子树段名与 Box 路径末段
   */
  constructor(id) {
    /** @type {string} Cell 标识（数据子树段名与 Box 路径末段） */
    this._id = id;
    /** @type {DataNode|null} 数据节点；null 直到 _mountData 调用 */
    this._dataNode = null;
    /** @type {Object} Schema 字段定义：{ key: { type, default, bind } } */
    this._schema = {};
    /** @type {Map<string, {path: string, key: string}>} 字段绑定映射 */
    this._bindings = new Map();
    /** @type {Array<[string, Array]>} Box 配方：记录 [method, args] 调用序列，供 _mountBox 重放 */
    this._boxRecipe = [];
    /** @type {Array<{name: string, config: Object}>} Slot 定义：构造期声明 */
    this._slotDefs = [];
    /**
     * Slot 运行时状态：构造期预填充（dataNode 为 null，_mountData 时填充），使 fill 可在挂载前调用。
     * @type {Map<string, {dataNode: DataNode|null, config: Object, children: CellBaseBuilder[]}>}
     */
    this._slots = new Map();
    this._slots.set('_default', { dataNode: null, config: {}, children: [] });
    /** @type {Array<{box: BoxBuilder, slotBoxes: Map, slotChildrenBoxes: Map}>} 挂载列表 */
    this._mounts = [];
    /** @type {React.ComponentType|null} 内容组件 */
    this._contentComponent = null;
    /** @type {string|null} 延迟应用的锚点（构造期声明，挂载时应用） */
    this._pendingAnchor = null;
    /** @type {Array<{name: string, targetPath: string}>} 延迟应用的引用子节点 */
    this._pendingRefChildren = [];
    /** @type {Map<string, *>|null} 延迟应用的 setData（未挂载时暂存，_mountData 时应用，覆盖 Schema 默认值） */
    this._pendingData = null;
  }

  // === Schema ===

  /**
   * 声明数据 Schema。已声明的字段在 _mountData 时按默认值写入数据子树。
   * Schema 形态：{ key: { type, default, bind } }
   *
   * bind 路径语法：
   * - `<nodePath>` 绑定到目标节点的同名字段，如 `'@userProfile'`
   * - `<nodePath>#<field>` 绑定到目标节点的指定字段，如 `'@userProfile#name'`
   *
   * 副作用：为每个字段自动生成 `setXxx` 语义化 setter（Xxx 为字段名首字母大写形式），
   * 内部调用 setData 并返回 this 支持链式。已有方法（如 setData）不被覆盖。
   * 提倡页面作者使用 setXxx，setData 作为底层通用方法保留。
   * @param {Object} schema Schema 对象
   * @returns {CellBaseBuilder} self（链式）
   */
  schema(schema) {
    this._schema = { ...this._schema, ...schema };
    for (const [key, def] of Object.entries(schema)) {
      if (!def) continue;
      if (def.bind) {
        this._bindings.set(key, this._parseBinding(def.bind, key));
      }
      // 自动生成 setXxx 语义化 setter（不覆盖已有方法或原型方法）
      const setterName = this._setterName(key);
      if (setterName && !(setterName in this)) {
        const fieldKey = key;
        this[setterName] = (value) => this.setData(fieldKey, value);
      }
    }
    // 若已挂载，立即应用新增默认值
    if (this._dataNode) {
      this._applySchemaDefaults();
    }
    return this;
  }

  /**
   * 由字段名生成 setter 方法名：`set` + 首字母大写。
   * 如 `title` → `setTitle`、`isActive` → `setIsActive`。
   * @param {string} key 字段名
   * @returns {string} setter 方法名
   */
  _setterName(key) {
    if (!key || typeof key !== 'string') return '';
    return 'set' + key.charAt(0).toUpperCase() + key.slice(1);
  }

  /**
   * 解析 bind 声明为 { path, key } 绑定描述。
   * 支持 `<nodePath>`（绑定目标节点的同名字段）与 `<nodePath>#<field>`（绑定指定字段）两种语法。
   * @param {string} bindPath bind 路径声明
   * @param {string} defaultKey 未显式指定字段时使用的字段名（即本 Cell 的字段名）
   * @returns {{path: string, key: string}} 目标节点路径与目标字段名
   */
  _parseBinding(bindPath, defaultKey) {
    const hashIdx = bindPath.indexOf('#');
    if (hashIdx === -1) return { path: bindPath, key: defaultKey };
    return { path: bindPath.slice(0, hashIdx), key: bindPath.slice(hashIdx + 1) };
  }

  /**
   * 将 Schema 中声明默认值的字段写入数据节点（跳过订阅通知）。
   * 绑定字段（bind）不参与默认值初始化，其值由目标节点数据驱动。
   */
  _applySchemaDefaults() {
    for (const [key, def] of Object.entries(this._schema)) {
      if (!def || def.bind) continue;
      if (Object.prototype.hasOwnProperty.call(def, 'default')) {
        this._dataNode._initData(key, def.default);
      }
    }
  }

  // === Slot 定义 ===

  /**
   * 声明命名插槽。在构造函数中调用，定义 Slot 的名称与布局配置。
   * 挂载时自动创建 Slot 数据节点（路径加一层）与子 Box。
   *
   * config 支持的键：
   * - 布局：fixedHeight/minHeight/maxHeight/fixedWidth/.../layout/moveX/moveY/backgroundColor/alignItems/draggable
   * - single: true 标记为单插槽（仅接收一个 Cell）
   *
   * 默认插槽 _default 无需声明：不调用 defineSlot 时仅有默认插槽，
   * 子 Cell 直接挂到本 Cell 的数据节点与主 Box（路径不加层级，向后兼容）。
   * @param {string} name 插槽名
   * @param {Object} config 配置对象
   * @returns {CellBaseBuilder} self（链式）
   */
  defineSlot(name, config = {}) {
    this._slotDefs.push({ name, config });
    this._slots.set(name, { dataNode: null, config, children: [] });
    return this;
  }

  // === 自定义内容渲染 ===

  /**
   * 注入自定义内容组件。组件接收 { cell } 作为 props，可在内部用
   * useCellData(cell, key) 订阅数据字段并触发重渲染。
   *
   * 元素在每个挂载点独立创建（指向同一 cell），由 Box ContentLayer 自动渲染。
   * @param {React.ComponentType<{cell: CellBaseBuilder}>} Component React 组件
   * @returns {CellBaseBuilder} self（链式）
   */
  renderContent(Component) {
    this._contentComponent = Component;
    return this;
  }

  // === 命名锚点与引用节点（延迟到挂载时应用） ===

  /**
   * 为本 Cell 的数据节点设置命名锚点。构造期调用时延迟到 _mountData 时应用。
   * @param {string} name 锚点标识符（不含 `@`）
   * @returns {CellBaseBuilder} self（链式）
   */
  setAnchor(name) {
    this._pendingAnchor = name;
    if (this._dataNode) this._dataNode.setAnchor(name);
    return this;
  }

  /**
   * 在本 Cell 的数据子树下创建引用节点（软链接）。构造期调用时延迟到 _mountData 时应用。
   * @param {string} name 引用子节点的段名
   * @param {string} targetPath 目标路径
   * @returns {CellBaseBuilder} self（链式）
   */
  createRefChild(name, targetPath) {
    this._pendingRefChildren.push({ name, targetPath });
    if (this._dataNode) this._dataNode.createRefChild(name, targetPath);
    return this;
  }

  // === 挂载 ===

  /**
   * 挂载数据子树。创建本 Cell 的 DataNode 与 Slot 数据节点，应用 Schema 默认值。
   * 多挂载时仅首次调用生效（幂等），后续挂载共享同一 DataNode。
   * @param {DataNode} parentDataNode 父数据节点
   * @returns {CellBaseBuilder} self（链式）
   */
  _mountData(parentDataNode) {
    if (this._dataNode) return this;
    this._dataNode = parentDataNode.createChild(this._id);
    this._dataNode._cell = this;  // 反向引用，支持 find(path) 路径访问
    // 应用 Schema 默认值
    this._applySchemaDefaults();
    // 应用挂载前暂存的 setData（覆盖 Schema 默认值）
    if (this._pendingData) {
      for (const [key, value] of this._pendingData) {
        this._dataNode.setData(key, value);
      }
      this._pendingData = null;
    }
    // 填充预创建 slot 的 dataNode（保留 fill 已记录的 children）
    this._slots.get('_default').dataNode = this._dataNode;
    for (const def of this._slotDefs) {
      const slotDataNode = this._dataNode.createChild(def.name);
      this._slots.get(def.name).dataNode = slotDataNode;
    }
    // 应用延迟的锚点与引用
    if (this._pendingAnchor) this._dataNode.setAnchor(this._pendingAnchor);
    for (const { name, targetPath } of this._pendingRefChildren) {
      this._dataNode.createRefChild(name, targetPath);
    }
    return this;
  }

  /**
   * 创建一个 Box 挂载。重放 Box 配方，创建 Slot 子 Box，注入内容组件，
   * 并级联为已有 slot children 挂载数据与 Box（根据 slot 关系自动挂载全树）。
   *
   * 级联策略：遍历所有 slot，为每个 child 先 _mountData（幂等，多挂载复用）再 _mountBox
   *（递归级联 child 自身的 slot children），然后将 child 的 Box 挂入 slot 的子 Box。
   * @returns {{box: BoxBuilder, slotBoxes: Map, slotChildrenBoxes: Map}} 挂载对象
   */
  _mountBox() {
    const idx = this._mounts.length;
    const basePath = this._dataNode.path + (idx > 0 ? '#m' + idx : '');
    const box = new BoxBuilder(basePath);
    // 重放 Box 配方
    for (const [method, args] of this._boxRecipe) {
      box[method](...args);
    }
    // 创建命名 Slot 子 Box
    const slotBoxes = new Map();
    const slotSubBoxArray = [];
    for (const def of this._slotDefs) {
      const slotBox = new BoxBuilder(basePath + '/' + def.name);
      this._applySlotConfig(slotBox, def.config);
      slotBoxes.set(def.name, slotBox);
      slotSubBoxArray.push(slotBox);
    }
    // 初始 children：命名 Slot 子 Box
    if (slotSubBoxArray.length > 0) {
      box.children(slotSubBoxArray);
    }
    // 注入内容组件
    if (this._contentComponent) {
      box.content(<this._contentComponent cell={this} />);
    }
    const mount = { box, slotBoxes, slotChildrenBoxes: new Map() };
    this._mounts.push(mount);
    // 级联：根据 slot 关系自动挂载所有子 Cell 的数据与 Box
    for (const [slotName, slot] of this._slots) {
      if (slot.children.length === 0) continue;
      const targetBox = slotName === '_default' ? box : slotBoxes.get(slotName);
      const childBoxes = [];
      for (const child of slot.children) {
        child._mountData(slot.dataNode);
        const childMount = child._mountBox();
        childBoxes.push(childMount.box);
      }
      mount.slotChildrenBoxes.set(slotName, childBoxes);
      if (slotName === '_default') {
        box.children([...slotSubBoxArray, ...childBoxes]);
      } else {
        targetBox.children(childBoxes);
      }
    }
    return mount;
  }

  /**
   * 将 Slot 配置应用到 Box 上。
   * @param {BoxBuilder} box Slot 子 Box
   * @param {Object} config 配置对象
   */
  _applySlotConfig(box, config) {
    for (const key of SLOT_BOX_CONFIG_KEYS) {
      if (key in config) {
        box[key](config[key]);
      }
    }
    if ('grid' in config) {
      const g = config.grid;
      box.grid(Array.isArray(g) ? g[0] : g, Array.isArray(g) ? g[1] : g);
    }
  }

  // === Slot 填充 ===

  /**
   * 向命名插槽填充子 Cell。仅记录 slot 关系，不立即挂载。
   *
   * 挂载时机：
   * - 未挂载时（组装阶段）：仅记录关系到 slot.children，挂载推迟到 mount() 统一触发
   * - 已挂载时（动态填充阶段）：立即为新子 Cell 挂载数据与 Box
   *
   * 单插槽（single: true）重复 fill 会覆盖；列表插槽追加。
   * @param {string} slotName 插槽名（'_default' 或 defineSlot 声明的名称）
   * @param {CellBaseBuilder|CellBaseBuilder[]} cells 子 Cell 或数组
   * @returns {CellBaseBuilder} self（链式）
   */
  fill(slotName, cells) {
    const slot = this._slots.get(slotName);
    if (!slot) {
      throw new Error(`Cell "${this._id}" 的插槽 "${slotName}" 不存在`);
    }
    const cellList = Array.isArray(cells) ? cells : [cells];
    // 单插槽覆盖语义：清空旧子项
    if (slot.config.single && slot.children.length > 0) {
      slot.children = [];
      for (const mount of this._mounts) {
        mount.slotChildrenBoxes.set(slotName, []);
        if (slotName !== '_default') {
          mount.slotBoxes.get(slotName).children([]);
        }
      }
    }
    // 记录 slot 关系
    slot.children.push(...cellList);
    // 已挂载时（动态填充）立即挂载新子项
    if (this._mounts.length > 0) {
      this._mountNewChildren(slotName, cellList);
    }
    return this;
  }

  /**
   * 为已挂载的 Cell 的新子项创建数据与 Box 挂载（动态填充场景）。
   * 遍历所有已有挂载，为每个挂载点创建子 Cell 的一个新 Box 挂载。
   * @param {string} slotName 插槽名
   * @param {CellBaseBuilder[]} children 新增子 Cell 列表
   */
  _mountNewChildren(slotName, children) {
    const slot = this._slots.get(slotName);
    for (const mount of this._mounts) {
      const targetBox = slotName === '_default' ? mount.box : mount.slotBoxes.get(slotName);
      let childBoxes = mount.slotChildrenBoxes.get(slotName) || [];
      for (const child of children) {
        child._mountData(slot.dataNode);
        const childMount = child._mountBox();
        childBoxes.push(childMount.box);
      }
      mount.slotChildrenBoxes.set(slotName, childBoxes);
      if (slotName === '_default') {
        const namedSlotBoxes = [...mount.slotBoxes.values()];
        mount.box.children([...namedSlotBoxes, ...childBoxes]);
      } else {
        targetBox.children(childBoxes);
      }
    }
  }

  /**
   * 向默认插槽填充子 Cell（向后兼容 Phase 1/2 的 slots 方法）。
   * @param {CellBaseBuilder[]} cells 子 Cell 数组
   * @returns {CellBaseBuilder} self（链式）
   */
  slots(cells) {
    return this.fill('_default', cells);
  }

  /**
   * 向默认插槽追加一个子 Cell（向后兼容 Phase 1/2 的 addSlot 方法）。
   * @param {CellBaseBuilder} cell 子 Cell
   * @returns {CellBaseBuilder} self（链式）
   */
  addSlot(cell) {
    return this.fill('_default', cell);
  }

  /**
   * 取插槽的数据节点（供高级用法或子 Cell 手动构造）。
   * @param {string} slotName 插槽名，默认 '_default'
   * @returns {DataNode} 数据节点
   */
  _getSlotNode(slotName = '_default') {
    const slot = this._slots.get(slotName);
    if (!slot) {
      throw new Error(`Cell "${this._id}" 的插槽 "${slotName}" 不存在`);
    }
    return slot.dataNode;
  }

  /** 取默认插槽数据节点（向后兼容 _getSlotsNode） */
  _getSlotsNode() {
    return this._getSlotNode('_default');
  }

  // === 数据 API ===

  /**
   * 本 Cell 的数据节点。未挂载（mount）之前为 null。
   * @returns {DataNode|null} 数据节点
   */
  get data() { return this._dataNode; }

  /**
   * 取字段值。绑定字段（bind）透明转发到目标节点；未挂载时从暂存的 pendingData 读取。
   * @param {string} key 字段名
   * @returns {*} 字段值；不存在返回 undefined
   */
  getData(key) {
    // 未挂载时从 pendingData 读取
    if (!this._dataNode) {
      return this._pendingData ? this._pendingData.get(key) : undefined;
    }
    const binding = this._bindings.get(key);
    if (binding) {
      const target = this._dataNode.resolve(binding.path);
      return target ? target.getData(binding.key) : undefined;
    }
    return this._dataNode.getData(key);
  }

  /**
   * 设置字段值。绑定字段（bind）透明转发到目标节点；未挂载时暂存，
   * 于 _mountData 时应用（覆盖 Schema 默认值）。值变化（Object.is 比较）时通知订阅者。
   * @param {string} key 字段名
   * @param {*} value 字段值
   * @returns {CellBaseBuilder} self（链式）
   */
  setData(key, value) {
    // 未挂载时暂存，_mountData 时应用（覆盖 Schema 默认值）
    if (!this._dataNode) {
      if (!this._pendingData) this._pendingData = new Map();
      this._pendingData.set(key, value);
      return this;
    }
    const binding = this._bindings.get(key);
    if (binding) {
      const target = this._dataNode.resolve(binding.path);
      if (target) target.setData(binding.key, value);
      return this;
    }
    this._dataNode.setData(key, value);
    return this;
  }

  /**
   * 订阅本 Cell 的数据变更。覆盖本数据节点字段变更与绑定字段（bind）目标节点的字段变更；
   * 绑定目标变更时 payload 重写为 node=本 Cell 数据节点、key=本 Cell 字段名，对外透明。
   * @param {(payload: {node: DataNode, key: string, value: *, prev: *}) => void} callback 变更回调
   * @returns {() => void} 取消订阅函数
   */
  subscribe(callback) {
    const unsubs = [this._dataNode.subscribe(callback)];
    for (const [key, binding] of this._bindings) {
      const target = this._dataNode.resolve(binding.path);
      if (!target) continue;
      const fieldKey = binding.key;
      const ownNode = this._dataNode;
      unsubs.push(target.subscribe((payload) => {
        if (payload.key !== fieldKey) return;
        callback({ node: ownNode, key, value: payload.value, prev: payload.prev });
      }));
    }
    return () => unsubs.forEach(fn => fn());
  }

  /**
   * 按路径解析本 Cell 数据子树中的节点。路径语法同 DataNode.resolve：
   * 绝对路径（`@/foo`）、相对路径（`./foo`、`../foo`）与命名锚点（`@name`）。
   * @param {string} path 路径字符串
   * @returns {DataNode|null} 目标节点；未找到返回 null
   */
  resolve(path) {
    return this._dataNode.resolve(path);
  }

  /**
   * 按路径查找 Cell 实例。利用 DataNode 的路径系统定位目标节点，
   * 通过 _cell 反向引用返回对应的 Cell。
   *
   * 路径语法同 DataNode.resolve：
   * - 绝对路径 '@/cell-demo/header/profile'
   * - 相对路径 './sibling' 或 '../parent/sibling'
   * - 命名锚点 '@userProfile'
   * @param {string} path 路径
   * @returns {CellBaseBuilder|null} 目标 Cell，未找到返回 null
   */
  find(path) {
    if (!this._dataNode) return null;
    const node = this._dataNode.resolve(path);
    return node ? (node._cell || null) : null;
  }

  // === Box 链式方法委托（记录配方 + 应用到已有挂载） ===

  /**
   * 记录一次 Box 链式调用：写入配方（供后续挂载重放），并立即应用到已有挂载。
   * @param {string} method Box 方法名
   * @param {Array} args 方法参数列表
   * @returns {CellBaseBuilder} self（链式）
   */
  _recordBoxOp(method, args) {
    this._boxRecipe.push([method, args]);
    for (const mount of this._mounts) {
      mount.box[method](...args);
    }
    return this;
  }

  /**
   * 设置排列方向（委托 BoxBuilder#layout）
   * @param {'horizontal'|'vertical'} t 排列方向
   * @returns {CellBaseBuilder} self（链式）
   */
  layout(t) { return this._recordBoxOp('layout', [t]); }
  /**
   * 设置 X 轴滚动开关（委托 BoxBuilder#moveX）
   * @param {boolean} v true=自由滚动、false=锁定、undefined=未设置
   * @returns {CellBaseBuilder} self（链式）
   */
  moveX(v) { return this._recordBoxOp('moveX', [v]); }
  /**
   * 设置 Y 轴滚动开关（委托 BoxBuilder#moveY）
   * @param {boolean} v true=自由滚动、false=锁定、undefined=未设置
   * @returns {CellBaseBuilder} self（链式）
   */
  moveY(v) { return this._recordBoxOp('moveY', [v]); }
  /**
   * 固定宽度：等价于 maxWidth(w).minWidth(w)（委托 BoxBuilder#fixedWidth）
   * @param {number} w 固定宽度（px）
   * @returns {CellBaseBuilder} self（链式）
   */
  fixedWidth(w) { return this._recordBoxOp('fixedWidth', [w]); }
  /**
   * 固定高度：等价于 maxHeight(h).minHeight(h)（委托 BoxBuilder#fixedHeight）
   * @param {number} h 固定高度（px）
   * @returns {CellBaseBuilder} self（链式）
   */
  fixedHeight(h) { return this._recordBoxOp('fixedHeight', [h]); }
  /**
   * 设置最小宽度（委托 BoxBuilder#minWidth）
   * @param {number} w 最小宽度（px）
   * @returns {CellBaseBuilder} self（链式）
   */
  minWidth(w) { return this._recordBoxOp('minWidth', [w]); }
  /**
   * 设置最小高度（委托 BoxBuilder#minHeight）
   * @param {number} h 最小高度（px）
   * @returns {CellBaseBuilder} self（链式）
   */
  minHeight(h) { return this._recordBoxOp('minHeight', [h]); }
  /**
   * 设置最大宽度（委托 BoxBuilder#maxWidth）
   * @param {number} w 最大宽度（px）
   * @returns {CellBaseBuilder} self（链式）
   */
  maxWidth(w) { return this._recordBoxOp('maxWidth', [w]); }
  /**
   * 设置最大高度（委托 BoxBuilder#maxHeight）
   * @param {number} h 最大高度（px）
   * @returns {CellBaseBuilder} self（链式）
   */
  maxHeight(h) { return this._recordBoxOp('maxHeight', [h]); }
  /**
   * 设置默认宽度（委托 BoxBuilder#defaultWidth）
   * @param {number} w 默认宽度（px）
   * @returns {CellBaseBuilder} self（链式）
   */
  defaultWidth(w) { return this._recordBoxOp('defaultWidth', [w]); }
  /**
   * 设置默认高度（委托 BoxBuilder#defaultHeight）
   * @param {number} h 默认高度（px）
   * @returns {CellBaseBuilder} self（链式）
   */
  defaultHeight(h) { return this._recordBoxOp('defaultHeight', [h]); }
  /**
   * 设置背景色（委托 BoxBuilder#backgroundColor）
   * @param {string} c CSS 颜色值
   * @returns {CellBaseBuilder} self（链式）
   */
  backgroundColor(c) { return this._recordBoxOp('backgroundColor', [c]); }
  /**
   * 设置交叉轴对齐方式（委托 BoxBuilder#alignItems）
   * @param {string} a CSS align-items 值
   * @returns {CellBaseBuilder} self（链式）
   */
  alignItems(a) { return this._recordBoxOp('alignItems', [a]); }
  /**
   * 设置是否可拖拽调整尺寸（委托 BoxBuilder#draggable）
   * @param {boolean} d 是否可拖拽
   * @returns {CellBaseBuilder} self（链式）
   */
  draggable(d) { return this._recordBoxOp('draggable', [d]); }
  /**
   * 控制下一级子 Box 的 Edge/Corner 覆盖层是否显示（委托 BoxBuilder#showChildOverlays）
   * @param {boolean} v 是否显示下一级覆盖层
   * @returns {CellBaseBuilder} self（链式）
   */
  showChildOverlays(v) { return this._recordBoxOp('showChildOverlays', [v]); }
  /**
   * 标记为视口根节点，尺寸取 100vw/100vh（委托 BoxBuilder#viewport）
   * @returns {CellBaseBuilder} self（链式）
   */
  viewport() { return this._recordBoxOp('viewport', []); }
  /**
   * 启用网格布局，按最小单元格尺寸自动排列子项（委托 BoxBuilder#grid）
   * @param {number} w 最小单元格宽（px）
   * @param {number} h 最小单元格高（px）
   * @returns {CellBaseBuilder} self（链式）
   */
  grid(w, h) { return this._recordBoxOp('grid', [w, h]); }

  // === 挂载入口 ===

  /**
   * 挂载 Cell 树。在根 Cell 上调用一次，根据 slot 关系自动挂载全树的数据与 Box。
   *
   * 调用流程：
   * 1. 构造所有 Cell（new Cell(id)）
   * 2. 用 fill 填充 slot 关系（仅记录，不挂载）
   * 3. 根 Cell 调用 mount(dag._root) → 自动级联挂载全树
   * 4. 调用 react() 渲染
   *
   * 幂等：已挂载时重复调用无副作用。
   * @param {DataNode} parentDataNode 父数据节点（通常为 dag._root）
   * @returns {CellBaseBuilder} self（链式）
   */
  mount(parentDataNode) {
    if (!this._dataNode) {
      this._mountData(parentDataNode);
      this._mountBox();
    }
    return this;
  }

  // === 渲染 ===

  /**
   * 渲染为 React 元素。返回 CellRoot，渲染指定挂载点的 Box 三层。
   * 调用前需先 mount；未挂载时返回 null。
   * @param {number} mountIndex 挂载索引（默认 0，主挂载）
   * @returns {JSX.Element|null} 根元素
   */
  react(mountIndex = 0) {
    if (!this._mounts[mountIndex]) {
      return null;
    }
    return <CellRoot cell={this} mountIndex={mountIndex} />;
  }
}

export default CellBaseBuilder;
