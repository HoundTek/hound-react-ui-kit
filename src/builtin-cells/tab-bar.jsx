/**
 * @file tab-bar.jsx —— TabBarCell（标签栏）预设
 *
 * 底部标签栏：items 为 [{id, title, icon?}]，activeId 为当前激活项 id；
 * 点击项写入 activeId 并调用注入的 _onChange(id) 回调（页面作者经 onChange 注入）。
 * 各项横向均分（flex:1），激活项主色字 + 顶部 2px 主色条。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';

/**
 * 标签栏单项：接收普通 props（不在 map 内调 hooks），title 经 useText 渲染。
 * @param {{item: object, active: boolean, onClick: Function}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function TabBarItemView({ item, active, onClick }) {
  const title = useText(item.title);
  return (
    <div
      onClick={onClick}
      style={{
        flex: 1, minWidth: 0, height: '100%',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
        cursor: 'pointer', userSelect: 'none', fontSize: 12,
        color: active ? '#4a90d9' : '#888',
        borderTop: active ? '2px solid #4a90d9' : '2px solid transparent',
      }}
    >
      {item.icon ? <span style={{ lineHeight: 1, flexShrink: 0 }}>{item.icon}</span> : null}
      <span style={{ maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
    </div>
  );
}

/**
 * 标签栏视图：订阅 items/activeId，点击项写回 activeId 并回调 _onChange。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function TabBarView({ cell }) {
  const items = useCellData(cell, 'items') || [];
  const activeId = useCellData(cell, 'activeId');
  const select = (id) => {
    cell.setActiveId(id);
    if (cell._onChange) cell._onChange(id);
  };
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex' }}>
      {items.map(item => (
        <TabBarItemView key={item.id} item={item} active={item.id === activeId} onClick={() => select(item.id)} />
      ))}
    </div>
  );
}

/**
 * TabBarCell：标签栏。items 为 [{id, title, icon?}]（title 可存 i18n key 或
 * 纯文本），activeId 为当前激活项 id；页面作者可用 onChange(handler) 注入
 * 回调（handler(id)）。
 */
class TabBarCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(48).backgroundColor('#ffffff')
      .schema({
        items: { type: 'array', default: [] },
        activeId: { type: 'string', default: '' },
      })
      .renderContent(TabBarView);
  }

  /**
   * 注入标签切换回调：点击标签项时调用 handler(id)。
   * @param {(id: string) => void} handler 标签切换回调
   * @returns {TabBarCell} self（链式）
   */
  onChange(handler) {
    this._onChange = handler;
    return this;
  }
}

export { TabBarCell };
