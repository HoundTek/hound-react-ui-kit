/**
 * @file color-picker.jsx —— ColorPickerCell（颜色选择器）预设
 *
 * 颜色选择 = 输入条（按钮）+ 色相环取色面板（伪窗口，见
 * docs/floating-window-tree-design.md）：
 *   - 输入条：当前色预览 + hex 文本，点击展开/收起取色面板
 *   - 色相环：外环为色相（conic-gradient），环内为**斜 45° 正方形**取色块
 *     （方块旋转 45° 后外接框恰为环内圆，形成"钻石"观感）。方块内部坐标取
 *     HSV（横轴饱和度、纵轴自下而上明度），旋转后四角依次为顶部白、右侧
 *     纯色相、底部黑、左侧黑，与常规取色器观感一致（纯 HSL 的 S/L 平面旋转
 *     45° 会出现"两角白两角黑"的过曝感）；写值再转成 HSL 存储
 *   - 色板行：常用色块，点击直接写入 color
 * 取色面板不绝对定位在 Cell 内容层内（内容层带 overflow 裁切），而是作为独立
 * 浮动视口挂到数据树根，按触发条屏幕矩形定位（下方空间不足时上翻），页面滚动/
 * 窗口缩放时跟随；关闭时机：点击面板外、Escape、触发条卸载。
 *
 * 色值以 **HSL 字符串**存储（如 `hsl(150, 67%, 32%)`）：HSL 是取色的原生表达，
 * 色相 / 饱和度 / 明度彼此独立，不会像 hex 那样每次经 RGB 取整后再反解，
 * 把色相抖到相邻值（灰阶、极暗、极亮时 hex 往返甚至会丢失色相）。hex 只用于
 * 输入解析（兼容旧数据）、显示读数与色板；取色过程中的写值一律走 HSL。
 *
 * Schema（数据契约）：swatches / color（HSL 或 hex 字符串，读入时统一解析为 HSL）。
 */
import { useEffect, useRef, useState } from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { useThemeColor, useCornerType, useShapeRadius } from '../core/theme/theme-react';
import { cornerStyle } from '../core/theme/shape';
import { TABULAR_NUMS } from '../core/theme/state-layer';
import { ButtonImpl } from '../basic-cells/button';
import { syncFloatingFrame } from '../core/box/box-component';
import { placePopover } from './popover-anchor';

/** 默认色板（hex：色板是"常用色"清单，不参与取色抖动） */
const DEFAULT_SWATCHES = ['#4a90d9', '#1a8a4a', '#c03a2a', '#c07a1a', '#8a6fd9', '#d96f9a', '#333333', '#888888'];
/** 默认当前色（HSL：与存储格式一致） */
const DEFAULT_COLOR = 'hsl(211, 65%, 57%)';

/** 空色板（模块级常量：保证 useEffect 依赖身份稳定，避免每次渲染新建数组） */
const NO_SWATCHES = [];

/** 色块边长（px） */
const SWATCH = 16;
/** 色相环外径（px） */
const RING_SIZE = 180;
/** 色相环环宽（px） */
const RING_THICK = 18;
/** 环内缘与取色块之间的留白（px） */
const RING_INSET = 6;
/** 环内圆直径（px）：环内按留白内缩 */
const INNER_SIZE = RING_SIZE - 2 * (RING_THICK + RING_INSET);
/** 取色块边长（px）：正方形旋转 45° 后外接框恰为 INNER_SIZE（对角线与圆同径） */
const SV_SIDE = INNER_SIZE / Math.SQRT2;
/** 取色面板内边距（px） */
const PANEL_PAD = 12;
/** 取色面板纵向间距（px） */
const PANEL_GAP = 10;
/** 色板行 / 读数行高度（px） */
const ROW_H = 18;
/** 取色面板宽度（px） */
const PANEL_W = RING_SIZE + PANEL_PAD * 2;
/** 取色面板高度（px）：内边距 + 环 + 色板行 + 读数行 */
const PANEL_H = PANEL_PAD * 2 + RING_SIZE + PANEL_GAP + ROW_H + PANEL_GAP + ROW_H;
/** 色相环渐变（0 度 = 右侧 = 0 色相，顺时针递进） */
const RING_GRADIENT =
  'conic-gradient(from 90deg, #f00 0deg, #ff0 60deg, #0f0 120deg, #0ff 180deg, #00f 240deg, #f0f 300deg, #f00 360deg)';
/** HSL 字符串解析（兼容 `hsl(150, 67%, 32%)` / `hsl(150 67% 32%)` / hsla） */
const HSL_RE = /^hsla?\(\s*([+-]?\d*\.?\d+)(?:deg)?\s*[,\s]\s*([+-]?\d*\.?\d+)%\s*[,\s]\s*([+-]?\d*\.?\d+)%/i;
/** 旋转 45° 的余弦（逆变换用） */
const COS45 = Math.cos(Math.PI / 4);

/** 取色面板 Cell id 计数器（同一父数据节点下需唯一段名） */
let _panelSeq = 0;

/**
 * 数值钳制到 [0, 1]
 * @param {number} n 输入值
 * @returns {number} 钳制结果
 */
const clamp01 = (n) => Math.max(0, Math.min(1, n));

/**
 * 四舍五入到指定小数位
 * @param {number} n 输入值
 * @param {number} [digits=1] 小数位
 * @returns {number} 舍入结果
 */
const round = (n, digits = 1) => {
  const p = 10 ** digits;
  return Math.round(n * p) / p;
};

/**
 * 解析 hex 色值为 RGB 分量（支持 #rgb / #rrggbb，非法输入按黑色）
 * @param {string} hex hex 色值
 * @returns {{r: number, g: number, b: number}} RGB 分量（0–255）
 */
function parseHex(hex) {
  const m = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec((hex || '').trim());
  if (!m) return { r: 0, g: 0, b: 0 };
  let h = m[1];
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/**
 * RGB → hex 字符串（小写，6 位）
 * @param {{r: number, g: number, b: number}} rgb RGB 分量
 * @returns {string} hex 色值
 */
function rgbToHex({ r, g, b }) {
  const to2 = n => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}

/**
 * RGB → HSL
 * @param {number} r 红（0–255）
 * @param {number} g 绿（0–255）
 * @param {number} b 蓝（0–255）
 * @returns {{h: number, s: number, l: number}} 色相 0–360、饱和度/明度 0–1
 */
function rgbToHsl(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h;
  if (max === rn) h = ((gn - bn) / d) % 6;
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return { h, s, l };
}

/**
 * HSL → RGB
 * @param {number} h 色相 0–360
 * @param {number} s 饱和度 0–1
 * @param {number} l 明度 0–1
 * @returns {{r: number, g: number, b: number}} RGB 分量（0–255）
 */
function hslToRgb(h, s, l) {
  const hh = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((hh / 60) % 2 - 1));
  const m = l - c / 2;
  const table = [
    [c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x],
  ];
  const [r, g, b] = table[Math.floor(hh / 60) % 6];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

/**
 * HSL → hex 便捷入口（仅用于显示读数与色板比对）
 * @param {{h: number, s: number, l: number}} hsl HSL 分量
 * @returns {string} hex 色值（小写）
 */
function hslToHex(hsl) {
  return rgbToHex(hslToRgb(hsl.h, hsl.s, hsl.l));
}

/**
 * HSL → HSV（取色方块用的显示坐标：横轴饱和、纵轴明度）
 * @param {{h: number, s: number, l: number}} hsl HSL 分量
 * @returns {{h: number, s: number, v: number}} HSV 分量（明度轴：v = 1 为白、0 为黑）
 */
function hslToHsv({ h, s, l }) {
  const v = l + s * Math.min(l, 1 - l);
  return { h, s: v === 0 ? 0 : 2 * (1 - l / v), v };
}

/**
 * HSV → HSL（写值一律落成 HSL 字符串：色相原样保留，不经 RGB 往返）
 * @param {{h: number, s: number, v: number}} hsv HSV 分量
 * @returns {{h: number, s: number, l: number}} HSL 分量
 */
function hsvToHsl({ h, s, v }) {
  const l = v * (1 - s / 2);
  const sl = l === 0 || l === 1 ? 0 : (v - l) / Math.min(l, 1 - l);
  return { h, s: clamp01(sl), l };
}

/**
 * 把颜色字符串解析为 HSL（hex / hsl() / hsla()，无法解析时按黑色）
 * @param {string} value 颜色字符串
 * @returns {{h: number, s: number, l: number}} HSL 分量
 */
function parseColor(value) {
  const raw = (value || '').trim();
  const m = HSL_RE.exec(raw);
  if (m) {
    const h = ((parseFloat(m[1]) % 360) + 360) % 360;
    return { h, s: clamp01(parseFloat(m[2]) / 100), l: clamp01(parseFloat(m[3]) / 100) };
  }
  const { r, g, b } = parseHex(raw);
  return rgbToHsl(r, g, b);
}

/**
 * HSL → 存储用颜色字符串（保留 1 位小数，避免取色过程中的舍入抖动）
 * @param {number} h 色相 0–360
 * @param {number} s 饱和度 0–1
 * @param {number} l 明度 0–1
 * @returns {string} `hsl(h, s%, l%)`
 */
function formatHsl(h, s, l) {
  const hh = ((h % 360) + 360) % 360;
  return `hsl(${round(hh)}, ${round(s * 100)}%, ${round(l * 100)}%)`;
}

/**
 * 色块按钮（常用色板）：点击写入该色，当前色以描边环标记。
 * @param {Object} props 组件属性
 * @param {string} props.color 色块色值
 * @param {boolean} props.active 是否为当前色
 * @param {string} props.ringColor 选中环色
 * @param {number} props.radius 圆角半径
 * @param {() => void} props.onPick 点击回调
 * @returns {JSX.Element} 色块按钮
 */
function SwatchButton({ color, active, ringColor, radius, onPick }) {
  return (
    <button
      type="button"
      aria-label={color}
      aria-pressed={active ? 'true' : 'false'}
      onClick={onPick}
      className="hk-focus hk-press"
      style={{
        width: SWATCH, height: SWATCH, flexShrink: 0, padding: 0,
        ...cornerStyle('g1', radius),
        backgroundColor: color, border: 'none', cursor: 'pointer',
        boxShadow: active ? `0 0 0 2px ${ringColor}` : 'inset 0 0 0 1px rgba(0,0,0,0.12)',
        boxSizing: 'border-box',
      }}
    />
  );
}

/**
 * 取色面板视图（伪窗口内容）：色相环 + 环内 45° 正方形取色块 + 色板行 + 读数行。
 * 方块内部用 HSV 坐标（横轴 S、纵轴自下而上 V）绘制渐变与游标，写值时经
 * `hsvToHsl` 转成 HSL 字符串存储：色相直接取 HSL 字符串自带的 h，灰阶/黑白
 * 也能原样保留色相，不会像 hex 那样经 RGB 取整往返把色相抖到相邻值。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 取色面板元素
 */
function ColorPickerPanelView({ cell }) {
  const swatches = useCellData(cell, 'swatches') || NO_SWATCHES;
  const color = useCellData(cell, 'color') || DEFAULT_COLOR;
  const text = useThemeColor('text', '#333333');
  const muted = useThemeColor('text-muted', '#79747E');
  const outline = useThemeColor('outline-variant', '#CAC4D0');
  const surface = useThemeColor('surface', '#ffffff');
  const corner = useCornerType();
  const controlR = useShapeRadius('control', 4);
  const ringRef = useRef(null);
  const svRef = useRef(null);

  const hsl = parseColor(color);
  // 色相直接取存储值：HSL 字符串本身就带着色相，即使 s=0 / l=0（灰阶、黑白）
  // 也能原样保留，因此不需要额外的"记忆色相"状态（这正是 HSL 存储相对 hex
  // 的优势：不会因为写值往返丢色相）
  const hue = hsl.h;
  // 方块上的显示坐标（HSV）：横轴饱和度、纵轴明度
  const hsv = hslToHsv(hsl);
  // 改色相时的基准：色相在灰阶/纯黑纯白上无意义，此时用可用的饱和度与明度，
  // 保证一动色环就有颜色，而不是"改了色相仍是黑白"
  const baseSat = hsv.s > 0.02 ? hsv.s : 1;
  const baseValue = hsv.v > 0.02 ? hsv.v : 1;
  const hex = hslToHex(hsl);

  /**
   * 写入取色结果：先更新面板自身数据（重绘游标），再经 pick 事件回传宿主
   *（伪窗口数据节点独立于宿主 Cell，宿主据此同步 color）
   * @param {string} next 取色结果（HSL 字符串）
   */
  const applyColor = (next) => {
    cell.setColor(next);
    cell.emit('pick', next);
  };

  /** 写入 HSL 三元组（统一走 HSL 存储） */
  const applyHsl = (h, s, l) => applyColor(formatHsl(h, s, l));

  /** 由指针坐标求色环角度（右侧为 0 色相，顺时针递进） */
  const applyHue = (clientX, clientY) => {
    const rect = ringRef.current?.getBoundingClientRect();
    if (!rect || !rect.width) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let deg = Math.atan2(clientY - cy, clientX - cx) * 180 / Math.PI;
    if (deg < 0) deg += 360;
    const next = hsvToHsl({ h: deg, s: baseSat, v: baseValue });
    applyHsl(next.h, next.s, next.l);
  };

  /**
   * 由指针坐标改写 45° 正方形取色块的 S/V：
   * 屏幕坐标先逆旋转 45° 回到方块本地坐标（横轴向右为饱和度、纵轴向上为
   * 明度），再按边长换算百分比，最后经 HSV → HSL 落成存储值。
   */
  const applySv = (clientX, clientY) => {
    const rect = svRef.current?.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return;
    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);
    const lx = dx * COS45 + dy * COS45;
    const ly = -dx * COS45 + dy * COS45;
    const next = hsvToHsl({
      h: hue,
      s: clamp01(0.5 + lx / SV_SIDE),
      v: clamp01(0.5 - ly / SV_SIDE),
    });
    applyHsl(next.h, next.s, next.l);
  };

  const onHueDown = (e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    applyHue(e.clientX, e.clientY);
  };
  const onHueMove = (e) => {
    if (e.currentTarget.hasPointerCapture && !e.currentTarget.hasPointerCapture(e.pointerId)) return;
    applyHue(e.clientX, e.clientY);
  };
  const onSvDown = (e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    applySv(e.clientX, e.clientY);
  };
  const onSvMove = (e) => {
    if (e.currentTarget.hasPointerCapture && !e.currentTarget.hasPointerCapture(e.pointerId)) return;
    applySv(e.clientX, e.clientY);
  };

  // 色相指针落点：环中线半径上按角度分布
  const thumbRadius = RING_SIZE / 2 - RING_THICK / 2;
  const thumbRad = hue * Math.PI / 180;
  const thumbX = RING_SIZE / 2 + thumbRadius * Math.cos(thumbRad);
  const thumbY = RING_SIZE / 2 + thumbRadius * Math.sin(thumbRad);
  // 取色块位置：环内圆的内切正方形（圆直径 = 正方形对角线）
  const innerOffset = RING_THICK + RING_INSET;

  return (
    <div
      data-hk-color-panel=""
      style={{
        width: '100%', height: '100%', boxSizing: 'border-box',
        padding: PANEL_PAD, display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: PANEL_GAP, overflow: 'hidden',
      }}
    >
      {/* 色相环 + 环内 45° 正方形取色块 */}
      <div style={{ position: 'relative', width: RING_SIZE, height: RING_SIZE, flexShrink: 0 }}>
        <div
          ref={ringRef}
          onPointerDown={onHueDown}
          onPointerMove={onHueMove}
          style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: RING_GRADIENT, cursor: 'crosshair', touchAction: 'none',
          }}
        />
        {/* 环内圆：底色与面板一致，形成"镂空"观感 */}
        <div
          style={{
            position: 'absolute', left: innerOffset, top: innerOffset,
            width: INNER_SIZE, height: INNER_SIZE, borderRadius: '50%',
            backgroundColor: surface, boxShadow: `inset 0 0 0 1px ${outline}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {/* 取色块：正方形旋转 45°（对角线 = 环内圆直径） */}
          <div
            ref={svRef}
            onPointerDown={onSvDown}
            onPointerMove={onSvMove}
            style={{
              position: 'relative', width: SV_SIDE, height: SV_SIDE,
              transform: 'rotate(45deg)', touchAction: 'none', cursor: 'crosshair',
              // 底层：横向从白到纯色相（饱和度）；上层：自下而上从黑到透明（明度）
              background:
                'linear-gradient(to top, #000 0%, rgba(0,0,0,0) 100%),'
                + `linear-gradient(to right, #fff 0%, hsl(${hue}, 100%, 50%) 100%)`,
            }}
          >
            <div style={{
              position: 'absolute', left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`,
              width: 12, height: 12, marginLeft: -6, marginTop: -6, borderRadius: '50%',
              border: '2px solid #fff', boxShadow: '0 0 0 1px rgba(0,0,0,0.35)',
              boxSizing: 'border-box', pointerEvents: 'none',
            }} />
          </div>
        </div>
        {/* 色相指针 */}
        <div style={{
          position: 'absolute', left: thumbX, top: thumbY,
          width: 14, height: 14, marginLeft: -7, marginTop: -7, borderRadius: '50%',
          border: '2px solid #fff', backgroundColor: `hsl(${hue}, 100%, 50%)`,
          boxShadow: '0 0 0 1px rgba(0,0,0,0.35)', boxSizing: 'border-box',
          pointerEvents: 'none',
        }} />
      </div>
      {/* 常用色板 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4, width: '100%',
        height: ROW_H, flexShrink: 0,
      }}>
        {swatches.map(sw => {
          const swHsl = parseColor(sw);
          return (
            <SwatchButton
              key={sw}
              color={sw}
              active={hslToHex(swHsl) === hex}
              ringColor={text}
              radius={controlR}
              onPick={() => applyHsl(swHsl.h, swHsl.s, swHsl.l)}
            />
          );
        })}
      </div>
      {/* 当前色读数（显示推导出的 hex，存储仍是 HSL） */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, width: '100%',
        height: ROW_H, flexShrink: 0,
      }}>
        <span style={{
          width: 12, height: 12, flexShrink: 0,
          ...cornerStyle(corner, 3),
          backgroundColor: color, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.15)',
        }} />
        <span style={{ fontSize: 12, color: muted, ...TABULAR_NUMS }}>{hex.toUpperCase()}</span>
      </div>
    </div>
  );
}

/**
 * 取色面板伪窗口 Cell：浮动视口 + overlay 圆角 + surface 底色，阴影/描边由
 * 浮动窗口框架统一给出；尺寸固定为 PANEL_W × PANEL_H，位置由触发器矩形决定。
 */
class ColorPickerPanelCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.floatingViewport()
      .movable(false).resizable(false)
      .styleRole('overlay').color('surface')
      .fixedWidth(PANEL_W).fixedHeight(PANEL_H)
      .schema({
        swatches: { type: 'array', default: DEFAULT_SWATCHES },
        color: { type: 'string', default: DEFAULT_COLOR },
      })
      .renderContent(ColorPickerPanelView);
  }
}

/**
 * 打开取色面板：把面板作为浮动视口挂到 Cell 树根上，按触发条屏幕矩形定位。
 * 返回控制器（cell / reposition / close），调用方负责在关闭时 close()。
 * @param {Object} p 参数
 * @param {import('../core/data-dag/data-dag').DataNode} p.parentNode 挂载父数据节点
 * @param {HTMLElement} p.trigger 触发条元素（定位依据）
 * @param {string} p.color 当前色（HSL 或 hex）
 * @param {string[]} p.swatches 常用色板
 * @param {(color: string) => void} p.onChange 取色回调（HSL 字符串）
 * @returns {{cell: ColorPickerPanelCell, reposition: Function, close: Function}|null} 控制器
 */
function openColorPickerWindow({ parentNode, trigger, color, swatches, onChange }) {
  if (!parentNode || !trigger) return null;
  const { x, y } = placePopover(trigger.getBoundingClientRect(), PANEL_W, PANEL_H);
  const cell = new ColorPickerPanelCell(`hk-color-panel-${++_panelSeq}`);
  cell.posX(x).posY(y);
  cell.setColor(color || DEFAULT_COLOR).setSwatches(swatches || DEFAULT_SWATCHES);
  cell.on('pick', next => onChange?.(next));
  cell.mount(parentNode);

  /** 按最新触发条矩形重定位（页面滚动/窗口缩放时跟随） */
  const reposition = () => {
    const box = cell._mounts[0]?.box;
    if (!box) return;
    const next = placePopover(trigger.getBoundingClientRect(), PANEL_W, PANEL_H);
    box.posX(next.x).posY(next.y);
    syncFloatingFrame(box);
  };

  /** 关闭并释放伪窗口（一次性实例，不复用） */
  const close = () => cell.destroy();

  return { cell, reposition, close };
}

/**
 * 颜色选择器组装视图（fallback）：触发条（当前色预览 + hex 文本）+ 取色面板
 * 伪窗口。展开态由内部 state 自管理；点击面板外、Escape 收起。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function ColorPickerAssembledView({ cell }) {
  const swatches = useCellData(cell, 'swatches') || NO_SWATCHES;
  const color = useCellData(cell, 'color') || DEFAULT_COLOR;
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const latestRef = useRef({ color, swatches });

  useEffect(() => {
    latestRef.current = { color, swatches };
  }, [color, swatches]);

  // ARIA 透传：触发条展开态同步到其 <button> DOM
  useEffect(() => {
    const btn = triggerRef.current && triggerRef.current.querySelector('button');
    if (!btn) return;
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }, [open]);

  // 展开时创建伪窗口；收起（外部点击 / Escape / 卸载）时销毁
  useEffect(() => {
    if (!open) return undefined;
    const trigger = triggerRef.current && triggerRef.current.querySelector('button');
    const panel = openColorPickerWindow({
      parentNode: cell._dataNode?.root,
      trigger,
      color: latestRef.current.color,
      swatches: latestRef.current.swatches,
      onChange: next => cell.setColor(next),
    });
    if (!panel) return undefined;
    panelRef.current = panel;
    const reposition = () => panel.reposition();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
      panel.close();
      panelRef.current = null;
    };
  }, [open, cell]);

  // 展开期间宿主 color/swatches 变化（如外部 setColor）同步到伪窗口
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    panel.cell.setColor(color || DEFAULT_COLOR);
    panel.cell.setSwatches(swatches);
  }, [color, swatches]);

  // 展开期间：Escape 与面板/触发条之外的按下都收起
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    };
    const onPointerDown = (e) => {
      const t = e.target;
      if (!t || typeof t.closest !== 'function') return;
      if (t.closest('[data-hk-color-trigger]') || t.closest('[data-hk-color-panel]')) return;
      setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('mousedown', onPointerDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('mousedown', onPointerDown, true);
    };
  }, [open]);

  return (
    <div
      data-hk-color-trigger=""
      style={{
        width: '100%', height: '100%', display: 'flex', alignItems: 'center',
        padding: '0 8px', boxSizing: 'border-box',
      }}
    >
      <div ref={triggerRef} style={{ flex: 1, minWidth: 0 }}>
        <ButtonImpl
          label={hslToHex(parseColor(color)).toUpperCase()}
          icon={(
            <span style={{
              display: 'block', width: 14, height: 14,
              borderRadius: '50%', backgroundColor: color,
              boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.2)',
            }} />
          )}
          type="default"
          block
          align="left"
          onPress={() => setOpen(!open)}
        />
      </div>
    </div>
  );
}

/**
 * 组装视图分发器：theme.getComponent('color-picker') 命中注册实现则整体替换，
 * 否则渲染 ColorPickerAssembledView（组装 fallback）。
 */
const ColorPickerDispatcher = createImplDispatcher('color-picker', ColorPickerAssembledView);

/**
 * ColorPickerCell：颜色选择器。swatches 为色板数组（默认 8 个常用色），
 * color 为当前色（HSL 字符串，读取时兼容 hex）；触发条显示当前色与推导出的
 * hex 文本，点击展开色相环取色面板（写值一律 HSL，避免色相抖动）。
 */
class ColorPickerCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(40).defaultWidth(200)
      .schema({
        swatches: { type: 'array', default: DEFAULT_SWATCHES },
        color: { type: 'string', default: DEFAULT_COLOR },
      })
      .renderContent(ColorPickerDispatcher);
  }
}

export {
  ColorPickerCell, ColorPickerAssembledView, ColorPickerPanelCell, ColorPickerPanelView,
};
