/**
 * @file preset-demo-page.jsx —— 预设 Cell 展示台
 *
 * 集中展示 src/builtin-cells/ 下全部 75 个扩展预设 Cell 的实际用法与效果。
 * 与 cell-demo-page（工作台）互补：工作台侧重"数据驱动交互 + 框架特性"，
 * 本页侧重"预设速览"——按 10 大类分区块陈列，每个预设都给出真实的数据。
 *
 * 页面使用模式与工作台一致：
 *   1) 根 Cell 用内置 PageCell（viewport + 纵向滚动）
 *   2) 区块容器用本页自定义的 DemoSection（全宽、显式高度），区块内用
 *      DemoRow（横向行，显式固定高）/ DemoUnit（上标签 + 下内容）规整陈列
 *   3) 浮层类预设（Toast/Dialog/Drawer/…）不与页面嵌套，而是与页面并列
 *      mount(dag._root)；浮动视口默认可见，mount 后调用 close() 隐藏，
 *      由"浮层与弹窗"区块内的按钮经 onPress 触发 open()
 *   4) 文本一律传纯中文（useText 对未注册文本原样返回，无需注册 i18n key）
 */
import React from 'react';
import {
  CellBaseBuilder, DataDag, TextCell, ToggleCell, ButtonCell,
  AccordionCell, AlertCell, AvatarCell, BadgeCell, BarCell, BreadcrumbCell,
  CalendarCell, CardCell, CarouselCell, ChartCell, ChatCell, CheckboxCell,
  ColorPickerCell, ConfirmCell, ControlCell, DashboardCell, DatePickerCell,
  DialogCell, DividerCell, DocumentCell, DrawerCell, EditorCell, EmptyCell,
  FieldCell, FloatingPanelCell, FormCell, GridCell, GroupCell, IconCell,
  IndexBarCell, InputCell, JoyConCell, KanbanCell, ListCell, LoadingCell,
  LoginCell, MediaCell, MenuCell, MessageCell, NavBarCell, NoticeCell,
  OrderCell, PageCell, PaginationCell, PanelCell, PickerCell, PopoverCell,
  ProcessCell, ProfileCell, ProgressCell, RadioCell, RateCell, ResultCell,
  SearchCell, SectionCell, SelectCell, SettingsCell, SkeletonCell, SliderCell,
  StatCell, StepperCell, SwitchCell, TabBarCell, TabCell, TableCell, TagCell,
  TextareaCell, TilingCell, TimelineCell, TitleCell, ToastCell, TooltipCell,
  TreeCell, UploadCell,
} from '../core/ui-kit';

// =========================================================================
//  辅助容器（本页内部布局用）
// =========================================================================

/**
 * 展示行：横向排列、双轴锁定、固定高（由调用方显式指定）、隐藏子项拖拽手柄。
 * 横向 reflow 对子项均分宽度；子项高度拉伸到行高。
 */
class DemoRow extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.layout('horizontal').moveX(false).moveY(false)
      .backgroundColor('#f7f8fa').showChildOverlays(false);
  }
}

/**
 * 展示单元：纵向容器，上方 label 单插槽（浅蓝标签，固定高 22）标注预设名，
 * 下方 content 单插槽陈列预设实例（非滚动类）。宽度均分、高度拉伸到行高。
 */
class DemoUnit extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.layout('vertical').moveX(false).moveY(false).backgroundColor('#ffffff')
      .defineSlot('label', {
        fixedHeight: 22, backgroundColor: '#eef2f7', layout: 'horizontal',
        moveX: false, moveY: false, single: true,
      })
      .defineSlot('content', {
        layout: 'vertical', moveX: false, moveY: false,
        backgroundColor: '#ffffff', showChildOverlays: false,
      });
  }
}

/**
 * 展示区块：纵向容器，全宽（无 defaultWidth 故占满父宽），显式固定高。
 * 顶部 title 单插槽（浅灰标题栏，固定高 32），下方默认插槽排布展示行。
 */
class DemoSection extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.layout('vertical').moveX(false).moveY(false).backgroundColor('#ffffff')
      .defineSlot('title', {
        fixedHeight: 32, backgroundColor: '#fafafa', layout: 'horizontal',
        moveX: false, moveY: false, single: true,
      })
      .showChildOverlays(false);
  }
}

/**
 * 页首 Hero：蓝色横条，纵向排列标题与副标题。
 */
class DemoHeroCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.layout('vertical').moveX(false).moveY(false).fixedHeight(92)
      .backgroundColor('#4a90d9').showChildOverlays(false);
  }
}

/**
 * 快捷构建展示单元：标签名 + 内容预设实例。
 * @param {string} id 单元 id
 * @param {string} name 标签文本（预设名）
 * @param {CellBaseBuilder} cell 内容预设实例
 * @returns {DemoUnit} 展示单元
 */
const U = (id, name, cell) => new DemoUnit(id)
  .fill('label', new TextCell(`${id}_lb`).setText(name).setSize(11).setColor('#7a8ba3'))
  .fill('content', cell);

/**
 * 快捷构建展示行：固定高度 + 横向填充若干单元。
 * @param {string} id 行 id
 * @param {number} height 行高（px）
 * @param {CellBaseBuilder[]} cells 行内 Cell 列表
 * @returns {DemoRow} 展示行
 */
const R = (id, height, cells) => new DemoRow(id).fixedHeight(height).fill('_default', cells);

/**
 * 快捷构建分区：标题 + 若干展示行，区块高度 = 32 标题 + 行高和。
 * @param {string} id 分区 id
 * @param {string} title 分区标题
 * @param {number} height 区块总高（px）
 * @param {CellBaseBuilder[]} rows 分区内行列表
 * @returns {DemoSection} 分区
 */
const S = (id, title, height, rows) => new DemoSection(id).fixedHeight(height)
  .fill('title', new TextCell(`${id}_t`).setText(title).setSize(13).setBold(true).setColor('#333'))
  .fill('_default', rows);

// =========================================================================
//  页面装配
// =========================================================================

/**
 * 构建预设展示树。新建 DataDag，组装 10 个分区；浮层预设与页面并列 mount，
 * 由按钮经 onPress 触发 open()。根 Cell 调用 mount(dag._root) 级联挂载。
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
    .setText('确定要删除这条数据吗？').setOkText('确定').setCancelText('取消')
    .posX(260).posY(260)
    .onOk(() => toastCell.open());
  const dialogCell = new DialogCell('dialog')
    .fill('header', new TextCell('dlgTitle').setText('操作确认').setSize(13).setBold(true).setColor('#333'))
    .fill('body', [
      new TextCell('dlgBody').setText('对话框容器：header 单插槽 + body 列表插槽。').setSize(12).setColor('#555'),
      new ButtonCell('dlgOk').setLabel('知道了').onPress(() => dialogCell.close()),
    ]);
  const drawerCell = new DrawerCell('drawer')
    .setTitle('侧滑抽屉').setText('抽屉正文内容，可经 posX/posY 贴屏幕右缘展示。')
    .posX(760).posY(0);
  const floatPanelCell = new FloatingPanelCell('floatPanel')
    .posX(380).posY(120)
    .fill('header', new TextCell('fpTitle').setText('浮动面板（可拖拽缩放）').setSize(12).setBold(true).setColor('#ffffff'))
    .fill('body', [
      new ListCell('fpList').setItems([
        { id: 'f1', title: '浮动面板示例项一' },
        { id: 'f2', title: '浮动面板示例项二' },
        { id: 'f3', title: '浮动面板示例项三' },
      ]),
      new ButtonCell('fpClose').setLabel('关闭').onPress(() => floatPanelCell.close()),
    ]);

  // ---------- 页首 ----------
  const hero = new DemoHeroCell('hero').fill('_default', [
    new TextCell('heroTitle').setText('Hound UI-Kit 预设 Cell 展示台').setSize(20).setBold(true).setColor('#ffffff'),
    new TextCell('heroDesc').setText('75 个扩展预设 Cell 分类速览：展示 · 指标 · 表单 · 交互 · 列表 · 导航 · 反馈 · 浮层 · 业务 · 容器')
      .setSize(12).setColor('rgba(255,255,255,0.85)'),
  ]);

  // ---------- 1. 文本与展示（32 + 62 + 70 = 164） ----------
  const secDisplay = S('sec-display', '1. 文本与展示', 164, [
    R('d-row1', 62, [
      U('d-title', 'TitleCell', new TitleCell('d_title').setText('标题文本').setColor('#4a90d9').setAlign('center')),
      U('d-text', 'TextCell', new TextCell('d_text').setText('通用文本').setSize(13).setBold(true)),
      U('d-tag', 'TagCell', new TagCell('d_tag').setText('默认标签')),
      U('d-badge', 'BadgeCell', new BadgeCell('d_badge').setCount(120).setMax(99)),
    ]),
    R('d-row2', 70, [
      U('d-avatar', 'AvatarCell', new AvatarCell('d_avatar').setName('张').setSize(40).setColor('#e07a3a')),
      U('d-icon', 'IconCell', new IconCell('d_icon').setGlyph('★').setSize(24).setColor('#f0a020')),
      U('d-divider', 'DividerCell', new DividerCell('d_divider').setText('分隔说明').setOrientation('horizontal')),
    ]),
  ]);

  // ---------- 2. 数据指标（32 + 98 + 150 + 150 = 430） ----------
  const secStat = S('sec-stat', '2. 数据指标', 430, [
    R('s-row1', 98, [
      U('s-stat', 'StatCell', new StatCell('s_stat').setLabel('本月销售额').setValue(12800).setSuffix('元').setTrend(12.5).setColor('#4a90d9')),
      U('s-progress', 'ProgressCell', new ProgressCell('s_progress').setPercent(72).setShowText(true)),
      U('s-rate', 'RateCell', new RateCell('s_rate').setValue(4).setCount(5)),
      U('s-process', 'ProcessCell', new ProcessCell('s_process').setSteps([
        { id: 'p1', title: '下单' }, { id: 'p2', title: '支付' },
        { id: 'p3', title: '发货' }, { id: 'p4', title: '完成' },
      ]).setCurrent(2)),
    ]),
    R('s-row2', 150, [
      new BarCell('s_bar').setItems([
        { label: '一月', value: 62 }, { label: '二月', value: 88 },
        { label: '三月', value: 45 }, { label: '四月', value: 96 },
        { label: '五月', value: 71 },
      ]),
      new TimelineCell('s_timeline').setItems([
        { id: 't1', time: '09:00', title: '晨会', desc: '同步今日计划' },
        { id: 't2', time: '10:30', title: '评审', desc: '设计稿评审' },
        { id: 't3', time: '14:00', title: '编码', desc: '实现预设 Cell' },
      ]),
    ]),
    R('s-row3', 150, [
      new ChartCell('s_chartBar').setType('bar').setColor('#4a90d9').setLabels(['A', 'B', 'C', 'D'])
        .setData([34, 55, 41, 78]),
      new ChartCell('s_chartLine').setType('line').setColor('#e07a3a').setLabels(['A', 'B', 'C', 'D'])
        .setData([20, 45, 30, 62]),
    ]),
  ]);

  // ---------- 3. 表单与输入（32 + 62 + 90 + 110 = 294） ----------
  const secForm = S('sec-form', '3. 表单与输入', 294, [
    R('f-row1', 62, [
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
    ]),
    R('f-row2', 90, [
      U('f-slider', 'SliderCell', new SliderCell('f_slider').setLabel('亮度').setMin(0).setMax(100).setValue(60)),
      U('f-stepper', 'StepperCell', new StepperCell('f_stepper').setLabel('数量').setValue(3).setMin(0).setMax(10)),
      U('f-date', 'DatePickerCell', new DatePickerCell('f_date').setValue('2026-08-11').setPlaceholder('选择日期')),
      U('f-color', 'ColorPickerCell', new ColorPickerCell('f_color').setColor('#1a8a4a')),
    ]),
    R('f-row3', 110, [
      U('f-textarea', 'TextareaCell', new TextareaCell('f_textarea').setLabel('备注').setPlaceholder('请输入补充说明…')),
    ]),
  ]);

  // ---------- 4. 选择与交互（32 + 66 + 70 + 150 = 318） ----------
  const secInteract = S('sec-interact', '4. 选择与交互', 318, [
    R('i-row1', 66, [
      U('i-check', 'CheckboxCell', new CheckboxCell('i_check').setLabel('接受协议').setChecked(true)),
      U('i-switch', 'SwitchCell', new SwitchCell('i_switch').setLabel('消息通知').setEnabled(true)),
      U('i-radio1', 'RadioCell', new RadioCell('i_radio1').setLabel('按月').setChecked(true).setGroup('billing')),
      U('i-radio2', 'RadioCell', new RadioCell('i_radio2').setLabel('按年').setChecked(false).setGroup('billing')),
    ]),
    R('i-row2', 70, [
      U('i-btn1', 'ButtonCell', new ButtonCell('i_btn1').setLabel('主按钮').setType('primary').onPress(() => {
        toastCell.setText('主按钮被点击').setType('info').setDuration(1500).open();
      })),
      U('i-btn2', 'ButtonCell', new ButtonCell('i_btn2').setLabel('次按钮').setType('default')),
      U('i-btn3', 'ButtonCell', new ButtonCell('i_btn3').setLabel('禁用按钮').setDisabled(true)),
      U('i-toggle', 'ToggleCell', new ToggleCell('i_toggle').setLabel('核心开关').setEnabled(true)),
    ]),
    R('i-row3', 150, [
      new JoyConCell('i_joy').onMove(dir => console.log('[preset-demo] joy move:', dir)),
    ]),
  ]);

  // ---------- 5. 列表与数据（32 + 170 + 150 + 170 + 150 = 672） ----------
  const secList = S('sec-list', '5. 列表与数据', 672, [
    R('l-row1', 170, [
      new ListCell('l_list').setItems([
        { id: 'a', title: '设计系统', subtitle: '规范与组件', icon: '◆' },
        { id: 'b', title: '组件库', subtitle: '75 个预设 Cell', icon: '●' },
        { id: 'c', title: '文档中心', subtitle: '设计文档', icon: '■' },
      ]).setSelected('a'),
      new MenuCell('l_menu').setItems([
        { id: 'm1', title: '仪表盘', icon: '◈' },
        { id: 'm2', title: '项目列表', icon: '▤' },
        { id: 'm3', title: '设置', icon: '⚙' },
      ]).setSelected('m1'),
      new CalendarCell('l_cal').setYear(2026).setMonth(8).setSelected('2026-08-11'),
      new IndexBarCell('l_index').setIndexes(['A', 'B', 'C', 'D', 'E', 'F']).setActiveIndex('B'),
    ]),
    R('l-row2', 150, [
      new OrderCell('l_order').setItems([
        { id: 'o1', title: '苹果', amount: 12 },
        { id: 'o2', title: '香蕉', amount: 35 },
        { id: 'o3', title: '橙子', amount: 21 },
      ]),
      new AccordionCell('l_acc').setItems([
        { id: 'a1', title: '什么是 Cell？', content: 'Cell 是数据驱动的可复用 UI 单元，由 CellBaseBuilder 构建。' },
        { id: 'a2', title: '如何使用 fill？', content: '页面作者用 fill(slot, cells) 向插槽内填入子 Cell。' },
      ]),
      new CarouselCell('l_car').setItems([
        { id: 'c1', text: '轮播内容 1：Hound UI-Kit' },
        { id: 'c2', text: '轮播内容 2：数据驱动' },
        { id: 'c3', text: '轮播内容 3：预设丰富' },
      ]),
      new BreadcrumbCell('l_crumb').setItems([
        { id: 'b1', title: '首页' }, { id: 'b2', title: '组件' }, { id: 'b3', title: 'Cell' },
      ]),
    ]),
    R('l-row3', 170, [
      new TableCell('l_table').setColumns([
        { key: 'name', title: '名称' }, { key: 'type', title: '类型' }, { key: 'size', title: '大小' },
      ]).setRows([
        { id: 't1', name: 'cell-base.jsx', type: 'jsx', size: '24 KB' },
        { id: 't2', name: 'data-dag.js', type: 'js', size: '16 KB' },
        { id: 't3', name: 'i18n.js', type: 'js', size: '8 KB' },
      ]).setSelectedRow('t1'),
      new TreeCell('l_tree').setNodes([
        { id: 'r', title: 'src', children: [
          { id: 'c', title: 'core', children: [
            { id: 'c1', title: 'cell' }, { id: 'c2', title: 'i18n' }, { id: 'c3', title: 'box' },
          ] },
          { id: 'b', title: 'builtin-cells' },
          { id: 'd', title: 'demo' },
        ] },
      ]).setExpanded(['r', 'c']),
    ]),
    R('l-row4', 150, [
      new KanbanCell('l_kanban').setColumns([
        { id: 'todo', title: '待办', items: [{ id: 'k1', title: '写文档' }, { id: 'k2', title: '评审' }] },
        { id: 'done', title: '已完成', items: [{ id: 'k3', title: '预设库' }] },
      ]),
      new PaginationCell('l_page').setTotal(86).setPageSize(10).setCurrent(3)
        .onChange(page => console.log('[preset-demo] page:', page)),
    ]),
  ]);

  // ---------- 6. 导航（32 + 44 + 120 + 48 = 244） ----------
  const secNav = S('sec-nav', '6. 导航', 244, [
    R('n-row1', 44, [
      new NavBarCell('n_bar').setTitle('导航栏').setItems([
        { id: 'n1', title: '首页' }, { id: 'n2', title: '组件' }, { id: 'n3', title: '文档' },
      ]).setActiveId('n1').onSelect(id => console.log('[preset-demo] nav:', id)),
    ]),
    R('n-row2', 120, [
      new TabCell('n_tab').setTabs([
        { id: 't1', title: '概览', content: '标签页 1：整体概览说明。' },
        { id: 't2', title: '属性', content: '标签页 2：属性配置说明。' },
        { id: 't3', title: '事件', content: '标签页 3：事件回调说明。' },
      ]).setActiveId('t1'),
    ]),
    R('n-row3', 48, [
      new TabBarCell('n_tabbar').setItems([
        { id: 'b1', title: '首页', icon: '🏠' },
        { id: 'b2', title: '分类', icon: '📂' },
        { id: 'b3', title: '我的', icon: '👤' },
      ]).setActiveId('b1').onChange(id => console.log('[preset-demo] tabbar:', id)),
    ]),
  ]);

  // ---------- 7. 反馈与状态（32 + 62 + 182 = 276） ----------
  const secFeedback = S('sec-feedback', '7. 反馈与状态', 276, [
    R('k-row1', 62, [
      U('k-alert', 'AlertCell', new AlertCell('k_alert').setType('warning').setText('注意：内存使用已达 85%').setClosable(true)),
      U('k-notice', 'NoticeCell', new NoticeCell('k_notice').setType('info').setText('新版本 1.2.0 已发布').setClosable(true)),
      U('k-loading', 'LoadingCell', new LoadingCell('k_loading').setText('加载中…')),
      U('k-skeleton', 'SkeletonCell', new SkeletonCell('k_skel').setType('line').setHeight(16)),
    ]),
    R('k-row2', 182, [
      U('k-empty', 'EmptyCell', new EmptyCell('k_empty').setGlyph('📭').setText('暂无数据').setDesc('点击刷新重试')),
      U('k-result', 'ResultCell', new ResultCell('k_result').setStatus('success').setTitle('提交成功').setDesc('您的申请已受理')),
      U('k-skel2', 'SkeletonCell', new SkeletonCell('k_skel2').setType('block').setHeight(48)),
    ]),
  ]);

  // ---------- 8. 浮层与弹窗（32 + 40 + 40 = 112） ----------
  const secFloat = S('sec-float', '8. 浮层与弹窗', 112, [
    R('o-row1', 40, [
      new ButtonCell('o_btnToast').setLabel('Toast 轻提示').setType('primary').onPress(() => toastCell.open()),
      new ButtonCell('o_btnMsg').setLabel('Message 消息条').onPress(() => messageCell.open()),
      new ButtonCell('o_btnTip').setLabel('Tooltip 气泡').onPress(() => tooltipCell.open()),
      new ButtonCell('o_btnPop').setLabel('Popover 气泡卡').onPress(() => popoverCell.open()),
    ]),
    R('o-row2', 40, [
      new ButtonCell('o_btnConfirm').setLabel('Confirm 确认框').setType('primary').onPress(() => confirmCell.open()),
      new ButtonCell('o_btnDialog').setLabel('Dialog 对话框').onPress(() => dialogCell.open()),
      new ButtonCell('o_btnDrawer').setLabel('Drawer 抽屉').onPress(() => drawerCell.open()),
      new ButtonCell('o_btnPanel').setLabel('浮动面板').onPress(() => floatPanelCell.open()),
    ]),
  ]);

  // ---------- 9. 业务与内容（32 + 122 + 120 + 170 + 150 = 594） ----------
  const secBiz = S('sec-biz', '9. 业务与内容', 594, [
    R('b-row1', 122, [
      U('b-profile', 'ProfileCell', new ProfileCell('b_profile').setName('张三').setRole('管理员').setDescription('全栈工程师').setColor('#4a90d9')),
      U('b-settings', 'SettingsCell', new SettingsCell('b_settings').setTitle('消息通知').setDesc('接收系统推送')
        .fill('control', new SwitchCell('b_sw').setEnabled(true))),
      U('b-upload', 'UploadCell', new UploadCell('b_upload').setText('选择文件').setFileList([
        { id: 'u1', name: 'design.pdf', size: 128 },
      ]).onUpload(() => console.log('[preset-demo] upload'))),
    ]),
    R('b-row2', 120, [
      new EditorCell('b_editor').setContent('').setPlaceholder('请输入正文内容…'),
      new DocumentCell('b_doc').setContent('只读文档内容。\n支持 pre-wrap 多行展示，适合说明性文本。'),
      new MediaCell('b_media').setType('image')
        .setSrc('https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=modern%20ui%20kit%20dashboard%20design%20banner%20blue%20gradient&image_size=landscape_4_3')
        .setCaption('示例媒体图'),
    ]),
    R('b-row3', 170, [
      new LoginCell('b_login').setSubmitText('立即登录').onSubmit(({ username, password }) => {
        console.log('[preset-demo] login:', username, password);
      }),
    ]),
    R('b-row4', 150, [
      new ChatCell('b_chat').setMessages([
        { id: 'm1', from: '客服', text: '您好，请问有什么可以帮您？', mine: false },
        { id: 'm2', from: '我', text: '我想了解预设 Cell 的用法。', mine: true },
      ]),
    ]),
  ]);

  // ---------- 10. 容器与布局（32 + 130 + 70 + 130 + 130 + 90 = 582） ----------
  const secContainer = S('sec-container', '10. 容器与布局', 582, [
    R('c-row1', 130, [
      new CardCell('c_card').fill('header', new TextCell('c_card_t').setText('卡片标题').setSize(13).setBold(true))
        .fill('body', [
          new TextCell('c_card_b').setText('卡片内容：header 单插槽 + body 滚动插槽。').setSize(12).setColor('#555'),
          new ButtonCell('c_card_btn').setLabel('查看详情').onPress(() => console.log('[preset-demo] card btn')),
        ]),
      new PanelCell('c_panel').fill('header', new TextCell('c_panel_t').setText('面板标题').setSize(13).setBold(true))
        .fill('_default', [
          new TextCell('c_panel_b').setText('面板内容：header 插槽 + 默认插槽。').setSize(12).setColor('#555'),
        ]),
    ]),
    R('c-row2', 70, [
      U('c-field', 'FieldCell', new FieldCell('c_field')
        .fill('label', new TextCell('c_field_lb').setText('用户名').setSize(13).setColor('#333'))
        .fill('control', new InputCell('c_field_in').setPlaceholder('请输入用户名'))),
      U('c-control', 'ControlCell', new ControlCell('c_control')
        .fill('label', new TextCell('c_control_lb').setText('消息通知').setSize(13).setColor('#333'))
        .fill('control', new SwitchCell('c_control_sw').setEnabled(false))),
    ]),
    R('c-row3', 130, [
      new FormCell('c_form').fill('_default', [
        new FieldCell('c_form_f1').fill('label', new TextCell('c_form_lb1').setText('邮箱').setSize(13).setColor('#333'))
          .fill('control', new InputCell('c_form_in1').setPlaceholder('name@example.com')),
        new FieldCell('c_form_f2').fill('label', new TextCell('c_form_lb2').setText('密码').setSize(13).setColor('#333'))
          .fill('control', new InputCell('c_form_in2').setPlaceholder('请输入密码')),
        new ButtonCell('c_form_sub').setLabel('提交').setType('primary').onPress(() => console.log('[preset-demo] form submit')),
      ]),
      new GroupCell('c_group').fill('_default', [
        new TextCell('c_group_t').setText('分组标题').setSize(13).setBold(true),
        new TextCell('c_group_b').setText('分组内容：纵向容器，showChildOverlays 已关闭。').setSize(12).setColor('#555'),
      ]),
    ]),
    R('c-row4', 130, [
      new GridCell('c_grid').fill('_default', [
        new TagCell('c_grid_t1').setText('网格项 1').setColor('#4a90d9'),
        new TagCell('c_grid_t2').setText('网格项 2').setColor('#1a8a4a'),
        new TagCell('c_grid_t3').setText('网格项 3').setColor('#e07a3a'),
        new TagCell('c_grid_t4').setText('网格项 4').setColor('#a05ad9'),
      ]),
      new DashboardCell('c_dash').fill('_default', [
        new StatCell('c_dash_s1').setLabel('访问量').setValue(12800).setColor('#4a90d9'),
        new StatCell('c_dash_s2').setLabel('订单数').setValue(326).setColor('#1a8a4a'),
        new StatCell('c_dash_s3').setLabel('转化率').setValue(3.6).setSuffix('%').setColor('#e07a3a'),
      ]),
    ]),
    R('c-row5', 90, [
      new TilingCell('c_tiling').fill('_default', [
        new TagCell('c_tiling_t1').setText('平铺 1').setColor('#4a90d9'),
        new TagCell('c_tiling_t2').setText('平铺 2').setColor('#1a8a4a'),
        new TagCell('c_tiling_t3').setText('平铺 3').setColor('#e07a3a'),
        new TagCell('c_tiling_t4').setText('平铺 4').setColor('#a05ad9'),
      ]),
      new SectionCell('c_sec').setTitle('内嵌分区').fill('_default', [
        new TextCell('c_sec_b').setText('分区容器可在任意位置内嵌使用。').setSize(12).setColor('#555'),
      ]),
    ]),
  ]);

  // ---------- 根装配 ----------
  const page = new PageCell('preset-demo').fill('_default', [
    hero,
    secDisplay,
    secStat,
    secForm,
    secInteract,
    secList,
    secNav,
    secFeedback,
    secFloat,
    secBiz,
    secContainer,
  ]);

  // 一次性挂载全树（根据 slot 关系自动级联）
  page.mount(dag._root);
  // 浮层预设与页面并列挂载（独立 reflow 根，由 FloatingLayer 渲染）；
  // 浮动视口默认可见，mount 后显式 close() 使其初始隐藏，由按钮触发 open()
  [toastCell, messageCell, tooltipCell, popoverCell, confirmCell, dialogCell, drawerCell, floatPanelCell]
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
