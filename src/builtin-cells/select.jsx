/**
 * @file select.jsx —— SelectCell（下拉选择）预设
 *
 * 原生下拉选择：options 为 [{id, title}] 列表，value 存选中项 id，
 * placeholder 为未选中时的占位文本（i18n key 或纯文本）。
 * 使用原生 <select>，未选中时显示 disabled 占位选项。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';

/**
 * 单个原生选项：订阅 option.title 的 i18n 翻译（拆为子组件，避免在 map 内调 hook）。
 * @param {{option: object}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function SelectOption({ option }) {
  const title = useText(option.title);
  return <option value={option.id}>{title}</option>;
}

/**
 * 下拉选择视图：订阅 options/value/placeholder，受控 select 写入 value。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function SelectView({ cell }) {
  const options = useCellData(cell, 'options') || [];
  const value = useCellData(cell, 'value');
  const placeholder = useText(useCellData(cell, 'placeholder'));
  return (
    <div style={{ width: '100%', height: '100%', padding: '0 8px', display: 'flex', alignItems: 'center' }}>
      <select
        value={value}
        onChange={e => cell.setValue(e.target.value)}
        style={{
          width: '100%', height: 28, border: 'none', outline: 'none',
          fontSize: 13, color: '#333', backgroundColor: '#fff', cursor: 'pointer',
        }}
      >
        {!value ? <option value="" disabled>{placeholder}</option> : null}
        {options.map(o => <SelectOption key={o.id} option={o} />)}
      </select>
    </div>
  );
}

/**
 * SelectCell：下拉选择（原生）。options 为 [{id, title}] 候选列表，
 * value 存选中项 id（未选时为 ''），placeholder 为占位文本（i18n key 或纯文本）。
 * 固定高 40，左右内边距 8px。
 */
class SelectCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(40).backgroundColor('#ffffff')
      .schema({
        options: { type: 'array', default: [] },
        value: { type: 'string', default: '' },
        placeholder: { type: 'string', default: '' },
      })
      .renderContent(SelectView);
  }
}

export { SelectCell };