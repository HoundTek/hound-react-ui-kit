/**
 * @file group.jsx —— GroupCell（分组容器）预设
 *
 * 分组容器：纵向排列、默认宽 260、白底（Edge/Corner 覆盖层默认隐藏，
 * 需要子项拖拽分界线时经 showEdges 开启；Corner 跟随 Edge 的显示开关）。
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
      .color('surface');
  }
}

export { GroupCell };