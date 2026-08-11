/**
 * @file editor.jsx —— EditorCell（多行编辑）预设
 *
 * 多行文本编辑：content 为编辑内容（受控，onChange 写回），placeholder 为占位提示
 * （i18n key 或纯文本），底部实时显示字数。纵向布局：textarea 占满可编辑区，
 * 字数小字沉底。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';

/**
 * 多行编辑视图：订阅 content/placeholder，textarea 变更写回 content。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function EditorView({ cell }) {
  const content = useCellData(cell, 'content');
  const placeholder = useText(useCellData(cell, 'placeholder'));
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', width: '100%', height: '100%',
      backgroundColor: '#ffffff', overflow: 'hidden',
    }}>
      <textarea
        value={content}
        placeholder={placeholder}
        onChange={(e) => cell.setContent(e.target.value)}
        style={{
          flex: 1, width: '100%', padding: '8px 10px', boxSizing: 'border-box',
          border: 'none', outline: 'none', resize: 'none', fontSize: 13,
          lineHeight: 1.6, color: '#333', backgroundColor: 'transparent',
        }}
      />
      <div style={{
        padding: '2px 10px 6px', fontSize: 11, color: '#999',
        textAlign: 'right', flexShrink: 0,
      }}>
        {content.length} 字
      </div>
    </div>
  );
}

/**
 * EditorCell：多行编辑。content 为编辑内容（受控），placeholder 为占位提示，
 * 底部实时显示字数。
 */
class EditorCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.layout('vertical').minHeight(120).defaultWidth(280).backgroundColor('#ffffff')
      .schema({
        content: { type: 'string', default: '' },
        placeholder: { type: 'string', default: '' },
      })
      .renderContent(EditorView);
  }
}

export { EditorCell };