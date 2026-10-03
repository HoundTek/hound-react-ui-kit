/**
 * @file checkbox.jsx —— CheckboxCell（复选框）高级 Cell
 *
 * 按钮族：复选框 = 按压 + 状态标记（见 docs/basic-cell-design.md）。
 * OptionImpl 为族内共享实现组件（纯受控，ButtonImpl 组装：icon 为状态标记，
 * 缺省按 shape 渲染共享 SVG 字形 GlyphCheckbox/GlyphRadio），供 radio 等
 * 选项类 Cell 复用。
 * 主题可经 theme.components.checkbox 整体重写呈现实现。
 *
 * Schema（数据契约，与旧版一致）：label / checked / disabled。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { ButtonImpl } from '../basic-cells/button';
import { GlyphCheckbox, GlyphRadio } from '../basic-cells/glyphs';

/**
 * 选项实现组件（纯受控，组装自 ButtonImpl）：按压行 + 状态标记 + label。
 * 状态标记：未传 markOn/markOff 时按 shape 渲染共享 SVG 字形（颜色继承
 * 父级 color）；传入 markOn/markOff 时按文本渲染（向后兼容自定义标记，
 * 文本 span 显式字号并继承全局字体）。
 * @param {Object} props
 * @param {string} props.label 选项文本（i18n key 或纯文本）
 * @param {boolean} props.checked 是否选中
 * @param {string} [props.markOn] 选中态自定义文本标记（传入则按文本渲染）
 * @param {string} [props.markOff] 未选中态自定义文本标记
 * @param {'checkbox'|'radio'} [props.shape='checkbox'] SVG 标记形状
 * @param {boolean} [props.disabled=false] 是否禁用
 * @param {() => void} [props.onToggle] 点击切换回调
 * @returns {JSX.Element} 选项行元素
 */
function OptionImpl({ label, checked, markOn, markOff, shape = 'checkbox', disabled = false, onToggle }) {
  const customMark = markOn != null || markOff != null;
  const icon = customMark
    ? <span style={{ fontSize: 14, fontFamily: 'inherit' }}>{checked ? (markOn ?? '') : (markOff ?? '')}</span>
    : (shape === 'radio'
      ? <GlyphRadio checked={checked} size={16} />
      : <GlyphCheckbox checked={checked} size={16} />);
  return (
    <div style={{ padding: '4px 12px', width: '100%', height: '100%', boxSizing: 'border-box', display: 'flex', alignItems: 'center' }}>
      <ButtonImpl
        label={label}
        icon={icon}
        type="default"
        block
        align="left"
        disabled={disabled}
        onPress={onToggle}
      />
    </div>
  );
}

/**
 * 复选框组装视图（fallback）：OptionImpl（SVG 复选标记），点击切换 checked。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function CheckboxAssembledView({ cell }) {
  const label = useCellData(cell, 'label');
  const checked = useCellData(cell, 'checked');
  const disabled = useCellData(cell, 'disabled');
  return (
    <OptionImpl
      label={label}
      checked={checked}
      disabled={disabled}
      onToggle={() => cell.setChecked(!checked)}
    />
  );
}

/** kind 'checkbox' 的实现分发视图 */
const CheckboxDispatcher = createImplDispatcher('checkbox', CheckboxAssembledView);

/**
 * CheckboxCell：复选框（高级 Cell，按钮族）。label 存 i18n key 或纯文本；
 * checked 为选中状态；disabled 禁用（点击不响应）。
 * 呈现实现由 kind 'checkbox' 分发（缺省为按钮组装版）。
 */
class CheckboxCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(40).color('surface')
      .schema({
        label: { type: 'string', default: '' },
        checked: { type: 'boolean', default: false },
        disabled: { type: 'boolean', default: false },
      })
      .renderContent(CheckboxDispatcher);
  }
}

export { CheckboxCell, OptionImpl, CheckboxAssembledView };
