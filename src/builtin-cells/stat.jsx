/**
 * @file stat.jsx —— StatCell（统计指标）高级 Cell
 *
 * 展示族：统计指标（见 docs/basic-cell-design.md）。
 * 双实现机制（kind: 'stat'）：组装 fallback（StatAssembledView）纵向排布
 * label/value/trend；主题可经 theme.components.stat 整体重写。
 *
 * Schema（数据契约，与旧版一致）：label / value / prefix / suffix / trend / color。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';
import { useThemeColor } from '../core/theme/theme-react';
import { GlyphTriangle } from '../basic-cells/glyphs';

/**
 * 统计指标组装视图（fallback）：订阅 label/value/prefix/suffix/trend/color，纵向排布。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function StatAssembledView({ cell }) {
  const label = useText(useCellData(cell, 'label'));
  const value = useCellData(cell, 'value');
  const prefix = useText(useCellData(cell, 'prefix'));
  const suffix = useText(useCellData(cell, 'suffix'));
  const trend = useCellData(cell, 'trend');
  const color = useCellData(cell, 'color');
  const surface = useThemeColor('surface', '#fff');
  const textMuted = useThemeColor('text-muted', '#888');
  const success = useThemeColor('success', '#1a8a4a');
  const danger = useThemeColor('danger', '#c03a2a');
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      padding: '0 16px', width: '100%', height: '100%', boxSizing: 'border-box',
      backgroundColor: surface,
    }}>
      <div style={{ fontSize: 12, color: textMuted }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 'bold', color, lineHeight: 1.4 }}>
        {prefix}{value}{suffix}
      </div>
      {trend != null ? (
        <div style={{ fontSize: 12, color: trend >= 0 ? success : danger, display: 'flex', alignItems: 'center', gap: 4 }}>
          <GlyphTriangle dir={trend >= 0 ? 'up' : 'down'} size={10} />
          {Math.abs(trend)}%
        </div>
      ) : null}
    </div>
  );
}

/** kind 'stat' 的实现分发视图 */
const StatDispatcher = createImplDispatcher('stat', StatAssembledView);

/**
 * StatCell：统计指标（高级 Cell，展示族）。label 存 i18n key 或纯文本；value
 * 为数值；prefix/suffix 存 i18n key 或纯文本（如 ¥ / 个）；trend 非空时显示
 * 涨跌。常与 DashboardCell/StatRowCell 等容器配合使用。呈现实现由 kind 'stat' 分发。
 */
class StatCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(76).color('surface')
      .schema({
        label: { type: 'string', default: '' },
        value: { type: 'number', default: 0 },
        prefix: { type: 'string', default: '' },
        suffix: { type: 'string', default: '' },
        trend: { type: 'number', default: null },
        color: { type: 'string', default: '#333333' },
      })
      .renderContent(StatDispatcher);
  }
}

export { StatCell, StatAssembledView };
