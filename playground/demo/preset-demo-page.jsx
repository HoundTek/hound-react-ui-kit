/**
 * @file preset-demo-page.jsx —— 预设 Cell 展示台
 *
 * 集中展示 src/builtin-cells/ 下全部扩展预设 Cell 的实际用法与效果：
 * 按 11 个大类分区陈列，每个预设都给出真实数据，页面顶部为页面导航与 Hero。
 *
 * 视觉语言（与文档页共用同一套主题令牌）：
 *   - 页面底色 surface-muted，内容卡片 surface + card 圆角 + outline-variant 描边
 *   - 每个预设统一为"瓦片"（tile）：surface-muted 底色 + control 圆角，
 *     上方 11px 预设名标签（text-muted），下方内容区
 *   - 间距统一走 8/12/16 一档：瓦片内 8/gap 4，分区内 12/gap 12，画布 16/gap 16
 *   - 尺寸按内容实测高度推导（行高 = 瓦片装饰高 + 组件自然高），
 *     分区高度由行高求和得出，避免内容裁切与大面积留白
 *
 * 结构：
 *   1) 根 Cell 用内置 PageCell（viewport + 纵向滚动），底色 surface-muted
 *   2) 页面导航（NavBarCell）+ 画布（DemoCanvas：padding/gap 16，显式总高）
 *   3) 画布内：Hero 卡片 + 11 个分区（DemoSection：标题行 + 若干展示行）
 *   4) 浮层类预设（Toast/Dialog/Drawer/…）不与页面嵌套，而是与页面并列
 *      mount(dag._root)；浮动视口默认可见，mount 后调用 close() 隐藏，
 *      由"浮层与弹窗"分区的按钮经 onPress 触发 open()
 *   5) 文本一律传纯中文（useText 对未注册文本原样返回，无需注册 i18n key）
 */
import React from 'react';
import { createPageNav } from './page-nav';
import { toggleThemeMode } from './theme-mode';
import {
  CellBaseBuilder, DataDag, TextCell, ButtonCell,
  ButtonImpl, useCellData, useText, useThemeColor,
  AccordionCell, AlertCell, AppBarCell, AvatarCell, BadgeCell, BarCell, BoardCell, BreadcrumbCell,
  CalendarCell, CardCell, CarouselCell, ChartCell, ChatCell, CheckboxCell,
  ColorPickerCell, ConfirmCell, ControlCell, DashboardCell, DatePickerCell,
  DialogCell, DividerCell, DocumentCell, DrawerCell, EditorCell, EmptyCell,
  FieldCell, FloatingPanelCell, FooterCell, FormCell, GridCell, GroupCell, IconCell,
  IndexBarCell, InputCell, JoyConCell, KanbanCell, ListCell, LoadingCell,
  LoginCell, MediaCell, MenuCell, MessageCell, ModalCell, MultiSwitchCell, NavBarCell, NoticeCell,
  OrderCell, PageCell, PaginationCell, PanelCell, PickerCell, PopoverCell,
  ProcessCell, ProfileCell, ProgressCell, RadioCell, RateCell, ResultCell,
  RowCell, SearchCell, SectionCell, SelectCell, SettingsCell, SkeletonCell, SliderCell,
  SplitCell, StatCell, StepperCell, SwitchCell, TabBarCell, TabCell, TableCell, TagCell,
  TextareaCell, TilingCell, TimelineCell, TitleCell, ToastCell, TooltipCell,
  TreeCell, UploadCell, WindowCell,
} from '../../src/core/ui-kit';

// =========================================================================
//  设计令牌（间距 / 尺寸，统一取值档位 4·8·12·16）
// =========================================================================

/** 画布内边距与分区间距（px） */
const PAGE_PAD = 16;
const PAGE_GAP = 16;
/** 分区内边距 / 标题行高 / 分区内间距（px） */
const SEC_PAD = 12;
const SEC_GAP = 12;
const SEC_TITLE_H = 28;
/** 分区标题右侧数量标注的固定宽度（px） */
const SEC_COUNT_W = 64;
/** 瓦片内边距 / 标签行高 / 标签与内容间距（px） */
const TILE_PAD = 8;
const TILE_GAP = 4;
const TILE_LABEL_H = 18;
/** Hero 卡片高度 / 内边距 / 水平间距（px） */
const HERO_H = 96;
const HERO_PAD = 16;
const HERO_GAP = 16;

// =========================================================================
//  页面内文本（无内边距排版，保证分区标题、瓦片标签与内容左缘对齐）
// =========================================================================

/**
 * 展示台文本视图：订阅 text/size/bold/color/align，颜色支持主题角色名。
 * 与 TextCell 的差别是不带 12px 水平内边距，便于在瓦片/分区内精确对齐。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function DemoTextView({ cell }) {
  const text = useText(useCellData(cell, 'text'));
  const size = useCellData(cell, 'size');
  const bold = useCellData(cell, 'bold');
  const align = useCellData(cell, 'align');
  const colorRole = useCellData(cell, 'color');
  // 角色名经主题解析；未定义角色按裸色值使用
  const color = useThemeColor(colorRole, colorRole);
  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', alignItems: 'center',
      justifyContent: align === 'center' ? 'center' : (align === 'right' ? 'flex-end' : 'flex-start'),
      fontSize: size, fontWeight: bold ? 600 : 400, color,
      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    }}>
      {text}
    </div>
  );
}

/** DemoTextCell：展示台内部排版文本（分区标题 / 瓦片标签 / Hero 文案） */
class DemoTextCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.schema({
      text: { type: 'string', default: '' },
      size: { type: 'number', default: 12 },
      bold: { type: 'boolean', default: false },
      color: { type: 'string', default: 'text-secondary' },
      align: { type: 'string', default: 'left' },
    }).renderContent(DemoTextView);
  }
}

/**
 * 快捷构建展示台文本。
 * @param {string} id Cell 标识
 * @param {string} text 文本内容
 * @param {{size?: number, bold?: boolean, color?: string, align?: string}} [opts] 排版选项
 * @returns {DemoTextCell} 文本 Cell
 */
const T = (id, text, { size = 12, bold = false, color = 'text-secondary', align = 'left' } = {}) =>
  new DemoTextCell(id).setText(text).setSize(size).setBold(bold).setColor(color).setAlign(align);

// =========================================================================
//  亮/暗切换（Hero 右侧）
// =========================================================================

/**
 * 亮/暗切换按钮视图：点击经 theme-mode 桥广播模式变化，App 切换
 * ThemeProvider 的 theme 实例（种子派生 dark 主题），全树重新呈现；
 * 按钮文字随当前模式更新。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function ThemeSwitchView({ cell }) {
  const label = useCellData(cell, 'label');
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
      <ButtonImpl
        label={label}
        variant="filled"
        size="small"
        onPress={() => {
          const dark = toggleThemeMode();
          cell.setLabel(dark ? '☀ 切至浅色' : '🌙 切至深色');
        }}
      />
    </div>
  );
}

/** ThemeSwitchCell：亮/暗模式切换控件（置于 Hero 右侧，固定宽避免挤压文案） */
class ThemeSwitchCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedWidth(128).fixedHeight(32)
      .schema({ label: { type: 'string', default: '🌙 切至深色' } })
      .renderContent(ThemeSwitchView);
  }
}

// =========================================================================
//  布局容器（本页内部布局用）
// =========================================================================

/** 展示行：横向排列、双轴锁定、显式固定高；子项宽度均分、高度拉伸到行高 */
class DemoRow extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.layout('horizontal').moveX(false).moveY(false).gap(SEC_GAP);
  }
}

/**
 * 展示单元（瓦片）：纵向容器，上方 label 单插槽（固定高 18）标注预设名，
 * 下方 content 单插槽陈列预设实例。底色 surface-muted + control 圆角，
 * 与分区卡片（surface）形成"卡片内嵌瓦片"的层级。
 */
class DemoUnit extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.layout('vertical').moveX(false).moveY(false)
      .styleRole('control').color('surface-muted')
      .padding(TILE_PAD).gap(TILE_GAP)
      .defineSlot('label', {
        fixedHeight: TILE_LABEL_H, layout: 'horizontal',
        moveX: false, moveY: false, single: true,
      })
      .defineSlot('content', {
        layout: 'vertical', moveX: false, moveY: false,
      });
  }
}

/** 分区标题行：横向排列（左标题弹性、右数量固定宽），高 28 */
class DemoSectionHeader extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.layout('horizontal').moveX(false).moveY(false);
  }
}

/**
 * 展示分区：纵向卡片（styleRole card + outlined 描边，surface 底色），
 * 顶部 header 单插槽（高 28），下方默认插槽排布展示行；内边距/间距 12。
 */
class DemoSection extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.layout('vertical').moveX(false).moveY(false)
      .styleRole('card').material('outlined')
      .padding(SEC_PAD).gap(SEC_GAP)
      .defineSlot('header', {
        fixedHeight: SEC_TITLE_H, layout: 'horizontal',
        moveX: false, moveY: false, single: true,
      });
  }
}

/** 画布：纵向容器（双轴锁定），承担页面内边距 16 与分区间距 16，显式总高 */
class DemoCanvas extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.layout('vertical').moveX(false).moveY(false)
      .padding(PAGE_PAD).gap(PAGE_GAP);
  }
}

/** 纵向文本列（Hero 左半部：标题 + 说明） */
class DemoColumn extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.layout('vertical').moveX(false).moveY(false);
  }
}

/**
 * Hero 卡片：横向卡片（primary-container 底色 + card 圆角），
 * 左侧标题/说明文字列，右侧亮暗切换按钮。
 */
class DemoHeroCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.layout('horizontal').moveX(false).moveY(false).fixedHeight(HERO_H)
      .styleRole('card').color('primary-container')
      .padding(HERO_PAD).gap(HERO_GAP);
  }
}

/**
 * 并排按钮组视图：三个按钮无间距拼接，连接处取 4px 小圆角、外侧保留
 * 胶囊半圆角，整体看起来像一个分段控件（四角独立圆角的典型用法）。
 * @returns {JSX.Element} 视图元素
 */
function ButtonGroupView() {
  const seg = (key, label, corners) => (
    <div style={{ flex: 1, display: 'flex' }} key={key}>
      <ButtonImpl label={label} variant="filled" block corners={corners} />
    </div>
  );
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex' }}>
      {seg('copy', '复制', [16, 4, 4, 16])}
      {seg('paste', '粘贴', [4, 4, 4, 4])}
      {seg('more', '更多', [4, 16, 16, 4])}
    </div>
  );
}

/** 按钮组展示 Cell：并排按钮组（仅展示台使用，无 schema） */
class ButtonGroupDemoCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.renderContent(ButtonGroupView);
  }
}

// =========================================================================
//  快捷构建
// =========================================================================

/**
 * 快捷构建瓦片：标签名 + 内容预设实例。
 * @param {string} id 单元 id
 * @param {string} name 标签文本（预设名）
 * @param {CellBaseBuilder} cell 内容预设实例
 * @returns {DemoUnit} 瓦片
 */
const U = (id, name, cell) => new DemoUnit(id)
  .fill('label', T(`${id}_lb`, name, { size: 11, color: 'text-muted' }))
  .fill('content', cell);

/**
 * 快捷构建分区：标题行（序号 + 标题 + 数量）+ 若干展示行。
 * 分区高度由行高求和推导（内边距 + 标题 + 行高 + 行间距），
 * 保证行内最大组件恰好放得下，无裁切、无多余留白。
 * @param {string} id 分区 id
 * @param {string} index 序号文本（'01'…）
 * @param {string} title 分区标题
 * @param {number} count 分区内预设数量
 * @param {Array<[string, number, CellBaseBuilder[]]>} rowSpecs 行规格：[行 id, 行高, 瓦片列表]
 * @returns {DemoSection} 分区（附 `_demoH` 总高）
 */
const buildSection = (id, index, title, count, rowSpecs) => {
  const rows = rowSpecs.map(([rowId, height, cells]) =>
    new DemoRow(rowId).fixedHeight(height).fill('_default', cells));
  const height = SEC_PAD * 2 + SEC_TITLE_H
    + rowSpecs.reduce((sum, [, h]) => sum + h, 0)
    + rows.length * SEC_GAP;
  const header = new DemoSectionHeader(`${id}-head`).fill('_default', [
    T(`${id}-head-title`, `${index} · ${title}`, { size: 13, bold: true, color: 'text' }),
    T(`${id}-head-count`, `${count} 个预设`, { size: 11, color: 'text-muted', align: 'right' })
      .fixedWidth(SEC_COUNT_W),
  ]);
  const section = new DemoSection(id).fixedHeight(height)
    .fill('header', header)
    .fill('_default', rows);
  section._demoH = height;
  return section;
};

// =========================================================================
//  页面装配
// =========================================================================

/**
 * 构建预设展示树。新建 DataDag，组装 Hero + 10 个分区；浮层预设与页面并列
 * mount，由按钮经 onPress 触发 open()。根 Cell 调用 mount(dag._root) 级联挂载。
 * @returns {JSX.Element} 页面根元素
 */
function buildPresetDemo() {
  const dag = new DataDag();

  // ---------- 浮层预设实例（不嵌套进页面，与页面并列挂载；初始 close） ----------
  const toastCell = new ToastCell('toast')
    .setText('操作成功').setType('success').setDuration(2000)
    .posX(680).posY(120);
  const messageCell = new MessageCell('message')
    .setText('服务器响应正常').setType('info').setDuration(2600)
    .posX(140).posY(16);
  const tooltipCell = new TooltipCell('tooltip')
    .setText('这是一个提示气泡').posX(620).posY(120);
  const popoverCell = new PopoverCell('popover')
    .setTitle('气泡卡片').setText('Popover 内容说明。').posX(520).posY(120);
  const confirmCell = new ConfirmCell('confirm')
    .setText('确定要删除这条数据吗？')
    .posX(260).posY(260)
    .onOk(() => toastCell.open());
  // 对话框（窗口变体 'dialog'）：标题栏由 chrome 渲染（标题 + 最小化 + 关闭），
  // 内部内容一律填 body 插槽——不再自己塞 header，避免"有的弹窗没有统一标题栏"
  const dialogCell = new DialogCell('dialog')
    .setTitle('操作确认')
    .posX(240).posY(220)
    .fill('body', [
      T('dlgBody', '标题栏由 chrome 统一渲染，内容填 body 插槽。', { size: 12, color: 'text-secondary' })
        .fixedHeight(32),
      new ButtonCell('dlgOk').setLabel('确认').fixedHeight(32).onPress(() => dialogCell.close()),
    ]);
  const drawerCell = new DrawerCell('drawer')
    .setTitle('侧滑抽屉').setText('抽屉正文内容，可经 posX/posY 贴屏幕右缘展示。')
    .posX(760).posY(0);
  // 浮动面板（窗口变体 'panel'）：主色标题栏 + 最小化/关闭，可拖拽缩放
  const floatPanelCell = new FloatingPanelCell('floatPanel')
    .posX(300).posY(140).fixedWidth(300).fixedHeight(210)
    .setTitle('浮动面板')
    .fill('body', [
      new ListCell('fpList').setItems([
        { id: 'f1', title: '浮动面板示例项一' },
        { id: 'f2', title: '浮动面板示例项二' },
        { id: 'f3', title: '浮动面板示例项三' },
      ]).fixedHeight(110),
      new ButtonCell('fpMin').setLabel('最小化').setVariant('tonal').fixedHeight(30)
        .onPress(() => floatPanelCell.setMinimized(true)),
    ]);
  // 独立窗口（可拖拽 + 可缩放，标题栏为拖拽点，含最小化/最大化/关闭）
  const windowCell = new WindowCell('windowMain')
    .setTitle('独立窗口 · 可拖拽缩放')
    .posX(420).posY(72).fixedHeight(230)
    .fill('body', [
      T('winBody1', '标题栏可拖拽移动，四边/四角可缩放；内容区独立滚动。', { size: 12, color: 'text-secondary' })
        .fixedHeight(32),
      new ListCell('winList').setItems([
        { id: 'w1', title: '窗口内列表项一' },
        { id: 'w2', title: '窗口内列表项二' },
      ]).fixedHeight(80),
      new ButtonCell('winClose').setLabel('关闭窗口').setVariant('tonal').fixedHeight(30)
        .onPress(() => windowCell.close()),
    ]);
  // 固定窗口（不可拖拽/缩放）：与可拖拽窗口对照展示窗口能力组合
  const windowPinned = new WindowCell('windowPinned')
    .setTitle('固定窗口 · 不可拖拽')
    .movable(false).resizable(false)
    .fixedWidth(260).fixedHeight(168)
    .posX(700).posY(280)
    .fill('body', [
      T('pinBody', '位置与尺寸锁定，仅内容可滚动。', { size: 12, color: 'text-secondary' }).fixedHeight(28),
      new ProgressCell('pinProgress').setPercent(64).fixedHeight(20),
      new ButtonCell('pinClose').setLabel('关闭').setVariant('outlined').fixedHeight(30)
        .onPress(() => windowPinned.close()),
    ]);
  // 模态窗口（固定尺寸、仅关闭控件，标题栏 44 高）
  const modalCell = new ModalCell('modalDemo')
    .setTitle('模态窗口')
    .posX(300).posY(180)
    .fill('body', [
      T('modalBody', '固定尺寸，仅保留关闭控件，常用于确认与短表单。', { size: 12, color: 'text-secondary' })
        .fixedHeight(32),
      new InputCell('modalInput').setPlaceholder('输入一行内容').fixedHeight(40),
      new ButtonCell('modalOk').setLabel('确定').fixedHeight(30).onPress(() => {
        modalCell.close();
        toastCell.setText('模态窗口已确认').setType('success').setDuration(1500).open();
      }),
    ]);

  // ---------- Hero ----------
  const hero = new DemoHeroCell('hero').fill('_default', [
    new DemoColumn('heroText').fill('_default', [
      T('heroTitle', 'Hound UI-Kit 预设 Cell 展示台', { size: 18, bold: true, color: 'on-primary-container' })
        .fixedHeight(34),
      T('heroDesc', '80+ 个扩展预设 Cell 分类速览：展示 · 指标 · 表单 · 交互 · 按钮变体 · 列表 · 导航 · 反馈 · 浮层 · 业务 · 容器',
        { size: 12, color: 'text-secondary' }),
    ]),
    new ThemeSwitchCell('themeSwitch'),
  ]);

  // ---------- 01 文本与展示（7） ----------
  // 行高 92 / 80：最大内容 Avatar 48 → 92 - 38 = 54 可用
  const secDisplay = buildSection('sec-display', '01', '文本与展示', 7, [
    ['d-row1', 92, [
      U('d-avatar', 'AvatarCell', new AvatarCell('d_avatar').setName('张').setSize(40).setColor('primary')),
      U('d-title', 'TitleCell', new TitleCell('d_title').setText('标题文本').setColor('primary').setAlign('center')),
      U('d-text', 'TextCell', new TextCell('d_text').setText('通用文本 · 13px 加粗').setSize(13).setBold(true)),
      U('d-tag', 'TagCell', new TagCell('d_tag').setText('默认标签').setColor('primary')),
    ]],
    ['d-row2', 80, [
      U('d-badge', 'BadgeCell', new BadgeCell('d_badge').setCount(120).setMax(99).setColor('danger')),
      U('d-icon', 'IconCell', new IconCell('d_icon').setGlyph('star').setSize(24).setColor('warning')),
      U('d-divider', 'DividerCell', new DividerCell('d_divider').setText('分隔说明').setOrientation('horizontal')),
    ]],
  ]);

  // ---------- 02 数据指标（8） ----------
  // 行高 124 / 124 / 160 / 256：Stat 76、Chart 120、Timeline 3 项约 213
  const secStat = buildSection('sec-stat', '02', '数据指标', 8, [
    ['s-row1', 124, [
      U('s-stat', 'StatCell', new StatCell('s_stat').setLabel('本月销售额').setValue(12800)
        .setSuffix('元').setTrend(12.5).setColor('primary')),
      U('s-progress', 'ProgressCell', new ProgressCell('s_progress').setPercent(72).setShowText(true)),
      U('s-rate', 'RateCell', new RateCell('s_rate').setValue(4).setCount(5).setColor('warning')),
    ]],
    ['s-row2', 124, [
      U('s-process', 'ProcessCell', new ProcessCell('s_process').setSteps([
        { id: 'p1', title: '下单' }, { id: 'p2', title: '支付' },
        { id: 'p3', title: '发货' }, { id: 'p4', title: '完成' },
      ]).setCurrent(2)),
      U('s-bar', 'BarCell', new BarCell('s_bar').setColor('primary').setItems([
        { label: '一月', value: 62 }, { label: '二月', value: 88 },
        { label: '三月', value: 45 }, { label: '四月', value: 96 },
        { label: '五月', value: 71 },
      ])),
    ]],
    ['s-row3', 160, [
      U('s-chart-bar', 'ChartCell · bar', new ChartCell('s_chartBar')
        .setType('bar').setColor('primary').setLabels(['A', 'B', 'C', 'D'])
        .setData('data', [34, 55, 41, 78])),
      U('s-chart-line', 'ChartCell · line', new ChartCell('s_chartLine')
        .setType('line').setColor('success').setLabels(['A', 'B', 'C', 'D'])
        .setData('data', [20, 45, 30, 62])),
    ]],
    ['s-row4', 180, [
      U('s-timeline', 'TimelineCell', new TimelineCell('s_timeline').setItems([
        { id: 't1', time: '09:00', title: '晨会', desc: '同步今日计划' },
        { id: 't2', time: '10:30', title: '评审', desc: '设计稿评审' },
        { id: 't3', time: '14:00', title: '编码', desc: '实现预设 Cell' },
      ])),
    ]],
  ]);

  // ---------- 03 表单与输入（10） ----------
  // 行高 84 / 94 / 84 / 128：输入类 40（含 ColorPicker/DatePicker 的输入条 40，
  // 取色与月历在伪窗口内展开，不占行高）、Slider/MultiSwitch 56、Textarea 88
  const secForm = buildSection('sec-form', '03', '表单与输入', 10, [
    ['f-row1', 84, [
      U('f-input', 'InputCell', new InputCell('f_input').setPlaceholder('请输入用户名').setValue('')),
      U('f-search', 'SearchCell', new SearchCell('f_search').setPlaceholder('搜索…').onSearch(v => {
        console.log('[preset-demo] search:', v);
      })),
      U('f-select', 'SelectCell', new SelectCell('f_select').setOptions([
        { id: 'a', title: '选项 A' }, { id: 'b', title: '选项 B' }, { id: 'c', title: '选项 C' },
      ]).setValue('b').setPlaceholder('请选择')),
      U('f-picker', 'PickerCell', new PickerCell('f_picker').setOptions([
        { id: 'x', title: '北京' }, { id: 'y', title: '上海' }, { id: 'z', title: '广州' },
      ]).setPlaceholder('请选择城市')),
    ]],
    ['f-row2', 94, [
      U('f-slider', 'SliderCell', new SliderCell('f_slider').setLabel('亮度').setMin(0).setMax(100).setValue(60)),
      U('f-multi', 'MultiSwitchCell', new MultiSwitchCell('f_multi')
        .setLabel('档位').setOptions(['低', '中', '高']).setIndex(1)),
      U('f-stepper', 'StepperCell', new StepperCell('f_stepper').setLabel('数量').setValue(3).setMin(0).setMax(10)),
    ]],
    ['f-row3', 84, [
      U('f-date', 'DatePickerCell', new DatePickerCell('f_date').setValue('2026-08-11').setPlaceholder('选择日期')),
      // 色值以 HSL 存储（示例值即为存储格式；输入条显示推导出的 hex）
      U('f-color', 'ColorPickerCell', new ColorPickerCell('f_color').setColor('hsl(150, 67%, 32%)')),
    ]],
    ['f-row4', 128, [
      U('f-textarea', 'TextareaCell', new TextareaCell('f_textarea').setLabel('备注').setPlaceholder('请输入补充说明…')),
    ]],
  ]);

  // ---------- 04 选择与交互（9） ----------
  // 行高 90 / 90 / 188：开关类 40–48、JoyCon 150
  const secInteract = buildSection('sec-interact', '04', '选择与交互', 9, [
    ['i-row1', 90, [
      U('i-check', 'CheckboxCell', new CheckboxCell('i_check').setLabel('接受协议').setChecked(true)),
      U('i-switch', 'SwitchCell', new SwitchCell('i_switch').setLabel('消息通知').setEnabled(true)),
      U('i-radio-a', 'RadioCell · 按月', new RadioCell('i_radio1').setLabel('按月').setChecked(true).setGroup('billing')),
      U('i-radio-b', 'RadioCell · 按年', new RadioCell('i_radio2').setLabel('按年').setChecked(false).setGroup('billing')),
    ]],
    ['i-row2', 90, [
      U('i-btn-primary', 'ButtonCell · primary', new ButtonCell('i_btn1').setLabel('主按钮').setType('primary')
        .onPress(() => {
          toastCell.setText('主按钮被点击').setType('info').setDuration(1500).open();
        })),
      U('i-btn-default', 'ButtonCell · default', new ButtonCell('i_btn2').setLabel('次按钮').setType('default')),
      U('i-btn-disabled', 'ButtonCell · disabled', new ButtonCell('i_btn3').setLabel('禁用按钮').setDisabled(true)),
      U('i-switch-disabled', 'SwitchCell · disabled',
        new SwitchCell('i_switch2').setLabel('核心开关').setEnabled(true).setDisabled(true)),
    ]],
    ['i-row3', 188, [
      U('i-joy', 'JoyConCell', new JoyConCell('i_joy')
        .onMove(dir => console.log('[preset-demo] joy move:', dir))),
    ]],
  ]);

  // ---------- 05 按钮变体（12） ----------
  // 行高 84：瓦片装饰 38 + 组件 32/40（large 取 40 高，恰好放下）
  const secButton = buildSection('sec-button', '05', '按钮变体', 12, [
    ['bt-row1', 84, [
      U('bt-filled', 'ButtonImpl · filled',
        new ButtonCell('bt_filled').setLabel('主按钮').setVariant('filled')),
      U('bt-tonal', 'ButtonImpl · tonal',
        new ButtonCell('bt_tonal').setLabel('柔和按钮').setVariant('tonal')),
      U('bt-outlined', 'ButtonImpl · outlined',
        new ButtonCell('bt_outlined').setLabel('描边按钮').setVariant('outlined')),
      U('bt-text', 'ButtonImpl · text',
        new ButtonCell('bt_text').setLabel('文字按钮').setVariant('text')),
    ]],
    ['bt-row2', 84, [
      U('bt-small', 'size · small',
        new ButtonCell('bt_small').setLabel('小号').setVariant('filled').setSize('small').fixedHeight(24)),
      U('bt-large', 'size · large',
        new ButtonCell('bt_large').setLabel('大号').setVariant('filled').setSize('large').fixedHeight(40)),
      U('bt-icon', 'size · icon（数字/图标窄按钮）',
        new ButtonCell('bt_icon').setLabel('7').setVariant('outlined').setSize('icon').fixedHeight(24)),
      U('bt-danger-tonal', 'danger · tonal（变体可组合语义色）',
        new ButtonCell('bt_danger').setLabel('删除').setType('danger').setVariant('tonal')),
    ]],
    ['bt-row3', 84, [
      U('bt-large-outlined', 'large · outlined（描边内阴影不挤文字）',
        new ButtonCell('bt_lg_out').setLabel('描边大按钮').setVariant('outlined').setSize('large').fixedHeight(40)),
      U('bt-small-tonal', 'small · tonal',
        new ButtonCell('bt_sm_tonal').setLabel('小号柔和').setVariant('tonal').setSize('small').fixedHeight(24)),
      U('bt-text-danger', 'danger · text',
        new ButtonCell('bt_txt_danger').setLabel('危险文字按钮').setType('danger').setVariant('text')),
      U('bt-group', '四角独立圆角 · 并排连接处 4px',
        new ButtonGroupDemoCell('bt_group')),
    ]],
  ]);

  // ---------- 05 列表与数据（12） ----------
  // 行高 250 / 184 / 124：Calendar 约 212、Kanban min 120、Carousel 80
  const secList = buildSection('sec-list', '06', '列表与数据', 12, [
    ['l-row1', 258, [
      U('l-list', 'ListCell', new ListCell('l_list').setItems([
        { id: 'a', title: '设计系统', subtitle: '规范与组件', icon: '◆' },
        { id: 'b', title: '组件库', subtitle: '80 个预设 Cell', icon: '●' },
        { id: 'c', title: '文档中心', subtitle: '设计文档', icon: '■' },
      ]).setSelected('a')),
      U('l-table', 'TableCell', new TableCell('l_table').setColumns([
        { key: 'name', title: '名称' }, { key: 'type', title: '类型' }, { key: 'size', title: '大小' },
      ]).setRows([
        { id: 't1', name: 'cell-base.jsx', type: 'jsx', size: '24 KB' },
        { id: 't2', name: 'data-dag.js', type: 'js', size: '16 KB' },
        { id: 't3', name: 'i18n.js', type: 'js', size: '8 KB' },
      ]).setSelectedRow('t1')),
      U('l-tree', 'TreeCell', new TreeCell('l_tree').setNodes([
        { id: 'r', title: 'src', children: [
          { id: 'c', title: 'core', children: [
            { id: 'c1', title: 'cell' }, { id: 'c2', title: 'i18n' }, { id: 'c3', title: 'box' },
          ] },
          { id: 'b', title: 'builtin-cells' },
          { id: 'd', title: 'demo' },
        ] },
      ]).setExpanded(['r', 'c'])),
      U('l-calendar', 'CalendarCell', new CalendarCell('l_cal').setYear(2026).setMonth(8).setSelected('2026-08-11')),
    ]],
    ['l-row2', 184, [
      U('l-kanban', 'KanbanCell', new KanbanCell('l_kanban').setColumns([
        { id: 'todo', title: '待办', items: [{ id: 'k1', title: '写文档' }, { id: 'k2', title: '评审' }] },
        { id: 'done', title: '已完成', items: [{ id: 'k3', title: '预设库' }] },
      ])),
      U('l-menu', 'MenuCell', new MenuCell('l_menu').setItems([
        { id: 'm1', title: '仪表盘', icon: '◈' },
        { id: 'm2', title: '项目列表', icon: '▤' },
        { id: 'm3', title: '设置', icon: '⚙' },
      ]).setSelected('m1')),
      U('l-order', 'OrderCell', new OrderCell('l_order').setItems([
        { id: 'o1', title: '苹果', amount: 12 },
        { id: 'o2', title: '香蕉', amount: 35 },
        { id: 'o3', title: '橙子', amount: 21 },
      ])),
      U('l-accordion', 'AccordionCell', new AccordionCell('l_acc').setItems([
        { id: 'a1', title: '什么是 Cell？', content: 'Cell 是数据驱动的可复用 UI 单元，由 CellBaseBuilder 构建。' },
        { id: 'a2', title: '如何使用 fill？', content: '页面作者用 fill(slot, cells) 向插槽内填入子 Cell。' },
      ])),
    ]],
    ['l-row3', 124, [
      U('l-carousel', 'CarouselCell', new CarouselCell('l_car').setItems([
        { id: 'c1', text: '轮播内容 1：Hound UI-Kit' },
        { id: 'c2', text: '轮播内容 2：数据驱动' },
        { id: 'c3', text: '轮播内容 3：预设丰富' },
      ])),
      U('l-pagination', 'PaginationCell', new PaginationCell('l_page').setTotal(86).setPageSize(10).setCurrent(3)
        .onChange(page => console.log('[preset-demo] page:', page))),
      U('l-breadcrumb', 'BreadcrumbCell', new BreadcrumbCell('l_crumb').setItems([
        { id: 'b1', title: '首页' }, { id: 'b2', title: '组件' }, { id: 'b3', title: 'Cell' },
      ])),
      U('l-index', 'IndexBarCell', new IndexBarCell('l_index').setIndexes(['A', 'B', 'C', 'D', 'E', 'F'])
        .setActiveIndex('B')),
    ]],
  ]);

  // ---------- 06 导航（3） ----------
  // 行高 92 / 164：NavBar 44、TabBar 48、Tab 120
  const secNav = buildSection('sec-nav', '07', '导航', 3, [
    ['n-row1', 92, [
      U('n-bar', 'NavBarCell', new NavBarCell('n_bar').setTitle('导航栏').setItems([
        { id: 'n1', title: '首页' }, { id: 'n2', title: '组件' }, { id: 'n3', title: '文档' },
      ]).setActiveId('n1').onSelect(id => console.log('[preset-demo] nav:', id))),
      U('n-tabbar', 'TabBarCell', new TabBarCell('n_tabbar').setItems([
        { id: 'b1', title: '首页', icon: '🏠' },
        { id: 'b2', title: '分类', icon: '📂' },
        { id: 'b3', title: '我的', icon: '👤' },
      ]).setActiveId('b1').onSelect(id => console.log('[preset-demo] tabbar:', id))),
    ]],
    ['n-row2', 164, [
      U('n-tab', 'TabCell', new TabCell('n_tab').setTabs([
        { id: 't1', title: '概览', content: '标签页 1：整体概览说明。' },
        { id: 't2', title: '属性', content: '标签页 2：属性配置说明。' },
        { id: 't3', title: '事件', content: '标签页 3：事件回调说明。' },
      ]).setActiveId('t1')),
    ]],
  ]);

  // ---------- 07 反馈与状态（7） ----------
  // 行高 88 / 200：Alert 40、Empty 140、Result 160
  const secFeedback = buildSection('sec-feedback', '08', '反馈与状态', 7, [
    ['k-row1', 88, [
      U('k-alert', 'AlertCell', new AlertCell('k_alert').setType('warning')
        .setText('注意：内存使用已达 85%').setClosable(true)),
      U('k-notice', 'NoticeCell', new NoticeCell('k_notice').setType('info')
        .setText('新版本 1.2.0 已发布').setClosable(true)),
      U('k-loading', 'LoadingCell', new LoadingCell('k_loading').setText('加载中…')),
      U('k-skeleton', 'SkeletonCell · line', new SkeletonCell('k_skel').setType('line').setHeight(16)),
    ]],
    ['k-row2', 200, [
      U('k-empty', 'EmptyCell', new EmptyCell('k_empty').setGlyph('📭').setText('暂无数据').setDesc('点击刷新重试')),
      U('k-result', 'ResultCell', new ResultCell('k_result').setStatus('success')
        .setTitle('提交成功').setDesc('您的申请已受理')),
      U('k-skeleton-block', 'SkeletonCell · block', new SkeletonCell('k_skel2').setType('block').setHeight(48)),
    ]],
  ]);

  // ---------- 09 浮层与弹窗（11） ----------
  // 行高 70：ButtonCell 32 → 70 - 38 = 32 恰好贴合
  const secFloat = buildSection('sec-float', '09', '浮层与弹窗', 11, [
    ['o-row1', 70, [
      U('o-toast', 'ToastCell', new ButtonCell('o_btnToast').setLabel('轻提示').setType('primary')
        .onPress(() => toastCell.open())),
      U('o-message', 'MessageCell', new ButtonCell('o_btnMsg').setLabel('消息条')
        .onPress(() => messageCell.open())),
      U('o-tooltip', 'TooltipCell', new ButtonCell('o_btnTip').setLabel('气泡提示')
        .onPress(() => tooltipCell.open())),
      U('o-popover', 'PopoverCell', new ButtonCell('o_btnPop').setLabel('气泡卡片')
        .onPress(() => popoverCell.open())),
    ]],
    ['o-row2', 70, [
      U('o-confirm', 'ConfirmCell', new ButtonCell('o_btnConfirm').setLabel('确认框').setType('primary')
        .onPress(() => confirmCell.open())),
      U('o-dialog', 'DialogCell', new ButtonCell('o_btnDialog').setLabel('对话框')
        .onPress(() => dialogCell.open())),
      U('o-drawer', 'DrawerCell', new ButtonCell('o_btnDrawer').setLabel('侧滑抽屉')
        .onPress(() => drawerCell.open())),
      U('o-panel', 'FloatingPanelCell', new ButtonCell('o_btnPanel').setLabel('浮动面板')
        .onPress(() => floatPanelCell.open())),
    ]],
    // 窗口族：可拖拽缩放窗口 / 固定窗口 / 模态窗口
    ['o-row3', 70, [
      U('o-window', 'WindowCell · 可拖拽缩放',
        new ButtonCell('o_btnWindow').setLabel('独立窗口').setVariant('tonal')
          .onPress(() => windowCell.open())),
      U('o-pinned', 'WindowCell · 固定窗口',
        new ButtonCell('o_btnPinned').setLabel('固定窗口').setVariant('outlined')
          .onPress(() => windowPinned.open())),
      U('o-modal', 'ModalCell · 模态窗口',
        new ButtonCell('o_btnModal').setLabel('模态窗口').setVariant('tonal')
          .onPress(() => modalCell.open())),
    ]],
  ]);

  // ---------- 10 业务与内容（8） ----------
  // 行高 184 / 184 / 208：Profile 88、Editor/Document/Media min 120、Login 170
  const secBiz = buildSection('sec-biz', '10', '业务与内容', 8, [
    ['b-row1', 184, [
      U('b-profile', 'ProfileCell', new ProfileCell('b_profile').setName('张三').setRole('管理员')
        .setDescription('全栈工程师').setColor('primary')),
      U('b-settings', 'SettingsCell', new SettingsCell('b_settings').setTitle('消息通知').setDesc('接收系统推送')
        .fill('control', new SwitchCell('b_sw').setEnabled(true))),
      U('b-upload', 'UploadCell', new UploadCell('b_upload').setText('选择文件').setFileList([
        { id: 'u1', name: 'design.pdf', size: 128 },
      ]).onUpload(() => console.log('[preset-demo] upload'))),
    ]],
    ['b-row2', 184, [
      U('b-editor', 'EditorCell', new EditorCell('b_editor').setContent('').setPlaceholder('请输入正文内容…')),
      U('b-document', 'DocumentCell', new DocumentCell('b_doc')
        .setContent('只读文档内容。\n支持 pre-wrap 多行展示，适合说明性文本。')),
      U('b-media', 'MediaCell', new MediaCell('b_media').setType('image')
        .setSrc('https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=modern%20ui%20kit%20dashboard%20design%20banner%20blue%20gradient&image_size=landscape_4_3')
        .setCaption('示例媒体图')),
    ]],
    ['b-row3', 208, [
      U('b-login', 'LoginCell', new LoginCell('b_login').setSubmitText('立即登录')
        .onSubmit(({ username, password }) => {
          console.log('[preset-demo] login:', username, password);
        })),
      U('b-chat', 'ChatCell', new ChatCell('b_chat').setMessages([
        { id: 'm1', from: '客服', text: '您好，请问有什么可以帮您？', mine: false },
        { id: 'm2', from: '我', text: '我想了解预设 Cell 的用法。', mine: true },
      ])),
    ]],
  ]);

  // ---------- 10 容器与布局（15） ----------
  // 行高 184 / 116 / 184 / 202 / 124 / 242：Grid min 160、Split min 200
  const secContainer = buildSection('sec-container', '11', '容器与布局', 15, [
    ['c-row1', 184, [
      U('c-card', 'CardCell', new CardCell('c_card')
        .fill('header', T('c_card_t', '卡片标题', { size: 13, bold: true, color: 'text' }))
        .fill('body', [
          T('c_card_b', '卡片内容：header 单插槽 + body 滚动插槽。', { size: 12, color: 'text-secondary' }),
          new ButtonCell('c_card_btn').setLabel('查看详情')
            .onPress(() => console.log('[preset-demo] card btn')),
        ])),
      U('c-panel', 'PanelCell', new PanelCell('c_panel')
        .fill('header', T('c_panel_t', '面板标题', { size: 13, bold: true, color: 'text' }))
        .fill('_default', [
          T('c_panel_b', '面板内容：header 插槽 + 默认插槽。', { size: 12, color: 'text-secondary' }),
        ])),
      U('c-section', 'SectionCell', new SectionCell('c_sec').setTitle('内嵌分区').fill('_default', [
        T('c_sec_b', '分区容器可在任意位置内嵌使用。', { size: 12, color: 'text-secondary' }),
      ])),
    ]],
    ['c-row2', 116, [
      U('c-field', 'FieldCell', new FieldCell('c_field')
        .fill('label', T('c_field_lb', '用户名', { size: 12, color: 'text' }))
        .fill('control', new InputCell('c_field_in').setPlaceholder('请输入用户名'))),
      U('c-control', 'ControlCell', new ControlCell('c_control')
        .fill('label', T('c_control_lb', '消息通知', { size: 12, color: 'text' }))
        .fill('control', new SwitchCell('c_control_sw').setEnabled(false))),
      U('c-tiling', 'TilingCell', new TilingCell('c_tiling').fill('_default', [
        new TagCell('c_tiling_t1').setText('平铺 1').setColor('primary'),
        new TagCell('c_tiling_t2').setText('平铺 2').setColor('success'),
        new TagCell('c_tiling_t3').setText('平铺 3').setColor('warning'),
        new TagCell('c_tiling_t4').setText('平铺 4').setColor('danger'),
      ])),
    ]],
    ['c-row3', 184, [
      U('c-form', 'FormCell', new FormCell('c_form').fill('_default', [
        new FieldCell('c_form_f1')
          .fill('label', T('c_form_lb1', '邮箱', { size: 12, color: 'text' }))
          .fill('control', new InputCell('c_form_in1').setPlaceholder('name@example.com')),
        new FieldCell('c_form_f2')
          .fill('label', T('c_form_lb2', '密码', { size: 12, color: 'text' }))
          .fill('control', new InputCell('c_form_in2').setPlaceholder('请输入密码')),
        new ButtonCell('c_form_sub').setLabel('提交').setType('primary')
          .onPress(() => console.log('[preset-demo] form submit')),
      ])),
      U('c-group', 'GroupCell', new GroupCell('c_group').fill('_default', [
        T('c_group_t', '分组标题', { size: 13, bold: true, color: 'text' }),
        T('c_group_b', '分组内容：纵向容器；Edge/Corner 覆盖层默认隐藏。', { size: 12, color: 'text-secondary' }),
      ])),
    ]],
    ['c-row4', 202, [
      U('c-grid', 'GridCell', new GridCell('c_grid').fill('_default', [
        new TagCell('c_grid_t1').setText('网格项 1').setColor('primary'),
        new TagCell('c_grid_t2').setText('网格项 2').setColor('success'),
        new TagCell('c_grid_t3').setText('网格项 3').setColor('warning'),
        new TagCell('c_grid_t4').setText('网格项 4').setColor('danger'),
      ])),
      U('c-dashboard', 'DashboardCell', new DashboardCell('c_dash').fill('_default', [
        new StatCell('c_dash_s1').setLabel('访问量').setValue(12800).setColor('primary'),
        new StatCell('c_dash_s2').setLabel('订单数').setValue(326).setColor('success'),
        new StatCell('c_dash_s3').setLabel('转化率').setValue(3.6).setSuffix('%').setColor('warning'),
      ])),
    ]],
    ['c-row5', 124, [
      U('c-row', 'RowCell', new RowCell('c_row').fixedHeight(56).fill('_default', [
        new TagCell('c_row_t1').setText('行项 1').setColor('primary'),
        new TagCell('c_row_t2').setText('行项 2').setColor('success'),
      ])),
      U('c-appbar', 'AppBarCell', new AppBarCell('c_appbar').fill('_default', [
        T('c_appbar_t', '顶栏', { size: 12, bold: true, color: 'on-primary' }),
      ])),
      U('c-footer', 'FooterCell', new FooterCell('c_footer').fill('_default', [
        T('c_footer_t', '页脚', { size: 12, color: 'inverse-on-surface' }),
      ])),
    ]],
    ['c-row6', 242, [
      // Split 的两块区域用不同底色（主区 surface / 侧栏 surface-muted），
      // 侧栏放多条导航项、主区放标题 + 多段正文，拖拽分界线即可看出宽度变化
      U('c-split', 'SplitCell', new SplitCell('c_split').color('surface')
        .fill('side', new DemoColumn('c_split_side').fixedHeight(200).padding(12).gap(4).fill('_default', [
          T('c_split_s0', '导航', { size: 12, bold: true, color: 'text' }).fixedHeight(28),
          T('c_split_s1', '● 概览', { size: 12, bold: true, color: 'primary' }).fixedHeight(28),
          T('c_split_s2', '○ 数据看板', { size: 12, color: 'text-secondary' }).fixedHeight(28),
          T('c_split_s3', '○ 成员管理', { size: 12, color: 'text-secondary' }).fixedHeight(28),
          T('c_split_s4', '○ 系统设置', { size: 12, color: 'text-secondary' }).fixedHeight(28),
        ]))
        .fill('_default', new DemoColumn('c_split_main').padding(16).gap(8).fill('_default', [
          T('c_split_m1', '主区 · 概览', { size: 14, bold: true, color: 'text' }).fixedHeight(28),
          T('c_split_m2', '侧栏默认宽 200（140–320），可拖拽分界线调宽。', { size: 12, color: 'text-secondary' }).fixedHeight(24),
          T('c_split_m3', '主区弹性占满剩余宽度，与侧栏底色区分开。', { size: 12, color: 'text-muted' }).fixedHeight(24),
          new ButtonCell('c_split_btn').setLabel('主区操作').setVariant('tonal'),
        ]))),
      U('c-board', 'BoardCell', new BoardCell('c_board').fill('_default', [
        T('c_board_t1', '板块自带样式（形状 + 描边）', { size: 12, color: 'text' }).fixedHeight(32),
        T('c_board_t2', '内部 padding/gap 保持内容间距', { size: 12, color: 'text-secondary' }).fixedHeight(32),
        T('c_board_t3', '与同级元素的间距由父容器 gap 承担', { size: 12, color: 'text-muted' }),
      ])),
    ]],
  ]);

  // ---------- 根装配 ----------
  const sections = [
    secDisplay, secStat, secForm, secInteract, secButton, secList,
    secNav, secFeedback, secFloat, secBiz, secContainer,
  ];
  // 画布总高 = 两侧内边距 + Hero + 分区总高 + 分区间距（子项数 - 1）
  const canvasHeight = PAGE_PAD * 2 + HERO_H
    + sections.reduce((sum, sec) => sum + sec._demoH, 0)
    + sections.length * PAGE_GAP;
  const canvas = new DemoCanvas('canvas').fixedHeight(canvasHeight).fill('_default', [hero, ...sections]);

  const page = new PageCell('preset-demo').color('surface-muted').fill('_default', [
    createPageNav('presets'),
    canvas,
  ]);

  // 一次性挂载全树（根据 slot 关系自动级联）
  page.mount(dag._root);
  // 浮层预设与页面并列挂载（独立 reflow 根，由 FloatingLayer 渲染）；
  // 浮动视口默认可见，mount 后显式 close() 使其初始隐藏，由按钮触发 open()
  [toastCell, messageCell, tooltipCell, popoverCell, confirmCell, dialogCell, drawerCell, floatPanelCell,
    windowCell, windowPinned, modalCell]
    .forEach(c => c.mount(dag._root).close());

  // 渲染
  return page.react();
}

/**
 * 模块级构建一次 Cell 树，避免 StrictMode 双调用导致重复构造。
 * @type {JSX.Element}
 */
const _presetDemoElement = buildPresetDemo();

/**
 * 预设展示台组件。直接返回模块级构建好的元素（惰性渲染，避免重复挂载）。
 * @returns {JSX.Element} 页面根元素
 */
const PresetDemoPage = () => _presetDemoElement;

export default PresetDemoPage;
