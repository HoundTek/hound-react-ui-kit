/**
 * @file grid.jsx —— GridCell（网格容器）预设
 *
 * 网格容器：子 Cell 按 120x80 最小单元格自动排布，默认宽 360、白底，
 * X/Y 轴均锁定，不显示子项覆盖层（编辑期可经 showChildOverlays 再开启）。
 * 页面作者 fill 默认插槽填充子 Cell。
 */
import CellBaseBuilder from '../core/cell/cell-base';

/**
 * GridCell：网格容器。按 120x80 网格自动排布子 Cell，
 * 页面作者 fill 默认插槽填充。
 */
class GridCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.grid(120, 80).moveX(false).moveY(false)
      .defaultWidth(360).minHeight(160).backgroundColor('#ffffff').showChildOverlays(false);
  }
}

export { GridCell };