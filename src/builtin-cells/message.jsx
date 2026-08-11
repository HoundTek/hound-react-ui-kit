/**
 * @file message.jsx —— MessageCell（消息条）预设
 *
 * 浮动构件（Cell × 浮动视口）：顶部消息条。type 决定底色与字形
 * （info/success/warning/error），text 存 i18n key 或纯文本；
 * duration（ms）非空时定时 close() 自动消失。
 * 与 ToastCell 的区别：宽度更大（320）、非圆角、顶部白色样式条。
 * 位置由页面作者用 posX/posY 指定。
 */
import React, { useEffect } from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';

/**
 * 消息条视图：订阅 text/type/duration；duration 非空时定时调用 cell.close()。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function MessageView({ cell }) {
  const text = useText(useCellData(cell, 'text'));
  const type = useCellData(cell, 'type');
  const duration = useCellData(cell, 'duration');
  useEffect(() => {
    if (!duration || !cell._mounts[0]) return;
    const timer = setTimeout(() => cell.close(), duration);
    return () => clearTimeout(timer);
  }, [duration, cell]);
  const typeMap = {
    info: { color: '#4a90d9', glyph: 'ℹ' },
    success: { color: '#1a8a4a', glyph: '✓' },
    warning: { color: '#c07a1a', glyph: '!' },
    error: { color: '#c03a2a', glyph: '✕' },
  };
  const t = typeMap[type] || typeMap.info;
  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative', overflow: 'hidden',
      color: '#ffffff', fontSize: 13, backgroundColor: t.color,
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, backgroundColor: 'rgba(255,255,255,0.5)' }} />
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', boxSizing: 'border-box' }}>
        <span style={{ fontWeight: 'bold' }}>{t.glyph}</span>
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{text}</span>
      </div>
    </div>
  );
}

/**
 * MessageCell：消息条（浮动视口）。默认固定尺寸、不可移动/缩放；
 * type 决定底色（info/success/warning/error），text 存 i18n key 或纯文本，
 * duration（ms）非空时自动关闭。位置由页面作者用 posX/posY 指定。
 */
class MessageCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.floatingViewport()
      .movable(false).resizable(false)
      .fixedWidth(320).defaultHeight(44)
      .schema({
        text: { type: 'string', default: '' },
        type: { type: 'string', default: 'info' },
        duration: { type: 'number', default: null },
      })
      .renderContent(MessageView);
  }
}

export { MessageCell };