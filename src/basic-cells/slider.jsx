/**
 * @file slider.jsx —— SliderCell（滑块）基础 Cell
 *
 * 基础种：交互原语「一维拖拽取值」。不可由其他 Cell 组装得出，不依赖任何
 * 其他 Cell 的实现（见 docs/basic-cell-design.md）。
 *
 * 自绘实现（取代原生 <input type="range"> 的浏览器黑盒）：轨道 + 填充 +
 * 滑块 + pointer 拖拽（pointerdown/move/up + setPointerCapture，点击定位）。
 *
 * 实现拆分为两层（基础 Cell 的统一形态）：
 * - SliderTrackImpl：纯受控实现组件（props 进、onChange 出，无 Cell 依赖），
 *   供高级 Cell 组装复用（switch / multi-switch / progress 等滑块族）
 * - SliderCell：Cell 壳（Schema ↔ SliderTrackImpl 绑定）
 */
import React, { useRef } from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';
import { useThemeColor, useCornerType, useElementStyle } from '../core/theme/theme-react';
import { cornerStyle, CAPSULE_RADIUS } from '../core/theme/shape';
import { TABULAR_NUMS } from '../core/theme/state-layer';

/** md3 滑块竖条宽度（px） */
const THUMB_W = 4;
/** 色条与滑块之间的留白（px，MD3 分体色条） */
const SEG_GAP = 4;
/** 色条断口：滑块半宽 + 留白 */
const SEG_CUT = THUMB_W / 2 + SEG_GAP;
/** classic 滑块直径（px） */
const CLASSIC_THUMB = 16;

/**
 * 把取值钳制到 [min, max] 并按 step 吸附。
 * @param {number} raw 原始值
 * @param {number} min 最小值
 * @param {number} max 最大值
 * @param {number} step 步长（0/undefined 表示连续）
 * @returns {number} 吸附后的值
 */
const snapValue = (raw, min, max, step) => {
  const snapped = step ? Math.round(raw / step) * step : raw;
  return Math.min(max, Math.max(min, Number(snapped.toFixed(6))));
};

/**
 * 滑块轨道实现组件（纯受控）：轨道 + 填充 + 滑块 + 可选档标记刻点。
 * 一维拖拽：pointerdown 即定位（点击跳变），拖动连续取值，pointerup 结束。
 * @param {Object} props
 * @param {number} props.min 最小值
 * @param {number} props.max 最大值
 * @param {number} [props.step=1] 步长
 * @param {number} props.value 当前值
 * @param {boolean} [props.interactive=true] 是否可拖拽（false 即只读，如进度条）
 * @param {boolean} [props.disabled=false] 是否禁用
 * @param {boolean} [props.showThumb=true] 是否显示滑块
 * @param {number[]} [props.ticks] 档标记位置（取值域内的值数组）
 * @param {'md3'|'classic'} [props.variant] 样式变体：md3 为 4px 胶囊轨道 +
 *   竖条 handle + 轨道内反色档标记（默认；可经 theme.elements.slider.variant
 *   全局指定）；classic 为细轨道 + 描边圆点的旧形态
 * @param {string} [props.color] 填充/滑块色（缺省取主题 primary）
 * @param {string} [props.trackColor] 轨道色（缺省取主题 surface-variant）
 * @param {(value: number) => void} [props.onChange] 取值变更回调（拖拽中实时触发）
 * @returns {JSX.Element} 轨道元素
 */
function SliderTrackImpl({
  min, max, step = 1, value, interactive = true, disabled = false,
  showThumb = true, ticks, variant, color, trackColor, ariaLabel, onChange,
}) {
  const trackRef = useRef(null);
  const dragging = useRef(false);
  const corner = useCornerType();
  const elStyle = useElementStyle('slider');
  const primary = useThemeColor('primary', '#6750A4');
  const onPrimary = useThemeColor('on-primary', '#FFFFFF');
  const surfaceVariant = useThemeColor('surface-variant', '#E7E0EC');
  const fill = color || primary;
  const track = trackColor || surfaceVariant;
  const ratio = max > min ? Math.min(1, Math.max(0, (value - min) / (max - min))) : 0;
  const v = variant || elStyle?.variant || 'md3';
  // 无障碍名称：优先调用方显式声明，否则取内置译文（滑块）
  const label = useText(ariaLabel || 'hk.slider.label');

  const valueFromEvent = (e) => {
    const rect = trackRef.current.getBoundingClientRect();
    const r = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    return snapValue(min + r * (max - min), min, max, step);
  };
  const active = interactive && !disabled;
  const pointerHandlers = active ? {
    onPointerDown: (e) => {
      dragging.current = true;
      e.target.setPointerCapture?.(e.pointerId);
      onChange?.(valueFromEvent(e));
    },
    onPointerMove: (e) => {
      if (dragging.current) onChange?.(valueFromEvent(e));
    },
    onPointerUp: () => { dragging.current = false; },
    onPointerCancel: () => { dragging.current = false; },
  } : {};
  // 键盘取值（MD3 slider 语义）：方向键 ±1 步、PageUp/Down ±10 步、Home/End 到端点
  const keyboardHandlers = active ? {
    tabIndex: 0,
    role: 'slider',
    'aria-label': label,
    'aria-valuemin': min,
    'aria-valuemax': max,
    'aria-valuenow': value,
    onKeyDown: (e) => {
      const unit = step || (max - min) / 100;
      const keyMap = {
        ArrowRight: unit, ArrowUp: unit, ArrowLeft: -unit, ArrowDown: -unit,
        PageUp: unit * 10, PageDown: -unit * 10,
      };
      let next = keyMap[e.key];
      if (e.key === 'Home') next = min;
      else if (e.key === 'End') next = max;
      if (next == null) return;
      e.preventDefault();
      onChange?.(snapValue(next, min, max, step || 0));
    },
  } : {};

  // 滑块中心位置：钳制到轨道内，保证轨道两端的滑块/刻点完整落在轨道内部
  // （百分比 + px 混算，left 的百分比相对轨道宽度解析）
  const thumbCenter = `clamp(${THUMB_W / 2}px, ${ratio * 100}%, calc(100% - ${THUMB_W / 2}px))`;
  const dotCenter = (t) => `clamp(1px, ${((t - min) / (max - min)) * 100}%, calc(100% - 1px))`;

  if (v === 'md3') {
    // MD3 滑块：4px 胶囊轨道拆成两段独立圆角色条（与滑块留 4px 间距）+
    // 竖条 handle + 轨道内反色档标记；轨道本体透明，视觉全由两段色条承担
    return (
      <div
        {...pointerHandlers}
        {...keyboardHandlers}
        className={active ? 'hk-focus' : undefined}
        style={{
          position: 'relative', width: '100%', height: 24,
          display: 'flex', alignItems: 'center', touchAction: 'none',
          cursor: active ? 'pointer' : 'default', opacity: disabled ? 0.5 : 1,
          outlineOffset: 2,
        }}
      >
        <div ref={trackRef} style={{ position: 'relative', width: '100%', height: 4 }}>
          {/* 已填充色条：止于滑块左侧留白处，独立胶囊圆角 */}
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: showThumb ? `max(0px, calc(${thumbCenter} - ${SEG_CUT}px))` : `${ratio * 100}%`,
            ...cornerStyle(corner, CAPSULE_RADIUS), backgroundColor: fill,
          }} />
          {/* 未填充色条：起于滑块右侧留白处 */}
          {showThumb ? (
            <div style={{
              position: 'absolute', top: 0, bottom: 0, right: 0,
              left: `min(calc(${thumbCenter} + ${SEG_CUT}px), 100%)`,
              ...cornerStyle(corner, CAPSULE_RADIUS), backgroundColor: track,
            }} />
          ) : null}
          {(ticks || []).map(t => (
            <div key={t} style={{
              position: 'absolute', top: '50%', left: dotCenter(t),
              width: 2, height: 2, transform: 'translate(-50%, -50%)', borderRadius: '50%',
              backgroundColor: t <= value ? onPrimary : fill, pointerEvents: 'none',
            }} />
          ))}
          {showThumb ? (
            <div style={{
              position: 'absolute', top: '50%', left: thumbCenter,
              width: THUMB_W, height: 20, transform: 'translate(-50%, -50%)',
              ...cornerStyle(corner, CAPSULE_RADIUS),
              backgroundColor: fill, boxSizing: 'border-box', pointerEvents: 'none',
            }} />
          ) : null}
        </div>
      </div>
    );
  }

  // classic：细轨道 + 描边圆点（滑块完整收纳在轨道内，两端不出界）
  const classicCut = CLASSIC_THUMB / 2 + 2;
  return (
    <div
      {...pointerHandlers}
      {...keyboardHandlers}
      className={active ? 'hk-focus' : undefined}
      style={{
        position: 'relative', width: '100%', height: 24,
        display: 'flex', alignItems: 'center', touchAction: 'none',
        cursor: active ? 'pointer' : 'default', opacity: disabled ? 0.5 : 1,
        outlineOffset: 2,
      }}
    >
      <div ref={trackRef} style={{ position: 'relative', width: '100%', height: 6 }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: showThumb
            ? `max(0px, calc(${thumbCenter} - ${classicCut}px))`
            : `${ratio * 100}%`,
          ...cornerStyle(corner, CAPSULE_RADIUS), backgroundColor: fill,
        }} />
        {showThumb ? (
          <div style={{
            position: 'absolute', top: 0, bottom: 0, right: 0,
            left: `min(calc(${thumbCenter} + ${classicCut}px), 100%)`,
            ...cornerStyle(corner, CAPSULE_RADIUS), backgroundColor: track,
          }} />
        ) : null}
        {(ticks || []).map(t => (
          <div key={t} style={{
            position: 'absolute', top: '50%', left: dotCenter(t),
            width: 4, height: 4, transform: 'translate(-50%, -50%)', borderRadius: '50%',
            backgroundColor: t <= value ? fill : track,
            boxShadow: `0 0 0 1px ${t <= value ? track : fill}`, pointerEvents: 'none',
          }} />
        ))}
        {showThumb ? (
          <div style={{
            position: 'absolute', top: '50%', left: thumbCenter,
            width: CLASSIC_THUMB, height: CLASSIC_THUMB, transform: 'translate(-50%, -50%)',
            borderRadius: '50%', backgroundColor: '#fff', border: `2px solid ${fill}`,
            boxSizing: 'border-box', boxShadow: '0 1px 3px rgba(0,0,0,0.25)', pointerEvents: 'none',
          }} />
        ) : null}
      </div>
    </div>
  );
}

/**
 * 滑块视图：订阅 label/min/max/step/value，拖拽经 SliderTrackImpl 即时写入 value。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function SliderView({ cell }) {
  const label = useText(useCellData(cell, 'label'));
  const min = useCellData(cell, 'min');
  const max = useCellData(cell, 'max');
  const step = useCellData(cell, 'step');
  const value = useCellData(cell, 'value');
  const textMuted = useThemeColor('text-muted', '#888');
  const text = useThemeColor('text', '#333');
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      padding: '0 12px', width: '100%', height: '100%', gap: 2, boxSizing: 'border-box',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: textMuted }}>
        <span>{label}</span>
        <span style={{ color: text, fontWeight: 'bold', ...TABULAR_NUMS }}>{value}</span>
      </div>
      <SliderTrackImpl
        min={min}
        max={max}
        step={step}
        value={value}
        ariaLabel={label}
        onChange={v => cell.setValue(v)}
      />
    </div>
  );
}

/**
 * SliderCell：滑块（基础 Cell）。label 存 i18n key 或纯文本；min/max/step
 * 定义取值域；value 为当前值（自绘轨道拖拽即时写入数据）。
 * 底色不在此声明：滑块本身无底/无描边，随父容器背景呈现。
 */
class SliderCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(56)
      .schema({
        label: { type: 'string', default: '' },
        min: { type: 'number', default: 0 },
        max: { type: 'number', default: 100 },
        step: { type: 'number', default: 1 },
        value: { type: 'number', default: 50 },
      })
      .renderContent(SliderView);
  }
}

export { SliderCell, SliderTrackImpl };
