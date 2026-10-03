/**
 * @file rate.jsx —— RateCell（评分）高级 Cell
 *
 * 滑块族：评分 = 离散一维滑块（见 docs/basic-cell-design.md）。
 * 组装 fallback：SliderTrackImpl（基础 Cell 滑块的实现组件，min1/max=count/
 * step1，每颗星一个刻点）+ SVG 星形回显（实心点亮 / 描边未点亮——SVG 固定
 * 几何绘制，避免 ★/☆ 文本字形随浏览器字体渲染产生尺寸差异）；
 * 点击刻点或拖动滑块即写入 value。主题可经 theme.components.rate 整体重写。
 *
 * Schema（数据契约，与旧版一致）：value / count / color / disabled。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { SliderTrackImpl } from '../basic-cells';

/** 五角星路径（24×24 viewBox，Material star 几何） */
const STAR_PATH = 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z';

/**
 * 单颗星（SVG）：lit 为实心填充，未点亮为描边空心。
 * @param {{lit: boolean, color: string, size: number}} props 组件属性
 * @returns {JSX.Element} 星形元素
 */
function RateStar({ lit, color, size }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ display: 'block', flexShrink: 0 }}
      aria-hidden="true"
    >
      <path
        d={STAR_PATH}
        fill={lit ? color : 'none'}
        stroke={color}
        strokeWidth={lit ? 0 : 2}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * 评分组装视图（fallback）：离散滑块轨道（1..count 刻点）+ SVG 星级回显。
 * value 为已点亮星数；滑块取值钳制在 [1, count]。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function RateAssembledView({ cell }) {
  const value = useCellData(cell, 'value');
  const count = useCellData(cell, 'count');
  const color = useCellData(cell, 'color');
  const disabled = useCellData(cell, 'disabled');
  const ticks = Array.from({ length: Math.max(0, count) }, (_, i) => i + 1);
  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', alignItems: 'center',
      gap: 8, padding: '0 12px', boxSizing: 'border-box',
      opacity: disabled ? 0.5 : 1,
    }}>
      {count > 0 ? (
        <div style={{ flex: 1, minWidth: 0 }}>
          <SliderTrackImpl
            min={1}
            max={count}
            step={1}
            value={Math.min(count, Math.max(1, value))}
            ticks={ticks}
            disabled={disabled}
            color={color}
            onChange={v => cell.setValue(v)}
          />
        </div>
      ) : null}
      <div style={{
        flexShrink: 0, display: 'flex', alignItems: 'center', gap: 2, height: 24,
      }}>
        {ticks.map(t => (
          <RateStar key={t} lit={t <= value} color={color} size={16} />
        ))}
      </div>
    </div>
  );
}

/** kind 'rate' 的实现分发视图 */
const RateDispatcher = createImplDispatcher('rate', RateAssembledView);

/**
 * RateCell：评分（高级 Cell，滑块族）。value 为已点亮星数（默认 0），
 * count 为星总数（默认 5），color 为星色（默认金橙），disabled 禁用时
 * 点击/拖动不响应。呈现实现由 kind 'rate' 分发（缺省为滑块组装版）。
 */
class RateCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(32).color('surface')
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
