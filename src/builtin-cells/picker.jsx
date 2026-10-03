/**
 * @file picker.jsx —— PickerCell（选择器）高级 Cell
 *
 * 菜单/列表族：选择器 = 受控 SelectImpl（ButtonImpl 输入条 + MenuImpl 下拉
 * 菜单，见 docs/basic-cell-design.md）；与 select 的区别在 open 状态由
 * schema 驱动（受控模式），便于外部数据驱动展开/收起。
 * 主题可经 theme.components.picker 整体重写呈现实现。
 *
 * Schema（数据契约，与旧版一致）：options / value / placeholder / open。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { SelectImpl } from './select';

/**
 * 选择器组装视图（fallback）：SelectImpl 受控模式——open 来自 schema，
 * onToggle 写回 open，onChange 写回 value（SelectImpl 选中后自行收起）。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function PickerAssembledView({ cell }) {
  const options = useCellData(cell, 'options') || [];
  const value = useCellData(cell, 'value');
  const placeholder = useCellData(cell, 'placeholder');
  const open = useCellData(cell, 'open');
  return (
    <SelectImpl
      options={options}
      value={value}
      placeholder={placeholder}
      open={open}
      onToggle={o => cell.setOpen(o)}
      onChange={id => cell.setValue(id)}
    />
  );
}

/** kind 'picker' 的实现分发视图 */
const PickerDispatcher = createImplDispatcher('picker', PickerAssembledView);

/**
 * PickerCell：选择器。options 为 [{id, title}] 候选列表，value 存选中项 id
 * （未选时为 ''），placeholder 为占位文本（i18n key 或纯文本），
 * open 控制下拉展开状态。点击输入框展开/收起，点击选项选中并收起。
 * 呈现实现由 kind 'picker' 分发（缺省为受控 SelectImpl 组装版）。
 */
class PickerCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(40).color('surface')
      .schema({
        options: { type: 'array', default: [] },
        value: { type: 'string', default: '' },
        placeholder: { type: 'string', default: '请选择' },
        open: { type: 'boolean', default: false },
      })
      .renderContent(PickerDispatcher);
  }
}

export { PickerCell, PickerAssembledView };
