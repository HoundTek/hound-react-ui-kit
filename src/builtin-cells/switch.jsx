/**
 * @file switch.jsx —— SwitchCell（开关）预设
 *
 * 展示行式开关：label 存 i18n key 或纯文本，enabled 为开/关状态，
 * disabled 禁用时不可点击。点击整行切换 enabled（数据驱动交互）。
 * 与核心预设 ToggleCell 的区别：支持 disabled，帧更高，适合独立成行。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';

/**
 * 开关视图：订阅 label/enabled/disabled，点击切换 enabled。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function SwitchView({ cell }) {
  const label = useText(useCellData(cell, 'label'));
  const enabled = useCellData(cell, 'enabled');
  const disabled = useCellData(cell, 'disabled');
  return (
    <div
      onClick={() => { if (!disabled) cell.setEnabled(!enabled); }}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 12px', width: '100%', height: '100%',
        cursor: disabled ? 'not-allowed' : 'pointer', userSelect: 'none',
        fontSize: 13, color: '#333', opacity: disabled ? 0.5 : 1,
      }}
    >
      <span>{label}</span>
      <div style={{
        width: 40, height: 22, borderRadius: 11, position: 'relative', flexShrink: 0,
        backgroundColor: enabled ? '#4a90d9' : '#ccc', transition: 'background-color .15s',
      }}>
        <div style={{
          position: 'absolute', top: 2, width: 18, height: 18, borderRadius: 9,
          backgroundColor: '#fff', transition: 'left .15s',
          left: enabled ? 20 : 2,
        }} />
      </div>
    </div>
  );
}

/**
 * SwitchCell：开关。label 存 i18n key 或纯文本；enabled 为开/关状态；
 * disabled 禁用（点击不响应）。
 */
class SwitchCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(44).backgroundColor('#fafafa')
      .schema({
        label: { type: 'string', default: '' },
        enabled: { type: 'boolean', default: true },
        disabled: { type: 'boolean', default: false },
      })
      .renderContent(SwitchView);
  }
}

export { SwitchCell };
