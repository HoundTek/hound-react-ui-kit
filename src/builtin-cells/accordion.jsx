/**
 * @file accordion.jsx —— AccordionCell（手风琴）预设
 *
 * 折叠面板列表：items 为 [{id, title, content}]，activeId 为当前展开项 id；
 * 点击标题行展开/收起（再次点击同一项收起置 ''），展开时渲染 content 文本。
 * 帧内纵向滚动（moveY true），标题行固定高 36。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';

/**
 * 手风琴单项：订阅项内 title/content（i18n key 或纯文本），点击标题切换展开状态。
 * @param {{cell: CellBaseBuilder, item: object, active: boolean}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function AccordionItemView({ cell, item, active }) {
  const title = useText(item.title);
  const content = useText(item.content);
  return (
    <div style={{ width: '100%' }}>
      <div
        onClick={() => cell.setActiveId(active ? '' : item.id)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 36, padding: '0 12px', fontSize: 13, cursor: 'pointer', userSelect: 'none',
          color: active ? '#4a90d9' : '#333', fontWeight: active ? 'bold' : 'normal',
          backgroundColor: active ? '#f0f6ff' : '#f7f7f7', borderBottom: '1px solid #e8e8e8',
        }}
      >
        <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
        <span style={{ flexShrink: 0, marginLeft: 8, fontSize: 12 }}>{active ? '▾' : '▸'}</span>
      </div>
      {active ? (
        <div style={{
          padding: '10px 12px', fontSize: 12, color: '#555',
          whiteSpace: 'pre-wrap', borderBottom: '1px solid #e8e8e8',
        }}>
          {content}
        </div>
      ) : null}
    </div>
  );
}

/**
 * 手风琴视图：订阅 items/activeId，渲染可展开/收起的列表。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function AccordionView({ cell }) {
  const items = useCellData(cell, 'items') || [];
  const activeId = useCellData(cell, 'activeId');
  return (
    <div style={{ width: '100%', height: '100%', backgroundColor: '#ffffff' }}>
      {items.map(item => (
        <AccordionItemView key={item.id} cell={cell} item={item} active={item.id === activeId} />
      ))}
    </div>
  );
}

/**
 * AccordionCell：手风琴。items 为 [{id, title, content}]（title/content 可存
 * i18n key 或纯文本）；activeId 为当前展开项 id，再次点击同一项收起。
 */
class AccordionCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.moveY(true).layout('vertical').backgroundColor('#ffffff')
      .schema({
        items: { type: 'array', default: [] },
        activeId: { type: 'string', default: '' },
      })
      .renderContent(AccordionView);
  }
}

export { AccordionCell };