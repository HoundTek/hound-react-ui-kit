/**
 * @file footer.jsx —— FooterCell（页脚）预设
 *
 * 页面结构容器：页面底栏。固定高 60、横向排列、双轴锁定，
 * inverse-surface 反色表面深色底（适合页脚/底部信息条）。
 * 纯结构容器：内容由页面作者 fill('_default', cells) 填充，
 * 或经 renderContent 注入自定义内容组件。
 */
import CellBaseBuilder from '../core/cell/cell-base';

/**
 * FooterCell：页脚容器。固定高 60、inverse-surface 深色底、横向排列、
 * 双轴锁定；默认插槽无需 defineSlot 声明，子 Cell 经 fill 挂入。
 */
class FooterCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(60).color('inverse-surface')
      .moveX(false).moveY(false).layout('horizontal');
  }
}

export { FooterCell };
