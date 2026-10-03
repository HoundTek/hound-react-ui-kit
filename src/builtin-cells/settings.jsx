/**
 * @file settings.jsx —— SettingsCell（设置项行）高级 Cell
 *
 * 展示族/容器扫尾：行式设置项（见 docs/basic-cell-design.md）。
 * 双实现机制（kind: 'settings'）：组装 fallback（SettingsAssembledView）渲染
 * 左侧 title（13px）+ desc（非空时下方 11px 浅灰），右侧主控件区为单插槽
 * control（页面作者 fill 控件 Cell，如 SwitchCell）；主题可经
 * theme.components.settings 整体重写。
 *
 * Schema（数据契约，与旧版一致）：title / desc。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';
import { useThemeColor } from '../core/theme/theme-react';

/**
 * 设置项文本组装视图（fallback）：订阅 title/desc，渲染左侧标题与描述。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function SettingsAssembledView({ cell }) {
  const title = useText(useCellData(cell, 'title'));
  const desc = useText(useCellData(cell, 'desc'));
  const titleColor = useThemeColor('text', '#444');
  const descColor = useThemeColor('text-muted', '#aaa');
  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', gap: 2, padding: '0 12px', boxSizing: 'border-box',
      minWidth: 0, overflow: 'hidden',
    }}>
      <div style={{ fontSize: 13, color: titleColor }}>{title}</div>
      {desc ? <div style={{ fontSize: 11, color: descColor }}>{desc}</div> : null}
    </div>
  );
}

/** kind 'settings' 的实现分发视图 */
const SettingsDispatcher = createImplDispatcher('settings', SettingsAssembledView);

/**
 * SettingsCell：设置项行（高级 Cell）。title/desc 存 i18n key 或纯文本；右侧
 * 主控件区为单插槽 control（single: true），页面作者 fill('control', cell)
 * 填充 SwitchCell 等控件。固定高 48。呈现实现由 kind 'settings' 分发。
 */
class SettingsCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(48).color('surface')
      .moveY(false).moveX(false).layout('horizontal')
      .schema({
        title: { type: 'string', default: '' },
        desc: { type: 'string', default: '' },
      })
      .defineSlot('control', { moveY: false, layout: 'vertical', single: true })
      .renderContent(SettingsDispatcher);
  }
}

export { SettingsCell, SettingsAssembledView };
