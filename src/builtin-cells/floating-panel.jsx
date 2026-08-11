/**
 * @file floating-panel.jsx —— FloatingPanelCell（浮动面板）预设
 *
 * 浮动面板容器：浮动视口、可移动可缩放（最小 240x140）、白底、纵向排列。
 * header（单插槽，蓝底横向标题栏，固定高 36，dragHandle 拖拽点）与
 * body（列表插槽，最小高 80、可纵向滚动）两个插槽由页面作者填充。
 * 用法：fill('header', new TitleCell(...))、fill('body', 内容)。
 */
import CellBaseBuilder from '../core/cell/cell-base';

/**
 * FloatingPanelCell：浮动面板。header 单插槽为蓝底拖拽标题栏（dragHandle），
 * body 列表插槽可纵向滚动。可移动/缩放，页面作者经 fill 填充。
 */
class FloatingPanelCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.floatingViewport().movable(true).resizable(true)
      .minWidth(240).minHeight(140).backgroundColor('#ffffff').layout('vertical')
      .defineSlot('header', {
        fixedHeight: 36, backgroundColor: '#4a90d9', dragHandle: true,
        layout: 'horizontal', moveX: false, moveY: false, single: true,
      })
      .defineSlot('body', {
        minHeight: 80, moveY: true, layout: 'vertical',
        backgroundColor: '#ffffff', showChildOverlays: false,
      });
  }
}

export { FloatingPanelCell };