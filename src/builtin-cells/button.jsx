/**
 * @file button.jsx —— ButtonCell（按钮）预设
 *
 * 通用按钮：label 存 i18n key 或纯文本；type 决定配色（primary/default/danger），
 * size 控制高度与字号（small/default/large）；点击写入 pressed 并触发
 * onPress(fn) 注入的点击动作（disabled 时不响应）。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';

/**
 * 按钮视图：订阅 label/disabled/type/size，点击写入 pressed 并调用注入回调。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function ButtonView({ cell }) {
  const label = useText(useCellData(cell, 'label'));
  const disabled = useCellData(cell, 'disabled');
  const type = useCellData(cell, 'type');
  const size = useCellData(cell, 'size');
  const sizeMap = {
    small: { height: 24, fontSize: 12 },
    default: { height: 32, fontSize: 13 },
    large: { height: 40, fontSize: 14 },
  };
  const s = sizeMap[size] || sizeMap.default;
  const typeMap = {
    primary: { background: '#4a90d9', color: '#fff', border: '1px solid #4a90d9' },
    default: { background: '#ffffff', color: '#666', border: '1px solid #cccccc' },
    danger: { background: '#c03a2a', color: '#fff', border: '1px solid #c03a2a' },
  };
  const t = typeMap[type] || typeMap.primary;
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <button
        disabled={disabled}
        onClick={() => {
          cell.setPressed(true);
          if (cell._onPress) cell._onPress();
        }}
        style={{
          height: s.height, padding: '0 16px', fontSize: s.fontSize,
          borderRadius: 4, cursor: disabled ? 'not-allowed' : 'pointer',
          border: t.border, backgroundColor: disabled ? '#f0f0f0' : t.background,
          color: disabled ? '#999' : t.color, whiteSpace: 'nowrap',
        }}
      >
        {label}
      </button>
    </div>
  );
}

/**
 * ButtonCell：按钮。label 存 i18n key 或纯文本；type 为 primary/default/danger；
 * size 为 small/default/large；点击写入 pressed 并触发 onPress(fn) 注入的点击动作。
 */
class ButtonCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(32).backgroundColor('#ffffff')
      .schema({
        label: { type: 'string', default: '' },
        disabled: { type: 'boolean', default: false },
        pressed: { type: 'boolean', default: false },
        type: { type: 'string', default: 'primary' },
        size: { type: 'string', default: 'default' },
      })
      .renderContent(ButtonView);
  }

  /**
   * 注入点击动作回调。按钮被点击时调用（点击同时写入 pressed 字段）。
   * @param {Function} handler 点击回调
   * @returns {ButtonCell} self（链式）
   */
  onPress(handler) {
    this._onPress = handler;
    return this;
  }
}

export { ButtonCell };