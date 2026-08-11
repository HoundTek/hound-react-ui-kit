/**
 * @file chat.jsx —— ChatCell（聊天）预设
 *
 * 简易聊天：messages 为 [{id, from, text, mine}]，mine 为 true 时右对齐蓝底白字
 * 气泡、否则灰底左对齐（from 小字）；底部输入行发送消息（按钮/Enter），
 * 追加到 messages 并清空输入。帧内纵向滚动（moveY true）。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';

/**
 * 消息气泡：订阅项内 from/text（i18n key 或纯文本），mine 决定对齐与配色。
 * @param {{msg: object}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function ChatMessageView({ msg }) {
  const from = useText(msg.from);
  const text = useText(msg.text);
  const mine = !!msg.mine;
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start',
      alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '80%', marginBottom: 8,
    }}>
      <div style={{ fontSize: 10, color: mine ? '#a8d0f5' : '#999', marginBottom: 2, padding: '0 2px' }}>{from}</div>
      <div style={{
        padding: '6px 10px', borderRadius: 8, fontSize: 13, lineHeight: 1.5,
        backgroundColor: mine ? '#4a90d9' : '#f0f0f0', color: mine ? '#fff' : '#333',
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>
        {text}
      </div>
    </div>
  );
}

/**
 * 聊天视图：订阅 messages/inputValue，渲染消息列表与输入行。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function ChatView({ cell }) {
  const messages = useCellData(cell, 'messages') || [];
  const inputValue = useCellData(cell, 'inputValue');
  const placeholder = useText('输入消息…');
  const sendLabel = useText('发送');
  const send = () => {
    if (!inputValue) return;
    cell.setMessages([...messages, { id: Date.now(), from: 'me', text: inputValue, mine: true }]);
    cell.setInputValue('');
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', backgroundColor: '#ffffff' }}>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column' }}>
        {messages.map(msg => <ChatMessageView key={msg.id} msg={msg} />)}
      </div>
      <div style={{ display: 'flex', gap: 6, padding: '8px 10px', borderTop: '1px solid #eeeeee', flexShrink: 0 }}>
        <input
          value={inputValue}
          placeholder={placeholder}
          onChange={e => cell.setInputValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') send(); }}
          style={{ flex: 1, minWidth: 0, padding: '6px 8px', border: '1px solid #cccccc', borderRadius: 4, fontSize: 13 }}
        />
        <button
          onClick={send}
          style={{
            padding: '6px 14px', border: 'none', borderRadius: 4, flexShrink: 0,
            backgroundColor: '#4a90d9', color: '#fff', fontSize: 13, cursor: 'pointer',
          }}
        >
          {sendLabel}
        </button>
      </div>
    </div>
  );
}

/**
 * ChatCell：聊天。messages 为 [{id, from, text, mine}]（from/text 可存 i18n key
 * 或纯文本）；inputValue 为输入框内容；发送按钮/Enter 追加消息并清空输入。
 */
class ChatCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.moveY(true).layout('vertical').backgroundColor('#ffffff')
      .schema({
        messages: { type: 'array', default: [] },
        inputValue: { type: 'string', default: '' },
      })
      .renderContent(ChatView);
  }
}

export { ChatCell };