/**
 * @file kanban.jsx —— KanbanCell（看板）高级 Cell
 *
 * 菜单/列表族：横向看板（见 docs/basic-cell-design.md）。columns 为列数组
 * [{id, title, items: [{id, title}]}]，每列固定宽 180（白底，列头 36
 * 灰底加粗，卡片列表可滚动），列间 1px 分隔；点击卡片写入 selectedItem
 * 并以主色边框高亮。横向滚动（moveX(true)）。
 * 主题可经 theme.components.kanban 整体重写呈现实现。
 *
 * Schema（数据契约，与旧版一致）：columns / selectedItem。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { useThemeColor, useCornerType, useShapeRadius } from '../core/theme/theme-react';
import { cornerStyle } from '../core/theme/shape';

/**
 * 看板组装视图（fallback）：订阅 columns/selectedItem，横向排列各列，
 * 点击卡片写入 selectedItem。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function KanbanAssembledView({ cell }) {
  const columns = useCellData(cell, 'columns') || [];
  const selectedItem = useCellData(cell, 'selectedItem');
  const corner = useCornerType();
  const controlR = useShapeRadius('control', 4);
  const surface = useThemeColor('surface', '#ffffff');
  const border = useThemeColor('border', '#eeeeee');
  const cardBorder = useThemeColor('border', '#e5e5e5');
  const surfaceMuted = useThemeColor('surface-muted', '#f5f5f5');
  const text = useThemeColor('text', '#333333');
  const primary = useThemeColor('primary', '#4a90d9');
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', overflowX: 'auto', overflowY: 'hidden' }}>
      {columns.map((col, colIdx) => (
        <div
          key={col.id}
          style={{
            width: 180, flexShrink: 0, boxSizing: 'border-box',
            display: 'flex', flexDirection: 'column',
            backgroundColor: surface,
            borderRight: colIdx < columns.length - 1 ? `1px solid ${border}` : 'none',
          }}
        >
          <div style={{
            height: 36, flexShrink: 0, display: 'flex', alignItems: 'center',
            padding: '0 10px', backgroundColor: surfaceMuted, fontWeight: 'bold',
            fontSize: 13, color: text, whiteSpace: 'nowrap',
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
                  backgroundColor: surface, border: '1px solid',
                  borderColor: selectedItem === item.id ? primary : cardBorder,
                  ...cornerStyle(corner, controlR), fontSize: 12, color: text,
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

/** kind 'kanban' 的实现分发视图 */
const KanbanDispatcher = createImplDispatcher('kanban', KanbanAssembledView);

/**
 * KanbanCell：看板。columns 为列数据（含列头与卡片），selectedItem 记录
 * 当前选中卡片 id（点击写入并以主色边框高亮）。横向滚动展示。
 * 呈现实现由 kind 'kanban' 分发（缺省为组装版）。
 */
class KanbanCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.moveX(true).minHeight(120).color('surface')
      .schema({
        columns: { type: 'array', default: [] },
        selectedItem: { type: 'string', default: '' },
      })
      .renderContent(KanbanDispatcher);
  }
}

export { KanbanCell, KanbanAssembledView };
