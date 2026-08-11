/**
 * @file index-bar.jsx —— IndexBarCell（索引栏）预设
 *
 * 纵向字母索引栏：indexes 为索引字母列表，activeIndex 为当前选中项；
 * 每项固定高 20、居中，点击 setActiveIndex 并高亮（蓝底白字）。
 * 通常配合列表滚动联动（由页面作者监听 activeIndex 变化定位）。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';

/**
 * 索引栏视图：订阅 indexes/activeIndex，点击字母写回 activeIndex 并高亮。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function IndexBarView({ cell }) {
  const indexes = useCellData(cell, 'indexes') || [];
  const activeIndex = useCellData(cell, 'activeIndex');
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', width: '100%', height: '100%',
      backgroundColor: '#ffffff', padding: '4px 0', boxSizing: 'border-box',
    }}>
      {indexes.map((letter) => {
        const active = activeIndex === letter;
        return (
          <div
            key={letter}
            onClick={() => cell.setActiveIndex(letter)}
            style={{
              height: 20, lineHeight: '20px', textAlign: 'center', fontSize: 12,
              margin: '0 2px', borderRadius: 3, cursor: 'pointer', userSelect: 'none',
              color: active ? '#fff' : '#666',
              backgroundColor: active ? '#4a90d9' : 'transparent',
            }}
          >
            {letter}
          </div>
        );
      })}
    </div>
  );
}

/**
 * IndexBarCell：索引栏。indexes 为索引字母列表，activeIndex 为当前选中项
 * （点击高亮蓝底白字），供页面作者联动滚动定位。
 */
class IndexBarCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedWidth(24).moveY(true).layout('vertical').backgroundColor('#ffffff')
      .schema({
        indexes: { type: 'array', default: ['A', 'B', 'C', 'D', 'E'] },
        activeIndex: { type: 'string', default: '' },
      })
      .renderContent(IndexBarView);
  }
}

export { IndexBarCell };