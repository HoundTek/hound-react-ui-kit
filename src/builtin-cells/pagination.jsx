/**
 * @file pagination.jsx —— PaginationCell（分页）预设
 *
 * 分页条：total/pageSize 计算总页数 pages，‹ 上一页 / 页码 / 下一页 ›
 * 三个区段；点击页码写入 current 并调用注入的 _onChange(page) 回调
 * （页面作者经 onChange 注入），边界（首/末页）按钮禁用。当前页主色高亮。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';

const BTN_BASE = {
  minWidth: 26, height: 26, padding: '0 6px', boxSizing: 'border-box',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  border: '1px solid #d9d9d9', borderRadius: 4, backgroundColor: '#ffffff',
  color: '#333333', fontSize: 13, cursor: 'pointer', userSelect: 'none',
};

/**
 * 分页视图：订阅 total/pageSize/current，点击页码/翻页写入 current 并回调 _onChange。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function PaginationView({ cell }) {
  const total = useCellData(cell, 'total');
  const pageSize = useCellData(cell, 'pageSize');
  const current = useCellData(cell, 'current');
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const go = (page) => {
    if (page < 1 || page > pages) return;
    cell.setCurrent(page);
    if (cell._onChange) cell._onChange(page);
  };
  const pageNumbers = [];
  for (let p = 1; p <= pages; p++) pageNumbers.push(p);
  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', alignItems: 'center',
      justifyContent: 'center', gap: 6,
    }}>
      <button
        type="button"
        disabled={current <= 1}
        onClick={() => go(current - 1)}
        style={{ ...BTN_BASE, ...(current <= 1 ? { opacity: 0.5, cursor: 'not-allowed' } : {}) }}
      >
        ‹
      </button>
      {pageNumbers.map((p) => {
        const active = p === current;
        return (
          <button
            key={p}
            type="button"
            onClick={() => go(p)}
            style={{
              ...BTN_BASE,
              ...(active
                ? { backgroundColor: '#4a90d9', borderColor: '#4a90d9', color: '#ffffff' }
                : {}),
            }}
          >
            {p}
          </button>
        );
      })}
      <button
        type="button"
        disabled={current >= pages}
        onClick={() => go(current + 1)}
        style={{ ...BTN_BASE, ...(current >= pages ? { opacity: 0.5, cursor: 'not-allowed' } : {}) }}
      >
        ›
      </button>
    </div>
  );
}

/**
 * PaginationCell：分页。total 为数据总数，pageSize 为每页条数（默认 10），
 * current 为当前页；页面作者可用 onChange(handler) 注入回调（handler(page)），
 * 边界页按钮自动禁用。
 */
class PaginationCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(36).backgroundColor('#ffffff')
      .schema({
        total: { type: 'number', default: 0 },
        pageSize: { type: 'number', default: 10 },
        current: { type: 'number', default: 1 },
      })
      .renderContent(PaginationView);
  }

  /**
   * 注入页码变更回调：点击页码或翻页按钮时调用 handler(page)。
   * @param {(page: number) => void} handler 页码变更回调
   * @returns {PaginationCell} self（链式）
   */
  onChange(handler) {
    this._onChange = handler;
    return this;
  }
}

export { PaginationCell };