/**
 * @file chat.jsx —— ChatCell（聊天）高级 Cell
 *
 * 输入族：聊天 = 消息气泡列表 + 底部输入行（见 docs/basic-cell-design.md）。
 * 组装 fallback（ChatAssembledView）：气泡结构保留（mine 右对齐主色气泡），
 * 色值全部走主题角色；底部 InputImpl + ButtonImpl「发送」（Enter 同效），
 * 追加到 messages 并清空输入。主题可经 theme.components.chat 整体重写
 * 呈现实现。帧内纵向滚动（moveY true）。
 *
 * Schema（数据契约，与旧版一致）：messages / inputValue。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';
import { useThemeColor, useCornerType, useShapeRadius } from '../core/theme/theme-react';
import { cornerStyle } from '../core/theme/shape';
import { InputImpl, ButtonImpl } from '../basic-cells';

/**
 * 消息气泡：订阅项内 from/text（i18n key 或纯文本），mine 决定对齐与配色
 *（全部走主题角色）。
 * @param {{msg: object}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function ChatMessageView({ msg }) {
  const from = useText(msg.from);
  const text = useText(msg.text);
  const mine = !!msg.mine;
  const corner = useCornerType();
  const overlayR = useShapeRadius('overlay', 8);
  const otherFromColor = useThemeColor('text-muted', '#999');
  const mineFromColor = useThemeColor('primary-soft', '#a8d0f5');
  const primaryColor = useThemeColor('primary', '#4a90d9');
  const surfaceMutedColor = useThemeColor('surface-muted', '#f0f0f0');
  const onPrimaryColor = useThemeColor('on-primary', '#fff');
  const textColor = useThemeColor('text', '#333');
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start',
      alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '80%', marginBottom: 8,
      boxSizing: 'border-box',
    }}>
      <div style={{ fontSize: 10, color: mine ? mineFromColor : otherFromColor, marginBottom: 2, padding: '0 2px' }}>{from}</div>
      <div style={{
        padding: '6px 10px', ...cornerStyle(corner, overlayR), fontSize: 13, lineHeight: 1.5,
        boxSizing: 'border-box', maxWidth: '100%',
        backgroundColor: mine ? primaryColor : surfaceMutedColor, color: mine ? onPrimaryColor : textColor,
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>
        {text}
      </div>
    </div>
  );
}

/**
 * 聊天组装视图（fallback）：订阅 messages/inputValue，渲染气泡列表与
 * 底部输入行（InputImpl + ButtonImpl「发送」，Enter 同效）。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function ChatAssembledView({ cell }) {
  const messages = useCellData(cell, 'messages') || [];
  const inputValue = useCellData(cell, 'inputValue');
  const surfaceColor = useThemeColor('surface', '#ffffff');
  const borderColor = useThemeColor('border', '#eeeeee');
  const send = () => {
    if (!inputValue) return;
    cell.setMessages([...messages, { id: Date.now(), from: 'me', text: inputValue, mine: true }]);
    cell.setInputValue('');
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', backgroundColor: surfaceColor }}>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column' }}>
        {messages.map(msg => <ChatMessageView key={msg.id} msg={msg} />)}
      </div>
      <div style={{ display: 'flex', gap: 6, padding: '8px 10px', borderTop: `1px solid ${borderColor}`, boxSizing: 'border-box', flexShrink: 0, alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 0, height: 32 }}>
          <InputImpl
            value={inputValue}
            placeholder="输入消息…"
            fontSize={13}
            onChange={v => cell.setInputValue(v)}
            onSubmit={send}
          />
        </div>
        <ButtonImpl label="发送" onPress={send} />
      </div>
    </div>
  );
}

/** kind 'chat' 的实现分发视图 */
const ChatDispatcher = createImplDispatcher('chat', ChatAssembledView);

/**
 * ChatCell：聊天（高级 Cell，输入族）。messages 为 [{id, from, text, mine}]
 *（from/text 可存 i18n key 或纯文本）；inputValue 为输入框内容；发送按钮
 * /Enter 追加消息并清空输入。
 * 呈现实现由 kind 'chat' 分发（缺省为组装 fallback）。
 */
class ChatCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.moveY(true).layout('vertical').color('surface')
      .schema({
        messages: { type: 'array', default: [] },
        inputValue: { type: 'string', default: '' },
      })
      .renderContent(ChatDispatcher);
  }
}

export { ChatCell, ChatAssembledView };
