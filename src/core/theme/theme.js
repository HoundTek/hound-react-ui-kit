/**
 * @file 主题系统核心。Theme 是一组呈现资源的集合，当前承载：
 *        - 动态属性层：尺寸变化特效（resize effect）的声明式描述
 *        - 静态资源层：形状描述（shape：圆角类型 + 包裹层规范）与普适样式配置
 *          （materials：颜色角色表、材质表、遮罩），见 docs/theme-shape-design.md
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
   * @param {'g1'|'g2'} [options.shape.corner='g1'] 圆角类型：g1 非平滑圆弧 / g2 曲率平滑
   * @param {Object<string, Array<{inset: number, radius: number|'concentric', color?: string, opacity?: number}>>}
   *   [options.shape.layers] 包裹层规范（按组件角色声明；default 为缺省角色）。
   *   inset 为与向外一层的间距（第 0 层恒 0）；radius 为显式 px 或 'concentric'（外半径 − inset）；
   *   color/opacity 为该层壳的可选填充（color 为颜色角色）
   * @param {Object} [options.materials={}] 普适样式配置取值表
   * @param {Object<string, string>} [options.materials.colors] 颜色角色 → 色值
   * @param {Object<string, Object>} [options.materials.material] 材质标识 → 材质参数
   *   （如 frosted: { blur, baseOpacity }）
   * @param {{color?: string, opacity?: number}} [options.materials.mask] 可操作窗口遮罩
   */
  constructor({ name = 'default', effects = {}, shape = {}, materials = {} } = {}) {
    this.name = name;
    this._effects = effects;
    this._shape = shape;
    this._materials = materials;
  }

  /**
   * 取当前主题的尺寸变化特效描述（声明式）
   * @returns {Object|null} 特效描述；未声明返回 null
   */
  getResizeEffect() {
    return this._effects.resize || null;
  }

  /**
   * 取圆角类型（g1 非平滑 / g2 曲率平滑）
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
}

export default Theme;
