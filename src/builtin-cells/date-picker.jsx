/**
 * @file date-picker.jsx —— DatePickerCell（日期选择）预设
 *
 * 下拉式日期选择：顶部只读输入条显示选中日期（value）或占位提示（placeholder），
 * 点击切换月历展开（open）。月历按周历网格渲染（表头日一二三四五六），
 * 支持 ± 切月（跨年自动进位），点击日期写回 value 并收起月历。
 * 交互全部写回 schema 字段（数据驱动）。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';

/** 周历表头：日一二三四五六 */
const WEEK_HEADERS = ['日', '一', '二', '三', '四', '五', '六'];

/**
 * 日期选择视图：订阅 value/year/month/open/placeholder。
 * 顶部输入条点击切换 open；月历切月（±，跨年进位）与点选日期写回 value。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function DatePickerView({ cell }) {
  const value = useCellData(cell, 'value');
  const year = useCellData(cell, 'year');
  const month = useCellData(cell, 'month');
  const open = useCellData(cell, 'open');
  const placeholder = useText(useCellData(cell, 'placeholder'));
  // 首日偏移（0=周日）与当月天数，构建月历格子数组（开头空位补齐）
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const dayCells = [];
  for (let i = 0; i < firstWeekday; i++) dayCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) dayCells.push(d);
  // 切月：跨年自动进位
  const prevMonth = () => {
    if (month === 1) cell.setYear(year - 1).setMonth(12);
    else cell.setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 12) cell.setYear(year + 1).setMonth(1);
    else cell.setMonth(month + 1);
  };
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', width: '100%', height: '100%',
      backgroundColor: '#ffffff', fontSize: 13, color: '#333', overflow: 'hidden',
    }}>
      {/* 顶部输入条：只读展示，点击切换展开 */}
      <div
        onClick={() => cell.setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', height: 32, margin: 6, padding: '0 10px',
          border: '1px solid #e8e8e8', borderRadius: 4, backgroundColor: '#fafafa',
          cursor: 'pointer', flexShrink: 0, userSelect: 'none',
        }}
      >
        <span style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', color: value ? '#333' : '#999' }}>
          {value || placeholder}
        </span>
        <span style={{ marginLeft: 6, fontSize: 10, color: '#888' }}>▾</span>
      </div>
      {/* 月历：切月栏 + 周历网格 */}
      {open && (
        <div style={{ padding: '0 6px 6px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 4px 4px' }}>
            <span
              onClick={prevMonth}
              style={{ cursor: 'pointer', color: '#4a90d9', padding: '0 6px', userSelect: 'none', fontWeight: 'bold' }}
            >‹</span>
            <span style={{ fontWeight: 'bold' }}>{year} 年 {month} 月</span>
            <span
              onClick={nextMonth}
              style={{ cursor: 'pointer', color: '#4a90d9', padding: '0 6px', userSelect: 'none', fontWeight: 'bold' }}
            >›</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center' }}>
            {WEEK_HEADERS.map((h) => (
              <div key={h} style={{ padding: '2px 0 4px', color: '#999', fontSize: 11 }}>{h}</div>
            ))}
            {dayCells.map((d, idx) => (d === null ? (
              <div key={`blank-${idx}`} style={{ height: 24 }} />
            ) : (
              <div
                key={d}
                onClick={() => cell.setValue(`${year}-${month}-${d}`).setOpen(false)}
                style={{
                  height: 24, lineHeight: '24px', borderRadius: 3, cursor: 'pointer',
                  userSelect: 'none',
                  color: value === `${year}-${month}-${d}` ? '#fff' : '#333',
                  backgroundColor: value === `${year}-${month}-${d}` ? '#4a90d9' : 'transparent',
                }}
              >
                {d}
              </div>
            )))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * DatePickerCell：日期选择。value 存选中的 'YYYY-MM-DD'（空串表示未选），
 * year/month 为月历当前显示的年月，open 控制月历展开，placeholder 为占位提示
 * （i18n key 或纯文本）。
 */
class DatePickerCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.moveY(true).layout('vertical').defaultWidth(240).backgroundColor('#ffffff')
      .schema({
        value: { type: 'string', default: '' },
        year: { type: 'number', default: 2026 },
        month: { type: 'number', default: 1 },
        open: { type: 'boolean', default: false },
        placeholder: { type: 'string', default: '请选择日期' },
      })
      .renderContent(DatePickerView);
  }
}

export { DatePickerCell };