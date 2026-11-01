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
import { cornerStyle, resolveElementRadius, elevationStyle, CAPSULE_RADIUS, hexToRgba } from '../core/theme/shape';
import { stateLayerProps, TABULAR_NUMS, supportsColorMix } from '../core/theme/state-layer';

/**
 * 生成给定颜色的浅色底（tonal 变体的数据色分支）。
 * hex 色直接预算 rgba；非 hex 走 color-mix，引擎不支持时退回透明。
 * @param {string} color 色值（hex / 颜色角色已解析值）
 * @param {number} alpha 透明度（0~1）
 * @returns {string} CSS 颜色
 */
const tint = (color, alpha) => {
  const rgba = hexToRgba(color, alpha);
  if (rgba) return rgba;
  return supportsColorMix()
    ? `color-mix(in srgb, ${color} ${Math.round(alpha * 100)}%, transparent)`
    : 'transparent';
};

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
 * @param {'small'|'default'|'large'|'icon'} [props.size='default'] 尺寸变体：
 *   small 24 / default 32 / large 40 / icon 28×28（纯图标或短数字按钮，
 *   如日历日格、翻页箭头、页码——水平内边距按档位递减，不再一律 16px）
 * @param {boolean} [props.disabled=false] 是否禁用
 * @param {boolean} [props.block=false] 是否撑满父宽
 * @param {'left'|'center'} [props.align='center'] 文字对齐
 * @param {string} [props.color] 数据色覆盖（如标签色）：按变体染色——
 *   filled 取实底 + on-primary 文字、tonal 取同色浅底、outlined 取描边与
 *   文字色、text 仅文字色
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
  const outline = useThemeColor('outline', '#79747E');
  const danger = useThemeColor('danger', '#B3261E');
  const surfaceMuted = useThemeColor('surface-muted', '#F3EDF7');
  const textMuted = useThemeColor('text-muted', '#79747E');
  // 尺寸档：高度 / 最小宽度 / 字号 / 水平内边距 / 图标与文字间距
  const sizeMap = {
    small: { height: 24, minWidth: 24, fontSize: 12, padX: 10, gap: 6 },
    default: { height: 32, minWidth: 32, fontSize: 13, padX: 16, gap: 8 },
    large: { height: 40, minWidth: 40, fontSize: 14, padX: 24, gap: 8 },
    icon: { height: 24, minWidth: 24, fontSize: 12, padX: 4, gap: 0 },
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
    filled: { background: tm.role, color: tm.onRole, ring: null, stateOn: tm.onRole },
    tonal: { background: tint(tm.role, 0.14), color: tm.role, ring: null, stateOn: tm.role },
    outlined: { background: 'transparent', color: tm.role, ring: outline, stateOn: tm.role },
    text: { background: 'transparent', color: tm.role, ring: null, stateOn: tm.role },
  };
  const t = variantMap[v] || variantMap.filled;
  const radius = resolveElementRadius(theme, elStyle?.radius, CAPSULE_RADIUS);
  const elevation = elStyle?.elevation ?? 0;
  // 数据色可传颜色角色名（如 'success'），经主题解析后落到具体色值；
  // 未定义角色时按裸色值使用（保持既有接口的硬编码色兼容）
  const dataColor = color ? (theme?.resolveColor(color) ?? color) : color;
  // 数据色按变体落地：filled 实底、tonal 浅底、outlined 描边、text 纯文字
  const dataPaint = dataColor && !disabled ? {
    filled: { background: dataColor, color: onPrimary, ring: null },
    tonal: { background: tint(dataColor, 0.16), color: dataColor, ring: null },
    outlined: { background: 'transparent', color: dataColor, ring: dataColor },
    text: { background: 'transparent', color: dataColor, ring: null },
  }[v] || null : null;
  const stateOn = dataPaint ? dataPaint.color : t.stateOn;
  const state = disabled ? { className: undefined, style: {} } : stateLayerProps(stateOn);
  // 描边一律用内阴影勾勒：不参与盒模型，边框粗细变化不会挤压文字
  const ring = dataPaint ? dataPaint.ring : t.ring;
  const shadows = [];
  if (ring) shadows.push(`inset 0 0 0 1px ${ring}`);
  if (!disabled && elevation) shadows.push(elevationStyle(elevation).boxShadow);
  return (
    <button
      disabled={disabled}
      onClick={() => { if (!disabled) onPress?.(); }}
      className={state.className ? `${state.className} hk-focus hk-press` : undefined}
      style={{
        height: s.height, minWidth: s.minWidth,
        padding: `0 ${s.padX}px`,
        fontSize: s.fontSize, gap: s.gap,
        display: 'flex', alignItems: 'center',
        ...(block ? { width: '100%' } : {}),
        justifyContent: align === 'left' ? 'flex-start' : 'center',
        textAlign: align,
        ...cornerStyle(corner, radius), cursor: disabled ? 'not-allowed' : 'pointer',
        border: 'none',
        backgroundColor: disabled ? surfaceMuted : (dataPaint ? dataPaint.background : t.background),
        color: disabled ? textMuted : (dataPaint ? dataPaint.color : t.color),
        whiteSpace: 'nowrap',
        overflow: 'hidden', textOverflow: 'ellipsis', boxSizing: 'border-box',
        fontWeight: 500,
        ...(shadows.length ? { boxShadow: shadows.join(', ') } : {}),
        ...state.style,
        ...(state.className ? { '--hk-focus': dataPaint ? dataColor : (ring || tm.role) } : {}),
      }}
    >
      {icon ? <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0, textAlign: 'center' }}>{icon}</span> : null}
      {text ? <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', ...TABULAR_NUMS }}>{text}</span> : null}
    </button>
  );
}

/**
 * 按钮视图：订阅 label/disabled/type/variant/size，点击写入 pressed 并调用注入回调。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function ButtonView({ cell }) {
  const label = useCellData(cell, 'label');
  const disabled = useCellData(cell, 'disabled');
  const type = useCellData(cell, 'type');
  const variant = useCellData(cell, 'variant');
  const size = useCellData(cell, 'size');
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <ButtonImpl
        label={label}
        type={type}
        variant={variant}
        size={size}
        disabled={disabled}
        onPress={() => {
          cell.setPressed(true);
          cell.emit('press');
        }}
      />
    </div>
  );
}

/**
 * ButtonCell：按钮（基础 Cell）。label 存 i18n key 或纯文本；
 * type 为 primary/default/danger（兼容旧接口），variant 为 MD3 四变体
 * （filled/tonal/outlined/text）；size 为 small/default/large/icon；
 * 点击写入 pressed 并触发 onPress(fn) 注入的点击动作。
 */
class ButtonCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(32)
      .schema({
        label: { type: 'string', default: '' },
        disabled: { type: 'boolean', default: false },
        pressed: { type: 'boolean', default: false },
        type: { type: 'string', default: 'primary' },
        variant: { type: 'string', default: '' },
        size: { type: 'string', default: 'default' },
      })
      .renderContent(ButtonView);
  }

  /**
   * 注册点击动作回调（可多个，按注册顺序触发；等价 on('press', handler)）。
   * @param {Function} handler 点击回调
   * @returns {ButtonCell} self（链式）
   */
  onPress(handler) {
    this.on('press', handler);
    return this;
  }
}

export { ButtonCell, ButtonImpl };
