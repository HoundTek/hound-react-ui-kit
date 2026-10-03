/**
 * @file icon.jsx —— IconCell（图标）高级 Cell
 *
 * 展示族：图标（见 docs/basic-cell-design.md）。
 * 双实现机制（kind: 'icon'）：组装 fallback（IconAssembledView）优先按内建
 * 命名图标（SVG 固定几何，跨浏览器一致）渲染，未命中按文本字形渲染
 *（字形随浏览器字体，尺寸可能有差异）；主题可经 theme.components.icon 整体重写。
 *
 * Schema（数据契约，与旧版一致）：glyph / size / color。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';

/**
 * 内建命名图标（SVG path，24×24 viewBox）：以固定几何绘制，
 * 避免文本字形随浏览器字体渲染产生尺寸差异。
 * @type {Object<string, string>}
 */
const BUILTIN_GLYPHS = {
  star: 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
};

/**
 * 图标组装视图（fallback）：订阅 glyph/size/color，居中渲染。
 * glyph 命中内建命名图标（如 'star'）时渲染 SVG，否则按文本字形渲染。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function IconAssembledView({ cell }) {
  const glyph = useCellData(cell, 'glyph');
  const size = useCellData(cell, 'size');
  const color = useCellData(cell, 'color');
  const path = BUILTIN_GLYPHS[glyph];
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {path ? (
        <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block' }} aria-hidden="true">
          <path d={path} fill={color} />
        </svg>
      ) : (
        <span style={{ fontSize: size, fontFamily: 'inherit', color, lineHeight: 1, userSelect: 'none' }}>{glyph}</span>
      )}
    </div>
  );
}

/** kind 'icon' 的实现分发视图 */
const IconDispatcher = createImplDispatcher('icon', IconAssembledView);

/**
 * IconCell：图标（高级 Cell，展示族）。glyph 为内建命名图标（'star'，
 * SVG 渲染）或单字符字形（如 ●，文本渲染）；size/color 控制外观；
 * 页面作者可直接替换 glyph。呈现实现由 kind 'icon' 分发。
 */
class IconCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedWidth(24).fixedHeight(24)
      .schema({
        glyph: { type: 'string', default: '●' },
        size: { type: 'number', default: 16 },
        color: { type: 'string', default: '#333333' },
      })
      .renderContent(IconDispatcher);
  }
}

export { IconCell, IconAssembledView };
