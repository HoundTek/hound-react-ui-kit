/**
 * @file section.jsx —— SectionCell（分区容器）预设
 *
 * 分区容器：顶部标题栏（高 32，13px 加粗，浅色底纹 + 下边框），
 * 下方默认插槽填充内容。title 存 i18n key 或纯文本。
 * 与 GroupCell 的区别：标题内建于容器（带 #fafafa 浅色底纹），视觉更醒目。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';

/**
 * 分区标题视图：订阅 title，渲染顶部标题栏（高 32、浅色底纹、下边框）。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function SectionView({ cell }) {
  const title = useText(useCellData(cell, 'title'));
  return (
    <div style={{
      width: '100%', height: 32, display: 'flex', alignItems: 'center',
      padding: '0 12px', fontSize: 13, fontWeight: 'bold', color: '#333',
      backgroundColor: '#fafafa', borderBottom: '1px solid #eee', boxSizing: 'border-box',
    }}>{title}</div>
  );
}

/**
 * SectionCell：分区容器。title 存 i18n key 或纯文本，渲染于顶部标题栏
 * （高 32、浅色底纹 #fafafa、下边框 #eee）；内容经 fill 填充默认插槽
 * _default。默认宽 260。
 */
class SectionCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.defaultWidth(260).backgroundColor('#ffffff')
      .moveY(false).moveX(false).layout('vertical')
      .schema({ title: { type: 'string', default: '' } })
      .renderContent(SectionView);
  }
}

export { SectionCell };