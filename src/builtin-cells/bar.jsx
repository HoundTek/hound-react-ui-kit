/**
 * @file bar.jsx —— BarCell（条形图）高级 Cell
 *
 * 展示族：条形图（见 docs/basic-cell-design.md）。
 * 双实现机制（kind: 'bar'）：组装 fallback（BarAssembledView）自身即组装
 * 实现——items 为 [{label, value}]，value 相对最大值归一化填充横向条宽度，
 * showValue 控制右侧数值回显；主题可经 theme.components.bar 整体重写。
 *
 * Schema（数据契约，与旧版一致）：items / color / showValue。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';
import { useThemeColor, useCornerType } from '../core/theme/theme-react';
import { cornerStyle, CAPSULE_RADIUS } from '../core/theme/shape';

/**
 * 条形图单行：label + 轨道 + 填充条（宽度按 maxValue 归一化）+ 可选数值。
 * @param {{item: Object, color: string, showValue: boolean, maxValue: number}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function BarRow({ item, color, showValue, maxValue }) {
  const label = useText(item.label);
  const corner = useCornerType();
  const labelColor = useThemeColor('text-secondary', '#666');
  const trackColor = useThemeColor('border', '#eee');
  const valueColor = useThemeColor('text-muted', '#888');
  const value = item.value || 0;
  const pct = (value / maxValue) * 100;
  return (
    <div style={{ display: 'flex', alignItems: 'center', height: 22 }}>
      <div style={{
        width: 48, fontSize: 12, color: labelColor, textAlign: 'right', paddingRight: 6, flexShrink: 0,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {label}
      </div>
      <div style={{ flex: 1, height: 10, ...cornerStyle(corner, CAPSULE_RADIUS), backgroundColor: trackColor, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', ...cornerStyle(corner, CAPSULE_RADIUS), backgroundColor: color }} />
      </div>
      {showValue ? (
        <span style={{ fontSize: 11, color: valueColor, paddingLeft: 6, flexShrink: 0 }}>{value}</span>
      ) : null}
    </div>
  );
}

/**
 * 条形图组装视图（fallback）：订阅 items/color/showValue，渲染纵向条列表。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function BarAssembledView({ cell }) {
  const items = useCellData(cell, 'items') || [];
  const color = useCellData(cell, 'color');
  const showValue = useCellData(cell, 'showValue');
  const maxValue = Math.max(0, ...items.map(i => i.value || 0)) || 1;
  return (
    <div style={{ width: '100%', height: '100%', boxSizing: 'border-box', padding: '4px 10px' }}>
      {items.map((item, i) => (
        <BarRow key={item.id || i} item={item} color={color} showValue={showValue} maxValue={maxValue} />
      ))}
    </div>
  );
}

/** kind 'bar' 的实现分发视图 */
const BarDispatcher = createImplDispatcher('bar', BarAssembledView);

/**
 * BarCell：条形图（高级 Cell，展示族）。items 为 [{label, value}]（label 存
 * i18n key 或纯文本，value 相对 items 最大值归一化填充宽度）；color 控制填充色；
 * showValue 控制右侧数值回显。帧内纵向滚动（moveY true），单行高 22。
 * 呈现实现由 kind 'bar' 分发。
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
      .renderContent(BarDispatcher);
  }
}

export { BarCell, BarAssembledView };
