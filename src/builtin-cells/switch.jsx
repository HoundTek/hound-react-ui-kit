/**
 * @file switch.jsx —— SwitchCell（开关）高级 Cell
 *
 * 开关族：开关 = 一段紧凑轨道 + 滑块 + 整行点击切换（见 docs/basic-cell-design.md）。
 * 双实现机制（kind: 'switch'）：
 * - 组装 fallback（SwitchAssembledView）：label + SwitchTrack（纯指示轨道，
 *   交互由整行 role="switch" 承担）
 * - 主题重写：theme.components.switch 声明实现名（如 'md3-switch'），经
 *   实现注册表解析后整体替换；本文件注册 MD3 风格实现 'md3-switch'
 *
 * 几何统一（两种实现共用同一轨道尺寸）：轨道 44×24、滑块 18、内缩 3px，
 * **开关的开/关两态滑块尺寸不变**（只改变位置，不做放大缩小），避免切换时
 * 轨道内出现尺寸跳变。
 *
 * 拖动语义（SwitchTrack）：按住轨道即把滑块动画移到按下位置；继续拖动时
 * 滑块跟手（取消过渡）；松手后按落点是否越过轨道中线决定开/关，滑块随后
 * 动画吸附到目标一端的静止位。
 * 短按语义：只是一下轻点（位移 <4px 且 <300ms）时**直接切换开关状态**
 * （不按点击位置推断开/关），滑块从按下位动画移到目标端；按住不放或拖动
 * 仍走「落点过中线」的判定，因此「按下过程 + 松手吸附」保持两段动效。
 *
 * Schema（数据契约，两种实现共用）：label / enabled / disabled。
 */
import React, { useRef, useState } from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { registerCellImpl } from '../core/cell/implementations';
import { useText } from '../core/i18n/i18n-react';
import { useThemeColor, useCornerType } from '../core/theme/theme-react';
import { cornerStyle, CAPSULE_RADIUS } from '../core/theme/shape';

/** 轨道宽 / 轨道高 / 滑块直径 / 滑块内缩（px）——两种实现共用的统一几何 */
const TRACK_W = 44;
const TRACK_H = 24;
const THUMB = 18;
const THUMB_INSET = (TRACK_H - THUMB) / 2;
/** 滑块行程（px）：轨道内侧留出内缩后的可移动范围 */
const THUMB_TRAVEL = TRACK_W - THUMB - THUMB_INSET * 2;
/** 「短按」判定：位移容差（px）与最长按下时长（ms）——短按直接切换状态 */
const TAP_SLOP = 4;
const TAP_DURATION_MS = 300;

/**
 * 开关轨道：胶囊轨道 + 圆形滑块，开为主色实底 + on-primary 滑块，关为
 * surface-variant 轨道 + outline 内描边 + outline 滑块。
 * 开/关两态滑块尺寸恒定（18），只移动位置；MD3 变体仅滑块带高光阴影。
 * 传入 onChange 时可拖动：按下即动画移向落点、拖动跟手、松手吸附到目标端。
 * @param {{on: boolean, variant: 'default'|'md3', disabled?: boolean,
 *   onChange?: (next: boolean) => void}} props 组件属性
 * @returns {JSX.Element} 轨道元素
 */
function SwitchTrack({ on, variant = 'default', disabled, onChange }) {
  const corner = useCornerType();
  const primary = useThemeColor('primary', '#6750A4');
  const onPrimary = useThemeColor('on-primary', '#fff');
  const surfaceVariant = useThemeColor('surface-variant', '#E7E0EC');
  const outline = useThemeColor('outline', '#79747E');
  const trackRef = useRef(null);
  // 拖拽预览：{ pos, live }；pos 为滑块 left（px），live 表示已进入连续拖动
  //（连续阶段去掉过渡，保证跟手；按下与松手两段保留过渡动效）
  const [drag, setDrag] = useState(null);
  // 按下现场：起点坐标 / 是否已进入拖动 / 按下时刻（用于区分短按与拖动）
  const pressRef = useRef(null);
  const md3 = variant === 'md3';
  const restLeft = on ? TRACK_W - THUMB - THUMB_INSET : THUMB_INSET;
  const thumbLeft = drag ? drag.pos : restLeft;

  /** 指针横向比例（0~1） */
  const pointerRatio = (e) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    return Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
  };
  /** 比例 → 滑块 left（始终留在轨道内侧） */
  const posFor = (r) => THUMB_INSET + r * THUMB_TRAVEL;

  const dragHandlers = (onChange && !disabled) ? {
    onPointerDown: (e) => {
      trackRef.current?.setPointerCapture?.(e.pointerId);
      pressRef.current = { x: e.clientX, played: false, at: Date.now() };
      setDrag({ pos: posFor(pointerRatio(e)), live: false });
    },
    onPointerMove: (e) => {
      if (!drag) return;
      const press = pressRef.current;
      if (press && !press.played && Math.abs(e.clientX - press.x) > TAP_SLOP) press.played = true;
      setDrag({ pos: posFor(pointerRatio(e)), live: true });
    },
    onPointerUp: (e) => {
      if (!drag) return;
      const press = pressRef.current;
      // 短按直接切换；拖动则按落点是否越过中线决定开/关
      const isTap = !!press && !press.played && (Date.now() - press.at) <= TAP_DURATION_MS;
      const next = isTap ? !on : pointerRatio(e) >= 0.5;
      pressRef.current = null;
      setDrag(null);
      if (next !== on) onChange(next);
    },
    onPointerCancel: () => {
      pressRef.current = null;
      setDrag(null);
    },
    // 轨道内的点按由拖动语义自行处理，阻止冒泡以免整行 onClick 再切换一次
    onClick: (e) => e.stopPropagation(),
  } : {};

  return (
    <div
      ref={trackRef}
      {...dragHandlers}
      className="hk-slide"
      style={{
        position: 'relative', width: TRACK_W, height: TRACK_H, flexShrink: 0,
        ...cornerStyle(corner, CAPSULE_RADIUS), boxSizing: 'border-box',
        backgroundColor: on ? primary : surfaceVariant,
        // 关态用内描边勾勒边界（内阴影不参与盒模型，不改轨道尺寸）
        boxShadow: on ? (md3 ? '0 1px 2px rgba(0,0,0,0.28)' : 'none') : `inset 0 0 0 1px ${outline}`,
        touchAction: 'none',
        cursor: (onChange && !disabled) ? 'pointer' : 'default',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {/* 滑块：两态同尺寸；按下/松手走 hk-slide 过渡，连续拖动时去处过渡跟手 */}
      <div
        className={drag?.live ? undefined : 'hk-slide'}
        style={{
          position: 'absolute', top: THUMB_INSET, left: thumbLeft,
          width: THUMB, height: THUMB, borderRadius: '50%',
          backgroundColor: on ? onPrimary : outline,
          boxShadow: md3 ? '0 1px 3px rgba(0,0,0,0.28)' : 'none',
        }}
      />
    </div>
  );
}

/**
 * 开关行（两种实现共用的外壳）：整行 role="switch"，点击/Enter/Space 切换。
 * @param {{label: string, enabled: boolean, disabled: boolean, onToggle: Function,
 *   track: JSX.Element}} props 组件属性
 * @returns {JSX.Element} 行元素
 */
function SwitchRow({ label, enabled, disabled, onToggle, track }) {
  const text = useThemeColor('text', '#333');
  return (
    <div
      role="switch"
      aria-checked={enabled}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      className="hk-focus"
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); }
      }}
      onClick={() => { if (!disabled) onToggle(); }}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        padding: '0 12px', width: '100%', height: '100%', boxSizing: 'border-box',
        cursor: disabled ? 'not-allowed' : 'pointer', userSelect: 'none',
        fontSize: 13, color: text, opacity: disabled ? 0.5 : 1,
      }}
    >
      <span style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{label}</span>
      {track}
    </div>
  );
}

/**
 * 开关组装视图（fallback）：label + 紧凑指示轨道（44×24），整行点击切换。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function SwitchAssembledView({ cell }) {
  const label = useText(useCellData(cell, 'label'));
  const enabled = useCellData(cell, 'enabled');
  const disabled = useCellData(cell, 'disabled');
  return (
    <SwitchRow
      label={label}
      enabled={enabled}
      disabled={disabled}
      onToggle={() => cell.setEnabled(!enabled)}
      track={<SwitchTrack on={enabled} variant="default" disabled={disabled} onChange={next => cell.setEnabled(next)} />}
    />
  );
}

/**
 * MD3 风格开关实现（组件级重写示例）：同一外壳 + MD3 变体轨道
 * （滑块两态同尺寸、带高光阴影与拖动过程）。点击/拖动切换 enabled。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function Md3SwitchImpl({ cell }) {
  const label = useText(useCellData(cell, 'label'));
  const enabled = useCellData(cell, 'enabled');
  const disabled = useCellData(cell, 'disabled');
  return (
    <SwitchRow
      label={label}
      enabled={enabled}
      disabled={disabled}
      onToggle={() => cell.setEnabled(!enabled)}
      track={<SwitchTrack on={enabled} variant="md3" disabled={disabled} onChange={next => cell.setEnabled(next)} />}
    />
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
    this.fixedHeight(40)
      .schema({
        label: { type: 'string', default: '' },
        enabled: { type: 'boolean', default: true },
        disabled: { type: 'boolean', default: false },
      })
      .renderContent(SwitchDispatcher);
  }
}

export { SwitchCell, SwitchAssembledView, Md3SwitchImpl };
