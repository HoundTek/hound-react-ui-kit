/**
 * @file switch.jsx —— SwitchCell（开关）高级 Cell
 *
 * 滑块族：开关 = 两档滑块（见 docs/basic-cell-design.md）。
 * 双实现机制（kind: 'switch'）：
 * - 组装 fallback（SwitchAssembledView）：label + SliderTrackImpl（基础 Cell
 *   滑块的实现组件，min0/max1/step1），点击/拖动滑块即切换
 * - 主题重写：theme.components.switch 声明实现名（如 'md3-switch'），经
 *   实现注册表解析后整体替换；本文件注册 MD3 风格实现 'md3-switch'
 *
 * Schema（数据契约，两种实现共用）：label / enabled / disabled。
 */
import React, { useRef } from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { registerCellImpl } from '../core/cell/implementations';
import { useText } from '../core/i18n/i18n-react';
import { useThemeColor, useCornerType } from '../core/theme/theme-react';
import { cornerStyle, CAPSULE_RADIUS } from '../core/theme/shape';
import { SliderTrackImpl } from '../basic-cells/slider';

/**
 * 开关组装视图（fallback）：label + 两档滑块轨道（0=关 / 1=开）。
 * 点击轨道定位、拖动越中即换档；点击行内轨道以外区域等效切换。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function SwitchAssembledView({ cell }) {
  const label = useText(useCellData(cell, 'label'));
  const enabled = useCellData(cell, 'enabled');
  const disabled = useCellData(cell, 'disabled');
  const text = useThemeColor('text', '#333');
  const trackWrapRef = useRef(null);
  return (
    <div
      onClick={(e) => {
        if (!disabled && !trackWrapRef.current?.contains(e.target)) cell.setEnabled(!enabled);
      }}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        padding: '0 12px', width: '100%', height: '100%', boxSizing: 'border-box',
        cursor: disabled ? 'not-allowed' : 'pointer', userSelect: 'none',
        fontSize: 13, color: text, opacity: disabled ? 0.5 : 1,
      }}
    >
      <span>{label}</span>
      <div ref={trackWrapRef} style={{ width: 56, flexShrink: 0 }}>
        <SliderTrackImpl
          min={0}
          max={1}
          step={1}
          value={enabled ? 1 : 0}
          disabled={disabled}
          onChange={v => cell.setEnabled(v >= 1)}
        />
      </div>
    </div>
  );
}

/**
 * MD3 风格开关实现（组件级重写示例）：52×32 胶囊轨道 + 可变径滑块。
 * 开：primary 轨道 + on-primary 大滑块；关：surface-variant 轨道 +
 * outline 描边 + outline 小滑块。点击切换 enabled。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function Md3SwitchImpl({ cell }) {
  const label = useText(useCellData(cell, 'label'));
  const enabled = useCellData(cell, 'enabled');
  const disabled = useCellData(cell, 'disabled');
  const corner = useCornerType();
  const text = useThemeColor('text', '#333');
  const primary = useThemeColor('primary', '#6750A4');
  const onPrimary = useThemeColor('on-primary', '#fff');
  const surfaceVariant = useThemeColor('surface-variant', '#E7E0EC');
  const outline = useThemeColor('outline', '#79747E');
  const thumbSize = enabled ? 24 : 16;
  return (
    <div
      onClick={() => { if (!disabled) cell.setEnabled(!enabled); }}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 12px', width: '100%', height: '100%', boxSizing: 'border-box',
        cursor: disabled ? 'not-allowed' : 'pointer', userSelect: 'none',
        fontSize: 13, color: text, opacity: disabled ? 0.5 : 1,
      }}
    >
      <span>{label}</span>
      <div style={{
        width: 52, height: 32, flexShrink: 0, position: 'relative',
        ...cornerStyle(corner, CAPSULE_RADIUS), boxSizing: 'border-box',
        backgroundColor: enabled ? primary : surfaceVariant,
        border: `2px solid ${enabled ? 'transparent' : outline}`,
        transition: 'background-color .15s',
      }}>
        <div style={{
          position: 'absolute', top: '50%', marginTop: -thumbSize / 2,
          width: thumbSize, height: thumbSize, borderRadius: '50%',
          backgroundColor: enabled ? onPrimary : outline,
          left: enabled ? 22 : 8, transition: 'left .15s, width .15s, height .15s, margin-top .15s',
        }} />
      </div>
    </div>
  );
}

// 注册主题可引用的重写实现（theme.components: { switch: 'md3-switch' }）
registerCellImpl('switch', 'md3-switch', Md3SwitchImpl);

/** kind 'switch' 的实现分发视图：主题声明重写时渲染重写实现，否则渲染组装 fallback */
const SwitchDispatcher = createImplDispatcher('switch', SwitchAssembledView);

/**
 * SwitchCell：开关（高级 Cell，滑块族）。label 存 i18n key 或纯文本；
 * enabled 为开/关状态；disabled 禁用。呈现实现由 kind 'switch' 分发：
 * 主题未声明重写时为两档滑块组装版，声明后为主题自定义实现。
 */
class SwitchCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(44).color('surface-muted')
      .schema({
        label: { type: 'string', default: '' },
        enabled: { type: 'boolean', default: true },
        disabled: { type: 'boolean', default: false },
      })
      .renderContent(SwitchDispatcher);
  }
}

export { SwitchCell, SwitchAssembledView, Md3SwitchImpl };
