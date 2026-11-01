/**
 * @file docs-meta.js —— 组件文档站数据层
 *
 *   - SCHEMA 内省：Cell 构造期声明的 schema() 可直接读取（_schema），
 *     文档站据此自动生成字段表，与代码零漂移（架构内省能力）
 *   - ENTRIES：分类 / 一句话描述 / 事件与数据契约表（on/emit 语义命名）
 *   - EXAMPLES：代表性预设的可运行示例工厂（独立 runtime 隔离，
 *     浮动视口类预设由全局 FloatingLayer 承载，示例仅静态类）
 *
 *   事件命名规范（阶段 2 统一后）：press 瞬时动作 / change 值变更 /
 *   select 选中项变更 / submit 提交 / ok 确认 / search / upload / move。
 */
import {
  DataDag, createRuntime,
  TextCell, TitleCell, IconCell, MediaCell, DividerCell, RowCell, GridCell, SplitCell,
  PanelCell, CardCell, SectionCell, FooterCell, PageCell, GroupCell,
  ButtonCell, ToggleCell, SliderCell, InputCell, ListCell,
  AvatarCell, BadgeCell, TagCell, StatCell, TableCell, TimelineCell, CalendarCell,
  ChartCell, BarCell, ProgressCell, SkeletonCell, LoadingCell, TreeCell,
  CheckboxCell, RadioCell, SwitchCell, MultiSwitchCell, RateCell, SearchCell,
  SelectCell, PickerCell, StepperCell, TextareaCell, UploadCell, ColorPickerCell,
  DatePickerCell, EditorCell, FormCell, FieldCell, LoginCell, JoyConCell,
  MenuCell, TabCell, TabBarCell, NavBarCell, AppBarCell, BreadcrumbCell, IndexBarCell,
  PaginationCell, CarouselCell, ControlCell,
  NoticeCell, AlertCell, ToastCell, ResultCell, EmptyCell, PopoverCell, TooltipCell,
  MessageCell, ChatCell, ConfirmCell,
  DialogCell, DrawerCell, FloatingPanelCell, WindowCell, ModalCell,
  OrderCell, ProfileCell, BoardCell, KanbanCell, DashboardCell, DocumentCell,
  SettingsCell, ProcessCell, TilingCell, AccordionCell,
} from '../src/core/ui-kit';

/** 分类（侧栏分组顺序） */
export const CATEGORIES = ['基础与布局', '数据展示', '表单与输入', '导航', '反馈与浮层', '业务预设'];

const E = (api, event, desc) => ({ api, event, desc });

/** 预设元数据条目 */
export const ENTRIES = [
  // ---------- 基础与布局 ----------
  { name: 'TextCell', cls: TextCell, cat: '基础与布局', desc: '通用文本，支持 size/bold/color/align。' },
  { name: 'TitleCell', cls: TitleCell, cat: '基础与布局', desc: '标题文本（带强调样式）。' },
  { name: 'IconCell', cls: IconCell, cat: '基础与布局', desc: '字形图标（SVG 字形集，跨浏览器一致）。' },
  { name: 'MediaCell', cls: MediaCell, cat: '基础与布局', desc: '图片/媒体容器，支持圆角与适配模式。' },
  { name: 'DividerCell', cls: DividerCell, cat: '基础与布局', desc: '水平/垂直分隔线，可带文字。' },
  { name: 'RowCell', cls: RowCell, cat: '基础与布局', desc: '横向布局容器（Box layout 预设）。' },
  { name: 'GridCell', cls: GridCell, cat: '基础与布局', desc: '自动网格：按最小单元格尺寸均分行列。' },
  { name: 'SplitCell', cls: SplitCell, cat: '基础与布局', desc: '双栏分隔容器，中缝可拖拽调整。' },
  { name: 'PanelCell', cls: PanelCell, cat: '基础与布局', desc: '面板容器（基础 Cell），标题 + 内容。' },
  { name: 'CardCell', cls: CardCell, cat: '基础与布局', desc: '卡片容器（styleRole card，主题包裹层）。' },
  { name: 'SectionCell', cls: SectionCell, cat: '基础与布局', desc: '区块容器：标题栏 + 内容插槽。' },
  { name: 'FooterCell', cls: FooterCell, cat: '基础与布局', desc: '页脚容器。' },
  { name: 'PageCell', cls: PageCell, cat: '基础与布局', desc: '页面根：viewport + 纵向滚动。' },
  { name: 'GroupCell', cls: GroupCell, cat: '基础与布局', desc: '分组容器（标签关联子项）。' },
  { name: 'AccordionCell', cls: AccordionCell, cat: '基础与布局', desc: '折叠面板组。', events: [E('onToggle', 'toggle', '展开/收起项变更')] },

  // ---------- 数据展示 ----------
  { name: 'StatCell', cls: StatCell, cat: '数据展示', desc: '指标卡：数值 + 标签 + 趋势。' },
  { name: 'TableCell', cls: TableCell, cat: '数据展示', desc: '表格（行数据 + 表头）。' },
  { name: 'ListCell', cls: ListCell, cat: '数据展示', desc: '列表（基础 Cell），行选中驱动。', events: [E('onSelect', 'select', '选中行变更')] },
  { name: 'TreeCell', cls: TreeCell, cat: '数据展示', desc: '树形控件：nodes/expanded/selected，键盘 tree 导航。', events: [E('onToggle', 'toggle', '展开态变更'), E('onSelect', 'select', '选中节点变更')] },
  { name: 'TimelineCell', cls: TimelineCell, cat: '数据展示', desc: '时间线。' },
  { name: 'CalendarCell', cls: CalendarCell, cat: '数据展示', desc: '月历：年月切换、日期选中。', events: [E('onSelect', 'select', '选中日期变更')] },
  { name: 'ChartCell', cls: ChartCell, cat: '数据展示', desc: '图表容器（SVG 系列图）。' },
  { name: 'BarCell', cls: BarCell, cat: '数据展示', desc: '条形对比图。' },
  { name: 'ProgressCell', cls: ProgressCell, cat: '数据展示', desc: '进度条（role=progressbar，aria 值随 percent）。' },
  { name: 'SkeletonCell', cls: SkeletonCell, cat: '数据展示', desc: '骨架屏占位。' },
  { name: 'LoadingCell', cls: LoadingCell, cat: '数据展示', desc: '加载指示（role=status + aria-busy）。' },
  { name: 'AvatarCell', cls: AvatarCell, cat: '数据展示', desc: '头像（文字/图片）。' },
  { name: 'BadgeCell', cls: BadgeCell, cat: '数据展示', desc: '徽标计数（超 max 显示 99+）。' },
  { name: 'TagCell', cls: TagCell, cat: '数据展示', desc: '标签。' },
  { name: 'DocumentCell', cls: DocumentCell, cat: '数据展示', desc: '文档预览容器。' },

  // ---------- 表单与输入 ----------
  { name: 'InputCell', cls: InputCell, cat: '表单与输入', desc: '文本输入（基础 Cell），值即时写回 value；可 controlled 受控。' },
  { name: 'TextareaCell', cls: TextareaCell, cat: '表单与输入', desc: '多行文本输入。' },
  { name: 'SelectCell', cls: SelectCell, cat: '表单与输入', desc: '下拉选择（listbox 键盘导航，展开回焦）。', events: [E('onChange', 'change', '选中项变更')] },
  { name: 'PickerCell', cls: PickerCell, cat: '表单与输入', desc: '受控选择器（open 由数据驱动）。' },
  { name: 'CheckboxCell', cls: CheckboxCell, cat: '表单与输入', desc: '复选框（role=checkbox + aria-checked）。' },
  { name: 'RadioCell', cls: RadioCell, cat: '表单与输入', desc: '单选组（role=radio）。', events: [E('onChange', 'change', '选中值变更')] },
  { name: 'SwitchCell', cls: SwitchCell, cat: '表单与输入', desc: '开关（role=switch，Enter/Space 切换）。主题可重写为 md3-switch。' },
  { name: 'MultiSwitchCell', cls: MultiSwitchCell, cat: '表单与输入', desc: '多段开关。', events: [E('onChange', 'change', '选中段变更')] },
  { name: 'SliderCell', cls: SliderCell, cat: '表单与输入', desc: '滑块（基础 Cell），拖拽写回 value。' },
  { name: 'RateCell', cls: RateCell, cat: '表单与输入', desc: '评分星级，键盘方向调节。', events: [E('onChange', 'change', '评分变更')] },
  { name: 'SearchCell', cls: SearchCell, cat: '表单与输入', desc: '搜索框：Enter/按钮触发。', events: [E('onSearch', 'search', '提交搜索（携带 value）')] },
  { name: 'StepperCell', cls: StepperCell, cat: '表单与输入', desc: '步进器（+/- 调整数值）。' },
  { name: 'UploadCell', cls: UploadCell, cat: '表单与输入', desc: '上传入口 + 文件列表（模拟）。', events: [E('onUpload', 'upload', '追加文件')] },
  { name: 'ColorPickerCell', cls: ColorPickerCell, cat: '表单与输入', desc: '颜色选择器。', events: [E('onChange', 'change', '颜色变更')] },
  { name: 'DatePickerCell', cls: DatePickerCell, cat: '表单与输入', desc: '日期选择（输入条 + 月历弹层）。' },
  { name: 'EditorCell', cls: EditorCell, cat: '表单与输入', desc: '富文本编辑区（contentEditable）。' },
  { name: 'FormCell', cls: FormCell, cat: '表单与输入', desc: '表单容器：纵向 + 滚动，fill FieldCell。' },
  { name: 'FieldCell', cls: FieldCell, cat: '表单与输入', desc: '表单项：标签 + 控件插槽。' },
  { name: 'LoginCell', cls: LoginCell, cat: '表单与输入', desc: '登录表单预设。', events: [E('onSubmit', 'submit', '提交（{username, password}）')] },

  // ---------- 导航 ----------
  { name: 'MenuCell', cls: MenuCell, cat: '导航', desc: '菜单（menu/menuitem，方向键导航）。', events: [E('onSelect', 'select', '选中项变更')] },
  { name: 'TabCell', cls: TabCell, cat: '导航', desc: '标签页（标签 + 内容联动）。' },
  { name: 'TabBarCell', cls: TabBarCell, cat: '导航', desc: '底部/顶部标签栏（tablist 键盘自动激活）。', events: [E('onSelect', 'select', '激活项变更（onChange 为废弃别名）')] },
  { name: 'NavBarCell', cls: NavBarCell, cat: '导航', desc: '顶部导航栏（标题 + 项）。', events: [E('onSelect', 'select', '选中项变更')] },
  { name: 'AppBarCell', cls: AppBarCell, cat: '导航', desc: '应用栏容器。' },
  { name: 'BreadcrumbCell', cls: BreadcrumbCell, cat: '导航', desc: '面包屑。', events: [E('onSelect', 'select', '点击层级')] },
  { name: 'IndexBarCell', cls: IndexBarCell, cat: '导航', desc: '索引条（字母定位）。' },
  { name: 'PaginationCell', cls: PaginationCell, cat: '导航', desc: '分页（边界禁用）。', events: [E('onChange', 'change', '页码变更')] },

  // ---------- 反馈与浮层 ----------
  { name: 'NoticeCell', cls: NoticeCell, cat: '反馈与浮层', desc: '公告条（info/success/warning/error，aria-live 播报）。' },
  { name: 'AlertCell', cls: AlertCell, cat: '反馈与浮层', desc: '警示横幅。' },
  { name: 'ToastCell', cls: ToastCell, cat: '反馈与浮层', desc: '轻提示（浮动视口，duration 自动关闭）。' },
  { name: 'ResultCell', cls: ResultCell, cat: '反馈与浮层', desc: '结果页（状态图标 + 操作插槽）。' },
  { name: 'EmptyCell', cls: EmptyCell, cat: '反馈与浮层', desc: '空状态占位。' },
  { name: 'PopoverCell', cls: PopoverCell, cat: '反馈与浮层', desc: '气泡卡片（浮动视口）。' },
  { name: 'TooltipCell', cls: TooltipCell, cat: '反馈与浮层', desc: '文字提示气泡。' },
  { name: 'MessageCell', cls: MessageCell, cat: '反馈与浮层', desc: '消息气泡（对话风格）。' },
  { name: 'ChatCell', cls: ChatCell, cat: '反馈与浮层', desc: '聊天窗口预设。' },
  { name: 'ConfirmCell', cls: ConfirmCell, cat: '反馈与浮层', desc: '确认框（模态：遮罩 + Esc 关闭 + 焦点循环）。', events: [E('onOk', 'ok', '点击确定后自动 close')] },
  { name: 'DialogCell', cls: DialogCell, cat: '反馈与浮层', desc: '对话框容器（header/body 插槽，默认模态）。' },
  { name: 'DrawerCell', cls: DrawerCell, cat: '反馈与浮层', desc: '侧滑抽屉（默认模态）。' },
  { name: 'FloatingPanelCell', cls: FloatingPanelCell, cat: '反馈与浮层', desc: '可拖拽缩放浮动面板（非模态）。' },
  { name: 'WindowCell', cls: WindowCell, cat: '反馈与浮层', desc: '浮动窗口基座（标题栏控件 + 工作区）。' },
  { name: 'ModalCell', cls: ModalCell, cat: '反馈与浮层', desc: '模态窗口基座（operable 由页面声明）。' },

  // ---------- 交互 ----------
  { name: 'ButtonCell', cls: ButtonCell, cat: '表单与输入', desc: '按钮（基础 Cell）：type/size/disabled，pressed 数据。', events: [E('onPress', 'press', '点击动作')] },
  { name: 'ToggleCell', cls: ToggleCell, cat: '表单与输入', desc: '开/关切换（核心预设，i18n 文案联动）。' },
  { name: 'JoyConCell', cls: JoyConCell, cat: '导航', desc: '虚拟摇杆（方向写入 direction）。', events: [E('onMove', 'move', '方向变更')] },
  { name: 'CarouselCell', cls: CarouselCell, cat: '数据展示', desc: '轮播（箭头切换 + 圆点指示）。' },
  { name: 'ControlCell', cls: ControlCell, cat: '业务预设', desc: '控件聚合面板。' },

  // ---------- 业务预设 ----------
  { name: 'OrderCell', cls: OrderCell, cat: '业务预设', desc: '订单行（可排序表头联动示例）。' },
  { name: 'ProfileCell', cls: ProfileCell, cat: '业务预设', desc: '用户资料卡（锚点 + 多挂载演示源）。', events: [E('onSwitch', 'press', '切换用户')] },
  { name: 'BoardCell', cls: BoardCell, cat: '业务预设', desc: '看板容器。' },
  { name: 'KanbanCell', cls: KanbanCell, cat: '业务预设', desc: '看板列（卡片流转）。' },
  { name: 'DashboardCell', cls: DashboardCell, cat: '业务预设', desc: '仪表盘网格布局。' },
  { name: 'SettingsCell', cls: SettingsCell, cat: '业务预设', desc: '设置列表（分组开关/选择）。' },
  { name: 'ProcessCell', cls: ProcessCell, cat: '业务预设', desc: '流程步骤条。' },
  { name: 'TilingCell', cls: TilingCell, cat: '业务预设', desc: '平铺宫格导航。' },
];

/**
 * 内省 Cell 构造期声明的 Schema 字段表（文档站字段表数据源，零维护）。
 * @param {Function} CellCls Cell 类
 * @returns {Array<{key: string, type: string, def: string, bind: string}>}
 */
export function introspectSchema(CellCls) {
  const probe = new CellCls('__docs_probe__');
  return Object.entries(probe._schema || {}).map(([key, def]) => ({
    key,
    type: def?.type || 'any',
    def: def?.default === undefined ? '—' : JSON.stringify(def.default),
    bind: def?.bind || '',
  }));
}

/**
 * 构建示例：独立 runtime 挂载单 Cell 树并返回 React 元素。
 * @param {Function} CellCls Cell 类
 * @param {(cell: any) => void} [configure] 配置回调（setXxx / fill）
 * @returns {import('react').ReactNode}
 */
export function mountExample(CellCls, configure) {
  const dag = new DataDag({ runtime: createRuntime() });
  const cell = new CellCls(`docs-demo-${CellCls.name}`);
  if (configure) configure(cell);
  cell.mount(dag._root);
  return cell.react();
}

/** 代表性预设的可运行示例（key = 条目 name） */
export const EXAMPLES = {
  ButtonCell: () => mountExample(ButtonCell, (c) => c.setLabel('主要按钮').setPressed(false)),
  InputCell: () => mountExample(InputCell, (c) => c.setValue('受控输入示例')),
  SwitchCell: () => mountExample(SwitchCell, (c) => c.setLabel('启用通知').setEnabled(true)),
  SliderCell: () => mountExample(SliderCell, (c) => c.setValue(60)),
  RateCell: () => mountExample(RateCell, (c) => c.setValue(4)),
  CheckboxCell: () => mountExample(CheckboxCell, (c) => c.setLabel('同意条款').setChecked(true)),
  SelectCell: () => mountExample(SelectCell, (c) => c.setOptions([
    { id: 'a', title: '选项 A' }, { id: 'b', title: '选项 B' },
  ]).setValue('b')),
  TabBarCell: () => mountExample(TabBarCell, (c) => c.setItems([
    { id: 't1', title: '首页' }, { id: 't2', title: '发现' }, { id: 't3', title: '我的' },
  ]).setActiveId('t1')),
  PaginationCell: () => mountExample(PaginationCell, (c) => c.setTotal(50).setPageSize(10).setCurrent(2)),
  TreeCell: () => mountExample(TreeCell, (c) => c.setNodes([
    { id: 'd1', title: 'src', children: [{ id: 'd11', title: 'core' }, { id: 'd12', title: 'builtin-cells' }] },
    { id: 'd2', title: 'docs' },
  ]).setExpanded(['d1'])),
  ListCell: () => mountExample(ListCell, (c) => c.setItems([
    { id: 'l1', title: '列表项一' }, { id: 'l2', title: '列表项二' },
  ]).setSelected('l1')),
  NoticeCell: () => mountExample(NoticeCell, (c) => c.setText('这是一条公告提示').setType('info')),
  ProgressCell: () => mountExample(ProgressCell, (c) => c.setPercent(66).setShowText(true)),
  StatCell: () => mountExample(StatCell, (c) => c.setLabel('待办任务').setValue(12)),
  AvatarCell: () => mountExample(AvatarCell, (c) => c.setName('史蒂文').setColor('#6750A4')),
  TagCell: () => mountExample(TagCell, (c) => c.setText('标签文本')),
  BadgeCell: () => mountExample(BadgeCell, (c) => c.setCount(120).setMax(99)),
  CalendarCell: () => mountExample(CalendarCell, (c) => c.setYear(2026).setMonth(11)),
  StepperCell: () => mountExample(StepperCell, (c) => c.setValue(3)),
  BreadcrumbCell: () => mountExample(BreadcrumbCell, (c) => c.setItems([
    { id: 'b1', title: '首页' }, { id: 'b2', title: '列表' }, { id: 'b3', title: '详情' },
  ])),
  LoadingCell: () => mountExample(LoadingCell),
  EmptyCell: () => mountExample(EmptyCell, (c) => c.setDesc('这里还什么都没有')),
};
