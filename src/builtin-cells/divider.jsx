/**
 * @file divider.jsx —— DividerCell（分隔线）预设
 *
 * 展示分隔线：orientation 为 horizontal 时渲染水平线（text 非空时嵌入居中文本），
 * vertical 时渲染垂直线。color 控制线色。帧尺寸由父布局分配，
 * 视图在帧内居中渲染线体。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';

/**
 * 分隔线视图：按 orientation 渲染水平/垂直线，text 非空时嵌入居中文本。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function DividerView({ cell }) {
  const text = useText(useCellData(cell, 'text'));
  const orientation = useCellData(cell, 'orientation');
  const color = useCellData(cell, 'color');
  if (orientation === 'vertical') {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: 1, height: '100%', backgroundColor: color }} />
      </div>
    );
  }
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px' }}>
      <div style={{ flex: 1, height: 1, backgroundColor: color }} />
      {text ? <span style={{ fontSize: 12, color: '#999', whiteSpace: 'nowrap' }}>{text}</span> : null}
      {text ? <div style={{ flex: 1, height: 1, backgroundColor: color }} /> : null}
    </div>
  );
}

/**
 * DividerCell：分隔线。orientation 为 horizontal/vertical；
 * horizontal 时 text 非空显示居中文本；color 为线色。
 */
class DividerCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.defaultHeight(24)
      .schema({
        text: { type: 'string', default: '' },
        orientation: { type: 'string', default: 'horizontal' },
        color: { type: 'string', default: '#e0e0e0' },
      })
      .renderContent(DividerView);
  }
}

export { DividerCell };
