/**
 * @file result.jsx —— ResultCell（结果页）预设
 *
 * 居中结果展示：status 决定图标与配色（success/error/warning/info），
 * title 加粗 16px、desc 灰色 13px。title/desc 存 i18n key 或纯文本。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';

/**
 * 结果视图：订阅 status/title/desc，按状态渲染大图标与文案。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function ResultView({ cell }) {
  const status = useCellData(cell, 'status');
  const title = useText(useCellData(cell, 'title'));
  const desc = useText(useCellData(cell, 'desc'));
  const statusMap = {
    success: { color: '#1a8a4a', glyph: '✓' },
    error: { color: '#c03a2a', glyph: '✕' },
    warning: { color: '#c07a1a', glyph: '!' },
    info: { color: '#4a90d9', glyph: 'ℹ' },
  };
  const s = statusMap[status] || statusMap.info;
  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0 16px',
    }}>
      <div style={{ fontSize: 48, lineHeight: 1, color: s.color, userSelect: 'none' }}>{s.glyph}</div>
      {title ? <div style={{ fontSize: 16, fontWeight: 'bold', color: '#333' }}>{title}</div> : null}
      {desc ? <div style={{ fontSize: 13, color: '#999', textAlign: 'center' }}>{desc}</div> : null}
    </div>
  );
}

/**
 * ResultCell：结果页。status 为 success/error/warning/info（默认 info），
 * title/desc 存 i18n key 或纯文本。默认高 160，居中展示图标与文案。
 */
class ResultCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.defaultHeight(160).backgroundColor('#ffffff')
      .schema({
        status: { type: 'string', default: 'info' },
        title: { type: 'string', default: '' },
        desc: { type: 'string', default: '' },
      })
      .renderContent(ResultView);
  }
}

export { ResultCell };