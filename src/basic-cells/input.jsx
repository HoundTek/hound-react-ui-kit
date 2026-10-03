/**
 * @file input.jsx —— InputCell（文本输入）基础 Cell
 *
 * 基础种：交互原语「文本输入」（原生 <input> 为载体），不依赖任何其他
 * Cell 的实现（见 docs/basic-cell-design.md）。
 *
 * 实现拆分为两层（基础 Cell 的统一形态）：
 * - InputImpl：纯受控实现组件（props 进、onChange 出，无 Cell 依赖），
 *   供高级 Cell 组装复用（search / login / chat 等输入族）
 * - InputCell：Cell 壳（Schema ↔ InputImpl 绑定）
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';
import { useThemeColor, useCornerType, useShapeRadius, useElementStyle } from '../core/theme/theme-react';
import { cornerStyle } from '../core/theme/shape';
import { ensureStateLayerStyle } from '../core/theme/state-layer';

/**
 * 文本输入实现组件（纯受控）：原生 <input> 承载文本输入手势。
 * 变体：outlined 描边 + 圆角（focus 时 primary 描边/光环）；filled 为
 * surface-variant 底 + 底部 2px 指示线（focus 时 primary）。变体解析
 * 优先级：props.variant > theme.elements.input.variant > 'outlined'。
 * @param {Object} props
 * @param {string} props.value 当前值
 * @param {string} [props.placeholder] 占位文本（i18n key 或纯文本）
 * @param {number} [props.fontSize=14] 字号
 * @param {'left'|'center'|'right'} [props.align='left'] 文字对齐
 * @param {boolean} [props.disabled=false] 是否禁用
 * @param {string} [props.type='text'] 原生 input 类型（'text' / 'password'）
 * @param {'outlined'|'filled'} [props.variant] 样式变体
 * @param {(value: string) => void} [props.onChange] 输入回调
 * @param {(value: string) => void} [props.onSubmit] 回车提交回调
 * @returns {JSX.Element} 输入框元素
 */
function InputImpl({
  value, placeholder, fontSize = 14, align = 'left', disabled = false,
  type = 'text', variant, onChange, onSubmit,
}) {
  const ph = useText(placeholder || '');
  const corner = useCornerType();
  const elStyle = useElementStyle('input');
  const controlR = useShapeRadius('control', 8);
  const surface = useThemeColor('surface', '#FEF7FF');
  const surfaceVariant = useThemeColor('surface-variant', '#E7E0EC');
  const outline = useThemeColor('outline', '#79747E');
  const primary = useThemeColor('primary', '#6750A4');
  const text = useThemeColor('text', '#1D1B20');
  const textMuted = useThemeColor('text-muted', '#79747E');
  const surfaceMuted = useThemeColor('surface-muted', '#F3EDF7');
  const v = variant || elStyle?.variant || 'outlined';
  ensureStateLayerStyle();
  const base = {
    width: '100%', height: '100%', boxSizing: 'border-box',
    padding: '0 12px', outline: 'none', fontSize, textAlign: align,
    color: text,
    '--hk-focus': primary, '--hk-placeholder': textMuted,
  };
  const style = v === 'filled'
    ? {
      ...base,
      border: 'none',
      borderBottom: `2px solid ${disabled ? outline : primary}`,
      ...cornerStyle(corner, `${controlR}px ${controlR}px 0 0`),
      background: disabled ? surfaceMuted : surfaceVariant,
    }
    : {
      ...base,
      border: `1px solid ${outline}`, ...cornerStyle(corner, controlR),
      background: disabled ? surfaceMuted : surface,
    };
  return (
    <input
      className="hk-focus"
      type={type}
      value={value}
      placeholder={ph}
      disabled={disabled}
      onChange={e => onChange?.(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter') onSubmit?.(e.target.value); }}
      style={style}
    />
  );
}

/**
 * 输入框视图：订阅 value/placeholder/fontSize/align/disabled，
 * 输入变化经 InputImpl 即时写回 value。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function InputView({ cell }) {
  const value = useCellData(cell, 'value');
  const placeholder = useCellData(cell, 'placeholder');
  const fontSize = useCellData(cell, 'fontSize');
  const align = useCellData(cell, 'align');
  const disabled = useCellData(cell, 'disabled');
  return (
    <InputImpl
      value={value}
      placeholder={placeholder}
      fontSize={fontSize}
      align={align}
      disabled={disabled}
      onChange={v => cell.setValue(v)}
    />
  );
}

/**
 * InputCell：文本输入（基础 Cell）。value 实时写入数据；placeholder 存
 * i18n key 或纯文本；fontSize/align/disabled 控制呈现。
 */
class InputCell extends CellBaseBuilder {
  constructor(id) {
    super(id);
    this.fixedHeight(36)
      .schema({
        value: { type: 'string', default: '' },
        placeholder: { type: 'string', default: '' },
        fontSize: { type: 'number', default: 14 },
        align: { type: 'string', default: 'left' },
        disabled: { type: 'boolean', default: false },
      })
      .renderContent(InputView);
  }
}

export { InputCell, InputImpl, InputView };
