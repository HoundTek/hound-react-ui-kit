/**
 * @file alert.jsx —— AlertCell（警示条）高级 Cell
 *
 * 浮层族：警示条 = NoticeImpl（族内共享公告条实现，见 docs/basic-cell-design.md）
 * 的内联形态（非胶囊、无投影）。type 决定配色与字形（info/success/warning/error），
 * text 存 i18n key 或纯文本；closable 时右侧 ✕ 可关闭（visible=false 后不再渲染）。
 * 主题可经 theme.components.alert 整体重写呈现实现。
 * 固定高度 40，常用于页面顶部或表单上方的提示区域。
 *
 * Schema（数据契约，与旧版一致）：type / text / closable / visible。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { NoticeImpl } from './notice';

/**
 * 警示条组装视图（fallback）：NoticeImpl 内联样式；visible=false 时不渲染，
 * 关闭钮写入 visible(false)。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element|null} 视图元素
 */
function AlertAssembledView({ cell }) {
  const type = useCellData(cell, 'type');
  const text = useCellData(cell, 'text');
  const closable = useCellData(cell, 'closable');
  const visible = useCellData(cell, 'visible');
  if (!visible) return null;
  return <NoticeImpl text={text} type={type} closable={closable} onClose={() => cell.setVisible(false)} />;
}

/** kind 'alert' 的实现分发视图 */
const AlertDispatcher = createImplDispatcher('alert', AlertAssembledView);

/**
 * AlertCell：警示条（高级 Cell，浮层族，非浮动）。type 决定配色与字形
 *（info/success/warning/error）；text 存 i18n key 或纯文本；closable 显示右侧 ✕，
 * 点击关闭（visible=false）。
 * 呈现实现由 kind 'alert' 分发（缺省为 NoticeImpl 内联组装版）。
 */
class AlertCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(40)
      .schema({
        type: { type: 'string', default: 'info' },
        text: { type: 'string', default: '' },
        closable: { type: 'boolean', default: false },
        visible: { type: 'boolean', default: true },
      })
      .renderContent(AlertDispatcher);
  }
}

export { AlertCell, AlertAssembledView };
