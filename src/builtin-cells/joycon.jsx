/**
 * @file joycon.jsx —— JoyConCell（方向键）预设
 *
 * 十字方向键面板：上/左/中/右/下五个按钮拼接（中 40x40，其余 36x36），
 * 点击写入 direction 并调用注入的 _onMove(dir) 回调（页面作者经 onMove 注入）。
 * 当前方向按钮以主色高亮，适合游戏/遥控器类页面。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';

const DIR_MAP = [
  { dir: 'up', glyph: '↑' },
  { dir: 'left', glyph: '←' },
  { dir: 'center', glyph: '●' },
  { dir: 'right', glyph: '→' },
  { dir: 'down', glyph: '↓' },
];

/**
 * 方向键视图：订阅 direction，点击按钮写入 direction 并回调 _onMove。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function JoyConView({ cell }) {
  const direction = useCellData(cell, 'direction');
  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', userSelect: 'none',
    }}>
      <div style={{ display: 'flex' }}>
        <div style={{ width: 40 }} />
        <JoyConButton cell={cell} spec={{ dir: 'up', glyph: '↑' }} active={direction === 'up'} />
        <div style={{ width: 40 }} />
      </div>
      <div style={{ display: 'flex' }}>
        <JoyConButton cell={cell} spec={{ dir: 'left', glyph: '←' }} active={direction === 'left'} />
        <JoyConButton cell={cell} spec={{ dir: 'center', glyph: '●' }} active={direction === 'center'} />
        <JoyConButton cell={cell} spec={{ dir: 'right', glyph: '→' }} active={direction === 'right'} />
      </div>
      <div style={{ display: 'flex' }}>
        <div style={{ width: 40 }} />
        <JoyConButton cell={cell} spec={{ dir: 'down', glyph: '↓' }} active={direction === 'down'} />
        <div style={{ width: 40 }} />
      </div>
    </div>
  );
}

/**
 * 单个方向键：点击写入 direction 并调用注入的 _onMove；当前方向主色高亮。
 * @param {{cell: CellBaseBuilder, spec: {dir: string, glyph: string}, active: boolean}} props 组件属性
 * @returns {JSX.Element} 按钮元素
 */
function JoyConButton({ cell, spec, active }) {
  const size = spec.dir === 'center' ? 40 : 36;
  return (
    <button
      type="button"
      onClick={() => { cell.setDirection(spec.dir); if (cell._onMove) cell._onMove(spec.dir); }}
      style={{
        width: size, height: size, margin: 2, padding: 0, boxSizing: 'border-box',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '1px solid #d0d0d0', borderRadius: 6, cursor: 'pointer',
        backgroundColor: active ? '#4a90d9' : '#ffffff',
        color: active ? '#ffffff' : '#666666', fontSize: 16, flexShrink: 0,
      }}
    >
      {spec.glyph}
    </button>
  );
}

/**
 * JoyConCell：方向键面板。direction 记录当前方向（center 为默认）；
 * 页面作者可用 onMove(handler) 注入方向回调（handler(dir)）。
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
      .renderContent(JoyConView);
  }

  /**
   * 注入方向回调：点击任意方向键时调用 handler(dir)。
   * @param {(dir: string) => void} handler 方向回调
   * @returns {JoyConCell} self（链式）
   */
  onMove(handler) {
    this._onMove = handler;
    return this;
  }
}

export { JoyConCell };
