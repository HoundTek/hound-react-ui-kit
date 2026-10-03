/**
 * @file textarea.jsx —— TextareaCell（多行文本域）高级 Cell
 *
 * 输入族：多行文本域 = 文本输入的多行形态（见 docs/basic-cell-design.md）。
 * TextareaImpl 为族内共享实现组件（纯受控），供 editor / chat 等复用。
 * 主题可经 theme.components.textarea 整体重写呈现实现。
 *
 * Schema（数据契约，与旧版一致）：label / placeholder / value。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';
import { useThemeColor, useCornerType, useShapeRadius, useElementStyle } from '../core/theme/theme-react';
import { cornerStyle } from '../core/theme/shape';
import { ensureStateLayerStyle } from '../core/theme/state-layer';

/**
 * 多行文本域实现组件（纯受控）：原生 <textarea> 承载多行文本输入手势。
 * 变体与 InputImpl 同一通道（props.variant > theme.elements.input.variant
 * > 'outlined'）：outlined 描边 + 圆角（focus primary 光环）；filled 为
 * surface-variant 底 + 底部 2px 指示线。
 * @param {Object} props
 * @param {string} props.value 当前值
 * @param {string} [props.placeholder] 占位文本（i18n key 或纯文本）
 * @param {boolean} [props.disabled=false] 是否禁用
 * @param {'outlined'|'filled'} [props.variant] 样式变体
 * @param {(value: string) => void} [props.onChange] 输入回调
 * @returns {JSX.Element} 文本域元素
 */
function TextareaImpl({ value, placeholder, disabled = false, variant, onChange }) {
  const ph = useText(placeholder || '');
  const corner = useCornerType();
  const elStyle = useElementStyle('input');
  const controlR = useShapeRadius('control', 8);
  const outline = useThemeColor('outline', '#79747E');
  const primary = useThemeColor('primary', '#6750A4');
  const text = useThemeColor('text', '#1D1B20');
  const textMuted = useThemeColor('text-muted', '#79747E');
  const surfaceVariant = useThemeColor('surface-variant', '#E7E0EC');
  const surfaceMuted = useThemeColor('surface-muted', '#F3EDF7');
  const v = variant || elStyle?.variant || 'outlined';
  ensureStateLayerStyle();
  const base = {
    flex: 1, width: '100%', minHeight: 0, resize: 'none', padding: 8, boxSizing: 'border-box',
    fontSize: 13, color: text, fontFamily: 'inherit', outline: 'none',
    '--hk-focus': primary, '--hk-placeholder': textMuted,
  };
  const style = v === 'filled'
    ? {
      ...base,
      border: 'none', borderBottom: `2px solid ${disabled ? outline : primary}`,
      ...cornerStyle(corner, `${controlR}px ${controlR}px 0 0`),
      background: disabled ? surfaceMuted : surfaceVariant,
    }
    : {
      ...base,
      border: `1px solid ${outline}`, ...cornerStyle(corner, controlR),
      background: disabled ? surfaceMuted : 'transparent',
    };
  return (
    <textarea
      className="hk-focus"
      value={value}
      placeholder={ph}
      disabled={disabled}
      onChange={e => onChange?.(e.target.value)}
      style={style}
    />
  );
}

/**
 * 文本域组装视图（fallback）：label（存在时渲染）+ TextareaImpl。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function TextareaAssembledView({ cell }) {
  const label = useText(useCellData(cell, 'label'));
  const placeholder = useCellData(cell, 'placeholder');
  const value = useCellData(cell, 'value');
  const textMuted = useThemeColor('text-muted', '#888');
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', padding: '8px 10px',
      width: '100%', height: '100%', boxSizing: 'border-box',
    }}>
      {label ? <div style={{ fontSize: 12, color: textMuted, marginBottom: 6, flexShrink: 0 }}>{label}</div> : null}
      <TextareaImpl value={value} placeholder={placeholder} onChange={v => cell.setValue(v)} />
    </div>
  );
}

/** kind 'textarea' 的实现分发视图 */
const TextareaDispatcher = createImplDispatcher('textarea', TextareaAssembledView);

/**
 * TextareaCell：多行文本域（高级 Cell，输入族）。label/placeholder 支持
 * i18n key 或纯文本，value 实时写入数据。
 * 呈现实现由 kind 'textarea' 分发（缺省为组装 fallback）。
 */
class TextareaCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(88).color('surface')
      .schema({
        label: { type: 'string', default: '' },
        placeholder: { type: 'string', default: '' },
        value: { type: 'string', default: '' },
      })
      .renderContent(TextareaDispatcher);
  }
}

export { TextareaCell, TextareaImpl, TextareaAssembledView };
