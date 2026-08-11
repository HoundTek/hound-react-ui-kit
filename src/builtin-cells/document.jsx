/**
 * @file document.jsx —— DocumentCell（文档查看）预设
 *
 * 只读文档视图：content 存多行文本（i18n key 或纯文本），按 pre-wrap 渲染
 * 保留换行与空白，行高 1.6 便于阅读。纵向可滚动，适合说明/正文展示。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';

/**
 * 文档视图：订阅 content，按段落渲染（pre-wrap 保留换行，行高 1.6，内边距 12x16）。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function DocumentView({ cell }) {
  const content = useText(useCellData(cell, 'content'));
  return (
    <div style={{
      width: '100%', height: '100%', boxSizing: 'border-box',
      whiteSpace: 'pre-wrap', lineHeight: 1.6, padding: '12px 16px',
      fontSize: 13, color: '#333',
    }}>
      {content}
    </div>
  );
}

/**
 * DocumentCell：文档查看。content 存多行文本（i18n key 或纯文本），
 * pre-wrap 渲染保留换行。纵向可滚动，适合长文本阅读。
 */
class DocumentCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.moveY(true).minHeight(120).defaultWidth(300).backgroundColor('#ffffff')
      .schema({ content: { type: 'string', default: '' } })
      .renderContent(DocumentView);
  }
}

export { DocumentCell };
