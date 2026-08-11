/**
 * @file control.jsx —— ControlCell（控件行）预设
 *
 * 通用控件行容器：横向排列，label（单插槽，固定宽 120）放标题/说明，
 * control（单插槽，固定宽 96）放开关、按钮等交互控件。
 * 与 FieldCell 的区别：label 区更宽、control 区为固定宽度（适合开关类控件）。
 * 用法：fill('label', new TextCell(...).setText('标题'))、
 *       fill('control', new SwitchCell(...))。
 */
import CellBaseBuilder from '../core/cell/cell-base';

/**
 * ControlCell：控件行容器。label 单插槽固定宽 120（标题/说明区），
 * control 单插槽固定宽 96（交互控件区）。页面作者经 fill 填充。
 */
class ControlCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.layout('horizontal').moveX(false).moveY(false).fixedHeight(48).backgroundColor('#ffffff')
      .defineSlot('label', {
        fixedWidth: 120, layout: 'horizontal', moveX: false, moveY: false,
        single: true, backgroundColor: '#ffffff',
      })
      .defineSlot('control', {
        fixedWidth: 96, layout: 'horizontal', moveX: false, moveY: false,
        single: true, backgroundColor: '#ffffff',
      });
  }
}

export { ControlCell };
