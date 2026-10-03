/**
 * @file stepper.jsx —— StepperCell（数字步进器）高级 Cell
 *
 * 按钮族：步进器 = −/+ 按钮 + 值回显（见 docs/basic-cell-design.md）。
 * 组装 fallback：两个 ButtonImpl（基础 Cell 按钮的实现组件）+ TextImpl
 * 显示当前值；点击按 step 调整 value 并自动钳制在 [min, max] 内，
 * 到达边界时对应按钮禁用。主题可经 theme.components.stepper 整体重写。
 *
 * Schema（数据契约，与旧版一致）：label / value / min / max / step。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';
import { useThemeColor } from '../core/theme/theme-react';
import { ButtonImpl, TextImpl } from '../basic-cells';
import { GlyphMinus, GlyphPlus } from '../basic-cells/glyphs';

/**
 * 步进器组装视图（fallback）：label + −/+ 按钮 + TextImpl 值回显。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function StepperAssembledView({ cell }) {
  const label = useText(useCellData(cell, 'label'));
  const value = useCellData(cell, 'value');
  const min = useCellData(cell, 'min');
  const max = useCellData(cell, 'max');
  const step = useCellData(cell, 'step');
  const textMuted = useThemeColor('text-muted', '#888');
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px',
      width: '100%', height: '100%', boxSizing: 'border-box',
    }}>
      {label ? <span style={{ flexShrink: 0, fontSize: 12, color: textMuted }}>{label}</span> : null}
      <div style={{ flex: 1 }} />
      <ButtonImpl
        label=""
        icon={<GlyphMinus size={12} />}
        type="default"
        size="small"
        disabled={value <= min}
        onPress={() => cell.setValue(Math.max(min, value - step))}
      />
      <div style={{ flexShrink: 0, width: 44, height: 24 }}>
        <TextImpl text={String(value)} size={13} align="center" color="text" />
      </div>
      <ButtonImpl
        label=""
        icon={<GlyphPlus size={12} />}
        type="default"
        size="small"
        disabled={value >= max}
        onPress={() => cell.setValue(Math.min(max, value + step))}
      />
    </div>
  );
}

/** kind 'stepper' 的实现分发视图 */
const StepperDispatcher = createImplDispatcher('stepper', StepperAssembledView);

/**
 * StepperCell：数字步进器（高级 Cell，按钮族）。value 为当前值（默认 0），
 * min/max 钳制范围（默认 0/10），step 为步长（默认 1）；label 存 i18n key
 * 或纯文本。呈现实现由 kind 'stepper' 分发（缺省为按钮组装版）。
 */
class StepperCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(40).color('surface')
      .schema({
        label: { type: 'string', default: '' },
        value: { type: 'number', default: 0 },
        min: { type: 'number', default: 0 },
        max: { type: 'number', default: 10 },
        step: { type: 'number', default: 1 },
      })
      .renderContent(StepperDispatcher);
  }
}

export { StepperCell, StepperAssembledView };
