/**
 * @file empty.jsx —— EmptyCell（空状态）预设
 *
 * 居中空状态提示：glyph 为占位图形（默认 □，32px 灰色），text 为主文案
 * （14px #666），desc 为辅助说明（12px #999），text/desc 存 i18n key 或纯文本。
 * 展示型预设，页面作者实例化后 setData 即可使用。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';

/**
 * 空状态视图：订阅 glyph/text/desc，纵向居中渲染。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function EmptyView({ cell }) {
  const glyph = useCellData(cell, 'glyph');
  const text = useText(useCellData(cell, 'text'));
  const desc = useText(useCellData(cell, 'desc'));
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 6, width: '100%', height: '100%', backgroundColor: '#ffffff',
      padding: 8, boxSizing: 'border-box', textAlign: 'center',
    }}>
      <div style={{ fontSize: 32, lineHeight: 1, color: '#bbb', userSelect: 'none' }}>{glyph}</div>
      {text ? <div style={{ fontSize: 14, color: '#666' }}>{text}</div> : null}
      {desc ? <div style={{ fontSize: 12, color: '#999' }}>{desc}</div> : null}
    </div>
  );
}

/**
 * EmptyCell：空状态。glyph 为占位图形，text 为主文案，desc 为辅助说明，
 * 纵向居中展示。
 */
class EmptyCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.defaultHeight(140).moveY(true).backgroundColor('#ffffff')
      .schema({
        glyph: { type: 'string', default: '□' },
        text: { type: 'string', default: '' },
        desc: { type: 'string', default: '' },
      })
      .renderContent(EmptyView);
  }
}

export { EmptyCell };