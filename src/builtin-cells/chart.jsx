/**
 * @file chart.jsx —— ChartCell（图表）预设
 *
 * 简单图表：type 为 'bar'（横向排布柱体，柱高 = value/max*100%）或
 * 'line'（SVG polyline 折线，viewBox 100x50 保持比例）；data 为数值数组，
 * labels 为列标注，max 取 data 最大值（0 时按 1）。数据为空时显示 '—'。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';

/**
 * 柱体单元：订阅列 label（i18n key 或纯文本），渲染柱体与底部标注。
 * @param {{value: number, label: string, max: number, color: string}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function ChartBarView({ value, label, max, color }) {
  const labelText = useText(label);
  const percent = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', minWidth: 0 }}>
      <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', minHeight: 0 }}>
        <div style={{ width: 18, height: `${percent}%`, backgroundColor: color, borderRadius: 2 }} />
      </div>
      <div style={{
        fontSize: 10, color: '#888', maxWidth: '100%', paddingTop: 2,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {labelText}
      </div>
    </div>
  );
}

/**
 * 折线标注：订阅列 label（i18n key 或纯文本），渲染 SVG 下方标注。
 * @param {{label: string}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function ChartLineLabelView({ label }) {
  const labelText = useText(label);
  return (
    <div style={{
      flex: 1, fontSize: 10, color: '#888', textAlign: 'center',
      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    }}>
      {labelText}
    </div>
  );
}

/**
 * 图表视图：订阅 type/data/labels/color，按类型渲染柱体或折线。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function ChartView({ cell }) {
  const type = useCellData(cell, 'type');
  const data = useCellData(cell, 'data') || [];
  const labels = useCellData(cell, 'labels') || [];
  const color = useCellData(cell, 'color');
  if (!data.length) {
    return (
      <div style={{
        width: '100%', height: '100%', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 20, color: '#ccc', backgroundColor: '#ffffff',
      }}>
        —
      </div>
    );
  }
  const max = Math.max(1, ...data.map(v => v || 0));
  if (type === 'line') {
    const n = data.length;
    const y = 50 - (data[0] / max) * 50;
    const points = n === 1
      ? `0,${y} 100,${y}`
      : data.map((v, i) => `${(i / (n - 1)) * 100},${50 - (v / max) * 50}`).join(' ');
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', width: '100%', height: '100%',
        padding: 8, boxSizing: 'border-box', backgroundColor: '#ffffff',
      }}>
        <svg viewBox="0 0 100 50" preserveAspectRatio="none" style={{ width: '100%', flex: 1, minHeight: 0 }}>
          {n === 1 ? <circle cx={50} cy={y} r={2.5} fill={color} /> : (
            <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
          )}
        </svg>
        {labels.length ? (
          <div style={{ display: 'flex', height: 14, flexShrink: 0, marginTop: 4 }}>
            {labels.map((lb, i) => <ChartLineLabelView key={i} label={lb} />)}
          </div>
        ) : null}
      </div>
    );
  }
  return (
    <div style={{
      display: 'flex', width: '100%', height: '100%',
      padding: 8, boxSizing: 'border-box', backgroundColor: '#ffffff',
    }}>
      {data.map((v, i) => (
        <ChartBarView key={i} value={v} label={labels[i] || ''} max={max} color={color} />
      ))}
    </div>
  );
}

/**
 * ChartCell：图表。type 为 'bar'/'line'；data 为数值数组，labels 为列标注
 * （可存 i18n key 或纯文本）；color 为主色；max 自动取 data 最大值（0 时按 1）。
 */
class ChartCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.minHeight(120).defaultWidth(240).backgroundColor('#ffffff')
      .schema({
        type: { type: 'string', default: 'bar' },
        data: { type: 'array', default: [] },
        labels: { type: 'array', default: [] },
        color: { type: 'string', default: '#4a90d9' },
      })
      .renderContent(ChartView);
  }
}

export { ChartCell };