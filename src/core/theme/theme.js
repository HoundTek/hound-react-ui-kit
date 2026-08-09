/**
 * @file 主题系统核心。Theme 是一组呈现资源的集合，本阶段聚焦"动态属性层"中的
 *        尺寸变化特效（resize effect）：主题以声明式描述声明"尺寸变化时呈现什么特效"，
 *        由特效注册表（resize-effects）解析为具体实现。
 *
 *        与 Cell/Box 解耦：Theme 只持有声明式描述，不依赖任何 Cell/Box 类型；
 *        Cell/Box 只通过注入机制读取当前主题的特效描述，不感知具体主题包。
 */
class Theme {
  /**
   * @param {Object} [options] 主题配置
   * @param {string} [options.name='default'] 主题名
   * @param {Object} [options.effects={}] 动态属性（特效）集合
   * @param {Object} [options.effects.resize] 尺寸变化特效描述
   * @param {string} options.effects.resize.type 特效类型（stretch / shrinkToFit / blur / none / ...）
   * @param {...*} [options.effects.resize.*] 特效参数（由对应实现消费，语义由实现定义）
   */
  constructor({ name = 'default', effects = {} } = {}) {
    this.name = name;
    this._effects = effects;
  }

  /**
   * 取当前主题的尺寸变化特效描述（声明式）
   * @returns {Object|null} 特效描述；未声明返回 null
   */
  getResizeEffect() {
    return this._effects.resize || null;
  }
}

export default Theme;
