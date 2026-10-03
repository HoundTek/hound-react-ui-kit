/**
 * @file date-picker.jsx —— DatePickerCell（日期选择）高级 Cell
 *
 * 菜单/列表族：日期选择 = ButtonImpl 输入条 + CalendarImpl 月历下拉
 *（见 docs/basic-cell-design.md）。输入条显示选中日期（value）或占位提示
 *（placeholder），点击切换月历展开（open）；切月栏箭头按钮翻页
 *（跨年自动进位），点击日期写回 value 并收起月历。
 * 交互全部写回 schema 字段（数据驱动）。
 * 主题可经 theme.components['date-picker'] 整体重写呈现实现。
 *
 * Schema（数据契约，与旧版一致）：value / year / month / open / placeholder。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { useThemeColor } from '../core/theme/theme-react';
import { ButtonImpl } from '../basic-cells/button';
import { GlyphChevron } from '../basic-cells/glyphs';
import { CalendarImpl } from './calendar';

/**
 * 日期选择组装视图（fallback）：订阅 value/year/month/open/placeholder。
 * 顶部 ButtonImpl 输入条点击切换 open；CalendarImpl 点选日期写回 value，
 * 左右箭头 ButtonImpl 切月（跨年进位）。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function DatePickerAssembledView({ cell }) {
  const value = useCellData(cell, 'value');
  const year = useCellData(cell, 'year');
  const month = useCellData(cell, 'month');
  const open = useCellData(cell, 'open');
  const placeholder = useCellData(cell, 'placeholder');
  const surface = useThemeColor('surface', '#ffffff');
  const text = useThemeColor('text', '#333');
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
      backgroundColor: surface, fontSize: 13, color: text, overflow: 'hidden',
    }}>
      {/* 顶部输入条：只读展示，点击切换展开 */}
      <div style={{ margin: 6, flexShrink: 0 }}>
        <ButtonImpl
          label={value || placeholder}
          icon={open ? <GlyphChevron dir="up" size={14} /> : <GlyphChevron dir="down" size={14} />}
          type="default"
          block
          align="left"
          onPress={() => cell.setOpen(!open)}
        />
      </div>
      {/* 月历：切月栏 + CalendarImpl 周历网格 */}
      {open && (
        <div style={{ padding: '0 6px 6px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 4px 4px' }}>
            <ButtonImpl label="" icon={<GlyphChevron dir="left" size={12} />} type="default" size="small" onPress={prevMonth} />
            <span style={{ fontSize: 13, fontWeight: 'bold' }}>{year} 年 {month} 月</span>
            <ButtonImpl label="" icon={<GlyphChevron dir="right" size={12} />} type="default" size="small" onPress={nextMonth} />
          </div>
          <CalendarImpl
            year={year}
            month={month}
            selected={value}
            onSelect={ds => cell.setValue(ds).setOpen(false)}
          />
        </div>
      )}
    </div>
  );
}

/** kind 'date-picker' 的实现分发视图 */
const DatePickerDispatcher = createImplDispatcher('date-picker', DatePickerAssembledView);

/**
 * DatePickerCell：日期选择。value 存选中的 'YYYY-MM-DD'（空串表示未选），
 * year/month 为月历当前显示的年月，open 控制月历展开，placeholder 为占位提示
 * （i18n key 或纯文本）。
 * 呈现实现由 kind 'date-picker' 分发（缺省为按钮+月历组装版）。
 */
class DatePickerCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.moveY(true).layout('vertical').defaultWidth(240).color('surface')
      .schema({
        value: { type: 'string', default: '' },
        year: { type: 'number', default: 2026 },
        month: { type: 'number', default: 1 },
        open: { type: 'boolean', default: false },
        placeholder: { type: 'string', default: '请选择日期' },
      })
      .renderContent(DatePickerDispatcher);
  }
}

export { DatePickerCell, DatePickerAssembledView };
