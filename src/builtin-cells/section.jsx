/**
 * @file section.jsx —— SectionCell（分区容器）高级 Cell
 *
 * 展示族/容器扫尾：分区容器（见 docs/basic-cell-design.md）。
 * 双实现机制（kind: 'section'）：组装 fallback（SectionAssembledView）渲染顶部
 * 标题栏（高 32，13px 加粗，surface-muted 浅色底纹 + border 下边框），下方默认
 * 插槽填充内容；主题可经 theme.components.section 整体重写。
 * 与 GroupCell 的区别：标题内建于容器，视觉更醒目。
 *
 * Schema（数据契约，与旧版一致）：title。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';
import { useThemeColor } from '../core/theme/theme-react';

/**
 * 分区标题组装视图（fallback）：订阅 title，渲染顶部标题栏（高 32、浅色底纹、下边框）。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function SectionAssembledView({ cell }) {
  const title = useText(useCellData(cell, 'title'));
  const textColor = useThemeColor('text', '#333');
  const bgColor = useThemeColor('surface-muted', '#fafafa');
  const borderColor = useThemeColor('border', '#eee');
  return (
    <div style={{
      width: '100%', height: 32, display: 'flex', alignItems: 'center',
      padding: '0 12px', fontSize: 13, fontWeight: 'bold', color: textColor,
      backgroundColor: bgColor, borderBottom: `1px solid ${borderColor}`, boxSizing: 'border-box',
    }}>{title}</div>
  );
}

/** kind 'section' 的实现分发视图 */
const SectionDispatcher = createImplDispatcher('section', SectionAssembledView);

/**
 * SectionCell：分区容器（高级 Cell）。title 存 i18n key 或纯文本，渲染于顶部
 * 标题栏（高 32、surface-muted 浅色底纹、border 下边框，经主题解析）；内容经
 * fill 填充默认插槽 _default。默认宽 260。呈现实现由 kind 'section' 分发。
 */
class SectionCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.defaultWidth(260).color('surface')
      .moveY(false).moveX(false).layout('vertical')
      .schema({ title: { type: 'string', default: '' } })
      .renderContent(SectionDispatcher);
  }
}

export { SectionCell, SectionAssembledView };
