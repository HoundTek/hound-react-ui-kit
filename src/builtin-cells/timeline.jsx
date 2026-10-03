/**
 * @file timeline.jsx —— TimelineCell（时间线）高级 Cell
 *
 * 展示族：时间线（见 docs/basic-cell-design.md）。
 * 双实现机制（kind: 'timeline'）：组装 fallback（TimelineAssembledView）为每项
 * 渲染左侧竖线 + 主色圆点与右侧 time/title/desc；主题可经
 * theme.components.timeline 整体重写。
 *
 * Schema（数据契约，与旧版一致）：items（[{id, time, title, desc}]）。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';
import { useThemeColor, useCornerType } from '../core/theme/theme-react';
import { cornerStyle, CAPSULE_RADIUS } from '../core/theme/shape';

/**
 * 时间线单项：接收普通 props（不在 map 内调 hooks），time/title/desc 经 useText 渲染。
 * @param {{item: object}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function TimelineItemView({ item }) {
  const time = useText(item.time);
  const title = useText(item.title);
  const desc = useText(item.desc);
  const corner = useCornerType();
  const border = useThemeColor('border', '#ddd');
  const primary = useThemeColor('primary', '#4a90d9');
  const textMuted = useThemeColor('text-muted', '#999');
  const text = useThemeColor('text', '#333');
  const descMuted = useThemeColor('text-muted', '#888');
  return (
    <div style={{ position: 'relative', width: '100%', boxSizing: 'border-box', padding: '8px 0 8px 24px' }}>
      <div style={{ position: 'absolute', left: 3, top: 0, bottom: 0, width: 1, backgroundColor: border }} />
      <div style={{ position: 'absolute', left: 0, top: 11, width: 8, height: 8, ...cornerStyle(corner, CAPSULE_RADIUS), backgroundColor: primary }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontSize: 11, color: textMuted }}>{time}</div>
        <div style={{ fontSize: 13, fontWeight: 'bold', color: text }}>{title}</div>
        <div style={{ fontSize: 12, color: descMuted, lineHeight: 1.5 }}>{desc}</div>
      </div>
    </div>
  );
}

/**
 * 时间线组装视图（fallback）：订阅 items，渲染时间线列表。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function TimelineAssembledView({ cell }) {
  const items = useCellData(cell, 'items') || [];
  return (
    <div style={{ width: '100%', height: '100%' }}>
      {items.map(item => (
        <TimelineItemView key={item.id} item={item} />
      ))}
    </div>
  );
}

/** kind 'timeline' 的实现分发视图 */
const TimelineDispatcher = createImplDispatcher('timeline', TimelineAssembledView);

/**
 * TimelineCell：时间线（高级 Cell，展示族）。items 为 [{id, time, title, desc}]
 * （time/title/desc 可存 i18n key 或纯文本）；每项左侧竖线 + 主色圆点，右侧
 * 展示内容。帧内纵向滚动（moveY true）。呈现实现由 kind 'timeline' 分发。
 */
class TimelineCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.moveY(true).layout('vertical').color('surface')
      .schema({
        items: { type: 'array', default: [] },
      })
      .renderContent(TimelineDispatcher);
  }
}

export { TimelineCell, TimelineAssembledView };
