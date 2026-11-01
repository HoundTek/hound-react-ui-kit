/**
 * @file rate.jsx —— RateCell（评分）高级 Cell
 *
 * 离散取值族：评分 = 一排可点击的五角星（见 docs/basic-cell-design.md）。
 * 组装 fallback：SVG 星形直接点击（点亮星为数据色实心，未点亮星为
 * 主题 outline-variant 实心——两种状态都用实心填充，只差颜色，避免空心
 * 描边在暗色模式下变成一圈细线；SVG 固定几何绘制，避免 ★/☆ 文本字形随
 * 浏览器字体渲染产生尺寸差异）；悬停时预览到光标所在星，点击即写入 value。
 * 不再挂滑块轨道：评分是离散选择，直接点星才符合直觉（键盘用每颗星
 * 自身的按钮语义，Enter/Space 触发）。
 * 主题可经 theme.components.rate 整体重写。
 *
 * Schema（数据契约，与旧版一致）：value / count / color / disabled。
 */
import React, { useState } from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { useThemeColor } from '../core/theme/theme-react';
import { stateLayerProps } from '../core/theme/state-layer';

/** 五角星路径（24×24 viewBox，Material star 几何） */
const STAR_PATH = 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z';

/** 单颗星尺寸（px；含 4px 内边距的点击热区） */
const STAR_SIZE = 20;
/** 星与星之间的间距（px） */
const STAR_GAP = 4;

/**
 * 单颗星（SVG）：两种状态都是实心填充，只用颜色区分——点亮取数据色，
 * 未点亮取主题 outline-variant（暗色模式随之变亮，不会出现空心描边细线）。
 * @param {{lit: boolean, color: string, dimColor: string, size: number}} props 组件属性
 * @returns {JSX.Element} 星形元素
 */
function RateStar({ lit, color, dimColor, size }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ display: 'block', flexShrink: 0 }}
      aria-hidden="true"
    >
      <path d={STAR_PATH} fill={lit ? color : dimColor} />
    </svg>
  );
}

/**
 * 评分组装视图（fallback）：一排可点击星。
 * value 为已点亮星数（0..count）；悬停预览到光标星，点击写入该星序号。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function RateAssembledView({ cell }) {
  const value = useCellData(cell, 'value');
  const count = useCellData(cell, 'count');
  // 数据色可传颜色角色名（如 'warning'），未定义角色按裸色值使用
  const colorRole = useCellData(cell, 'color');
  const color = useThemeColor(colorRole, colorRole);
  // 未点亮星的实心色：主题 outline-variant（暗色模式自动提亮）
  const dimColor = useThemeColor('outline-variant', '#d5cfe0');
  const disabled = useCellData(cell, 'disabled');
  const [hover, setHover] = useState(0);
  const stars = Array.from({ length: Math.max(0, count) }, (_, i) => i + 1);
  // 悬停预览优先，否则取当前值
  const lit = hover || value;
  // 态层罩层（点击热区悬浮/按压反馈）
  const layer = disabled ? null : stateLayerProps(color);
  return (
    <div
      style={{
        width: '100%', height: '100%', display: 'flex', alignItems: 'center',
        gap: STAR_GAP, padding: '0 12px', boxSizing: 'border-box',
        opacity: disabled ? 0.5 : 1,
      }}
      onMouseLeave={() => setHover(0)}
    >
      {stars.map(t => {
        const on = t <= lit;
        const starStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center' };
        return (
          <button
            key={t}
            type="button"
            disabled={disabled}
            aria-label={`${t} 星`}
            aria-pressed={t <= value}
            onMouseEnter={() => setHover(t)}
            onClick={() => { if (!disabled) cell.setValue(t); }}
            className={layer ? `${layer.className} hk-focus hk-press` : undefined}
            style={{
              ...starStyle,
              width: STAR_SIZE + 8, height: STAR_SIZE + 8, padding: 0,
              border: 'none', background: 'transparent', cursor: disabled ? 'not-allowed' : 'pointer',
              borderRadius: 9999, color, flexShrink: 0,
              ...(layer ? { ...layer.style, '--hk-focus': color } : {}),
            }}
          >
            <RateStar lit={on} color={color} dimColor={dimColor} size={STAR_SIZE} />
          </button>
        );
      })}
    </div>
  );
}

/** kind 'rate' 的实现分发视图 */
const RateDispatcher = createImplDispatcher('rate', RateAssembledView);

/**
 * RateCell：评分（高级 Cell，离散取值族）。value 为已点亮星数（默认 0），
 * count 为星总数（默认 5），color 为星色（默认金橙），disabled 禁用时
 * 点击不响应。呈现实现由 kind 'rate' 分发（缺省为可点击星组装版）。
 */
class RateCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(32)
      .schema({
        value: { type: 'number', default: 0 },
        count: { type: 'number', default: 5 },
        color: { type: 'string', default: '#f0a020' },
        disabled: { type: 'boolean', default: false },
      })
      .renderContent(RateDispatcher);
  }
}

export { RateCell, RateAssembledView };
