/**
 * @file search.jsx —— SearchCell（搜索框）高级 Cell
 *
 * 输入族：搜索框 = 文本输入 + 搜索按钮（见 docs/basic-cell-design.md）。
 * 组装 fallback（SearchAssembledView）：InputImpl + ButtonImpl「搜索」，
 * Enter 或点击按钮触发 cell._onSearch(value)。主题可经
 * theme.components.search 整体重写呈现实现。
 *
 * Schema（数据契约，与旧版一致）：placeholder / value。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { useThemeColor } from '../core/theme/theme-react';
import { InputImpl, ButtonImpl } from '../basic-cells';

/**
 * 搜索组装视图（fallback）：InputImpl 受控写入 value，Enter（onSubmit）
 * 或点击「搜索」按钮时调用 cell._onSearch(value)。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function SearchAssembledView({ cell }) {
  const placeholder = useCellData(cell, 'placeholder');
  const value = useCellData(cell, 'value') || '';
  const surface = useThemeColor('surface', '#fff');
  const doSearch = () => {
    if (cell._onSearch) cell._onSearch(value);
  };
  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', alignItems: 'center',
      padding: '0 8px', gap: 8, backgroundColor: surface, boxSizing: 'border-box',
    }}>
      <div style={{ flex: 1, minWidth: 0, height: 28 }}>
        <InputImpl
          value={value}
          placeholder={placeholder}
          fontSize={13}
          onChange={v => cell.setValue(v)}
          onSubmit={doSearch}
        />
      </div>
      <ButtonImpl label="搜索" size="small" onPress={doSearch} />
    </div>
  );
}

/** kind 'search' 的实现分发视图 */
const SearchDispatcher = createImplDispatcher('search', SearchAssembledView);

/**
 * SearchCell：搜索框（高级 Cell，输入族）。placeholder 存 i18n key 或纯文本
 *（默认「搜索…」），value 为输入内容；onSearch(handler) 注入回调，Enter 或
 * 点击按钮时以当前输入值触发。固定高 40。
 * 呈现实现由 kind 'search' 分发（缺省为组装 fallback）。
 */
class SearchCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(40).color('surface')
      .schema({
        placeholder: { type: 'string', default: '搜索…' },
        value: { type: 'string', default: '' },
      })
      .renderContent(SearchDispatcher);
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

export { SearchCell, SearchAssembledView };
