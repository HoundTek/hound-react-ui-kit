/**
 * @file nav-bar.jsx —— NavBarCell（导航栏）高级 Cell
 *
 * 顶部导航栏：左侧标题（加粗白字）+ 右侧导航项列表；点击导航项写入
 * activeId 并调用注入的 _onSelect(id) 回调（页面作者经 onSelect 注入），
 * activeId 项以下边框白线高亮。底色取主题角色样式表 styles.nav（普适配置级），
 * 文字取 on-primary 颜色角色，固定高度 44。
 *
 * 双实现机制（kind 'nav-bar'）：主题可经 theme.components['nav-bar'] 声明
 * 重写实现整体替换；未声明时渲染 NavBarAssembledView（组装 fallback，
 * 保留原有呈现逻辑）。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';
import { useThemeColor } from '../core/theme/theme-react';

/**
 * 导航项视图：接收普通 props（不在 map 内调 hooks），title 经 useText 渲染
 *（可传 i18n key 或纯文本）。
 * @param {{item: object, active: boolean, onSelect: Function, onPrimary: string}} props 组件属性
 * @returns {JSX.Element} 导航项元素
 */
function NavItemView({ item, active, onSelect, onPrimary }) {
  const title = useText(item.title);
  return (
    <div
      onClick={() => onSelect(item.id)}
      style={{
        height: '100%', display: 'flex', alignItems: 'center', padding: '0 10px',
        boxSizing: 'border-box', cursor: 'pointer', userSelect: 'none', fontSize: 13,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        borderBottom: active ? `2px solid ${onPrimary}` : '2px solid transparent',
        color: active ? onPrimary : 'rgba(255,255,255,0.85)',
      }}
    >
      <span style={{ minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{title}</span>
    </div>
  );
}

/**
 * 导航栏组装视图（fallback）：订阅 title/items/activeId，点击导航项写入
 * activeId 并回调 _onSelect。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function NavBarAssembledView({ cell }) {
  const title = useText(useCellData(cell, 'title'));
  const items = useCellData(cell, 'items') || [];
  const activeId = useCellData(cell, 'activeId');
  const primary = useThemeColor('primary', '#4a90d9');
  const onPrimary = useThemeColor('on-primary', '#ffffff');
  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', alignItems: 'center',
      padding: '0 12px', boxSizing: 'border-box',
      backgroundColor: primary, color: onPrimary, fontSize: 13,
    }}>
      <div style={{
        fontWeight: 'bold', fontSize: 14, marginRight: 'auto',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {title}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', height: '100%', flexShrink: 0 }}>
        {items.map((item) => (
          <NavItemView
            key={item.id}
            item={item}
            active={activeId === item.id}
            onPrimary={onPrimary}
            onSelect={(id) => { cell.setActiveId(id); if (cell._onSelect) cell._onSelect(id); }}
          />
        ))}
      </div>
    </div>
  );
}

/** kind 'nav-bar' 的实现分发视图 */
const NavBarDispatcher = createImplDispatcher('nav-bar', NavBarAssembledView);

/**
 * NavBarCell：导航栏（高级 Cell，按钮族）。title 存 i18n key 或纯文本，
 * items 为导航项数组，activeId 记录当前选中项 id（下边框白线高亮）；
 * 页面作者可用 onSelect(handler) 注入回调（handler(id)）。
 * 呈现实现由 kind 'nav-bar' 分发（缺省为 NavBarAssembledView）。
 */
class NavBarCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    // 底色由主题角色样式表 styles.nav 兜底（普适配置级），Cell 只声明组件角色
    this.fixedHeight(44).styleRole('nav')
      .schema({
        title: { type: 'string', default: '' },
        items: { type: 'array', default: [] },
        activeId: { type: 'string', default: '' },
      })
      .renderContent(NavBarDispatcher);
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

export { NavBarCell, NavBarAssembledView };