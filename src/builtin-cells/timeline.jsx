/**
 * @file timeline.jsx —— TimelineCell（时间线）高级 Cell
 *
 * 展示族：时间线（见 docs/basic-cell-design.md）。
 * 双实现机制（kind: 'timeline'）：组装 fallback（TimelineAssembledView）为每项
 * 渲染左侧竖线 + 主色圆点与右侧的时间/标题/说明；主题可经
 * theme.components.timeline 整体重写。
 *
 * 轨道排版：左侧轨道 16px（竖线 2px 居中、圆点 10px 居中），内容距轨道
 * 12px（合计左内边距 24px）；首项竖线从圆点中心起、末项止于圆点中心，
 * 不越过边界；每项上下统一 6px，首末项不额外留白。
 *
 * Schema（数据契约，与旧版一致）：items（[{id, time, title, desc}]）。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';
import { useThemeColor, useCornerType } from '../core/theme/theme-react';
import { cornerStyle, CAPSULE_RADIUS } from '../core/theme/shape';
import { TABULAR_NUMS } from '../core/theme/state-layer';

/** 左侧轨道宽度（px，含圆点） */
const RAIL_W = 16;
/** 竖线宽度（px） */
const RAIL_LINE_W = 2;
/** 圆点直径（px） */
const DOT_SIZE = 10;
/** 每项上下内边距（px） */
const ROW_PAD_Y = 6;
/** 圆点顶部偏移：与标题行（行高 18）垂直居中 */
const DOT_TOP = ROW_PAD_Y + 4;
/** 圆点中心距项顶的距离（px）—— 竖线首末端的收束位置 */
const RAIL_CENTER = DOT_TOP + DOT_SIZE / 2;

/**
 * 时间线单项：接收普通 props（不在 map 内调 hooks），time/title/desc 经 useText 渲染。
 * @param {{item: object, first: boolean, last: boolean}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function TimelineItemView({ item, first, last }) {
  const time = useText(item.time);
  const title = useText(item.title);
  const desc = useText(item.desc);
  const corner = useCornerType();
  const border = useThemeColor('border', '#ddd');
  const primary = useThemeColor('primary', '#4a90d9');
  const textMuted = useThemeColor('text-muted', '#999');
  const text = useThemeColor('text', '#333');
  return (
    <div style={{
      position: 'relative', width: '100%', boxSizing: 'border-box',
      padding: `${ROW_PAD_Y}px 0 ${ROW_PAD_Y}px ${RAIL_W + 12}px`,
    }}>
      {/* 竖线：首项从圆点中心起，末项止于圆点中心，不越界 */}
      <div style={{
        position: 'absolute', left: (RAIL_W - RAIL_LINE_W) / 2, width: RAIL_LINE_W,
        top: first ? RAIL_CENTER : 0,
        bottom: last ? `calc(100% - ${RAIL_CENTER}px)` : 0,
        backgroundColor: border,
      }} />
      <div style={{
        position: 'absolute', left: (RAIL_W - DOT_SIZE) / 2, top: DOT_TOP,
        width: DOT_SIZE, height: DOT_SIZE,
        ...cornerStyle(corner, CAPSULE_RADIUS), backgroundColor: primary,
      }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 'bold', color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
          {time ? <div style={{ fontSize: 11, color: textMuted, flexShrink: 0, ...TABULAR_NUMS }}>{time}</div> : null}
        </div>
        {desc ? <div style={{ fontSize: 12, color: textMuted, lineHeight: 1.5 }}>{desc}</div> : null}
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
      {items.map((item, i) => (
        <TimelineItemView
          key={item.id}
          item={item}
          first={i === 0}
          last={i === items.length - 1}
        />
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
 * 底色不在此声明：时间线随父容器背景呈现。
 */
class TimelineCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.moveY(true).layout('vertical')
      .schema({
        items: { type: 'array', default: [] },
      })
      .renderContent(TimelineDispatcher);
  }
}

export { TimelineCell, TimelineAssembledView };
