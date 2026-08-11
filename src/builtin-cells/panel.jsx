/**
 * @file panel.jsx —— PanelCell（面板）预设
 *
 * 组合型容器预设：header（单插槽，页眉栏）承标题/操作区，默认插槽承接主体内容。
 * 与 CardCell 的区别：更轻量的视觉（无页眉底色，边框由父容器或主题决定），
 * 主体内容直接填充默认插槽（不在独立滚动插槽内）。
 */
import CellBaseBuilder from '../core/cell/cell-base';

/**
 * PanelCell：面板容器。header 单插槽固定高度 36（横向页眉），
 * 主体内容填充默认插槽（_default），在 header 之下纵向排布。
 */
class PanelCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.defaultWidth(260).minHeight(100).backgroundColor('#ffffff')
      .moveY(false).moveX(false).layout('vertical')
      .defineSlot('header', {
        fixedHeight: 36, backgroundColor: '#fafafa',
        layout: 'horizontal', moveX: false, moveY: false, single: true,
      });
  }
}

export { PanelCell };
