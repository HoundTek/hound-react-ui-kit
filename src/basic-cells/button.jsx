/**
 * @file button.jsx —— ButtonCell（按钮）基础 Cell
 *
 * 基础种：交互原语「按压」。离散触发，不可由拖拽/输入模拟
 *（见 docs/basic-cell-design.md）。不依赖任何其他 Cell 的实现。
 *
 * 实现拆分为两层（基础 Cell 的统一形态）：
 * - ButtonImpl：纯受控实现组件（props 进、onPress 出，无 Cell 依赖），
 *   供高级 Cell 组装复用（menu / tab-bar / pagination / confirm 等按钮族）
 * - ButtonCell：Cell 壳（Schema ↔ ButtonImpl 绑定）
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';
import { useTheme, useThemeColor, useCornerType, useElementStyle } from '../core/theme/theme-react';
import { cornerStyle, resolveElementRadius, elevationStyle, CAPSULE_RADIUS } from '../core/theme/shape';
import { stateLayerProps } from '../core/theme/state-layer';

/**
 * 按钮实现组件（纯受控）：label 经 useText 渲染（可传 i18n key 或纯文本）。
 * 变体（MD3 四变体）：filled 主色实底 / tonal 主色浅底 / outlined 描边 /
 * text 纯文字；变体解析优先级：props.variant > theme.elements.button.variant
 * > type 推导（兼容旧 type：primary→filled、default→outlined、danger→filled
 * 危险色）。size 控制高度与字号；block 时撑满父宽，align 控制文字对齐
 * （供菜单项等组装场景）。圆角默认胶囊（elements.button.radius 可覆盖），
 * hover/active 叠加 MD3 态层，elevation 阴影档默认 0。
 * @param {Object} props
 * @param {string} props.label 按钮文本（i18n key 或纯文本）
 * @param {string|JSX.Element} [props.icon] 前置字形/图标（可选；装饰性符号
 *   请传共享 SVG 字形组件，见 basic-cells/glyphs，颜色继承按钮文字色）
 * @param {'filled'|'tonal'|'outlined'|'text'} [props.variant] 样式变体
 * @param {'primary'|'default'|'danger'} [props.type='primary'] 语义配色（兼容旧接口）
 * @param {'small'|'default'|'large'} [props.size='default'] 尺寸变体
 * @param {boolean} [props.disabled=false] 是否禁用
 * @param {boolean} [props.block=false] 是否撑满父宽
 * @param {'left'|'center'} [props.align='center'] 文字对齐
 * @param {string} [props.color] 数据色覆盖（如标签色）：设置后覆盖变体的
 *   底色与描边，文字取 on-primary
 * @param {() => void} [props.onPress] 按压回调（disabled 时不触发）
 * @returns {JSX.Element} 按钮元素
 */
function ButtonImpl({
  label, icon, variant, type = 'primary', size = 'default', disabled = false,
  block = false, align = 'center', color, onPress,
}) {
  const text = useText(label);
  const theme = useTheme();
  const corner = useCornerType();
  const elStyle = useElementStyle('button');
  const primary = useThemeColor('primary', '#6750A4');
  const onPrimary = useThemeColor('on-primary', '#FFFFFF');
  const primaryDark = useThemeColor('primary-dark', '#4F378B');
  const primarySoft = useThemeColor('primary-soft', '#EADDFF');
  const outline = useThemeColor('outline', '#79747E');
  const danger = useThemeColor('danger', '#B3261E');
  const surfaceMuted = useThemeColor('surface-muted', '#F3EDF7');
  const textMuted = useThemeColor('text-muted', '#79747E');
  const sizeMap = {
    small: { height: 24, fontSize: 12 },
    default: { height: 32, fontSize: 13 },
    large: { height: 40, fontSize: 14 },
  };
  const s = sizeMap[size] || sizeMap.default;
  // type → （变体, 语义色）推导（兼容旧接口）；props/主题显式 variant 覆盖变体槽
  const typeMap = {
    primary: { variant: 'filled', role: primary, onRole: onPrimary },
    default: { variant: 'outlined', role: primary, onRole: onPrimary },
    danger: { variant: 'filled', role: danger, onRole: onPrimary },
  };
  const tm = typeMap[type] || typeMap.primary;
  const v = variant || elStyle?.variant || tm.variant;
  const variantMap = {
    filled: { background: tm.role, color: tm.onRole, border: 'none', stateOn: tm.onRole },
    tonal: { background: primarySoft, color: primaryDark, border: 'none', stateOn: primaryDark },
    outlined: { background: 'transparent', color: tm.role, border: `1px solid ${outline}`, stateOn: tm.role },
    text: { background: 'transparent', color: tm.role, border: 'none', stateOn: tm.role },
  };
  const t = variantMap[v] || variantMap.filled;
  const radius = resolveElementRadius(theme, elStyle?.radius, CAPSULE_RADIUS);
  const elevation = elStyle?.elevation ?? 0;
  const state = disabled ? { className: undefined, style: {} } : stateLayerProps(t.stateOn);
  return (
    <button
      disabled={disabled}
      onClick={() => { if (!disabled) onPress?.(); }}
      className={state.className}
      style={{
        height: s.height, padding: '0 16px', fontSize: s.fontSize,
        display: 'flex', alignItems: 'center', gap: 8,
        ...(block ? { width: '100%' } : {}),
        justifyContent: align === 'left' ? 'flex-start' : 'center',
        textAlign: align,
        ...cornerStyle(corner, radius), cursor: disabled ? 'not-allowed' : 'pointer',
        border: t.border, backgroundColor: disabled ? surfaceMuted : t.background,
        color: disabled ? textMuted : t.color, whiteSpace: 'nowrap',
        overflow: 'hidden', textOverflow: 'ellipsis', boxSizing: 'border-box',
        fontWeight: 500,
        ...(disabled || !elevation ? {} : elevationStyle(elevation)),
        ...(color && !disabled ? { backgroundColor: color, border: 'none', color: onPrimary } : {}),
        ...state.style,
      }}
    >
      {icon ? <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0, textAlign: 'center' }}>{icon}</span> : null}
      {text ? <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{text}</span> : null}
    </button>
  );
}

/**
 * 按钮视图：订阅 label/disabled/type/size，点击写入 pressed 并调用注入回调。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function ButtonView({ cell }) {
  const label = useCellData(cell, 'label');
  const disabled = useCellData(cell, 'disabled');
  const type = useCellData(cell, 'type');
  const size = useCellData(cell, 'size');
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <ButtonImpl
        label={label}
        type={type}
        size={size}
        disabled={disabled}
        onPress={() => {
          cell.setPressed(true);
          if (cell._onPress) cell._onPress();
        }}
      />
    </div>
  );
}

/**
 * ButtonCell：按钮（基础 Cell）。label 存 i18n key 或纯文本；
 * type 为 primary/default/danger；size 为 small/default/large；
 * 点击写入 pressed 并触发 onPress(fn) 注入的点击动作。
 */
class ButtonCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(32).color('surface')
      .schema({
        label: { type: 'string', default: '' },
        disabled: { type: 'boolean', default: false },
        pressed: { type: 'boolean', default: false },
        type: { type: 'string', default: 'primary' },
        size: { type: 'string', default: 'default' },
      })
      .renderContent(ButtonView);
  }

  /**
   * 注入点击动作回调。按钮被点击时调用（点击同时写入 pressed 字段）。
   * @param {Function} handler 点击回调
   * @returns {ButtonCell} self（链式）
   */
  onPress(handler) {
    this._onPress = handler;
    return this;
  }
}

export { ButtonCell, ButtonImpl };
