/**
 * @file picker.jsx —— PickerCell（选择器）预设
 *
 * 自定义展开的选择器：输入框显示当前选中项标题或占位文本，点击后
 * 下方展开选项列表（覆盖浮层）。value 存选中项 id，open 控制展开状态，
 * options 为 [{id, title}] 列表，title 存 i18n key 或纯文本。
 * 不用原生 select，便于自定义外观与交互。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';

/**
 * 选中项标题：订阅 item.title 的 i18n 翻译（仅在列表内查找命中时渲染）。
 * @param {{item: object}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function SelectedLabel({ item }) {
  const title = useText(item.title);
  return <span>{title}</span>;
}

/**
 * 单个选项行：订阅 item.title 的 i18n 翻译；点击写入 value 并收起列表，
 * 选中项以主色高亮。value 由父视图经 props 传入，避免在 map 内调 hook。
 * @param {{cell: CellBaseBuilder, item: object, value: string}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function OptionRow({ cell, item, value }) {
  const title = useText(item.title);
  const active = value === item.id;
  return (
    <div
      onClick={() => { cell.setValue(item.id); cell.setOpen(false); }}
      style={{
        height: 34, padding: '0 12px', display: 'flex', alignItems: 'center',
        fontSize: 13, cursor: 'pointer', userSelect: 'none',
        color: active ? '#4a90d9' : '#333',
        backgroundColor: active ? 'rgba(74,144,217,0.10)' : '#fff',
        fontWeight: active ? 'bold' : 'normal',
      }}
    >
      {title}
    </div>
  );
}

/**
 * 选择器视图：订阅 options/value/placeholder/open。点击输入框切换 open，
 * open 时下方绝对定位展开选项列表（每项高 34）。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function PickerView({ cell }) {
  const options = useCellData(cell, 'options') || [];
  const value = useCellData(cell, 'value');
  const placeholder = useText(useCellData(cell, 'placeholder'));
  const open = useCellData(cell, 'open');
  const current = options.find(o => o.id === value);
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div
        onClick={() => cell.setOpen(!open)}
        style={{
          height: '100%', padding: '0 12px', display: 'flex', alignItems: 'center',
          gap: 8, cursor: 'pointer', userSelect: 'none', fontSize: 13,
          color: current ? '#333' : '#999', backgroundColor: '#fff',
        }}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {current ? <SelectedLabel item={current} /> : placeholder}
        </span>
        <span style={{ fontSize: 10, color: '#999', transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
          backgroundColor: '#fff', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          overflow: 'hidden', padding: '4px 0',
        }}>
          {options.map(o => <OptionRow key={o.id} cell={cell} item={o} value={value} />)}
        </div>
      )}
    </div>
  );
}

/**
 * PickerCell：选择器。options 为 [{id, title}] 候选列表，value 存选中项 id
 * （未选时为 ''），placeholder 为占位文本（i18n key 或纯文本），
 * open 控制下拉展开状态。点击输入框展开/收起，点击选项选中并收起。
 */
class PickerCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(40).backgroundColor('#ffffff')
      .schema({
        options: { type: 'array', default: [] },
        value: { type: 'string', default: '' },
        placeholder: { type: 'string', default: '请选择' },
        open: { type: 'boolean', default: false },
      })
      .renderContent(PickerView);
  }
}

export { PickerCell };
