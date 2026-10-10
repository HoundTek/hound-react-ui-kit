/**
 * @file split.jsx —— SplitCell（分栏容器）预设
 *
 * 页面结构容器：侧栏 + 主区的横向分栏。双轴锁定、横向排列；
 * side 插槽默认宽 200（min 140 / max 320，与主区间的分界线可拖拽调宽）、
 * 纵向滚动（moveY），承菜单/导航等侧栏内容；默认插槽承主区内容
 * （弹性占满剩余宽度）。
 * 分界线覆盖层显式开启（showEdges）：默认隐藏，开启后悬停分界线
 * 显示主题 primary 指示条，按下拖拽调宽。
 * 纯容器型：无 schema、无视图、无 import React。
 */
import CellBaseBuilder from '../core/cell/cell-base';

/**
 * SplitCell：分栏容器。side 插槽（默认宽 200、可拖拽调宽、纵向滚动）+ 默认插槽
 * （主区）。页面作者经 fill('side', cells) / fill('_default', cells) 填充。
 */
class SplitCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.minHeight(200).color('surface-muted')
      .moveX(false).moveY(false).layout('horizontal')
      .showEdges(true)
      .defineSlot('side', {
        defaultWidth: 200, minWidth: 140, maxWidth: 320, color: 'surface-muted',
        layout: 'vertical', moveY: true,
      });
  }
}

export { SplitCell };
