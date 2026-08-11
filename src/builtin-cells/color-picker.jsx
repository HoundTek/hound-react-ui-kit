/**
 * @file color-picker.jsx —— ColorPickerCell（颜色选择器）预设
 *
 * 颜色选择：swatches 为常用色板数组（默认 8 个常用色），点击色块写入 color
 * （当前色描边高亮）；下方原生取色器支持精细编辑。color 存 hex 格式。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';

const DEFAULT_SWATCHES = ['#4a90d9', '#1a8a4a', '#c03a2a', '#c07a1a', '#8a6fd9', '#d96f9a', '#333333', '#888888'];

/**
 * 颜色选择器视图：订阅 swatches/color，点击色块或取色器写入 color。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function ColorPickerView({ cell }) {
  const swatches = useCellData(cell, 'swatches') || [];
  const color = useCellData(cell, 'color');
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 8,
      width: '100%', height: '100%', padding: 8, boxSizing: 'border-box',
      backgroundColor: '#ffffff',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {swatches.map((sw, i) => (
          <div
            key={i}
            onClick={() => cell.setColor(sw)}
            style={{
              width: 20, height: 20, borderRadius: 4, backgroundColor: sw,
              cursor: 'pointer', flexShrink: 0, boxSizing: 'border-box',
              border: sw === color ? '2px solid #333333' : '1px solid rgba(0,0,0,0.15)',
            }}
          />
        ))}
      </div>
      <input
        type="color"
        value={color}
        onChange={e => cell.setColor(e.target.value)}
        style={{ width: 32, height: 20, padding: 0, border: 'none', background: 'none', cursor: 'pointer', flexShrink: 0 }}
      />
    </div>
  );
}

/**
 * ColorPickerCell：颜色选择器。swatches 为色板数组（默认 8 个常用色），
 * color 为当前色（hex）；点击色块或取色器写入 color（数据驱动交互）。
 */
class ColorPickerCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(64).defaultWidth(200).backgroundColor('#ffffff')
      .schema({
        swatches: { type: 'array', default: DEFAULT_SWATCHES },
        color: { type: 'string', default: '#4a90d9' },
      })
      .renderContent(ColorPickerView);
  }
}

export { ColorPickerCell };