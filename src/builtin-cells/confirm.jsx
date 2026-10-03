/**
 * @file confirm.jsx —— ConfirmCell（确认对话框）高级 Cell
 *
 * 浮层族（按钮组装）：确认框 = TextImpl 文本 + ButtonImpl 确定/取消按钮
 *（见 docs/basic-cell-design.md）。text 为消息（i18n key 或纯文本），
 * okText/cancelText 为按钮文案；确定触发 onOk(fn) 注入的回调并关闭，
 * 取消直接关闭。主题可经 theme.components.confirm 整体重写呈现实现。
 * 位置由页面作者 posX/posY 指定。
 *
 * Schema（数据契约，与旧版一致）：text / okText / cancelText。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { ButtonImpl, TextImpl } from '../basic-cells';

/**
 * 确认框组装视图（fallback）：TextImpl 消息文本 + ButtonImpl 取消/确定按钮，
 * 确定触发注入回调并 close()，取消直接 close()。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function ConfirmAssembledView({ cell }) {
  const text = useCellData(cell, 'text');
  const okText = useCellData(cell, 'okText');
  const cancelText = useCellData(cell, 'cancelText');
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      width: '100%', height: '100%', padding: '16px 16px 12px', boxSizing: 'border-box',
    }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', minHeight: 0 }}>
        <TextImpl text={text} size={14} color="text" />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
        <ButtonImpl label={cancelText} type="default" size="small" onPress={() => cell.close()} />
        <ButtonImpl
          label={okText}
          type="primary"
          size="small"
          onPress={() => { if (cell._onOk) cell._onOk(); cell.close(); }}
        />
      </div>
    </div>
  );
}

/** kind 'confirm' 的实现分发视图 */
const ConfirmDispatcher = createImplDispatcher('confirm', ConfirmAssembledView);

/**
 * ConfirmCell：确认对话框（高级 Cell，浮层族，浮动视口）。text 为消息文案，
 * okText/cancelText 为按钮文案（默认 确定/取消）；确定触发 onOk(fn) 注入的回调
 * 并 close()，取消直接 close()。位置由页面作者 posX/posY 指定。
 * 呈现实现由 kind 'confirm' 分发（缺省为文本 + 按钮组装版）。
 */
class ConfirmCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.floatingViewport().movable(false).resizable(false)
      .fixedWidth(280).fixedHeight(120).styleRole('window').layout('vertical')
      .schema({
        text: { type: 'string', default: '' },
        okText: { type: 'string', default: '确定' },
        cancelText: { type: 'string', default: '取消' },
      })
      .renderContent(ConfirmDispatcher);
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

export { ConfirmCell, ConfirmAssembledView };
