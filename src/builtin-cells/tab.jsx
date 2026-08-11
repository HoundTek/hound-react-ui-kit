/**
 * @file tab.jsx —— TabCell（标签页）预设
 *
 * 标签页容器：tabs 为 [{id, title, content}]，activeId 为当前激活 tab id；
 * 顶部 tab 头横排（高 36，点击切换 activeId），下方内容区渲染激活 tab 的
 * content（pre-wrap 多行文本）。帧内纵向滚动（moveY true）。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';

/**
 * 标签头单项：接收普通 props（不在 map 内调 hooks），title 经 useText 渲染。
 * @param {{tab: object, active: boolean, onClick: Function}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function TabHeadView({ tab, active, onClick }) {
  const title = useText(tab.title);
  return (
    <div
      onClick={onClick}
      style={{
        flex: 1, minWidth: 0, height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', userSelect: 'none', fontSize: 13,
        color: active ? '#4a90d9' : '#666', fontWeight: active ? 'bold' : 'normal',
        borderBottom: active ? '2px solid #4a90d9' : '2px solid transparent',
      }}
    >
      <span style={{ maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
    </div>
  );
}

/**
 * 标签页视图：订阅 tabs/activeId，渲染 tab 头与激活 tab 的内容区。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function TabView({ cell }) {
  const tabs = useCellData(cell, 'tabs') || [];
  const activeId = useCellData(cell, 'activeId');
  const activeTab = tabs.find(t => t.id === activeId) || null;
  const content = useText(activeTab ? activeTab.content : '');
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', flexShrink: 0, height: 36, borderBottom: '1px solid #e8e8e8' }}>
        {tabs.length === 0 ? (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, color: '#999',
          }}>
            暂无标签
          </div>
        ) : (
          tabs.map(tab => (
            <TabHeadView key={tab.id} tab={tab} active={tab.id === activeId} onClick={() => cell.setActiveId(tab.id)} />
          ))
        )}
      </div>
      <div style={{
        flex: 1, padding: 12, fontSize: 13, color: '#444',
        whiteSpace: 'pre-wrap', lineHeight: 1.7, overflowWrap: 'break-word',
      }}>
        {content}
      </div>
    </div>
  );
}

/**
 * TabCell：标签页。tabs 为 [{id, title, content}]（title/content 可存 i18n key
 * 或纯文本），activeId 为当前激活 tab id（点击 tab 头切换）；
 * tabs 为空时头部显示占位。
 */
class TabCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(120).moveY(true).layout('vertical').backgroundColor('#ffffff')
      .schema({
        tabs: { type: 'array', default: [] },
        activeId: { type: 'string', default: '' },
      })
      .renderContent(TabView);
  }
}

export { TabCell };
