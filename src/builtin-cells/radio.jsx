/**
 * @file radio.jsx —— RadioCell（单选）预设
 *
 * 单行单选：label 存 i18n key 或纯文本，value 为该项值，checked 为选中状态，
 * group 为所属组名（同组互斥由页面作者处理）。点击整行 setChecked(true)，
 * 选中时圆点以主色填充。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';
import { useThemeColor, useCornerType } from '../core/theme/theme-react';
import { cornerStyle, CAPSULE_RADIUS } from '../core/theme/shape';

/**
 * 单选视图：订阅 label/checked，点击整行置为选中（数据驱动）。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function RadioView({ cell }) {
  const label = useText(useCellData(cell, 'label'));
  const checked = useCellData(cell, 'checked');
  const corner = useCornerType();
  const text = useThemeColor('text', '#333');
  const primary = useThemeColor('primary', '#4a90d9');
  const surface = useThemeColor('surface', '#fff');
  const borderColor = useThemeColor('border', '#ccc');
  const onPrimary = useThemeColor('on-primary', '#fff');
  return (
    <div
      onClick={() => cell.setChecked(true)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px',
        width: '100%', height: '100%', cursor: 'pointer', userSelect: 'none',
        fontSize: 13, color: text,
      }}
    >
      <div style={{
        width: 16, height: 16, ...cornerStyle(corner, CAPSULE_RADIUS), flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: checked ? primary : surface,
        border: checked ? `1px solid ${primary}` : `1px solid ${borderColor}`,
      }}>
        {checked ? <div style={{ width: 6, height: 6, ...cornerStyle(corner, CAPSULE_RADIUS), backgroundColor: onPrimary }} /> : null}
      </div>
      {label}
    </div>
  );
}

/**
 * RadioCell：单选。value 为该项的值，checked 为选中状态，
 * group 为组名；label 存 i18n key 或纯文本。点击置为选中（主色圆点）。
 */
class RadioCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(40).color('surface')
      .schema({
        label: { type: 'string', default: '' },
        value: { type: 'string', default: '' },
        checked: { type: 'boolean', default: false },
        group: { type: 'string', default: '' },
      })
      .renderContent(RadioView);
  }
}

export { RadioCell };