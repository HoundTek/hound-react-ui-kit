import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';

/**
 * 输入框视图：支持占位文本（i18n key）、字号、文字对齐。
 * 输入变化时同步回写 cell 数据（cell.setData 可用时）。
 */
function InputView({ cell }) {
  const value = useCellData(cell, 'value');
  const placeholder = useText(useCellData(cell, 'placeholder'));
  const fontSize = useCellData(cell, 'fontSize');
  const align = useCellData(cell, 'align');
  const disabled = useCellData(cell, 'disabled');

  const handleChange = (e) => {
    const next = e.target.value;
    if (typeof cell.setData === 'function') {
      cell.setData('value', next);
    } else if (typeof cell.set === 'function') {
      cell.set('value', next);
    }
  };

  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      onChange={handleChange}
      style={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        border: '1px solid #dcdfe6',
        borderRadius: 4,
        padding: '0 12px',
        outline: 'none',
        fontSize,
        textAlign: align,
        background: disabled ? '#f5f7fa' : '#ffffff',
        color: '#303133',
      }}
    />
  );
}

class InputCell extends CellBaseBuilder {
  constructor(id) {
    super(id);
    this.fixedHeight(36)
      .schema({
        value: { type: 'string', default: '' },
        placeholder: { type: 'string', default: '' },
        fontSize: { type: 'number', default: 14 },
        align: { type: 'string', default: 'left' },
        disabled: { type: 'boolean', default: false },
      })
      .renderContent(InputView);
  }
}

export { InputCell, InputView };
