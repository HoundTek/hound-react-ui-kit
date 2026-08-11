/**
 * @file calendar.jsx —— CalendarCell（月历）预设
 *
 * 单月日历：year/month 定位月份，selected 存 'YYYY-MM-DD' 选中日期，
 * firstDay 指定每周首日（0=周日）；点击日期写入 selected 并高亮蓝底。
 * 帧内纵向滚动（moveY true），默认宽度 196（7 列 × 28px）。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';

const WEEK_HEADERS = ['日', '一', '二', '三', '四', '五', '六'];
const CELL_STYLE = { width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 };
const HEADER_STYLE = { width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#888' };

/** 当月天数。 */
function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

/** 当月 1 日相对 firstDay 的列偏移（0-6）。 */
function firstOffset(year, month, firstDay) {
  return (new Date(year, month - 1, 1).getDay() - firstDay + 7) % 7;
}

/** 格式化为 'YYYY-MM-DD'。 */
function dateString(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * 月历视图：订阅 year/month/selected/firstDay，渲染表头与日期格。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function CalendarView({ cell }) {
  const year = useCellData(cell, 'year');
  const month = useCellData(cell, 'month');
  const selected = useCellData(cell, 'selected');
  const firstDay = useCellData(cell, 'firstDay');
  const days = daysInMonth(year, month);
  const offset = firstOffset(year, month, firstDay);
  const headers = [...WEEK_HEADERS.slice(firstDay), ...WEEK_HEADERS.slice(0, firstDay)];
  const cells = [];
  for (let i = 0; i < offset; i += 1) cells.push(<div key={`empty-${i}`} style={CELL_STYLE} />);
  for (let d = 1; d <= days; d += 1) {
    const ds = dateString(year, month, d);
    const isSelected = ds === selected;
    cells.push(
      <div
        key={ds}
        onClick={() => cell.setSelected(ds)}
        style={{
          ...CELL_STYLE, cursor: 'pointer', borderRadius: 4,
          backgroundColor: isSelected ? '#4a90d9' : '#ffffff',
          color: isSelected ? '#ffffff' : '#333333',
        }}
      >
        {d}
      </div>
    );
  }
  return (
    <div style={{ width: '100%', height: '100%', backgroundColor: '#ffffff', padding: 8 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', width: 196 }}>
        {headers.map(h => <div key={h} style={HEADER_STYLE}>{h}</div>)}
        {cells}
      </div>
    </div>
  );
}

/**
 * CalendarCell：月历。year/month 定位月份（month 1-12），selected 存 'YYYY-MM-DD'，
 * firstDay 指定每周首日（0=周日，默认）；点击日期写入 selected 并高亮蓝底。
 */
class CalendarCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.moveY(true).defaultWidth(196).backgroundColor('#ffffff')
      .schema({
        year: { type: 'number', default: 2026 },
        month: { type: 'number', default: 1 },
        selected: { type: 'string', default: '' },
        firstDay: { type: 'number', default: 0 },
      })
      .renderContent(CalendarView);
  }
}

export { CalendarCell };