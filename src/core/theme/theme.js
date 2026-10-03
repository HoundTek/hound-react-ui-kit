/**
 * @file 主题系统核心。Theme 是一组呈现资源的集合，当前承载：
 *        - 动态属性层：尺寸变化特效（resize effect）的声明式描述
 *        - 静态资源层：形状描述（shape：圆角类型 + 包裹层规范）与普适样式配置
 *          （materials：颜色角色表、材质表、遮罩；styles：按组件角色的普适样式
 *          默认值表），见 docs/theme-shape-design.md
 *
 *        与 Cell/Box 解耦：Theme 只持有声明式描述，不依赖任何 Cell/Box 类型；
 *        Cell/Box 只通过注入机制读取当前主题的声明，不感知具体主题包。
 */
class Theme {
  /**
   * @param {Object} [options] 主题配置
   * @param {string} [options.name='default'] 主题名
   * @param {Object} [options.effects={}] 动态属性（特效）集合
   * @param {Object} [options.effects.resize] 尺寸变化特效描述
   * @param {string} options.effects.resize.type 特效类型（stretch / blur / freezeZoom / none / ...）
   * @param {...*} [options.effects.resize.*] 特效参数（由对应实现消费，语义由实现定义）
   * @param {Object} [options.shape={}] 形状描述
   * @param {'g1'|'g2'} [options.shape.corner='g1'] 圆角类型（已废弃：渲染恒为
   *   g1 border-radius；g2 曲率平滑依赖 CSS corner-shape，未普及已舍弃，
   *   见 docs/basic-cell-design.md「跨浏览器一致性约定」）
   * @param {Object<string, Array<{inset: number, radius: number|'concentric', color?: string, opacity?: number}>>}
   *   [options.shape.layers] 包裹层规范（按组件角色声明；default 为缺省角色）。
   *   inset 为与向外一层的间距（第 0 层恒 0）；radius 为显式 px 或 'concentric'（外半径 − inset）；
   *   color/opacity 为该层壳的可选填充（color 为颜色角色）
   * @param {Object} [options.materials={}] 普适样式配置取值表
   * @param {Object<string, string>} [options.materials.colors] 颜色角色 → 色值
   * @param {Object<string, Object>} [options.materials.material] 材质标识 → 材质参数
   *   （如 frosted: { blur, baseOpacity }）
   * @param {{color?: string, opacity?: number}} [options.materials.mask] 可操作窗口遮罩
   * @param {Object<string, {shape?: 'rect'|'capsule'|'circle', color?: string, material?: string, opacity?: number}>}
   *   [options.styles={}] 普适样式默认值表（按组件角色声明；default 为缺省角色）。
   *   字段与 Cell 的普适配置声明一一对应：shape 基础形状、color 颜色角色、
   *   material 材质标识、opacity 不透明度。解析优先级：
   *   Cell 显式声明（.shape()/.color()/.material()/.opacity()）> 本表 > 内建降级
   * @param {Object<string, string>} [options.components={}] 组件级重写声明
   *   （两级样式体系第二级，见 docs/basic-cell-design.md）：Cell 种类 → 实现名。
   *   实现名经 src/core/cell/implementations.js 注册表解析，未识别降级为该
   *   Cell 的组装 fallback
   * @param {Object<string, {variant?: string, radius?: number|'capsule'|string, elevation?: number}>}
   *   [options.elements={}] 元素级样式表（普适性配置的元素级扩展）：按元素角色
   *   （button / input / slider / list / ...）集中声明基础实现组件（XxxImpl）内部
   *   元素的默认样式。variant 变体名（枚举由各 Impl 定义）；radius 为 px 数值、
   *   'capsule' 或形状尺度角色名（走 getBaseRadius）；elevation 为 0–3 阴影档。
   *   解析优先级：Impl props 显式 > 本表 > 内建默认
   */
  constructor({ name = 'default', effects = {}, shape = {}, materials = {}, styles = {}, components = {}, elements = {} } = {}) {
    this.name = name;
    this._effects = effects;
    this._shape = shape;
    this._materials = materials;
    this._styles = styles;
    this._components = components;
    this._elements = elements;
  }

  /**
   * 取当前主题的尺寸变化特效描述（声明式）
   * @returns {Object|null} 特效描述；未声明返回 null
   */
  getResizeEffect() {
    return this._effects.resize || null;
  }

  /**
   * 取圆角类型（已废弃：渲染恒为 g1，见 docs/basic-cell-design.md
   * 「跨浏览器一致性约定」；保留仅为调用点兼容）
   * @returns {'g1'|'g2'} 圆角类型；未声明返回 'g1'
   */
  getCornerType() {
    return this._shape.corner || 'g1';
  }

  /**
   * 取组件角色的包裹层规范；角色未声明时回退 default 角色
   * @param {string} [role] 组件角色（如 'button'、'window'）
   * @returns {Array|null} 层规范数组；未声明返回 null
   */
  getShapeLayers(role) {
    const layers = this._shape.layers;
    if (!layers) return null;
    return (role && layers[role]) || layers.default || null;
  }

  /**
   * 取组件角色的基准圆角（其层规范第 0 层的 radius）。供元素级圆角
   * 按角色对齐主题半径尺度（见 docs/theme-shape-design.md）
   * @param {string} [role] 组件角色（如 'control'、'card'）
   * @returns {number|null} 基准圆角（px）；未声明或非数值返回 null
   */
  getBaseRadius(role) {
    const r = this.getShapeLayers(role)?.[0]?.radius;
    return typeof r === 'number' ? r : null;
  }

  /**
   * 把颜色角色解析为具体色值
   * @param {string} role 颜色角色（如 'primary'、'surface'）
   * @returns {string|null} 色值；角色未定义返回 null
   */
  resolveColor(role) {
    return this._materials.colors?.[role] ?? null;
  }

  /**
   * 取材质参数（如 frosted 的 blur/baseOpacity）
   * @param {string} name 材质标识（solid / frosted / outlined / ...）
   * @returns {Object|null} 材质参数；未声明返回 null
   */
  getMaterial(name) {
    return this._materials.material?.[name] ?? null;
  }

  /**
   * 取可操作窗口遮罩配置
   * @returns {{color?: string, opacity?: number}|null} 遮罩配置；未声明返回 null
   */
  getMask() {
    return this._materials.mask ?? null;
  }

  /**
   * 取组件角色的普适样式默认值（styles 表）；角色未声明时回退 default 角色。
   * 仅作默认值：Cell 显式声明的 shape/color/material/opacity 优先于本表
   * @param {string} [role] 组件角色（如 'card'、'window'）
   * @returns {{shape?: string, color?: string, material?: string, opacity?: number}|null}
   *   角色样式；未声明返回 null
   */
  getRoleStyle(role) {
    return (role && this._styles[role]) || this._styles.default || null;
  }

  /**
   * 取主题对某 Cell 种类声明的重写实现名（组件级重写，声明式）。
   * 实现名由 Cell 视图层经实现注册表解析，未识别时降级组装 fallback
   * @param {string} kind Cell 种类（如 'switch'）
   * @returns {string|null} 实现名；未声明返回 null
   */
  getComponent(kind) {
    return this._components?.[kind] ?? null;
  }

  /**
   * 取元素角色的元素级样式默认值（elements 表）；角色未声明时回退 default 角色。
   * 仅作默认值：Impl props 显式传入优先于本表
   * @param {string} [role] 元素角色（如 'button'、'input'、'slider'、'list'）
   * @returns {{variant?: string, radius?: number|string, elevation?: number}|null}
   *   元素样式；未声明返回 null
   */
  getElementStyle(role) {
    return (role && this._elements[role]) || this._elements.default || null;
  }
}

export default Theme;
