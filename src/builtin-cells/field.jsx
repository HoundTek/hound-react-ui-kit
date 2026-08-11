/**
 * @file field.jsx —— FieldCell（表单字段容器）预设
 *
 * 表单行容器：横向排列、固定高 44、白底。label（单插槽，固定宽 80）与
 * control（单插槽，占满剩余空间）两个插槽由页面作者填充。
 * 用法：fill('label', new TextCell(...).setText('标签'))、
 *       fill('control', new InputCell(...))。
 */
import CellBaseBuilder from '../core/cell/cell-base';

/**
 * FieldCell：表单字段容器。label 单插槽固定宽 80（标签区），
 * control 单插槽占满剩余空间（输入控件区）。页面作者经 fill 填充。
 */
class FieldCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.layout('horizontal').moveX(false).moveY(false).fixedHeight(44).backgroundColor('#ffffff')
      .defineSlot('label', {
        fixedWidth: 80, layout: 'horizontal', moveX: false, moveY: false,
        single: true, backgroundColor: '#ffffff',
      })
      .defineSlot('control', {
        layout: 'horizontal', moveX: true, single: true, backgroundColor: '#ffffff',
      });
  }
}

export { FieldCell };