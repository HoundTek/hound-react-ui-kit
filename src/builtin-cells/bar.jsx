/**
 * @file bar.jsx —— BarCell（条形图）预设
 *
 * 展示横向条形图：items 为 [{label, value}] 数组，value 相对最大值归一化
 * 填充宽度；color 控制填充色，showValue 控制右侧数值回显。
 * 帧内纵向滚动（moveY true），单行高 22。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';

/**
 * 条形图视图：订阅 items/color/showValue，渲染纵向条列表。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function BarView({ cell }) {
  const items = useCellData(cell, 'items') || [];
  const color = useCellData(cell, 'color');
  const showValue = useCellData(cell, 'showValue');
  const maxValue = Math.max(0, ...items.map(i => i.value || 0)) || 1;
  return (
    <div style={{ width: '100%', height: '100%', padding: '4px 10px' }}>
      {items.map((item, i) => (
        <BarRow key={item.id || i} item={item} color={color} showValue={showValue} maxValue={maxValue} />
      ))}
    </div>
  );
}

/**
 * 条形图单行：label + 轨道 + 填充条（宽度按 maxValue 归一化）+ 可选数值。
 * @param {{item: Object, color: string, showValue: boolean, maxValue: number}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function BarRow({ item, color, showValue, maxValue }) {
  const label = useText(item.label);
  const value = item.value || 0;
  const pct = (value / maxValue) * 100;
  return (
    <div style={{ display: 'flex', alignItems: 'center', height: 22 }}>
      <div style={{
        width: 48, fontSize: 12, color: '#666', textAlign: 'right', paddingRight: 6, flexShrink: 0,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {label}
      </div>
      <div style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: '#eee', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 5, backgroundColor: color }} />
      </div>
      {showValue ? (
        <span style={{ fontSize: 11, color: '#888', paddingLeft: 6, flexShrink: 0 }}>{value}</span>
      ) : null}
    </div>
  );
}

/**
 * BarCell：条形图。items 为 [{label, value}]（label 存 i18n key 或纯文本，
 * value 相对 items 最大值归一化填充宽度）；color 控制填充色；
 * showValue 控制右侧数值回显。
 */
class BarCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.moveY(true).layout('vertical')
      .schema({
        items: { type: 'array', default: [] },
        color: { type: 'string', default: '#4a90d9' },
        showValue: { type: 'boolean', default: true },
      })
      .renderContent(BarView);
  }
}

export { BarCell };
