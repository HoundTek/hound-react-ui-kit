/**
 * @file timeline.jsx —— TimelineCell（时间线）预设
 *
 * 时间线列表：items 为 [{id, time, title, desc}]（文本字段可存 i18n key 或
 * 纯文本）；每项左侧渲染竖线 + 主色圆点，右侧展示 time/title/desc。
 * 帧内纵向滚动（moveY true）。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';

/**
 * 时间线单项：接收普通 props（不在 map 内调 hooks），time/title/desc 经 useText 渲染。
 * @param {{item: object}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function TimelineItemView({ item }) {
  const time = useText(item.time);
  const title = useText(item.title);
  const desc = useText(item.desc);
  return (
    <div style={{ position: 'relative', width: '100%', boxSizing: 'border-box', padding: '8px 0 8px 24px' }}>
      <div style={{ position: 'absolute', left: 3, top: 0, bottom: 0, width: 1, backgroundColor: '#ddd' }} />
      <div style={{ position: 'absolute', left: 0, top: 11, width: 8, height: 8, borderRadius: '50%', backgroundColor: '#4a90d9' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontSize: 11, color: '#999' }}>{time}</div>
        <div style={{ fontSize: 13, fontWeight: 'bold', color: '#333' }}>{title}</div>
        <div style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }}>{desc}</div>
      </div>
    </div>
  );
}

/**
 * 时间线视图：订阅 items，渲染时间线列表。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function TimelineView({ cell }) {
  const items = useCellData(cell, 'items') || [];
  return (
    <div style={{ width: '100%', height: '100%' }}>
      {items.map(item => (
        <TimelineItemView key={item.id} item={item} />
      ))}
    </div>
  );
}

/**
 * TimelineCell：时间线。items 为 [{id, time, title, desc}]（time/title/desc 可存
 * i18n key 或纯文本）；每项左侧竖线 + 主色圆点，右侧展示内容。
 */
class TimelineCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.moveY(true).layout('vertical').backgroundColor('#ffffff')
      .schema({
        items: { type: 'array', default: [] },
      })
      .renderContent(TimelineView);
  }
}

export { TimelineCell };
