/**
 * @file nav-bar.jsx —— NavBarCell（导航栏）预设
 *
 * 顶部导航栏：左侧标题（加粗白字）+ 右侧导航项列表；点击导航项写入
 * activeId 并调用注入的 _onSelect(id) 回调（页面作者经 onSelect 注入），
 * activeId 项以下边框白线高亮。蓝底白字，固定高度 44。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';

/**
 * 导航栏视图：订阅 title/items/activeId，点击导航项写入 activeId 并回调 _onSelect。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function NavBarView({ cell }) {
  const title = useText(useCellData(cell, 'title'));
  const items = useCellData(cell, 'items') || [];
  const activeId = useCellData(cell, 'activeId');
  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', alignItems: 'center',
      padding: '0 12px', boxSizing: 'border-box',
      backgroundColor: '#4a90d9', color: '#ffffff', fontSize: 13,
    }}>
      <div style={{
        fontWeight: 'bold', fontSize: 14, marginRight: 'auto',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {title}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', height: '100%', flexShrink: 0 }}>
        {items.map((item) => {
          const active = activeId === item.id;
          return (
            <div
              key={item.id}
              onClick={() => { cell.setActiveId(item.id); if (cell._onSelect) cell._onSelect(item.id); }}
              style={{
                height: '100%', display: 'flex', alignItems: 'center', padding: '0 10px',
                cursor: 'pointer', userSelect: 'none',
                borderBottom: active ? '2px solid #ffffff' : '2px solid transparent',
                color: active ? '#ffffff' : 'rgba(255,255,255,0.85)',
              }}
            >
              {item.title}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * NavBarCell：导航栏。title 存 i18n key 或纯文本，items 为导航项数组，
 * activeId 记录当前选中项 id（下边框白线高亮）；页面作者可用
 * onSelect(handler) 注入回调（handler(id)）。
 */
class NavBarCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(44).backgroundColor('#4a90d9')
      .schema({
        title: { type: 'string', default: '' },
        items: { type: 'array', default: [] },
        activeId: { type: 'string', default: '' },
      })
      .renderContent(NavBarView);
  }

  /**
   * 注入导航选择回调：点击导航项时调用 handler(id)。
   * @param {(id: string) => void} handler 选择回调
   * @returns {NavBarCell} self（链式）
   */
  onSelect(handler) {
    this._onSelect = handler;
    return this;
  }
}

export { NavBarCell };