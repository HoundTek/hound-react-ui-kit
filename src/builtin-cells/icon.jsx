/**
 * @file icon.jsx —— IconCell（图标）预设
 *
 * 展示图标字形：glyph 为单字符字形（如 ★ → ● 等），size/color 控制外观。
 * 预设以文本字形实现，不依赖图标字体或图片资源；页面作者可直接替换 glyph。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';

/**
 * 图标视图：订阅 glyph/size/color，居中渲染字形。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function IconView({ cell }) {
  const glyph = useCellData(cell, 'glyph');
  const size = useCellData(cell, 'size');
  const color = useCellData(cell, 'color');
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: size, color, lineHeight: 1, userSelect: 'none' }}>{glyph}</span>
    </div>
  );
}

/**
 * IconCell：图标。glyph 为字形文本，size/color 控制外观。
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
      .renderContent(IconView);
  }
}

export { IconCell };
