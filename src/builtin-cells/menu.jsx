/**
 * @file menu.jsx —— MenuCell（菜单）高级 Cell
 *
 * 按钮族：菜单 = 按钮列表（见 docs/basic-cell-design.md）。
 * 组装 fallback：MenuImpl —— items.map(ButtonImpl)（基础 Cell 按钮的实现
 * 组件），纵向为菜单、横向为标签栏（TabBarCell 的组装来源，多级依赖）。
 * 主题可经 theme.components.menu 整体重写呈现实现。
 *
 * Schema（数据契约，与旧版一致）：items（[{id, title, icon?}]）/ selected。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { useThemeColor } from '../core/theme/theme-react';
import { ButtonImpl } from '../basic-cells/button';

/**
 * 菜单实现组件（组装自 ButtonImpl）：items 渲染为按钮列/行，点击回调选中项。
 * 纵向（菜单）：通栏左对齐大按钮，选中项 primary 变体；
 * 横向（标签栏，供 TabBarCell 组装复用）：均分行，选中项 primary 变体。
 * @param {Object} props
 * @param {Array<{id: string, title: string, icon?: string}>} props.items 菜单项
 * @param {string} props.activeId 当前选中项 id
 * @param {'vertical'|'horizontal'} [props.direction='vertical'] 排列方向
 * @param {(id: string) => void} props.onSelect 选中回调
 * @returns {JSX.Element} 菜单元素
 */
function MenuImpl({ items, activeId, direction = 'vertical', onSelect }) {
  const surfaceMuted = useThemeColor('surface-muted', '#f0f0f0');
  const horizontal = direction === 'horizontal';
  return (
    <div style={{
      width: '100%', height: '100%', boxSizing: 'border-box',
      display: 'flex', flexDirection: horizontal ? 'row' : 'column',
    }}>
      {(items || []).map((item) => {
        const active = activeId === item.id;
        const btn = (
          <ButtonImpl
            label={item.title}
            icon={item.icon}
            type={active ? 'primary' : 'default'}
            size={horizontal ? 'default' : 'large'}
            block
            align={horizontal ? 'center' : 'left'}
            onPress={() => onSelect(item.id)}
          />
        );
        return horizontal ? (
          <div key={item.id} style={{ flex: 1, minWidth: 0, display: 'flex' }}>{btn}</div>
        ) : (
          <div key={item.id} style={{ borderBottom: `1px solid ${surfaceMuted}` }}>{btn}</div>
        );
      })}
    </div>
  );
}

/**
 * 菜单组装视图（fallback）：纵向 MenuImpl，点击写入 selected。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function MenuAssembledView({ cell }) {
  const items = useCellData(cell, 'items') || [];
  const selected = useCellData(cell, 'selected');
  return (
    <div style={{ width: '100%', height: '100%', overflowY: 'auto' }}>
      <MenuImpl items={items} activeId={selected} direction="vertical" onSelect={id => cell.setSelected(id)} />
    </div>
  );
}

/** kind 'menu' 的实现分发视图 */
const MenuDispatcher = createImplDispatcher('menu', MenuAssembledView);

/**
 * MenuCell：菜单（高级 Cell，按钮族）。items 为菜单项数据（含可选 icon 字形），
 * selected 记录当前选中项 id（点击写入，选中项主色高亮）。纵向布局、可滚动。
 * 呈现实现由 kind 'menu' 分发（缺省为按钮组装版）。
 */
class MenuCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.layout('vertical').moveY(true).color('surface')
      .schema({
        items: { type: 'array', default: [] },
        selected: { type: 'string', default: '' },
      })
      .renderContent(MenuDispatcher);
  }
}

export { MenuCell, MenuImpl, MenuAssembledView };
