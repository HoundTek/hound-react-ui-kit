/**
 * @file joycon.jsx —— JoyConCell（方向键）高级 Cell
 *
 * 滑块族：二维坐标选择 = 两个正交一维滑块（见 docs/basic-cell-design.md）。
 * 组装 fallback：x/y 两个 SliderTrackImpl（基础 Cell 滑块的实现组件，
 * min-1/max1/step1，三档刻点）+ 当前方向回显（SVG 方向图标 + 方向名）；
 * 拖动 x 轴得 left/right，拖动 y 轴得 up/down，回中为 center，均写入 direction
 * 并调用注入的 _onMove(dir) 回调（页面作者经 onMove 注入）。
 * 主题可经 theme.components.joycon 整体重写呈现实现。
 *
 * Schema（数据契约，与旧版一致）：direction。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { useThemeColor } from '../core/theme/theme-react';
import { SliderTrackImpl } from '../basic-cells';
import { GlyphChevron } from '../basic-cells/glyphs';

/** 方向回显图标（SVG 字形；center 为实心小圆点） */
const DIR_ICON = {
  up: <GlyphChevron dir="up" size={14} />,
  left: <GlyphChevron dir="left" size={14} />,
  right: <GlyphChevron dir="right" size={14} />,
  down: <GlyphChevron dir="down" size={14} />,
};
const CENTER_DOT = (
  <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'currentColor', flexShrink: 0 }} />
);
const TICKS = [-1, 0, 1];

/**
 * 方向键组装视图（fallback）：x/y 正交滑块 + 当前方向回显（SVG 方向图标
 * + 方向名文本，颜色继承父级 color）。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function JoyConAssembledView({ cell }) {
  const direction = useCellData(cell, 'direction');
  const textColor = useThemeColor('text', '#333');
  const xValue = direction === 'left' ? -1 : direction === 'right' ? 1 : 0;
  const yValue = direction === 'up' ? 1 : direction === 'down' ? -1 : 0;
  const move = (dir) => { cell.setDirection(dir); if (cell._onMove) cell._onMove(dir); };
  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', gap: 4, padding: '0 12px', boxSizing: 'border-box',
      userSelect: 'none',
    }}>
      <div style={{
        flexShrink: 0, height: 20, display: 'flex', alignItems: 'center',
        justifyContent: 'center', gap: 6, fontSize: 13, color: textColor,
      }}>
        {DIR_ICON[direction] || CENTER_DOT}
        <span>{direction}</span>
      </div>
      <SliderTrackImpl
        min={-1}
        max={1}
        step={1}
        value={xValue}
        ticks={TICKS}
        onChange={v => move(v < 0 ? 'left' : v > 0 ? 'right' : 'center')}
      />
      <SliderTrackImpl
        min={-1}
        max={1}
        step={1}
        value={yValue}
        ticks={TICKS}
        onChange={v => move(v > 0 ? 'up' : v < 0 ? 'down' : 'center')}
      />
    </div>
  );
}

/** kind 'joycon' 的实现分发视图 */
const JoyConDispatcher = createImplDispatcher('joycon', JoyConAssembledView);

/**
 * JoyConCell：方向键面板（高级 Cell，滑块族）。direction 记录当前方向
 *（center 为默认）；页面作者可用 onMove(handler) 注入方向回调
 *（handler(dir)）。呈现实现由 kind 'joycon' 分发（缺省为双滑块组装版）。
 */
class JoyConCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedWidth(150).fixedHeight(150)
      .schema({
        direction: { type: 'string', default: 'center' },
      })
      .renderContent(JoyConDispatcher);
  }

  /**
   * 注入方向回调：方向变更时调用 handler(dir)。
   * @param {(dir: string) => void} handler 方向回调
   * @returns {JoyConCell} self（链式）
   */
  onMove(handler) {
    this._onMove = handler;
    return this;
  }
}

export { JoyConCell, JoyConAssembledView };
