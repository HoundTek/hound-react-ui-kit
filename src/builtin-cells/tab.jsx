/**
 * @file tab.jsx —— TabCell（标签页）高级 Cell
 *
 * 按钮族（多级依赖）：标签页 = 页标签栏 + 内容区（按钮 → 菜单 → 页标签栏 →
 * 标签页，见 docs/basic-cell-design.md）。
 * 组装 fallback：TabBarImpl（依赖 tab-bar 的组装实现，三级依赖）渲染
 * tabs 头，下方内容区展示激活 tab 的 content（pre-wrap 多行文本）。
 * 主题可经 theme.components.tab 整体重写呈现实现。
 *
 * Schema（数据契约，与旧版一致）：tabs（[{id, title, content}]）/ activeId。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';
import { useThemeColor } from '../core/theme/theme-react';
import { TabBarImpl } from './tab-bar';

/**
 * 标签页组装视图（fallback）：TabBarImpl 渲染标签头（tabs → items 映射），
 * 内容区展示激活 tab 的 content。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function TabAssembledView({ cell }) {
  const tabs = useCellData(cell, 'tabs') || [];
  const activeId = useCellData(cell, 'activeId');
  const activeTab = tabs.find(t => t.id === activeId) || null;
  const content = useText(activeTab ? activeTab.content : '');
  const border = useThemeColor('border', '#e8e8e8');
  const textMuted = useThemeColor('text-muted', '#999');
  const text = useThemeColor('text', '#444');
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flexShrink: 0, height: 36, boxSizing: 'border-box', borderBottom: `1px solid ${border}` }}>
        {tabs.length === 0 ? (
          <div style={{
            height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, color: textMuted,
          }}>
            暂无标签
          </div>
        ) : (
          <TabBarImpl
            items={tabs.map(t => ({ id: t.id, title: t.title }))}
            activeId={activeId}
            onChange={id => cell.setActiveId(id)}
          />
        )}
      </div>
      <div style={{
        flex: 1, minHeight: 0, padding: 12, fontSize: 13, color: text,
        whiteSpace: 'pre-wrap', lineHeight: 1.7, overflowWrap: 'break-word',
        boxSizing: 'border-box', overflowY: 'auto',
      }}>
        {content}
      </div>
    </div>
  );
}

/** kind 'tab' 的实现分发视图 */
const TabDispatcher = createImplDispatcher('tab', TabAssembledView);

/**
 * TabCell：标签页（高级 Cell，按钮族）。tabs 为 [{id, title, content}]
 * （title/content 可存 i18n key 或纯文本），activeId 为当前激活 tab id
 * （点击标签头切换）；tabs 为空时头部显示占位。
 * 呈现实现由 kind 'tab' 分发（缺省为页标签栏组装版）。
 */
class TabCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(120).moveY(true).layout('vertical').color('surface')
      .schema({
        tabs: { type: 'array', default: [] },
        activeId: { type: 'string', default: '' },
      })
      .renderContent(TabDispatcher);
  }
}

export { TabCell, TabAssembledView };
