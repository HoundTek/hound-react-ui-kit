/**
 * @file row.jsx —— RowCell（横向行容器）预设
 *
 * 页面结构容器：等高横向行。横向排列、双轴锁定（reflow 对子项均分
 * 宽度，子项高度拉伸到行高）；行高由页面作者经 fixedHeight 显式指定。
 * 拖拽分界线默认隐藏，需要可拖拽分栏时经 showEdges() 开启。
 * 与 TilingCell 的区别：语义为内容行（surface 底色），
 * 适合统计卡片行、列表-详情联动行等区块内并列内容。
 * 纯容器型：无 schema、无视图、无 import React。
 */
import CellBaseBuilder from '../core/cell/cell-base';

/**
 * RowCell：横向行容器。页面作者经 fixedHeight 指定行高、
 * fill('_default', cells) 填充行内子 Cell。
 */
class RowCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.layout('horizontal').moveX(false).moveY(false)
      .color('surface');
  }
}

export { RowCell };
