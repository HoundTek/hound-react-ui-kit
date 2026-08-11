/**
 * @file settings.jsx —— SettingsCell（设置项行）预设
 *
 * 行式设置项：左侧 title（13px 深灰）+ desc（非空时下方 11px 浅灰），
 * 右侧主控件区为单插槽 control，页面作者 fill 控件 Cell（如 SwitchCell）。
 * title/desc 存 i18n key 或纯文本。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';

/**
 * 设置项文本视图：订阅 title/desc，渲染左侧标题与描述。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function SettingsView({ cell }) {
  const title = useText(useCellData(cell, 'title'));
  const desc = useText(useCellData(cell, 'desc'));
  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', gap: 2, padding: '0 12px', boxSizing: 'border-box',
      minWidth: 0, overflow: 'hidden',
    }}>
      <div style={{ fontSize: 13, color: '#444' }}>{title}</div>
      {desc ? <div style={{ fontSize: 11, color: '#aaa' }}>{desc}</div> : null}
    </div>
  );
}

/**
 * SettingsCell：设置项行。title/desc 存 i18n key 或纯文本；右侧主控件区为
 * 单插槽 control（single: true），页面作者 fill('control', cell) 填充
 * SwitchCell 等控件。固定高 48。
 */
class SettingsCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(48).backgroundColor('#ffffff')
      .moveY(false).moveX(false).layout('horizontal')
      .schema({
        title: { type: 'string', default: '' },
        desc: { type: 'string', default: '' },
      })
      .defineSlot('control', { moveY: false, layout: 'vertical', single: true })
      .renderContent(SettingsView);
  }
}

export { SettingsCell };