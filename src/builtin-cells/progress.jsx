/**
 * @file progress.jsx —— ProgressCell（进度条）高级 Cell
 *
 * 滑块族：进度条 = 只读滑块（见 docs/basic-cell-design.md）。
 * 组装 fallback：SliderTrackImpl（基础 Cell 滑块的实现组件，
 * interactive:false、无滑块，percent 映射为 0~100 取值）+ 百分比文本。
 * 主题可经 theme.components.progress 整体重写呈现实现。
 *
 * Schema（数据契约，与旧版一致）：percent / showText / color / trackColor。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { useThemeColor } from '../core/theme/theme-react';
import { SliderTrackImpl } from '../basic-cells/slider';

/**
 * 进度条组装视图（fallback）：只读滑块轨道 + 百分比文本。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function ProgressAssembledView({ cell }) {
  const percent = useCellData(cell, 'percent');
  const showText = useCellData(cell, 'showText');
  const color = useCellData(cell, 'color');
  const trackColor = useCellData(cell, 'trackColor');
  const textSecondary = useThemeColor('text-secondary', '#666');
  const clamped = Math.max(0, Math.min(100, percent || 0));
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', boxSizing: 'border-box' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <SliderTrackImpl
          min={0}
          max={100}
          step={0}
          value={clamped}
          interactive={false}
          showThumb={false}
          color={color}
          trackColor={trackColor}
        />
      </div>
      {showText ? (
        <span style={{ fontSize: 12, color: textSecondary, minWidth: 36, textAlign: 'right' }}>{clamped}%</span>
      ) : null}
    </div>
  );
}

/** kind 'progress' 的实现分发视图 */
const ProgressDispatcher = createImplDispatcher('progress', ProgressAssembledView);

/**
 * ProgressCell：进度条（高级 Cell，滑块族）。percent 为 0~100（自动钳制），
 * showText 控制百分比文本，color/trackColor 控制填充色与轨道色。
 * 呈现实现由 kind 'progress' 分发（缺省为只读滑块组装版）。
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
        color: { type: 'string', default: '#6750A4' },
        trackColor: { type: 'string', default: '#E7E0EC' },
      })
      .renderContent(ProgressDispatcher);
  }
}

export { ProgressCell, ProgressAssembledView };
