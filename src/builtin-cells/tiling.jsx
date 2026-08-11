/**
 * @file tiling.jsx —— TilingCell（平铺容器）预设
 *
 * 纯容器预设：无数据、无视图，页面作者用 fill 填充子 Cell。
 * 锁定双轴（moveX/moveY false）→ reflow 按子项数量等分宽度；
 * 子项宽度由 reflow 等分，适合并列小卡片（如状态统计、快捷入口）。
 */
import CellBaseBuilder from '../core/cell/cell-base';

/**
 * TilingCell：平铺容器。横向排列、双轴锁定；子项宽度由 reflow 等分，
 * 高度随帧自动撑满。页面作者经 fill('_default', cells) 填充子 Cell。
 */
class TilingCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.layout('horizontal').moveX(false).moveY(false);
  }
}

export { TilingCell };
