/**
 * @file alert.jsx —— AlertCell（警示条）预设
 *
 * 展示内嵌提示条：type 决定配色与字形（info/success/warning/error），
 * text 存 i18n key 或纯文本；closable 时右侧 ✕ 可关闭（visible=false 后不再渲染）。
 * 固定高度 40，常用于页面顶部或表单上方的提示区域。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';

/**
 * 警示条视图：订阅 type/text/closable/visible；visible=false 时不渲染。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function AlertView({ cell }) {
  const type = useCellData(cell, 'type');
  const text = useText(useCellData(cell, 'text'));
  const closable = useCellData(cell, 'closable');
  const visible = useCellData(cell, 'visible');
  if (!visible) return null;
  const typeMap = {
    info: { bg: '#e8f0fa', fg: '#2a6da8', glyph: 'ℹ' },
    success: { bg: '#e6f5ea', fg: '#1a7a3a', glyph: '✓' },
    warning: { bg: '#fdf3e0', fg: '#a0601a', glyph: '!' },
    error: { bg: '#fbe9e7', fg: '#b03a2a', glyph: '✕' },
  };
  const t = typeMap[type] || typeMap.info;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px',
      width: '100%', height: '100%', fontSize: 13, color: t.fg, backgroundColor: t.bg,
    }}>
      <span style={{ fontWeight: 'bold', flexShrink: 0 }}>{t.glyph}</span>
      <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{text}</span>
      {closable ? (
        <span
          onClick={() => cell.setVisible(false)}
          style={{ flexShrink: 0, cursor: 'pointer', fontWeight: 'bold', userSelect: 'none' }}
        >
          ✕
        </span>
      ) : null}
    </div>
  );
}

/**
 * AlertCell：警示条。type 决定配色与字形（info/success/warning/error）；
 * text 存 i18n key 或纯文本；closable 显示右侧 ✕，点击关闭（visible=false）。
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
      .renderContent(AlertView);
  }
}

export { AlertCell };
