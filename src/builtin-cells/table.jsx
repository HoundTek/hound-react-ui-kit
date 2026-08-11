/**
 * @file table.jsx —— TableCell（表格）预设
 *
 * 数据表格：columns 为 [{key, title, width?}]（title 存 i18n key 或纯文本），
 * rows 为业务数据行（[{id, ...}]），点击行写入 selectedRow（选中行浅蓝底高亮）。
 * 列宽取 column.width 或 flex:1 均分；帧内纵向滚动（moveY true）。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';

/**
 * 表头单元格：接收普通 props（不在 map 内调 hooks），title 经 useText 渲染。
 * @param {{column: object}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function TableHeadCellView({ column }) {
  const title = useText(column.title);
  return (
    <div style={{
      flex: column.width ? 'none' : 1, width: column.width || undefined, minWidth: 0,
      padding: '0 8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    }}>
      {title}
    </div>
  );
}

/**
 * 数据单元格：接收普通 props（不在 map 内调 hooks），行值经 useText 渲染
 * （i18n key 存在则翻译，否则原样显示，数字等值透传）。
 * @param {{column: object, row: object}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function TableCellView({ column, row }) {
  const value = useText(row[column.key]);
  return (
    <div style={{
      flex: column.width ? 'none' : 1, width: column.width || undefined, minWidth: 0,
      padding: '0 8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    }}>
      {value}
    </div>
  );
}

/**
 * 数据行：接收普通 props（不在 map 内调 hooks），点击行写回 selectedRow。
 * @param {{cell: CellBaseBuilder, row: object, columns: object[], selected: boolean}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function TableRowView({ cell, row, columns, selected }) {
  return (
    <div
      onClick={() => cell.setSelectedRow(row.id)}
      style={{
        display: 'flex', alignItems: 'center', height: 32, fontSize: 12,
        cursor: 'pointer', userSelect: 'none',
        backgroundColor: selected ? '#e8f0fa' : '#ffffff',
        borderBottom: '1px solid #eee',
      }}
    >
      {columns.map(col => (
        <TableCellView key={col.key} column={col} row={row} />
      ))}
    </div>
  );
}

/**
 * 表格视图：订阅 columns/rows/selectedRow，渲染表头与数据行。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function TableView({ cell }) {
  const columns = useCellData(cell, 'columns') || [];
  const rows = useCellData(cell, 'rows') || [];
  const selectedRow = useCellData(cell, 'selectedRow');
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <div style={{
        display: 'flex', alignItems: 'center', height: 32, fontSize: 12,
        fontWeight: 'bold', color: '#333', backgroundColor: '#f5f5f5',
        borderBottom: '1px solid #e8e8e8',
      }}>
        {columns.map(col => (
          <TableHeadCellView key={col.key} column={col} />
        ))}
      </div>
      {rows.map(row => (
        <TableRowView key={row.id} cell={cell} row={row} columns={columns} selected={row.id === selectedRow} />
      ))}
    </div>
  );
}

/**
 * TableCell：表格。columns 为 [{key, title, width?}]（title 可存 i18n key 或
 * 纯文本），rows 为业务数据行（[{id, ...}]，其余字段按 column.key 取值），
 * selectedRow 为当前选中行 id（点击行切换，浅蓝底高亮）。
 */
class TableCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.moveY(true).layout('vertical').backgroundColor('#ffffff')
      .schema({
        columns: { type: 'array', default: [] },
        rows: { type: 'array', default: [] },
        selectedRow: { type: 'string', default: '' },
      })
      .renderContent(TableView);
  }
}

export { TableCell };
