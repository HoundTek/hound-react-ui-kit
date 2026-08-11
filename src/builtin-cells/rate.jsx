/**
 * @file rate.jsx —— RateCell（评分）预设
 *
 * 星级评分：value 为已点亮星数，count 为星总数，color 为星色，
 * disabled 禁用时点击不响应。点击第 i 颗星 setValue(i+1)。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';

/**
 * 评分视图：订阅 value/count/color/disabled，渲染 count 颗星
 * （★ 已点亮 / ☆ 未点亮），点击第 i 颗写入 i+1。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function RateView({ cell }) {
  const value = useCellData(cell, 'value');
  const count = useCellData(cell, 'count');
  const color = useCellData(cell, 'color');
  const disabled = useCellData(cell, 'disabled');
  const stars = Array.from({ length: count }, (_, i) => i);
  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', alignItems: 'center',
      gap: 2, padding: '0 12px', cursor: disabled ? 'not-allowed' : 'pointer',
    }}>
      {stars.map(i => (
        <span
          key={i}
          onClick={() => { if (!disabled) cell.setValue(i + 1); }}
          style={{ fontSize: 20, color: i < value ? color : '#ddd', userSelect: 'none', lineHeight: 1 }}
        >
          {i < value ? '★' : '☆'}
        </span>
      ))}
    </div>
  );
}

/**
 * RateCell：评分。value 为已点亮星数（默认 0），count 为星总数（默认 5），
 * color 为星色（默认金橙），disabled 禁用时点击不响应。
 */
class RateCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(32).backgroundColor('#ffffff')
      .schema({
        value: { type: 'number', default: 0 },
        count: { type: 'number', default: 5 },
        color: { type: 'string', default: '#f0a020' },
        disabled: { type: 'boolean', default: false },
      })
      .renderContent(RateView);
  }
}

export { RateCell };