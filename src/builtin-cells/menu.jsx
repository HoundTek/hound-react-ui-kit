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
import React, { useEffect, useRef, useState } from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { useThemeColor } from '../core/theme/theme-react';
import { ButtonImpl } from '../basic-cells/button';

/**
 * 菜单实现组件（组装自 ButtonImpl）：items 渲染为按钮列/行，点击回调选中项。
 * 纵向（菜单）：通栏左对齐大按钮，选中项 primary 变体；
 * 横向（标签栏，供 TabBarCell 组装复用）：均分行，选中项 primary 变体。
 * 键盘导航（WAI-ARIA）：容器 role（缺省 menu）承载 onKeyDown；纵向方向键
 * 仅在项间移动焦点（环绕），Enter/Space 经原生按钮 click 走与鼠标相同的
 * onSelect 路径；横向（标签栏）方向键移动焦点并即时激活（自动激活模式）；
 * Home/End 跳首/尾项。roving tabindex：当前焦点项（缺省选中项，无选中则
 * 首项）tabIndex=0，其余 -1。ButtonImpl 未透传 role/tabIndex/aria 属性，
 * 故渲染后经容器 ref 同步到各 <button> DOM（React 不回收未设置的属性）。
 * @param {Object} props
 * @param {Array<{id: string, title: string, icon?: string}>} props.items 菜单项
 * @param {string} props.activeId 当前选中项 id
 * @param {'vertical'|'horizontal'} [props.direction='vertical'] 排列方向
 * @param {(id: string) => void} props.onSelect 选中回调
 * @param {string} [props.role='menu'] 容器 ARIA 角色（listbox/tablist 等由组装方覆盖）
 * @param {string} [props.itemRole='menuitem'] 项 ARIA 角色（option/tab 等由组装方覆盖）
 * @returns {JSX.Element} 菜单元素
 */
function MenuImpl({ items, activeId, direction = 'vertical', onSelect, role = 'menu', itemRole = 'menuitem' }) {
  const surfaceMuted = useThemeColor('surface-muted', '#f0f0f0');
  const horizontal = direction === 'horizontal';
  const containerRef = useRef(null);
  const [focusedId, setFocusedId] = useState(null);
  const list = items || [];

  // 渲染后同步项角色 / roving tabindex / aria-selected 到各按钮 DOM
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const btns = root.querySelectorAll('button');
    const roving = (focusedId && list.some(it => it.id === focusedId))
      ? focusedId
      : (list.some(it => it.id === activeId) ? activeId : (list[0] ? list[0].id : null));
    btns.forEach((btn, i) => {
      const item = list[i];
      if (!item) return;
      btn.setAttribute('role', itemRole);
      btn.tabIndex = item.id === roving ? 0 : -1;
      if (itemRole === 'option' || itemRole === 'tab') {
        btn.setAttribute('aria-selected', item.id === activeId ? 'true' : 'false');
      }
    });
  }, [items, activeId, itemRole, focusedId]);

  const indexFromEvent = (e) => {
    const root = containerRef.current;
    if (!root) return -1;
    const btn = e.target && e.target.closest ? e.target.closest('button') : null;
    return Array.from(root.querySelectorAll('button')).indexOf(btn);
  };

  const onKeyDown = (e) => {
    const idx = indexFromEvent(e);
    if (idx < 0 || list.length === 0) return;
    const step = horizontal
      ? (e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0)
      : (e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0);
    let target = -1;
    if (step) target = (idx + step + list.length) % list.length;
    else if (e.key === 'Home') target = 0;
    else if (e.key === 'End') target = list.length - 1;
    if (target < 0) return;
    e.preventDefault();
    const root = containerRef.current;
    root.querySelectorAll('button')[target].focus();
    // 横向（标签栏）：方向键即切换激活项，与鼠标点击同一 onSelect 路径；
    // 纵向（菜单/下拉）：仅移动焦点，Enter/Space 由原生按钮 click 激活
    if (horizontal) onSelect(list[target].id);
  };

  const onFocus = (e) => {
    const idx = indexFromEvent(e);
    if (idx >= 0 && list[idx]) setFocusedId(list[idx].id);
  };

  return (
    <div ref={containerRef} role={role} onKeyDown={onKeyDown} onFocus={onFocus} style={{
      width: '100%', height: '100%', boxSizing: 'border-box',
      display: 'flex', flexDirection: horizontal ? 'row' : 'column',
    }}>
      {list.map((item) => {
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
 * 滚动由 Box 内容层承担（MenuCell moveY(true)），本视图不再开内部滚动——
 * 否则滚动发生在视图层，Box 层浮动滚动条测不到可滚动量而不显示。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function MenuAssembledView({ cell }) {
  const items = useCellData(cell, 'items') || [];
  const selected = useCellData(cell, 'selected');
  return (
    <div style={{ width: '100%' }}>
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
    this.layout('vertical').moveY(true)
      .schema({
        items: { type: 'array', default: [] },
        selected: { type: 'string', default: '' },
      })
      .renderContent(MenuDispatcher);
  }
}

export { MenuCell, MenuImpl, MenuAssembledView };
