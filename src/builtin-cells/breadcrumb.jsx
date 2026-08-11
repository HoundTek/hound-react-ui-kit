/**
 * @file breadcrumb.jsx —— BreadcrumbCell（面包屑）预设
 *
 * 展示面包屑导航：items 为 [{id, title}] 数组，项间用 separator 分隔；
 * 点击非末项写入 activeId（加粗高亮），末项始终加粗；items 为空不渲染。
 * 固定高度 32，横向单行。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';

/**
 * 面包屑视图：订阅 items/separator/activeId，横向排布项与分隔符。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function BreadcrumbView({ cell }) {
  const items = useCellData(cell, 'items') || [];
  const separator = useCellData(cell, 'separator');
  const activeId = useCellData(cell, 'activeId');
  if (items.length === 0) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', padding: '0 10px',
      width: '100%', height: '100%', overflow: 'hidden',
    }}>
      {items.map((item, i) => (
        <React.Fragment key={item.id}>
          <BreadcrumbItem cell={cell} item={item} isLast={i === items.length - 1} active={item.id === activeId} />
          {i < items.length - 1 ? (
            <span style={{ fontSize: 12, color: '#bbb', padding: '0 6px', flexShrink: 0 }}>{separator}</span>
          ) : null}
        </React.Fragment>
      ))}
    </div>
  );
}

/**
 * 面包屑单项：非末项可点击（写入 activeId），末项或 activeId 命中的项加粗。
 * @param {{cell: CellBaseBuilder, item: Object, isLast: boolean, active: boolean}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function BreadcrumbItem({ cell, item, isLast, active }) {
  const title = useText(item.title);
  const isActive = active || isLast;
  return (
    <span
      onClick={() => cell.setActiveId(item.id)}
      style={{
        fontSize: 12, color: isActive ? '#333' : '#888',
        fontWeight: isActive ? 'bold' : 'normal',
        cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none', flexShrink: 0,
      }}
    >
      {title}
    </span>
  );
}

/**
 * BreadcrumbCell：面包屑。items 为 [{id, title}]（title 存 i18n key 或纯文本）；
 * separator 为项间分隔符（默认 '/'）；activeId 为当前激活项 id，
 * 点击非末项写入 activeId（加粗高亮），末项始终加粗。
 */
class BreadcrumbCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(32)
      .schema({
        items: { type: 'array', default: [] },
        separator: { type: 'string', default: '/' },
        activeId: { type: 'string', default: '' },
      })
      .renderContent(BreadcrumbView);
  }
}

export { BreadcrumbCell };
