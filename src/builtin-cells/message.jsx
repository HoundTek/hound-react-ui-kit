/**
 * @file message.jsx —— MessageCell（消息条）高级 Cell
 *
 * 浮层族：消息条 = NoticeImpl（族内共享公告条实现，见 docs/basic-cell-design.md）
 * 的浮层形态（非胶囊 + 投影）。type 决定底色与字形（info/success/warning/error），
 * text 存 i18n key 或纯文本；duration（ms）非空时定时 close() 自动消失。
 * 与 ToastCell 的区别：宽度更大（320）、非胶囊。
 * 主题可经 theme.components.message 整体重写呈现实现。
 * 位置由页面作者用 posX/posY 指定。
 *
 * Schema（数据契约，与旧版一致）：text / type / duration。
 */
import React, { useEffect } from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { NoticeImpl } from './notice';

/**
 * 消息条组装视图（fallback）：NoticeImpl 非胶囊 + 投影；
 * duration 非空时定时调用 cell.close()。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function MessageAssembledView({ cell }) {
  const text = useCellData(cell, 'text');
  const type = useCellData(cell, 'type');
  const duration = useCellData(cell, 'duration');
  useEffect(() => {
    if (!duration || !cell._mounts[0]) return;
    const timer = setTimeout(() => cell.close(), duration);
    return () => clearTimeout(timer);
  }, [duration, cell]);
  return <NoticeImpl text={text} type={type} elevated />;
}

/** kind 'message' 的实现分发视图 */
const MessageDispatcher = createImplDispatcher('message', MessageAssembledView);

/**
 * MessageCell：消息条（高级 Cell，浮层族，浮动视口）。默认固定尺寸、不可移动/缩放；
 * type 决定底色（info/success/warning/error），text 存 i18n key 或纯文本，
 * duration（ms）非空时自动关闭。位置由页面作者用 posX/posY 指定。
 * 呈现实现由 kind 'message' 分发（缺省为 NoticeImpl 组装版）。
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
      .renderContent(MessageDispatcher);
  }
}

export { MessageCell, MessageAssembledView };
