/**
 * @file stat.jsx —— StatCell（统计指标）预设
 *
 * 展示单个统计指标：label 为指标名（i18n key 或纯文本），value 为大号数值，
 * prefix/suffix 为前后缀（如货币符号/单位），trend 非空时显示涨跌百分比。
 * 常与 DashboardCell/StatRowCell 等容器配合使用。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';

/**
 * 统计指标视图：订阅 label/value/prefix/suffix/trend/color，纵向排布。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function StatView({ cell }) {
  const label = useText(useCellData(cell, 'label'));
  const value = useCellData(cell, 'value');
  const prefix = useText(useCellData(cell, 'prefix'));
  const suffix = useText(useCellData(cell, 'suffix'));
  const trend = useCellData(cell, 'trend');
  const color = useCellData(cell, 'color');
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      padding: '0 16px', width: '100%', height: '100%', backgroundColor: '#fff',
    }}>
      <div style={{ fontSize: 12, color: '#888' }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 'bold', color, lineHeight: 1.4 }}>
        {prefix}{value}{suffix}
      </div>
      {trend != null ? (
        <div style={{ fontSize: 12, color: trend >= 0 ? '#1a8a4a' : '#c03a2a' }}>
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
        </div>
      ) : null}
    </div>
  );
}

/**
 * StatCell：统计指标。label 存 i18n key 或纯文本；value 为数值；
 * prefix/suffix 存 i18n key 或纯文本（如 ¥ / 个）；trend 非空时显示涨跌。
 */
class StatCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(76).backgroundColor('#ffffff')
      .schema({
        label: { type: 'string', default: '' },
        value: { type: 'number', default: 0 },
        prefix: { type: 'string', default: '' },
        suffix: { type: 'string', default: '' },
        trend: { type: 'number', default: null },
        color: { type: 'string', default: '#333333' },
      })
      .renderContent(StatView);
  }
}

export { StatCell };
