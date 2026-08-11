/**
 * @file group.jsx —— GroupCell（分组容器）预设
 *
 * 分组容器：纵向排列、默认宽 260、白底，不显示子项覆盖层。
 * 页面作者 fill 默认插槽，可先 fill 一个 TitleCell 作为分组标题，
 * 再填充其余内容 Cell。
 */
import CellBaseBuilder from '../core/cell/cell-base';

/**
 * GroupCell：分组容器。纵向排列，页面作者 fill 默认插槽，
 * 可先 fill 一个 TitleCell 作为分组标题。
 */
class GroupCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.layout('vertical').defaultWidth(260).minHeight(80)
      .backgroundColor('#ffffff').showChildOverlays(false);
  }
}

export { GroupCell };