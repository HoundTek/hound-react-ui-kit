/**
 * @file dashboard.jsx —— DashboardCell（仪表盘容器）预设
 *
 * 纯容器型：grid(140, 110) 网格自动排布子 Cell（如 StatCell），默认插槽 fill 填充；
 * 无 schema、无视图，仅承担网格布局与背景。
 */
import CellBaseBuilder from '../core/cell/cell-base';

/**
 * DashboardCell：仪表盘容器。grid(140, 110) 网格布局，默认插槽经 fill 填充子 Cell；
 * 子项不可自由移动，隐藏子项拖拽手柄。
 */
class DashboardCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.grid(140, 110).backgroundColor('#ffffff')
      .moveX(false).moveY(false).showChildOverlays(false);
  }
}

export { DashboardCell };