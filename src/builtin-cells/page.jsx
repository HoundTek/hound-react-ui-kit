/**
 * @file page.jsx —— PageCell（页面根）预设
 *
 * 页面级根容器：声明页面视口（viewport）与纵向布局、纵向滚动（moveY(true)），
 * 子 Cell 直接挂入默认插槽 _default，由页面作者经 fill('_default', cells)
 * 或 fill(cells) 填充。纯容器型：无 schema、无视图、无 import React。
 */
import CellBaseBuilder from '../core/cell/cell-base';

/**
 * PageCell：页面根。viewport + 纵向布局 + 纵向滚动；
 * 默认插槽无需 defineSlot 声明，子 Cell 经 fill 挂入。
 */
class PageCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.viewport().layout('vertical').moveY(true);
  }
}

export { PageCell };