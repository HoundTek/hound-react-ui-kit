/**
 * @file confirm.jsx —— ConfirmCell（确认对话框）预设
 *
 * 浮动视口确认框：text 为消息（i18n key 或纯文本），okText/cancelText 为按钮文案；
 * 确定触发 onOk(fn) 注入的回调并关闭，取消直接关闭。位置由页面作者 posX/posY 指定。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';

/**
 * 确认框视图：订阅 text/okText/cancelText，确定/取消按钮关闭并触发回调。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function ConfirmView({ cell }) {
  const text = useText(useCellData(cell, 'text'));
  const okText = useText(useCellData(cell, 'okText'));
  const cancelText = useText(useCellData(cell, 'cancelText'));
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      width: '100%', height: '100%', padding: '16px 16px 12px', boxSizing: 'border-box',
    }}>
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center',
        fontSize: 14, color: '#333', lineHeight: 1.6, whiteSpace: 'pre-wrap',
      }}>
        {text}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
        <button
          onClick={() => cell.close()}
          style={{
            padding: '6px 14px', border: '1px solid #cccccc', borderRadius: 4,
            backgroundColor: '#ffffff', color: '#666', fontSize: 13, cursor: 'pointer',
          }}
        >
          {cancelText}
        </button>
        <button
          onClick={() => { if (cell._onOk) cell._onOk(); cell.close(); }}
          style={{
            padding: '6px 14px', border: '1px solid #4a90d9', borderRadius: 4,
            backgroundColor: '#4a90d9', color: '#ffffff', fontSize: 13, cursor: 'pointer',
          }}
        >
          {okText}
        </button>
      </div>
    </div>
  );
}

/**
 * ConfirmCell：确认对话框（浮动视口）。text 为消息文案，okText/cancelText 为
 * 按钮文案（默认 确定/取消）；确定触发 onOk(fn) 注入的回调并 close()，
 * 取消直接 close()。位置由页面作者 posX/posY 指定。
 */
class ConfirmCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.floatingViewport().movable(false).resizable(false)
      .fixedWidth(280).fixedHeight(120).backgroundColor('#ffffff').layout('vertical')
      .schema({
        text: { type: 'string', default: '' },
        okText: { type: 'string', default: '确定' },
        cancelText: { type: 'string', default: '取消' },
      })
      .renderContent(ConfirmView);
  }

  /**
   * 注入确认回调。点击确定时调用（随后自动 close()）。
   * @param {Function} handler 确认回调
   * @returns {ConfirmCell} self（链式）
   */
  onOk(handler) {
    this._onOk = handler;
    return this;
  }
}

export { ConfirmCell };