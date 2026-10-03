/**
 * @file calendar.jsx —— CalendarCell（月历）高级 Cell
 *
 * 按钮族：月历日期格 = 按钮阵列（见 docs/basic-cell-design.md）。
 * CalendarImpl 为族内共享实现组件（纯受控：日期格 ButtonImpl），
 * 供 date-picker 复用。主题可经 theme.components.calendar 整体重写呈现实现。
 *
 * Schema（数据契约，与旧版一致）：year / month / selected / firstDay。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { useThemeColor } from '../core/theme/theme-react';
import { ButtonImpl } from '../basic-cells/button';

const WEEK_HEADERS = ['日', '一', '二', '三', '四', '五', '六'];
const CELL_STYLE = { width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 };
const HEADER_STYLE = { width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 };

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
 * 月历实现组件（纯受控，日期格组装自 ButtonImpl）：表头星期行 + 日期网格，
 * 选中日期 primary 变体高亮，点击回调日期串（'YYYY-MM-DD'）。
 * @param {Object} props
 * @param {number} props.year 年
 * @param {number} props.month 月（1-12）
 * @param {string} props.selected 选中日期（'YYYY-MM-DD'）
 * @param {number} [props.firstDay=0] 每周首日（0=周日）
 * @param {(dateStr: string) => void} props.onSelect 选中回调
 * @returns {JSX.Element} 月历元素
 */
function CalendarImpl({ year, month, selected, firstDay = 0, onSelect }) {
  const surfaceColor = useThemeColor('surface', '#ffffff');
  const headerColor = useThemeColor('text-muted', '#888');
  const days = daysInMonth(year, month);
  const offset = firstOffset(year, month, firstDay);
  const headers = [...WEEK_HEADERS.slice(firstDay), ...WEEK_HEADERS.slice(0, firstDay)];
  const cells = [];
  for (let i = 0; i < offset; i += 1) cells.push(<div key={`empty-${i}`} style={CELL_STYLE} />);
  for (let d = 1; d <= days; d += 1) {
    const ds = dateString(year, month, d);
    cells.push(
      <div key={ds} style={{ ...CELL_STYLE, padding: 0 }}>
        <ButtonImpl
          label={String(d)}
          type={ds === selected ? 'primary' : 'default'}
          size="small"
          onPress={() => onSelect(ds)}
        />
      </div>
    );
  }
  return (
    <div style={{ width: '100%', height: '100%', backgroundColor: surfaceColor, padding: 8, boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', width: 196 }}>
        {headers.map(h => <div key={h} style={{ ...HEADER_STYLE, color: headerColor }}>{h}</div>)}
        {cells}
      </div>
    </div>
  );
}

/**
 * 月历组装视图（fallback）：CalendarImpl，点击日期写入 selected。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function CalendarAssembledView({ cell }) {
  const year = useCellData(cell, 'year');
  const month = useCellData(cell, 'month');
  const selected = useCellData(cell, 'selected');
  const firstDay = useCellData(cell, 'firstDay');
  return (
    <CalendarImpl year={year} month={month} selected={selected} firstDay={firstDay} onSelect={ds => cell.setSelected(ds)} />
  );
}

/** kind 'calendar' 的实现分发视图 */
const CalendarDispatcher = createImplDispatcher('calendar', CalendarAssembledView);

/**
 * CalendarCell：月历（高级 Cell，按钮族）。year/month 定位月份（month 1-12），
 * selected 存 'YYYY-MM-DD'，firstDay 指定每周首日（0=周日，默认）；
 * 点击日期写入 selected 并高亮主色底。
 * 呈现实现由 kind 'calendar' 分发（缺省为按钮组装版）。
 */
class CalendarCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.moveY(true).defaultWidth(196).color('surface')
      .schema({
        year: { type: 'number', default: 2026 },
        month: { type: 'number', default: 1 },
        selected: { type: 'string', default: '' },
        firstDay: { type: 'number', default: 0 },
      })
      .renderContent(CalendarDispatcher);
  }
}

export { CalendarCell, CalendarImpl, CalendarAssembledView };
