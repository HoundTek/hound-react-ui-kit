/**
 * @file stepper.jsx —— StepperCell（数字步进器）预设
 *
 * 数值步进控件：label 存 i18n key 或纯文本（左侧灰小字），value 为当前值，
 * min/max 为取值范围，step 为步长。−/+ 按钮按步长调整 value 并自动钳制在
 * [min, max] 内；到达边界时按钮半透明禁用（not-allowed）。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';

/**
 * 步进器视图：订阅 label/value/min/max/step，点击 −/+ 写回 value（数据驱动交互）。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function StepperView({ cell }) {
  const label = useText(useCellData(cell, 'label'));
  const value = useCellData(cell, 'value');
  const min = useCellData(cell, 'min');
  const max = useCellData(cell, 'max');
  const step = useCellData(cell, 'step');
  const btnStyle = (disabled) => ({
    width: 28, height: 28, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '1px solid #ccc', borderRadius: 4, backgroundColor: '#ffffff',
    color: '#333', fontSize: 16, lineHeight: 1,
    cursor: disabled ? 'not-allowed' : 'pointer', userSelect: 'none',
    opacity: disabled ? 0.4 : 1,
  });
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px',
      width: '100%', height: '100%',
    }}>
      {label ? <span style={{ flexShrink: 0, fontSize: 12, color: '#888' }}>{label}</span> : null}
      <div style={{ flex: 1 }} />
      <button
        type="button"
        disabled={value <= min}
        onClick={() => cell.setValue(Math.max(min, value - step))}
        style={btnStyle(value <= min)}
      >
        −
      </button>
      <span style={{
        flexShrink: 0, minWidth: 36, textAlign: 'center', fontSize: 13, color: '#333',
        fontFamily: 'Consolas, Monaco, monospace',
      }}>
        {value}
      </span>
      <button
        type="button"
        disabled={value >= max}
        onClick={() => cell.setValue(Math.min(max, value + step))}
        style={btnStyle(value >= max)}
      >
        +
      </button>
    </div>
  );
}

/**
 * StepperCell：数字步进器。value 为当前值（默认 0），min/max 钳制范围
 * （默认 0/10），step 为步长（默认 1）；label 存 i18n key 或纯文本。
 */
class StepperCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(40).backgroundColor('#ffffff')
      .schema({
        label: { type: 'string', default: '' },
        value: { type: 'number', default: 0 },
        min: { type: 'number', default: 0 },
        max: { type: 'number', default: 10 },
        step: { type: 'number', default: 1 },
      })
      .renderContent(StepperView);
  }
}

export { StepperCell };
