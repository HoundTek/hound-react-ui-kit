/**
 * @file divider.jsx —— DividerCell（分隔线）高级 Cell
 *
 * 展示族：分隔线（见 docs/basic-cell-design.md）。
 * 双实现机制（kind: 'divider'）：组装 fallback（DividerAssembledView）按
 * orientation 渲染水平线（text 非空时嵌入居中文本）或垂直线；主题可经
 * theme.components.divider 整体重写。
 *
 * Schema（数据契约，与旧版一致）：text / orientation / color。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';
import { useThemeColor } from '../core/theme/theme-react';

/**
 * 分隔线组装视图（fallback）：按 orientation 渲染水平/垂直线，text 非空时嵌入居中文本。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function DividerAssembledView({ cell }) {
  const text = useText(useCellData(cell, 'text'));
  const orientation = useCellData(cell, 'orientation');
  const color = useCellData(cell, 'color');
  const textMuted = useThemeColor('text-muted', '#999');
  if (orientation === 'vertical') {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: 1, height: '100%', backgroundColor: color }} />
      </div>
    );
  }
  return (
    <div style={{
      width: '100%', height: '100%', boxSizing: 'border-box',
      display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px',
    }}>
      <div style={{ flex: 1, height: 1, backgroundColor: color }} />
      {text ? <span style={{ fontSize: 12, color: textMuted, whiteSpace: 'nowrap' }}>{text}</span> : null}
      {text ? <div style={{ flex: 1, height: 1, backgroundColor: color }} /> : null}
    </div>
  );
}

/** kind 'divider' 的实现分发视图 */
const DividerDispatcher = createImplDispatcher('divider', DividerAssembledView);

/**
 * DividerCell：分隔线（高级 Cell，展示族）。orientation 为 horizontal/vertical；
 * horizontal 时 text 非空显示居中文本；color 为线色。帧尺寸由父布局分配，
 * 视图在帧内居中渲染线体。呈现实现由 kind 'divider' 分发。
 */
class DividerCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.defaultHeight(24)
      .schema({
        text: { type: 'string', default: '' },
        orientation: { type: 'string', default: 'horizontal' },
        color: { type: 'string', default: '#e0e0e0' },
      })
      .renderContent(DividerDispatcher);
  }
}

export { DividerCell, DividerAssembledView };
