/**
 * @file menu.jsx —— MenuCell（菜单）预设
 *
 * 纵向菜单列表：items 为 [{id, title, icon?}]，icon 非空时在标题前
 * 显示字形；点击项写入 selected 并以蓝底白字高亮。纵向滚动（moveY(true)）。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';

/**
 * 菜单视图：订阅 items/selected，纵向渲染菜单项，点击写入 selected。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function MenuView({ cell }) {
  const items = useCellData(cell, 'items') || [];
  const selected = useCellData(cell, 'selected');
  return (
    <div style={{ width: '100%', height: '100%', overflowY: 'auto' }}>
      {items.map((item) => {
        const active = selected === item.id;
        return (
          <div
            key={item.id}
            onClick={() => cell.setSelected(item.id)}
            style={{
              height: 40, display: 'flex', alignItems: 'center', gap: 8,
              padding: '0 12px', boxSizing: 'border-box', cursor: 'pointer',
              backgroundColor: active ? '#4a90d9' : '#ffffff',
              color: active ? '#ffffff' : '#333333', fontSize: 13,
              borderBottom: '1px solid #f0f0f0', userSelect: 'none',
            }}
          >
            {item.icon ? (
              <span style={{ width: 18, flexShrink: 0, textAlign: 'center', fontSize: 14 }}>{item.icon}</span>
            ) : null}
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * MenuCell：菜单。items 为菜单项数据（含可选 icon 字形），selected 记录
 * 当前选中项 id（点击写入并以蓝底白字高亮）。纵向布局、可滚动。
 */
class MenuCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.layout('vertical').moveY(true).backgroundColor('#ffffff')
      .schema({
        items: { type: 'array', default: [] },
        selected: { type: 'string', default: '' },
      })
      .renderContent(MenuView);
  }
}

export { MenuCell };