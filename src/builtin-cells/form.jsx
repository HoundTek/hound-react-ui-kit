/**
 * @file form.jsx —— FormCell（表单容器）预设
 *
 * 表单容器：纵向排列、默认宽 320、白底、纵向可滚动（X 轴锁定）。
 * 页面作者 fill 默认插槽填充 FieldCell 等表单项。
 */
import CellBaseBuilder from '../core/cell/cell-base';

/**
 * FormCell：表单容器。纵向排列、可滚动，页面作者 fill 默认插槽
 * 填充 FieldCell 等表单项。
 */
class FormCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.layout('vertical').moveX(false).moveY(true)
      .defaultWidth(320).minHeight(120).backgroundColor('#ffffff');
  }
}

export { FormCell };