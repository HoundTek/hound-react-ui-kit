/**
 * @file order.jsx —— OrderCell（可排序列表）预设
 *
 * 可排序数据列表：items 为 [{id, title, amount}]；表头「名称」「金额」
 * 点击切换排序（同字段切换方向，不同字段设为新字段升序），sortField/
 * sortDir 记录当前排序，金额右对齐。纵向滚动（moveY(true)）。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';

const DIR_GLYPH = { asc: ' ↑', desc: ' ↓' };

/**
 * 排序列表视图：订阅 items/sortField/sortDir，点击表头切换排序并重排数据行。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function OrderView({ cell }) {
  const items = useCellData(cell, 'items') || [];
  const sortField = useCellData(cell, 'sortField');
  const sortDir = useCellData(cell, 'sortDir');
  const toggle = (field) => {
    if (sortField === field) {
      cell.setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      cell.setSortField(field);
      cell.setSortDir('asc');
    }
  };
  const sorted = [...items].sort((a, b) => {
    if (!sortField) return 0;
    let result = 0;
    if (sortField === 'amount') result = (a.amount || 0) - (b.amount || 0);
    else result = String(a.title).localeCompare(String(b.title));
    return sortDir === 'desc' ? -result : result;
  });
  const headCellStyle = (field) => ({
    height: 30, display: 'flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none',
    ...(field === 'amount' ? { justifyContent: 'flex-end', padding: '0 10px', width: 90, flexShrink: 0 } : { flex: 1, padding: '0 10px' }),
  });
  const glyph = (field) => (sortField === field ? DIR_GLYPH[sortDir] || '' : '');
  return (
    <div style={{ width: '100%', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', backgroundColor: '#f5f5f5', fontWeight: 'bold', fontSize: 12, color: '#333333', position: 'sticky', top: 0 }}>
        <div onClick={() => toggle('title')} style={headCellStyle('title')}>名称{glyph('title')}</div>
        <div onClick={() => toggle('amount')} style={headCellStyle('amount')}>金额{glyph('amount')}</div>
      </div>
      {sorted.map((item) => (
        <div key={item.id} style={{ display: 'flex', borderTop: '1px solid #f0f0f0' }}>
          <div style={{
            flex: 1, height: 30, display: 'flex', alignItems: 'center', padding: '0 10px',
            fontSize: 13, color: '#333333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {item.title}
          </div>
          <div style={{
            width: 90, flexShrink: 0, height: 30, display: 'flex', alignItems: 'center',
            justifyContent: 'flex-end', padding: '0 10px', fontSize: 13, color: '#333333',
          }}>
            {item.amount}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * OrderCell：可排序列表。items 为数据行，sortField/sortDir 记录排序状态
 * （点击表头切换：同字段翻转方向，不同字段设为新字段升序）。
 */
class OrderCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.minHeight(100).moveY(true).backgroundColor('#ffffff')
      .schema({
        items: { type: 'array', default: [] },
        sortField: { type: 'string', default: '' },
        sortDir: { type: 'string', default: 'asc' },
      })
      .renderContent(OrderView);
  }
}

export { OrderCell };