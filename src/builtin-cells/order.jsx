/**
 * @file order.jsx —— OrderCell（可排序列表）高级 Cell
 *
 * 菜单/列表族：可排序数据列表（见 docs/basic-cell-design.md）。items 为
 * [{id, title, amount}]；表头为 ButtonImpl 排序按钮（当前排序字段显示
 * SVG 三角方向标记），点击切换排序（同字段切换方向，不同字段设为新字段升序），
 * sortField/sortDir 记录当前排序，金额右对齐。纵向滚动（moveY(true)）。
 * 主题可经 theme.components.order 整体重写呈现实现。
 *
 * Schema（数据契约，与旧版一致）：items / sortField / sortDir。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { useThemeColor } from '../core/theme/theme-react';
import { ButtonImpl } from '../basic-cells/button';
import { GlyphTriangle } from '../basic-cells/glyphs';

/**
 * 排序列表组装视图（fallback）：订阅 items/sortField/sortDir，
 * 点击表头 ButtonImpl 切换排序并重排数据行。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function OrderAssembledView({ cell }) {
  const items = useCellData(cell, 'items') || [];
  const sortField = useCellData(cell, 'sortField');
  const sortDir = useCellData(cell, 'sortDir');
  const surfaceMuted = useThemeColor('surface-muted', '#f5f5f5');
  const rowBorder = useThemeColor('border', '#f0f0f0');
  const text = useThemeColor('text', '#333333');
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
  const dirIcon = (field) => (sortField === field
    ? <GlyphTriangle dir={sortDir === 'desc' ? 'down' : 'up'} size={10} />
    : null);
  return (
    <div style={{ width: '100%', height: '100%', overflowY: 'auto' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4, padding: '3px 4px',
        backgroundColor: surfaceMuted, position: 'sticky', top: 0,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <ButtonImpl
            label="名称"
            icon={dirIcon('title')}
            type="default"
            size="small"
            block
            align="left"
            onPress={() => toggle('title')}
          />
        </div>
        <div style={{ width: 90, flexShrink: 0 }}>
          <ButtonImpl
            label="金额"
            icon={dirIcon('amount')}
            type="default"
            size="small"
            block
            onPress={() => toggle('amount')}
          />
        </div>
      </div>
      {sorted.map((item) => (
        <div key={item.id} style={{ display: 'flex', boxSizing: 'border-box', borderTop: `1px solid ${rowBorder}` }}>
          <div style={{
            flex: 1, height: 30, display: 'flex', alignItems: 'center', padding: '0 10px',
            fontSize: 13, color: text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {item.title}
          </div>
          <div style={{
            width: 90, flexShrink: 0, height: 30, display: 'flex', alignItems: 'center',
            justifyContent: 'flex-end', padding: '0 10px', fontSize: 13, color: text,
          }}>
            {item.amount}
          </div>
        </div>
      ))}
    </div>
  );
}

/** kind 'order' 的实现分发视图 */
const OrderDispatcher = createImplDispatcher('order', OrderAssembledView);

/**
 * OrderCell：可排序列表。items 为数据行，sortField/sortDir 记录排序状态
 * （点击表头切换：同字段翻转方向，不同字段设为新字段升序）。
 * 呈现实现由 kind 'order' 分发（缺省为按钮组装版）。
 */
class OrderCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.minHeight(100).moveY(true).color('surface')
      .schema({
        items: { type: 'array', default: [] },
        sortField: { type: 'string', default: '' },
        sortDir: { type: 'string', default: 'asc' },
      })
      .renderContent(OrderDispatcher);
  }
}

export { OrderCell, OrderAssembledView };
