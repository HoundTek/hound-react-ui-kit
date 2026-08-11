/**
 * @file progress.jsx —— ProgressCell（进度条）预设
 *
 * 展示进度：percent 为 0~100 的进度值（内部钳制），color/trackColor 控制填充色与轨道色，
 * showText 时右侧显示百分比文本。填充宽度过渡动画由 CSS transition 承担。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';

/**
 * 进度条视图：订阅 percent/showText/color/trackColor，渲染轨道与填充。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function ProgressView({ cell }) {
  const percent = useCellData(cell, 'percent');
  const showText = useCellData(cell, 'showText');
  const color = useCellData(cell, 'color');
  const trackColor = useCellData(cell, 'trackColor');
  const clamped = Math.max(0, Math.min(100, percent || 0));
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px' }}>
      <div style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: trackColor, overflow: 'hidden' }}>
        <div style={{
          width: `${clamped}%`, height: '100%', borderRadius: 4,
          backgroundColor: color, transition: 'width .2s',
        }} />
      </div>
      {showText ? (
        <span style={{ fontSize: 12, color: '#666', minWidth: 36, textAlign: 'right' }}>{clamped}%</span>
      ) : null}
    </div>
  );
}

/**
 * ProgressCell：进度条。percent 为 0~100（自动钳制），showText 控制百分比文本，
 * color/trackColor 控制填充色与轨道色。
 */
class ProgressCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(24)
      .schema({
        percent: { type: 'number', default: 0 },
        showText: { type: 'boolean', default: true },
        color: { type: 'string', default: '#4a90d9' },
        trackColor: { type: 'string', default: '#e8e8e8' },
      })
      .renderContent(ProgressView);
  }
}

export { ProgressCell };
