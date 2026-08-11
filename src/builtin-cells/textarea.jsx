/**
 * @file textarea.jsx —— TextareaCell（多行文本域）预设
 *
 * 多行文本输入：label 存 i18n key 或纯文本（顶部灰小字，存在时渲染），
 * placeholder 为占位提示，value 实时写入数据（onChange 数据驱动交互）。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';

/**
 * 文本域视图：订阅 label/placeholder/value，onChange 即时写回 value。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function TextareaView({ cell }) {
  const label = useText(useCellData(cell, 'label'));
  const placeholder = useText(useCellData(cell, 'placeholder'));
  const value = useCellData(cell, 'value');
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', padding: '8px 10px',
      width: '100%', height: '100%', boxSizing: 'border-box',
    }}>
      {label ? <div style={{ fontSize: 12, color: '#888', marginBottom: 6, flexShrink: 0 }}>{label}</div> : null}
      <textarea
        value={value}
        placeholder={placeholder}
        onChange={e => cell.setValue(e.target.value)}
        style={{
          flex: 1, width: '100%', resize: 'none', padding: 8, boxSizing: 'border-box',
          border: '1px solid #ccc', borderRadius: 4, fontSize: 13, color: '#333',
          fontFamily: 'inherit', outline: 'none',
        }}
      />
    </div>
  );
}

/**
 * TextareaCell：多行文本域。label/placeholder 支持 i18n key 或纯文本，
 * value 实时写入数据。
 */
class TextareaCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(88).backgroundColor('#ffffff')
      .schema({
        label: { type: 'string', default: '' },
        placeholder: { type: 'string', default: '' },
        value: { type: 'string', default: '' },
      })
      .renderContent(TextareaView);
  }
}

export { TextareaCell };
