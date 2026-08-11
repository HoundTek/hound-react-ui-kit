/**
 * @file tooltip.jsx —— TooltipCell（提示气泡）预设
 *
 * 浮动视口类型的深色提示气泡：text 存 i18n key 或纯文本（白字居中），
 * 底部小三角指向目标。默认固定宽 140、高度内容撑开（不设 defaultHeight），
 * 不可移动/缩放；位置由页面作者用 posX/posY 指定。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';

/**
 * 气泡视图：订阅 text，渲染深色气泡与底部小三角。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function TooltipView({ cell }) {
  const text = useText(useCellData(cell, 'text'));
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div style={{
        backgroundColor: '#333', color: '#fff', fontSize: 12, lineHeight: 1.5,
        padding: '8px 12px', borderRadius: 6, textAlign: 'center',
      }}>
        {text}
      </div>
      <div style={{
        position: 'absolute', bottom: -4, left: '50%', marginLeft: -4,
        width: 8, height: 8, backgroundColor: '#333', transform: 'rotate(45deg)',
      }} />
    </div>
  );
}

/**
 * TooltipCell：提示气泡（浮动视口）。text 存 i18n key 或纯文本；
 * 默认固定宽 140、高度内容撑开，不可移动/缩放；位置由页面作者用 posX/posY 指定。
 */
class TooltipCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.floatingViewport()
      .movable(false).resizable(false)
      .defaultWidth(140)
      .schema({
        text: { type: 'string', default: '' },
      })
      .renderContent(TooltipView);
  }
}

export { TooltipCell };
