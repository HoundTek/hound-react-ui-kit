/**
 * @file search.jsx —— SearchCell（搜索框）预设
 *
 * 搜索输入框：placeholder 存 i18n key 或纯文本（默认「搜索…」），
 * value 为输入内容；按 Enter 或点击右侧「搜索」按钮触发搜索。
 * 页面作者经 onSearch(handler) 注入回调（返回 this），触发时以
 * 当前输入值调用。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';

/**
 * 搜索视图：订阅 placeholder/value；input 受控写入 value，
 * Enter 或点击「搜索」按钮时调用 cell._onSearch(value)。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function SearchView({ cell }) {
  const placeholder = useText(useCellData(cell, 'placeholder'));
  const value = useCellData(cell, 'value') || '';
  const doSearch = () => {
    if (cell._onSearch) cell._onSearch(value);
  };
  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', alignItems: 'center',
      padding: '0 8px', gap: 8, backgroundColor: '#fff',
    }}>
      <input
        value={value}
        placeholder={placeholder}
        onChange={e => cell.setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') doSearch(); }}
        style={{
          flex: 1, minWidth: 0, height: '100%', border: 'none', outline: 'none',
          fontSize: 13, color: '#333', backgroundColor: 'transparent',
        }}
      />
      <div
        onClick={doSearch}
        style={{
          flexShrink: 0, padding: '0 12px', height: 28, display: 'flex',
          alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          backgroundColor: '#4a90d9', color: '#fff', fontSize: 13,
          borderRadius: 4, userSelect: 'none',
        }}
      >搜索</div>
    </div>
  );
}

/**
 * SearchCell：搜索框。placeholder 存 i18n key 或纯文本（默认「搜索…」），
 * value 为输入内容；onSearch(handler) 注入回调，Enter 或点击按钮时
 * 以当前输入值触发。固定高 40。
 */
class SearchCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(40).backgroundColor('#ffffff')
      .schema({
        placeholder: { type: 'string', default: '搜索…' },
        value: { type: 'string', default: '' },
      })
      .renderContent(SearchView);
  }

  /**
   * 注入搜索回调。
   * @param {(value: string) => void} handler 搜索回调
   * @returns {SearchCell} this，支持链式
   */
  onSearch(handler) {
    this._onSearch = handler;
    return this;
  }
}

export { SearchCell };