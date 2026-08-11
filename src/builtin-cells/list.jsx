/**
 * @file list.jsx —— ListCell（列表）预设
 *
 * 展示业务数据列表：items 为 [{id, title, subtitle?, icon?}] 数组，
 * 点击行写入 selected（高亮选中行），支持图标与副标题双行展示。
 * 帧内纵向滚动（moveY true），行高固定 36。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';

/**
 * 列表视图：订阅 items/selected，渲染行列表，点击切换选中并高亮。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function ListView({ cell }) {
  const items = useCellData(cell, 'items') || [];
  const selected = useCellData(cell, 'selected');
  return (
    <div style={{ width: '100%', height: '100%' }}>
      {items.map(item => (
        <div
          key={item.id}
          onClick={() => cell.setSelected(item.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px',
            height: 36, fontSize: 13, cursor: 'pointer', userSelect: 'none',
            color: item.id === selected ? '#fff' : '#333',
            backgroundColor: item.id === selected ? '#357abd' : '#f7f7f7',
            borderBottom: '1px solid #e8e8e8',
          }}
        >
          {item.icon ? <span style={{ flexShrink: 0 }}>{item.icon}</span> : null}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
            {item.subtitle ? (
              <div style={{
                fontSize: 11, opacity: 0.7,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {item.subtitle}
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * ListCell：列表。items 为业务数据（[{id, title, subtitle?, icon?}]），
 * selected 为当前选中 id（点击行切换，高亮显示）。
 */
class ListCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.moveY(true).layout('vertical')
      .schema({
        items: { type: 'array', default: [] },
        selected: { type: 'string', default: '' },
      })
      .renderContent(ListView);
  }
}

export { ListCell };
