/**
 * @file kanban.jsx —— KanbanCell（看板）预设
 *
 * 横向看板：columns 为列数组 [{id, title, items: [{id, title}]}]，
 * 每列固定宽 180（白底，列头 36 灰底加粗，卡片列表可滚动），列间 1px #eee 分隔；
 * 点击卡片写入 selectedItem 并以蓝色边框高亮。横向滚动（moveX(true)）。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';

/**
 * 看板视图：订阅 columns/selectedItem，横向排列各列，点击卡片写入 selectedItem。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function KanbanView({ cell }) {
  const columns = useCellData(cell, 'columns') || [];
  const selectedItem = useCellData(cell, 'selectedItem');
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', overflowX: 'auto', overflowY: 'hidden' }}>
      {columns.map((col, colIdx) => (
        <div
          key={col.id}
          style={{
            width: 180, flexShrink: 0, display: 'flex', flexDirection: 'column',
            backgroundColor: '#ffffff',
            borderRight: colIdx < columns.length - 1 ? '1px solid #eeeeee' : 'none',
          }}
        >
          <div style={{
            height: 36, flexShrink: 0, display: 'flex', alignItems: 'center',
            padding: '0 10px', backgroundColor: '#f5f5f5', fontWeight: 'bold',
            fontSize: 13, color: '#333333', whiteSpace: 'nowrap',
            overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {col.title}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 4, minHeight: 0 }}>
            {(col.items || []).map((item) => (
              <div
                key={item.id}
                onClick={() => cell.setSelectedItem(item.id)}
                style={{
                  height: 28, display: 'flex', alignItems: 'center', padding: '0 8px',
                  marginBottom: 4, boxSizing: 'border-box', cursor: 'pointer',
                  backgroundColor: '#ffffff', border: '1px solid',
                  borderColor: selectedItem === item.id ? '#4a90d9' : '#e5e5e5',
                  borderRadius: 4, fontSize: 12, color: '#333333',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}
              >
                {item.title}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * KanbanCell：看板。columns 为列数据（含列头与卡片），selectedItem 记录
 * 当前选中卡片 id（点击写入并以蓝色边框高亮）。横向滚动展示。
 */
class KanbanCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.moveX(true).minHeight(120).backgroundColor('#ffffff')
      .schema({
        columns: { type: 'array', default: [] },
        selectedItem: { type: 'string', default: '' },
      })
      .renderContent(KanbanView);
  }
}

export { KanbanCell };
