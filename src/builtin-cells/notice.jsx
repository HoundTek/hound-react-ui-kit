/**
 * @file notice.jsx —— NoticeCell（公告条）预设
 *
 * 非浮动公告条：text（i18n key 或纯文本）横向居中展示，type 决定底色与字形
 * （info/success/warning/error）；closable 时右侧显示 ✕，点击写入
 * visible(false) 隐藏。与 AlertCell 的区别：更扁（高 36）、无边框圆角、
 * 内容居中，适合页内公告。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';

/**
 * 公告条视图：订阅 text/type/closable/visible，visible 为 false 时不渲染，
 * 关闭按钮写入 visible(false)。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function NoticeView({ cell }) {
  const text = useText(useCellData(cell, 'text'));
  const type = useCellData(cell, 'type');
  const closable = useCellData(cell, 'closable');
  const visible = useCellData(cell, 'visible');
  if (!visible) return null;
  const typeMap = {
    info: { color: '#4a90d9', glyph: 'ℹ' },
    success: { color: '#1a8a4a', glyph: '✓' },
    warning: { color: '#c07a1a', glyph: '!' },
    error: { color: '#c03a2a', glyph: '✕' },
  };
  const t = typeMap[type] || typeMap.info;
  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', alignItems: 'center',
      justifyContent: 'center', gap: 8, padding: '0 12px', boxSizing: 'border-box',
      backgroundColor: t.color, color: '#ffffff', fontSize: 12,
    }}>
      <span style={{ fontWeight: 'bold' }}>{t.glyph}</span>
      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{text}</span>
      {closable ? (
        <span
          onClick={() => cell.setVisible(false)}
          style={{ marginLeft: 'auto', cursor: 'pointer', userSelect: 'none', fontWeight: 'bold' }}
        >
          ✕
        </span>
      ) : null}
    </div>
  );
}

/**
 * NoticeCell：公告条（非浮动）。text 存 i18n key 或纯文本，type 决定底色与字形；
 * closable 为 true 时显示关闭按钮，visible 控制可见性（false 时不渲染）。
 */
class NoticeCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(36).layout('horizontal')
      .schema({
        text: { type: 'string', default: '' },
        type: { type: 'string', default: 'info' },
        closable: { type: 'boolean', default: false },
        visible: { type: 'boolean', default: true },
      })
      .renderContent(NoticeView);
  }
}

export { NoticeCell };