/**
 * @file card.jsx —— CardCell（卡片）预设
 *
 * 组合型容器预设：header（单插槽，横向页眉）/body（列表插槽，可滚动）两个插槽
 * 由页面作者填充（如 TitleCell/TextCell 填入 header，内容 Cell 填入 body）。
 * 默认白底、纵向排列、隐藏子项拖拽手柄，适合信息分组展示。
 */
import CellBaseBuilder from '../core/cell/cell-base';

/**
 * CardCell：卡片容器。header 单插槽固定高度 44（横向页眉），
 * body 列表插槽最小高度 60、可纵向滚动。页面作者经 fill 填充。
 */
class CardCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.defaultWidth(260).minHeight(120).backgroundColor('#ffffff')
      .moveY(false).moveX(false).layout('vertical')
      .defineSlot('header', {
        fixedHeight: 44, backgroundColor: '#f5f5f5',
        layout: 'horizontal', moveX: false, moveY: false, single: true,
      })
      .defineSlot('body', {
        minHeight: 60, moveY: true, layout: 'vertical',
        backgroundColor: '#ffffff', showChildOverlays: false,
      });
  }
}

export { CardCell };
