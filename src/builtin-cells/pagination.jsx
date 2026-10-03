/**
 * @file pagination.jsx —— PaginationCell（分页）高级 Cell
 *
 * 按钮族：分页 = 按钮行（见 docs/basic-cell-design.md）。
 * 组装 fallback：ButtonImpl 排成一行（左箭头上一页 / 页码 / 右箭头下一页），
 * 当前页 type 'primary' 其余 'default'，边界（首/末页）按钮禁用；
 * 点击写入 current 并调用注入的 _onChange(page) 回调（页面作者经
 * onChange 注入）。主题可经 theme.components.pagination 整体重写。
 *
 * Schema（数据契约，与旧版一致）：total / pageSize / current。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { ButtonImpl } from '../basic-cells';
import { GlyphChevron } from '../basic-cells/glyphs';

/**
 * 分页组装视图（fallback）：ButtonImpl 页码行，点击写入 current 并回调 _onChange。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function PaginationAssembledView({ cell }) {
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
      justifyContent: 'center', gap: 6, overflowX: 'auto', boxSizing: 'border-box',
    }}>
      <ButtonImpl
        label=""
        icon={<GlyphChevron dir="left" size={12} />}
        type="default"
        size="small"
        disabled={current <= 1}
        onPress={() => go(current - 1)}
      />
      {pageNumbers.map(p => (
        <ButtonImpl
          key={p}
          label={String(p)}
          type={p === current ? 'primary' : 'default'}
          size="small"
          onPress={() => go(p)}
        />
      ))}
      <ButtonImpl
        label=""
        icon={<GlyphChevron dir="right" size={12} />}
        type="default"
        size="small"
        disabled={current >= pages}
        onPress={() => go(current + 1)}
      />
    </div>
  );
}

/** kind 'pagination' 的实现分发视图 */
const PaginationDispatcher = createImplDispatcher('pagination', PaginationAssembledView);

/**
 * PaginationCell：分页（高级 Cell，按钮族）。total 为数据总数，pageSize 为
 * 每页条数（默认 10），current 为当前页；页面作者可用 onChange(handler)
 * 注入回调（handler(page)），边界页按钮自动禁用。
 * 呈现实现由 kind 'pagination' 分发（缺省为按钮组装版）。
 */
class PaginationCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(36).color('surface')
      .schema({
        total: { type: 'number', default: 0 },
        pageSize: { type: 'number', default: 10 },
        current: { type: 'number', default: 1 },
      })
      .renderContent(PaginationDispatcher);
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

export { PaginationCell, PaginationAssembledView };
