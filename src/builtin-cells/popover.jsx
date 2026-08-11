/**
 * @file popover.jsx —— PopoverCell（气泡提示）预设
 *
 * 浮动视口类型的气泡提示：白底圆角卡片，title 加粗 + text 常规。
 * title/text 存 i18n key 或纯文本；位置由页面作者用 posX/posY 指定，
 * 不可移动、不可缩放。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';

/**
 * 气泡视图：订阅 title/text，title 为空时不渲染标题行。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function PopoverView({ cell }) {
  const title = useText(useCellData(cell, 'title'));
  const text = useText(useCellData(cell, 'text'));
  return (
    <div style={{
      width: '100%', height: '100%', boxSizing: 'border-box', padding: 12,
      display: 'flex', flexDirection: 'column', gap: 4, overflow: 'hidden',
      backgroundColor: '#ffffff', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
    }}>
      {title ? <div style={{ fontSize: 14, fontWeight: 'bold', color: '#333' }}>{title}</div> : null}
      {text ? <div style={{ fontSize: 13, color: '#666', lineHeight: 1.5 }}>{text}</div> : null}
    </div>
  );
}

/**
 * PopoverCell：气泡提示（浮动视口）。白底圆角、投影；title 加粗、text 常规。
 * 默认 180px 宽、64px 高，不可移动/缩放；位置由页面作者用 posX/posY 指定。
 */
class PopoverCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.floatingViewport()
      .movable(false).resizable(false)
      .defaultWidth(180).defaultHeight(64)
      .schema({
        title: { type: 'string', default: '' },
        text: { type: 'string', default: '' },
      })
      .renderContent(PopoverView);
  }
}

export { PopoverCell };