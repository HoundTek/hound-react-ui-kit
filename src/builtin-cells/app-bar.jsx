/**
 * @file app-bar.jsx —— AppBarCell（顶栏）预设
 *
 * 页面结构容器：应用顶栏（App Bar）。固定高 60、横向排列、双轴锁定，
 * primary 主题色底；页面作者经 fill('_default', cells) 填充 Logo/导航/
 * 用户区等子 Cell（各子项以 fixedWidth/defaultWidth 配重分宽）。
 * 纯容器型：无 schema、无视图、无 import React。
 */
import CellBaseBuilder from '../core/cell/cell-base';

/**
 * AppBarCell：顶栏容器。固定高 60、primary 底色、横向排列、双轴锁定；
 * 默认插槽无需 defineSlot 声明，子 Cell 经 fill 挂入。
 */
class AppBarCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(60).color('primary')
      .moveX(false).moveY(false).layout('horizontal');
  }
}

export { AppBarCell };
