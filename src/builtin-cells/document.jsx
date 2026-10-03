/**
 * @file document.jsx —— DocumentCell（文档查看）高级 Cell
 *
 * 展示族：只读文档视图（见 docs/basic-cell-design.md）。
 * 双实现机制（kind: 'document'）：组装 fallback（DocumentAssembledView）按
 * pre-wrap 渲染多行文本（保留换行与空白，行高 1.6 便于阅读，TextImpl 为单行
 * 截断排版故不复用）；主题可经 theme.components.document 整体重写。
 *
 * Schema（数据契约，与旧版一致）：content。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';
import { useThemeColor } from '../core/theme/theme-react';

/**
 * 文档组装视图（fallback）：订阅 content，按段落渲染（pre-wrap 保留换行，行高 1.6，内边距 12x16）。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function DocumentAssembledView({ cell }) {
  const content = useText(useCellData(cell, 'content'));
  const textColor = useThemeColor('text', '#333');
  return (
    <div style={{
      width: '100%', height: '100%', boxSizing: 'border-box',
      whiteSpace: 'pre-wrap', lineHeight: 1.6, padding: '12px 16px',
      fontSize: 13, color: textColor,
    }}>
      {content}
    </div>
  );
}

/** kind 'document' 的实现分发视图 */
const DocumentDispatcher = createImplDispatcher('document', DocumentAssembledView);

/**
 * DocumentCell：文档查看（高级 Cell，展示族）。content 存多行文本（i18n key 或
 * 纯文本），pre-wrap 渲染保留换行。纵向可滚动，适合长文本阅读。
 * 呈现实现由 kind 'document' 分发。
 */
class DocumentCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.moveY(true).minHeight(120).defaultWidth(300).color('surface')
      .schema({ content: { type: 'string', default: '' } })
      .renderContent(DocumentDispatcher);
  }
}

export { DocumentCell, DocumentAssembledView };
