/**
 * @file tab-bar.jsx —— TabBarCell（页标签栏）高级 Cell
 *
 * 按钮族（多级依赖）：页标签栏 = 横向菜单（按钮 → 菜单 → 页标签栏，
 * 见 docs/basic-cell-design.md）。
 * 组装 fallback：TabBarImpl —— MenuImpl 横向变体（依赖 menu 的组装实现，
 * 二级依赖）。主题可经 theme.components['tab-bar'] 整体重写呈现实现。
 *
 * Schema（数据契约，与旧版一致）：items（[{id, title, icon?}]）/ activeId。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { devWarn } from '../core/runtime';
import { MenuImpl } from './menu';

/**
 * 页标签栏实现组件（组装自 MenuImpl 横向变体）：均分标签项，激活项
 * primary 变体高亮，点击回调切换。
 * @param {Object} props
 * @param {Array<{id: string, title: string, icon?: string}>} props.items 标签项
 * @param {string} props.activeId 当前激活项 id
 * @param {(id: string) => void} props.onChange 切换回调
 * @returns {JSX.Element} 标签栏元素
 */
function TabBarImpl({ items, activeId, onChange }) {
  return (
    <MenuImpl items={items} activeId={activeId} direction="horizontal" onSelect={onChange} />
  );
}

/**
 * 页标签栏组装视图（fallback）：TabBarImpl，点击写回 activeId 并触发 'select' 事件。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function TabBarAssembledView({ cell }) {
  const items = useCellData(cell, 'items') || [];
  const activeId = useCellData(cell, 'activeId');
  return (
    <TabBarImpl
      items={items}
      activeId={activeId}
      onChange={(id) => {
        cell.setActiveId(id);
        cell.emit('select', id);
      }}
    />
  );
}

/** kind 'tab-bar' 的实现分发视图 */
const TabBarDispatcher = createImplDispatcher('tab-bar', TabBarAssembledView);

/**
 * TabBarCell：页标签栏（高级 Cell，按钮族）。items 为 [{id, title, icon?}]
 * （title 可存 i18n key 或纯文本），activeId 为当前激活项 id。
 * 事件语义统一（见 docs/improvement-plan.md）：激活项变更属"选中项变更"，
 * 规范回调为 onSelect(handler)（等价 on('select', handler)）；
 * onChange 为废弃别名，保留一个 major 版本过渡。
 * 呈现实现由 kind 'tab-bar' 分发（缺省为横向菜单组装版）。
 */
class TabBarCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(48).color('surface')
      .schema({
        items: { type: 'array', default: [] },
        activeId: { type: 'string', default: '' },
      })
      .renderContent(TabBarDispatcher);
  }

  /**
   * 注册标签选择回调（规范命名）：点击标签项时调用 handler(id)。
   * @param {(id: string) => void} handler 标签选择回调
   * @returns {TabBarCell} self（链式）
   */
  onSelect(handler) {
    this.on('select', handler);
    return this;
  }

  /**
   * @deprecated 语义漂移别名（激活项变更属 select 而非 change），
   * 请改用 onSelect(handler)。保留一个 major 版本过渡。
   * @param {(id: string) => void} handler 标签选择回调
   * @returns {TabBarCell} self（链式）
   */
  onChange(handler) {
    devWarn('[TabBarCell]', 'onChange 已废弃（语义为选中项变更），请改用 onSelect');
    this.on('select', handler);
    return this;
  }
}

export { TabBarCell, TabBarImpl, TabBarAssembledView };
