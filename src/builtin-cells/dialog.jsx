/**
 * @file dialog.jsx —— DialogCell（对话框容器）预设
 *
 * 浮动对话框容器：浮动视口、固定 320x200、可整体移动、不可缩放、
 * 白色底、纵向排列。header（单插槽，浅灰横向页眉，固定高 40）与
 * body（列表插槽，最小高 120、可纵向滚动）两个插槽由页面作者填充。
 * 用法：fill('header', [TitleCell, CloseButtonCell])、fill('body', 内容)；
 * 标题栏拖拽由页面作者在 header 插槽的 Cell 上配置 dragHandle，
 * 或直接拖动容器（movable 默认开启）；关闭按钮可经 closable() 开启。
 */
import CellBaseBuilder from '../core/cell/cell-base';

/**
 * DialogCell：对话框容器。header 单插槽（固定高 40 横向页眉，浅灰底），
 * body 列表插槽（最小高 120、可纵向滚动）。页面作者经 fill 填充。
 */
class DialogCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.floatingViewport().movable(true).resizable(false)
      .fixedWidth(320).fixedHeight(200).backgroundColor('#ffffff').layout('vertical')
      .defineSlot('header', {
        fixedHeight: 40, backgroundColor: '#e8e8e8',
        layout: 'horizontal', moveX: false, moveY: false, single: true,
      })
      .defineSlot('body', {
        minHeight: 120, moveY: true, layout: 'vertical',
        backgroundColor: '#ffffff', showChildOverlays: false,
      });
  }
}

export { DialogCell };