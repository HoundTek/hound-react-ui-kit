/**
 * @file checkbox.jsx —— CheckboxCell（复选框）预设
 *
 * 展示单行复选框：label 存 i18n key 或纯文本，checked 为选中状态，
 * disabled 禁用时不可点击。点击整行切换 checked（数据驱动交互）。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';
import { useThemeColor, useCornerType, useShapeRadius } from '../core/theme/theme-react';
import { cornerStyle } from '../core/theme/shape';

/**
 * 复选框视图：订阅 label/checked/disabled，点击切换 checked。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function CheckboxView({ cell }) {
  const label = useText(useCellData(cell, 'label'));
  const checked = useCellData(cell, 'checked');
  const disabled = useCellData(cell, 'disabled');
  const corner = useCornerType();
  const controlR = useShapeRadius('control', 3);
  const text = useThemeColor('text', '#333');
  const primary = useThemeColor('primary', '#4a90d9');
  const surface = useThemeColor('surface', '#fff');
  const borderColor = useThemeColor('border', '#ccc');
  const onPrimary = useThemeColor('on-primary', '#fff');
  return (
    <div
      onClick={() => { if (!disabled) cell.setChecked(!checked); }}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px',
        width: '100%', height: '100%', cursor: disabled ? 'not-allowed' : 'pointer',
        userSelect: 'none', fontSize: 13, color: text, opacity: disabled ? 0.5 : 1,
      }}
    >
      <div style={{
        width: 16, height: 16, ...cornerStyle(corner, controlR), flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: checked ? primary : surface,
        border: checked ? `1px solid ${primary}` : `1px solid ${borderColor}`,
        color: onPrimary, fontSize: 12, fontWeight: 'bold',
      }}>
        {checked ? '✓' : ''}
      </div>
      {label}
    </div>
  );
}

/**
 * CheckboxCell：复选框。label 存 i18n key 或纯文本；checked 为选中状态；
 * disabled 禁用（点击不响应）。
 */
class CheckboxCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(40).color('surface')
      .schema({
        label: { type: 'string', default: '' },
        checked: { type: 'boolean', default: false },
        disabled: { type: 'boolean', default: false },
      })
      .renderContent(CheckboxView);
  }
}

export { CheckboxCell };
