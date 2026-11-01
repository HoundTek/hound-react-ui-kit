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
import React, { useRef, useState } from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';
import { useThemeColor, useCornerType, useElementStyle } from '../core/theme/theme-react';
import { cornerStyle, CAPSULE_RADIUS } from '../core/theme/shape';
import { TABULAR_NUMS } from '../core/theme/state-layer';

/** md3 滑块竖条宽度（px） */
const THUMB_W = 4;
/** md3 色条（轨道）高度（px）：胶囊端部圆角半径 = 高度一半 */
const MD3_TRACK_H = 4;
/** classic 轨道高度（px）：端部圆角半径 = 高度一半 */
const CLASSIC_TRACK_H = 6;
/** 色条与滑块之间的留白（px，MD3 分体色条） */
const SEG_GAP = 4;
/** 色条断口：滑块半宽 + 留白 */
const SEG_CUT = THUMB_W / 2 + SEG_GAP;
/** classic 滑块直径（px） */
const CLASSIC_THUMB = 16;

/** 「短暂点击」判定：位移容差（px）与最长按下时长（ms） */
const TAP_SLOP = 4;
const TAP_DURATION_MS = 300;

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
 * 一维拖拽（与开关同一套三段动效）：按下即把滑块动画移到**指针所在位置**
 * （「中间态」），继续拖动时滑块跟手（取消过渡），松手后清掉预览、由取值
 * 驱动动画吸附到目标档位。
 * 点按（<4px 位移且 <300ms）按 tapMode 分派：
 * - 'jump'（默认）：直接跳到点击处的取值（滑块 / 摇杆等连续量）
 * - 'step'（多档位进度条）：短按分两种——落在**当前档点的邻近区间**（当前档点到
 *   左右相邻档点的中点之间）时，朝指针所在的一侧移动**相邻一档**（点击位置本身
 *   不直接作为取值，避免误触跨越多档）；落在该区间之外时，直接切到离点击位置
 *   **最近的状态**（按档点圆心的像素距离取最近档点）
 * @param {Object} props
 * @param {number} props.min 最小值
 * @param {number} props.max 最大值
 * @param {number} [props.step=1] 步长
 * @param {number} props.value 当前值
 * @param {boolean} [props.interactive=true] 是否可拖拽（false 即只读，如进度条）
 * @param {boolean} [props.disabled=false] 是否禁用
 * @param {boolean} [props.showThumb=true] 是否显示滑块
 * @param {number[]} [props.ticks] 档标记位置（取值域内的值数组）
 * @param {'jump'|'step'} [props.tapMode='jump'] 短按语义（见上）
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
  showThumb = true, ticks, variant, color, trackColor, ariaLabel, tapMode = 'jump', onChange,
}) {
  const trackRef = useRef(null);
  const dragging = useRef(false);
  // 按下时的现场：起点坐标 / 起点取值 / 是否已进入拖动 / 按下时刻
  const pressRef = useRef(null);
  // 连续拖动中：true 时去掉 `.hk-slide` 过渡，让滑块严格跟手；
  // 按下与松手两段保留过渡，形成「先动画到位、再动画吸附」的过程
  const [following, setFollowing] = useState(false);
  // 按下预览：滑块**视觉位置**（0~1 的连续比例，不是吸附后的取值）。
  // 按下/拖动时把滑块画到指针处（与开关一致），数据仍按吸附值写入，
  // 松手后清空预览，由取值驱动动画吸附回档位。
  const [preview, setPreview] = useState(null);
  const slideClass = following ? undefined : 'hk-slide';
  const corner = useCornerType();
  const elStyle = useElementStyle('slider');
  const primary = useThemeColor('primary', '#6750A4');
  const onPrimary = useThemeColor('on-primary', '#FFFFFF');
  const surfaceVariant = useThemeColor('surface-variant', '#E7E0EC');
  const fill = color || primary;
  const track = trackColor || surfaceVariant;
  const valueRatio = max > min ? Math.min(1, Math.max(0, (value - min) / (max - min))) : 0;
  const ratio = preview == null ? valueRatio : preview;
  // 刻点高亮用的显示取值：预览时取指针处的连续取值，静止时取数据取值
  const shownValue = preview == null ? value : min + preview * (max - min);
  const v = variant || elStyle?.variant || 'md3';
  // 端部圆角半径 = 轨道高一半；两端档点的圆心与色条端部圆角的圆心重合
  const capRadius = (v === 'md3' ? MD3_TRACK_H : CLASSIC_TRACK_H) / 2;
  // 无障碍名称：优先调用方显式声明，否则取内置译文（滑块）
  const label = useText(ariaLabel || 'hk.slider.label');

  /** 指针在轨道上的横向比例（0~1） */
  const ratioFromEvent = (e) => {
    const rect = trackRef.current.getBoundingClientRect();
    return Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
  };
  /** 指针位置对应的（已吸附）取值 */
  const valueFromEvent = (e) => snapValue(min + ratioFromEvent(e) * (max - min), min, max, step);

  /**
   * 档点圆心在轨道内的像素位置（与渲染口径一致：比例位置钳制在两端胶囊
   * 圆角的圆心之间），用于把指针坐标与档点圆心放进同一坐标系比较。
   * @param {DOMRect} rect 轨道矩形
   * @param {number} tickValue 档点取值
   * @returns {number} 圆心相对轨道左缘的像素位置
   */
  const dotPixel = (rect, tickValue) => {
    const pct = max > min ? (tickValue - min) / (max - min) : 0;
    return Math.min(Math.max(capRadius, pct * rect.width), rect.width - capRadius);
  };

  /**
   * 取某档位在指定方向上的**相邻一档**：有档点时取该方向最近的档点，
   * 无档点时按 step 步进；该方向已无档位时返回 null。
   * @param {number} from 当前取值
   * @param {number} dir 方向（+1 增大 / -1 减小）
   * @returns {number|null} 相邻档位的取值
   */
  const adjacentTick = (from, dir) => {
    const list = (ticks || []).slice().sort((a, b) => a - b);
    if (list.length) {
      const next = dir > 0
        ? list.find(t => t > from + 1e-9)
        : list.filter(t => t < from - 1e-9).pop();
      return next === undefined ? null : next;
    }
    const candidate = snapValue(from + dir * (step || 1), min, max, step);
    return candidate === from ? null : candidate;
  };

  /**
   * 短按换档。判定区 = **当前取值所在的档点 → 左右相邻档点的中点**之间的区间
   *（首/末档在外侧没有邻居，该侧展开到轨道端点）。
   * - 落在区间内：朝指针所在的一侧只移动**相邻一档**（点击位置本身不作为取值）
   * - 落在区间外：直接切到离点击位置**最近的状态**（按档点圆心的像素距离取最近
   *   档点；无档点时按 step 吸附指针位置）
   * 正好落在当前档点圆心（无方向）时不改变取值。
   * @param {number} clientX 指针横坐标
   * @param {number} from 当前取值
   * @returns {number|null} 换档后的取值；不换档返回 null
   */
  const valueFromTap = (clientX, from) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || !rect.width) return null;
    const x = clientX - rect.left;
    const center = dotPixel(rect, from);
    const list = (ticks || []).slice().sort((a, b) => a - b);
    // 邻近区间的边界：与左右相邻档点的中点（没有邻居的一侧不设限）
    const prev = list.filter(t => t < from - 1e-9).pop();
    const next = list.find(t => t > from + 1e-9);
    const lower = prev === undefined ? -Infinity : (dotPixel(rect, prev) + center) / 2;
    const upper = next === undefined ? Infinity : (dotPixel(rect, next) + center) / 2;
    if (x >= lower && x <= upper) {
      const dir = Math.sign(x - center);
      return dir ? adjacentTick(from, dir) : null;
    }
    // 区间外：切到离点击位置最近的状态
    let nearest = null;
    let best = Infinity;
    list.forEach((t) => {
      const dist = Math.abs(x - dotPixel(rect, t));
      if (dist < best) {
        best = dist;
        nearest = t;
      }
    });
    if (nearest === null) return snapValue(min + (x / rect.width) * (max - min), min, max, step);
    return Math.abs(nearest - from) > 1e-9 ? nearest : null;
  };

  const active = interactive && !disabled;
  /** 结束按下过程：清预览与现场，恢复过渡并复位无障碍取值 */
  const releasePress = () => {
    dragging.current = false;
    pressRef.current = null;
    setPreview(null);
    setFollowing(false); // 松手：过渡恢复，吸附到目标取值
  };
  const pointerHandlers = active ? {
    onPointerDown: (e) => {
      const at = valueFromEvent(e);
      const r = ratioFromEvent(e);
      dragging.current = true;
      // 按下时的现场：起点坐标 / 起点取值 / 是否已进入拖动 / 按下时刻
      pressRef.current = { x: e.clientX, value, played: false, at: Date.now() };
      setFollowing(false); // 首段：动画滑到按下位置
      setPreview(r); // 中间态：滑块先移（动画）到指针处
      e.target.setPointerCapture?.(e.pointerId);
      if (tapMode === 'jump') onChange?.(at);
    },
    onPointerMove: (e) => {
      if (!dragging.current) return;
      const press = pressRef.current;
      if (press && !press.played && Math.abs(e.clientX - press.x) > TAP_SLOP) press.played = true;
      setFollowing(true); // 后续拖动：跟手，不再有过渡滞后
      setPreview(ratioFromEvent(e)); // 滑块跟手（连续位置，不吸附）
      const at = valueFromEvent(e);
      // 'step' 仅在进入拖动后才写数据；按下阶段只走预览
      if (tapMode === 'step') {
        if (press?.played) onChange?.(at);
      } else {
        onChange?.(at);
      }
    },
    onPointerUp: (e) => {
      const press = pressRef.current;
      const at = valueFromEvent(e);
      const isTap = !!press && !press.played && (Date.now() - press.at) <= TAP_DURATION_MS;
      releasePress();
      if (tapMode === 'step') {
        // 短按：落在当前档点的邻近区间时只移动相邻一档；落在区间外时切到
        // 离点击位置最近的状态（见 valueFromTap）
        if (isTap && press) {
          const next = valueFromTap(e.clientX, press.value);
          if (next != null) onChange?.(next);
        } else {
          onChange?.(at); // 长按/拖动后松手：落到指针处
        }
      }
    },
    onPointerCancel: () => releasePress(),
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

  // 滑块中心位置：钳制到轨道内，保证轨道两端的滑块/档点完整落在轨道内部
  // （百分比 + px 混算，left 的百分比相对轨道宽度解析）
  const thumbCenter = `clamp(${THUMB_W / 2}px, ${ratio * 100}%, calc(100% - ${THUMB_W / 2}px))`;
  // 档点圆心：与 thumbCenter 同口径内缩，两端档点圆心与色条端部圆角圆心重合
  const dotCenter = (t) => {
    const pct = max > min ? ((t - min) / (max - min)) * 100 : 0;
    return `clamp(${capRadius}px, ${pct}%, calc(100% - ${capRadius}px))`;
  };

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
        <div ref={trackRef} style={{ position: 'relative', width: '100%', height: MD3_TRACK_H }}>
          {/* 已填充色条：止于滑块左侧留白处，独立胶囊圆角 */}
          <div className={slideClass} style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: showThumb ? `max(0px, calc(${thumbCenter} - ${SEG_CUT}px))` : `${ratio * 100}%`,
            ...cornerStyle(corner, CAPSULE_RADIUS), backgroundColor: fill,
          }} />
          {/* 未填充色条：起于滑块右侧留白处 */}
          {showThumb ? (
            <div className={slideClass} style={{
              position: 'absolute', top: 0, bottom: 0, right: 0,
              left: `min(calc(${thumbCenter} + ${SEG_CUT}px), 100%)`,
              ...cornerStyle(corner, CAPSULE_RADIUS), backgroundColor: track,
            }} />
          ) : null}
          {(ticks || []).map(t => (
            <div key={t} className={slideClass} style={{
              position: 'absolute', top: '50%', left: dotCenter(t),
              width: 2, height: 2, transform: 'translate(-50%, -50%)', borderRadius: '50%',
              backgroundColor: t <= shownValue ? onPrimary : fill, pointerEvents: 'none',
            }} />
          ))}
          {showThumb ? (
            <div className={slideClass} style={{
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
      <div ref={trackRef} style={{ position: 'relative', width: '100%', height: CLASSIC_TRACK_H }}>
        <div className={slideClass} style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: showThumb
            ? `max(0px, calc(${thumbCenter} - ${classicCut}px))`
            : `${ratio * 100}%`,
          ...cornerStyle(corner, CAPSULE_RADIUS), backgroundColor: fill,
        }} />
        {showThumb ? (
          <div className={slideClass} style={{
            position: 'absolute', top: 0, bottom: 0, right: 0,
            left: `min(calc(${thumbCenter} + ${classicCut}px), 100%)`,
            ...cornerStyle(corner, CAPSULE_RADIUS), backgroundColor: track,
          }} />
        ) : null}
        {(ticks || []).map(t => (
          <div key={t} className={slideClass} style={{
            position: 'absolute', top: '50%', left: dotCenter(t),
            width: 4, height: 4, transform: 'translate(-50%, -50%)', borderRadius: '50%',
            backgroundColor: t <= shownValue ? fill : track,
            boxShadow: `0 0 0 1px ${t <= shownValue ? track : fill}`, pointerEvents: 'none',
          }} />
        ))}
        {showThumb ? (
          <div className={slideClass} style={{
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
