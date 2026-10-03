/**
 * @file radio.jsx —— RadioCell（单选）高级 Cell
 *
 * 按钮族：单选 = 按压 + 状态标记（见 docs/basic-cell-design.md）。
 * 组装 fallback：OptionImpl（按钮族共享实现组件，shape 'radio'，共享
 * SVG 单选标记），点击整行 setChecked(true)（单选语义：只能置中，同组
 * 互斥由页面作者处理）。
 * 主题可经 theme.components.radio 整体重写呈现实现。
 *
 * Schema（数据契约，与旧版一致）：label / value / checked / group。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { OptionImpl } from './checkbox';

/**
 * 单选组装视图（fallback）：OptionImpl（shape 'radio'，SVG 单选标记），
 * 点击置为选中。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function RadioAssembledView({ cell }) {
  const label = useCellData(cell, 'label');
  const checked = useCellData(cell, 'checked');
  return (
    <OptionImpl
      label={label}
      checked={checked}
      shape="radio"
      onToggle={() => cell.setChecked(true)}
    />
  );
}

/** kind 'radio' 的实现分发视图 */
const RadioDispatcher = createImplDispatcher('radio', RadioAssembledView);

/**
 * RadioCell：单选（高级 Cell，按钮族）。value 为该项的值，checked 为选中
 * 状态，group 为组名；label 存 i18n key 或纯文本。点击置为选中。
 * 呈现实现由 kind 'radio' 分发（缺省为按钮组装版）。
 */
class RadioCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(40).color('surface')
      .schema({
        label: { type: 'string', default: '' },
        value: { type: 'string', default: '' },
        checked: { type: 'boolean', default: false },
        group: { type: 'string', default: '' },
      })
      .renderContent(RadioDispatcher);
  }
}

export { RadioCell, RadioAssembledView };
