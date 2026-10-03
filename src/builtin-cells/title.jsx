/**
 * @file title.jsx —— TitleCell（标题）高级 Cell
 *
 * 展示族：标题 = 加粗文本（TextImpl，见 docs/basic-cell-design.md）。
 * 双实现机制（kind: 'title'）：组装 fallback（TitleAssembledView）直接渲染
 * 基础 Cell 文本的实现组件 TextImpl（bold）；主题可经 theme.components.title
 * 整体重写。与 TextCell 的区别：默认加粗、字号更大，用于区块/面板标题。
 *
 * Schema（数据契约，与旧版一致）：text / size / color / align。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { TextImpl } from '../basic-cells';

/**
 * 标题组装视图（fallback）：订阅 text/size/color/align，渲染加粗 TextImpl。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function TitleAssembledView({ cell }) {
  const text = useCellData(cell, 'text');
  const size = useCellData(cell, 'size');
  const color = useCellData(cell, 'color');
  const align = useCellData(cell, 'align');
  return <TextImpl text={text} size={size} color={color} bold align={align} />;
}

/** kind 'title' 的实现分发视图 */
const TitleDispatcher = createImplDispatcher('title', TitleAssembledView);

/**
 * TitleCell：标题（高级 Cell，展示族）。text 存 i18n key 或纯文本，
 * size/color/align 控制排版。呈现实现由 kind 'title' 分发（缺省为 TextImpl 组装版）。
 */
class TitleCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(40).color('surface')
      .schema({
        text: { type: 'string', default: '' },
        size: { type: 'number', default: 16 },
        color: { type: 'string', default: '#333333' },
        align: { type: 'string', default: 'left' },
      })
      .renderContent(TitleDispatcher);
  }
}

export { TitleCell, TitleAssembledView };
