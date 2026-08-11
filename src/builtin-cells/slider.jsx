/**
 * @file slider.jsx —— SliderCell（滑块）预设
 *
 * 展示滑块输入：label 存 i18n key 或纯文本，min/max/step 定义取值域，
 * value 为当前值（onChange 即时写入数据，右上角回显）。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';

/**
 * 滑块视图：订阅 label/min/max/step/value，onChange 写入 value。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function SliderView({ cell }) {
  const label = useText(useCellData(cell, 'label'));
  const min = useCellData(cell, 'min');
  const max = useCellData(cell, 'max');
  const step = useCellData(cell, 'step');
  const value = useCellData(cell, 'value');
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      padding: '0 12px', width: '100%', height: '100%', gap: 6,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#888' }}>
        <span>{label}</span>
        <span style={{ color: '#333', fontWeight: 'bold' }}>{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => cell.setValue(Number(e.target.value))}
        style={{ width: '100%' }}
      />
    </div>
  );
}

/**
 * SliderCell：滑块。label 存 i18n key 或纯文本；min/max/step 定义取值域；
 * value 为当前值（拖动即时写入数据）。
 */
class SliderCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(56).backgroundColor('#fafafa')
      .schema({
        label: { type: 'string', default: '' },
        min: { type: 'number', default: 0 },
        max: { type: 'number', default: 100 },
        step: { type: 'number', default: 1 },
        value: { type: 'number', default: 50 },
      })
      .renderContent(SliderView);
  }
}

export { SliderCell };
