/**
 * @file date-picker.jsx —— DatePickerCell（日期选择）高级 Cell
 *
 * 菜单/列表族：日期选择 = ButtonImpl 输入条 + CalendarImpl 月历伪窗口
 *（见 docs/basic-cell-design.md、docs/floating-window-tree-design.md）。
 * 输入条显示选中日期（value）或占位提示（placeholder），点击展开/收起月历
 * 伪窗口（open）；伪窗口内切月栏箭头按钮翻页（跨年自动进位），点击日期写回
 * value 并收起。月历不绝对定位在 Cell 内容层内（内容层带 overflow 裁切），
 * 而是作为独立浮动视口挂到数据树根，按输入条屏幕矩形定位（下方空间不足时
 * 上翻），页面滚动/窗口缩放时跟随；关闭时机：选中日期、点击窗口外、Escape、
 * 输入条卸载。
 * 交互全部写回 schema 字段（数据驱动）。
 * 主题可经 theme.components['date-picker'] 整体重写呈现实现。
 *
 * Schema（数据契约，与旧版一致）：value / year / month / open / placeholder。
 */
import { useEffect, useRef } from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';
import { useThemeColor } from '../core/theme/theme-react';
import { TABULAR_NUMS } from '../core/theme/state-layer';
import { ButtonImpl } from '../basic-cells/button';
import { GlyphChevron } from '../basic-cells/glyphs';
import { syncFloatingFrame } from '../core/box/box-component';
import { CalendarImpl } from './calendar';
import { placePopover } from './popover-anchor';

/** 月历伪窗口内边距（px） */
const PANEL_PAD = 8;
/** 月历伪窗口纵向间距（px） */
const PANEL_GAP = 6;
/** 切月栏高度（px） */
const MONTH_BAR_H = 32;
/** 月历区高度（px）：星期表头 22 + 间隙 2 + 6 行日期 6×28 + 行间距 5×2 + 内边距 16 */
const CALENDAR_H = 22 + 2 + 6 * 28 + 5 * 2 + 16;
/** 月历伪窗口宽度 / 高度（px） */
const PANEL_W = 264;
const PANEL_H = PANEL_PAD * 2 + MONTH_BAR_H + PANEL_GAP + CALENDAR_H;

/** 月历伪窗口 Cell id 计数器（同一父数据节点下需唯一段名） */
let _panelSeq = 0;

/**
 * 日期选择月历视图（伪窗口内容）：切月栏 + CalendarImpl 周历网格。
 * 切月（跨年进位）写回面板自身 year/month 并经 navigate 回传宿主；点选日期
 * 写回 value 并经 pick 回传宿主（宿主据此收起伪窗口）。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 月历伪窗口元素
 */
function DatePickerPanelView({ cell }) {
  const value = useCellData(cell, 'value');
  const year = useCellData(cell, 'year');
  const month = useCellData(cell, 'month');
  const text = useThemeColor('text', '#333333');

  /** 切月：跨年自动进位，并同步到宿主 Cell（再次展开时停在同一月份） */
  const shiftMonth = (delta) => {
    let y = year;
    let m = month + delta;
    if (m < 1) { y -= 1; m = 12; }
    if (m > 12) { y += 1; m = 1; }
    cell.setYear(y).setMonth(m);
    cell.emit('navigate', y, m);
  };

  return (
    <div
      data-hk-date-panel=""
      style={{
        width: '100%', height: '100%', boxSizing: 'border-box',
        padding: PANEL_PAD, display: 'flex', flexDirection: 'column',
        gap: PANEL_GAP, overflow: 'hidden', fontSize: 13, color: text,
      }}
    >
      {/* 切月栏：上一月 / 年月标题 / 下一月 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: MONTH_BAR_H, flexShrink: 0,
      }}>
        <ButtonImpl
          label="" icon={<GlyphChevron dir="left" size={12} />} type="default" size="small"
          ariaLabel="上一月" onPress={() => shiftMonth(-1)} />
        <span style={{ fontWeight: 'bold', color: text, ...TABULAR_NUMS }}>{year} 年 {month} 月</span>
        <ButtonImpl
          label="" icon={<GlyphChevron dir="right" size={12} />} type="default" size="small"
          ariaLabel="下一月" onPress={() => shiftMonth(1)} />
      </div>
      {/* 周历网格 */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <CalendarImpl
          year={year}
          month={month}
          selected={value}
          onSelect={(ds) => {
            cell.setValue(ds);
            cell.emit('pick', ds);
          }}
        />
      </div>
    </div>
  );
}

/**
 * 月历伪窗口 Cell：浮动视口 + overlay 圆角 + surface 底色，阴影由浮动窗口框架
 * 统一给出；尺寸固定为 PANEL_W × PANEL_H，位置由输入条矩形决定。
 */
class DatePickerPanelCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.floatingViewport()
      .movable(false).resizable(false)
      .styleRole('overlay').color('surface')
      .fixedWidth(PANEL_W).fixedHeight(PANEL_H)
      .schema({
        value: { type: 'string', default: '' },
        year: { type: 'number', default: 2026 },
        month: { type: 'number', default: 1 },
      })
      .renderContent(DatePickerPanelView);
  }
}

/**
 * 打开月历伪窗口：把月历作为浮动视口挂到 Cell 树根上，按输入条屏幕矩形定位。
 * 返回控制器（cell / reposition / close），调用方负责在关闭时 close()。
 * @param {Object} p 参数
 * @param {import('../core/data-dag/data-dag').DataNode} p.parentNode 挂载父数据节点
 * @param {HTMLElement} p.trigger 输入条元素（定位依据）
 * @param {string} p.value 选中日期（'YYYY-MM-DD'）
 * @param {number} p.year 当前显示年
 * @param {number} p.month 当前显示月（1-12）
 * @param {(dateStr: string) => void} p.onPick 选中日期回调
 * @param {(year: number, month: number) => void} p.onNavigate 切月回调
 * @returns {{cell: DatePickerPanelCell, reposition: Function, close: Function}|null} 控制器
 */
function openDatePickerWindow({ parentNode, trigger, value, year, month, onPick, onNavigate }) {
  if (!parentNode || !trigger) return null;
  const { x, y } = placePopover(trigger.getBoundingClientRect(), PANEL_W, PANEL_H);
  const cell = new DatePickerPanelCell(`hk-date-panel-${++_panelSeq}`);
  cell.posX(x).posY(y);
  cell.setValue(value || '').setYear(year).setMonth(month);
  cell.on('pick', dateStr => onPick?.(dateStr));
  cell.on('navigate', (y2, m2) => onNavigate?.(y2, m2));
  cell.mount(parentNode);

  /** 按最新输入条矩形重定位（页面滚动/窗口缩放时跟随） */
  const reposition = () => {
    const box = cell._mounts[0]?.box;
    if (!box) return;
    const next = placePopover(trigger.getBoundingClientRect(), PANEL_W, PANEL_H);
    box.posX(next.x).posY(next.y);
    syncFloatingFrame(box);
  };

  /** 关闭并释放伪窗口（一次性实例，不复用） */
  const close = () => cell.destroy();

  return { cell, reposition, close };
}

/**
 * 日期选择组装视图（fallback）：订阅 value/year/month/open/placeholder。
 * 顶部 ButtonImpl 输入条点击切换 open；open 时经伪窗口展示月历（脱离内容层
 * 裁切）。伪窗口内的选中/切月经事件回写本 Cell 的 schema 字段。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function DatePickerAssembledView({ cell }) {
  const value = useCellData(cell, 'value');
  const year = useCellData(cell, 'year');
  const month = useCellData(cell, 'month');
  const open = useCellData(cell, 'open');
  const placeholder = useText(useCellData(cell, 'placeholder'));
  const muted = useThemeColor('text-muted', '#79747E');
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  /** 最新渲染值（伪窗口创建时读取，避免回调身份变化触发重建） */
  const latestRef = useRef({ value, year, month });

  useEffect(() => {
    latestRef.current = { value, year, month };
  }, [value, year, month]);

  // ARIA 透传：输入条展开态同步到其 <button> DOM
  useEffect(() => {
    const btn = triggerRef.current && triggerRef.current.querySelector('button');
    if (!btn) return;
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }, [open]);

  // 展开时创建伪窗口；收起（选中、外部点击、Escape、卸载）时销毁
  useEffect(() => {
    if (!open) return undefined;
    const trigger = triggerRef.current && triggerRef.current.querySelector('button');
    const panel = openDatePickerWindow({
      parentNode: cell._dataNode?.root,
      trigger,
      value: latestRef.current.value,
      year: latestRef.current.year,
      month: latestRef.current.month,
      onPick: (ds) => {
        cell.setValue(ds);
        cell.setOpen(false);
      },
      onNavigate: (y, m) => cell.setYear(y).setMonth(m),
    });
    if (!panel) return undefined;
    panelRef.current = panel;
    const reposition = () => panel.reposition();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
      panel.close();
      panelRef.current = null;
    };
  }, [open, cell]);

  // 展开期间宿主数据变化同步到伪窗口
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    panel.cell.setValue(value || '').setYear(year).setMonth(month);
  }, [value, year, month]);

  // 展开期间：Escape 收起并回焦输入条；点击伪窗口与输入条之外收起
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      cell.setOpen(false);
    };
    const onPointerDown = (e) => {
      const t = e.target;
      if (!t || typeof t.closest !== 'function') return;
      if (t.closest('[data-hk-date-trigger]') || t.closest('[data-hk-date-panel]')) return;
      cell.setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('mousedown', onPointerDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('mousedown', onPointerDown, true);
    };
  }, [open, cell]);

  return (
    <div
      data-hk-date-trigger=""
      style={{
        width: '100%', height: '100%', display: 'flex', alignItems: 'center',
        padding: '0 8px', boxSizing: 'border-box',
      }}
    >
      <div ref={triggerRef} style={{ flex: 1, minWidth: 0, color: value ? undefined : muted }}>
        <ButtonImpl
          label={value || placeholder}
          icon={<GlyphChevron dir={open ? 'up' : 'down'} size={14} />}
          type="default"
          block
          align="left"
          onPress={() => cell.setOpen(!open)}
        />
      </div>
    </div>
  );
}

/** kind 'date-picker' 的实现分发视图 */
const DatePickerDispatcher = createImplDispatcher('date-picker', DatePickerAssembledView);

/**
 * DatePickerCell：日期选择。value 存选中的 'YYYY-MM-DD'（空串表示未选），
 * year/month 为月历当前显示的年月，open 控制月历伪窗口展开，placeholder 为
 * 占位提示（i18n key 或纯文本）。
 * 呈现实现由 kind 'date-picker' 分发（缺省为输入条 + 月历伪窗口组装版）。
 */
class DatePickerCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(40).defaultWidth(240)
      .schema({
        value: { type: 'string', default: '' },
        year: { type: 'number', default: 2026 },
        month: { type: 'number', default: 1 },
        open: { type: 'boolean', default: false },
        placeholder: { type: 'string', default: 'hk.datePicker.placeholder' },
      })
      .renderContent(DatePickerDispatcher);
  }
}

export {
  DatePickerCell, DatePickerAssembledView, DatePickerPanelCell, DatePickerPanelView,
};
