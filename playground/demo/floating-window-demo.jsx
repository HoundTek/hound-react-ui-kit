/**
 * @file floating-window-demo.jsx —— 浮动窗口（伪窗口）演示，全部经 Cell API 构建。
 *
 * 用户可见的 API 面只有 Cell（主窗口与伪窗口一致）：窗口定义、插槽填充、
 * 父子窗口声明、可操作窗口（遮罩）与 open/close 均为 Cell 层 API，
 * 不直接触碰 BoxBuilder（原 box-demo-page 的 Box 直建版本已整体 Cell 化）。
 *
 * 演示点：
 * - floatWin：简单窗口（WindowCell 预设，可移动/缩放，标题栏内建窗口控件
 *   结构 chrome：标题 + 最小化/最大化/关闭），并经 operable() 设为可操作
 *   窗口——遮罩唯一来源，仅放行本窗口及其子窗口链
 * - floatComplex：复杂布局窗口（自定义 ComplexWindowCell，继承框架导出的
 *   FloatingWindowCellBase 获得内建 chrome 与窗口样式控制 API）：标题栏
 *   （chrome）+ 工具栏（ButtonCell 组）+ 工作区横向分栏（MenuCell 侧栏，
 *   宽度约束 + workspace 插槽显式开启 showEdges → 可拖拽分界线；Corner 跟随
 *   Edge 的显示开关）+ 内容列（StatCell 统计行 / TagCell 网格 / 可滚动
 *   ListCell 日志）+ 状态栏。窗口内部 UI 全部由既有预设 Cell 组装，
 *   不再定义演示专用的占位 Cell
 * - floatModal：floatWin 的子窗口（ModalCell 预设 + setParent 声明父窗口，
 *   父 Cell 须先挂载），恒层叠于父窗口之上（父子窗口树模型，
 *   见 docs/floating-window-tree-design.md）
 *
 * 层级由系统管理（后聚焦/出现居上 + 模态序排列）。浮动视口初始隐藏（mount 后
 * close()），工作台页挂载时经 openFloatingDemo 打开、离开时经 closeFloatingDemo
 * 关闭（见 cell-demo-page）；浮动视口的全局渲染由 app.jsx 的 FloatingLayer 承担。
 */
import {
  DataDag,
  WindowCell, ModalCell, FloatingWindowCellBase,
  MenuCell, GroupCell, RowCell, GridCell,
  ButtonCell, StatCell, TagCell, ListCell, TextCell,
} from '../../src/core/ui-kit';

/**
 * 复杂布局窗口 Cell：浮动视口（可移动/缩放），继承 FloatingWindowCellBase
 * 获得内建 chrome（标题栏窗口控件结构）与窗口样式控制 API。四个命名插槽按
 * 定义序纵向排布——title（标题栏，拖拽点）/ toolbar（工具栏）/ workspace
 * （横向分栏工作区）/ status（底部状态栏）。min 约束保证内部固定子项始终
 * 放得下（标题 36 + 工具栏 36 + 状态栏 24 + 统计行 80 + 网格 96 = 272 高；
 * 侧栏 min 100 宽），缩放不会把窗口压入布局非法状态。
 */
class ComplexWindowCell extends FloatingWindowCellBase {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.floatingViewport().movable(true).resizable(true)
      .defaultWidth(560).defaultHeight(380).minWidth(320).minHeight(300)
      .styleRole('window').layout('vertical').moveX(false).moveY(false)
      .schema({
        title: { type: 'string', default: '复杂布局窗口' },
        maximized: { type: 'boolean', default: false },
        minimized: { type: 'boolean', default: false },
      })
      .defineSlot('title', {
        fixedHeight: 36, color: 'primary', dragHandle: true,
        layout: 'horizontal', moveX: false, moveY: false, single: true,
      })
      .defineSlot('toolbar', {
        fixedHeight: 36, color: 'surface-muted', gap: 4, padding: 2,
        layout: 'horizontal', moveX: false, moveY: false,
      })
      .defineSlot('workspace', {
        color: 'surface', layout: 'horizontal', moveX: false, moveY: false,
        // 显式开启 Edge 覆盖层（默认隐藏，就近继承；Corner 跟随 Edge 的显示
        // 开关）：侧栏（default 150 / min 100 / max 220）与内容区间渲染
        // 可拖拽分界线，悬停/拖拽显示主题 edgeIndicator 指示条
        showEdges: true,
      })
      .defineSlot('status', {
        fixedHeight: 24, color: 'surface-muted',
        layout: 'horizontal', moveX: false, moveY: false,
      });
    this._initChrome('title', {
      controls: { minimize: true, maximize: true, close: true },
      titleBarHeight: 36,
      titleColor: 'on-primary',
    });
  }
}

// =========================================================================
//  窗口装配（模块级构建一次，避免 StrictMode 双调用导致重复构造）
// =========================================================================

const dag = new DataDag();

/**
 * 简单窗口：WindowCell 预设。标题栏内建窗口控件结构（chrome：setTitle
 * 标题文本 + 最小化/最大化/关闭控件），body 插槽承可滚动列表。
 * operable() 将本窗口设为可操作窗口（遮罩唯一来源）：仅本窗口及其子窗口链
 *（floatModal）可操作，其余窗口与页面被遮罩挡住；注释掉该行则回到默认态
 *（无遮罩）。
 * @type {WindowCell}
 */
const floatWin = new WindowCell('floatWin')
  .posX(80).posY(120).fixedWidth(280).fixedHeight(180)
  .operable()
  .setTitle('浮动窗口')
  .fill('body', new ListCell('floatWinList').setItems([
    { id: 'w1', title: '窗口内容行 1' },
    { id: 'w2', title: '窗口内容行 2' },
    { id: 'w3', title: '窗口内容行 3' },
    { id: 'w4', title: '窗口内容行 4' },
    { id: 'w5', title: '窗口内容行 5' },
    { id: 'w6', title: '窗口内容行 6' },
    { id: 'w7', title: '窗口内容行 7' },
  ]));

/**
 * 复杂布局窗口：单一浮动视口内组合完整布局能力（全部经既有预设 Cell 组装）——
 * 标题栏（内建 chrome）+ 工具栏（ButtonCell 组）+ 工作区（横向分栏：
 * MenuCell 侧栏宽度约束 + 显式 showEdges → 可拖拽分界线；GroupCell 内容列
 * 嵌套 StatCell 统计行 / TagCell 网格 / 可滚动 ListCell 日志）+ 底部状态栏。
 * @type {ComplexWindowCell}
 */
const floatComplex = new ComplexWindowCell('floatComplex')
  .posX(560).posY(240)
  .fill('toolbar', [
    new ButtonCell('fcTbSave').setLabel('保存').fixedWidth(72),
    new ButtonCell('fcTbUndo').setLabel('撤销').setType('default').fixedWidth(72),
    new ButtonCell('fcTbRedo').setLabel('重做').setType('default').fixedWidth(72),
    new ButtonCell('fcTbShare').setLabel('分享').setType('default').fixedWidth(72),
  ])
  .fill('workspace', [
    // 侧栏：MenuCell 预设（点击写入 selected，选中项主色高亮）；
    // 宽度约束 default 150 / min 100 / max 220 → 与内容区间现可拖拽分界线
    new MenuCell('fcSide')
      .defaultWidth(150).minWidth(100).maxWidth(220).color('surface-muted')
      .setItems([
        { id: 'overview', title: '概览' },
        { id: 'analytics', title: '分析' },
        { id: 'reports', title: '报表' },
        { id: 'members', title: '成员' },
        { id: 'settings', title: '设置' },
      ])
      .setSelected('overview'),
    // 内容列：GroupCell 纵向容器（双轴锁定，子项高度由 reflow 分配）
    new GroupCell('fcContent').defaultWidth(410).moveX(false).moveY(false)
      .fill('_default', [
        // 统计行：RowCell 横向行容器 + StatCell×3
        new RowCell('fcStats').fixedHeight(80)
          .fill('_default', [
            new StatCell('fcStatUv').setLabel('访问量').setValue(12840).setTrend(12.5).setColor('#6750A4'),
            new StatCell('fcStatOrder').setLabel('订单量').setValue(986).setTrend(3.2).setColor('#2f9e63'),
            new StatCell('fcStatRefund').setLabel('退款率').setValue(2).setSuffix('%').setTrend(-0.8).setColor('#B3261E'),
          ]),
        // 标签网格：GridCell 自动排布 + TagCell×4
        new GridCell('fcGrid').fixedHeight(96)
          .fill('_default', [
            new TagCell('fcTagNew').setText('新功能').setColor('#6750A4'),
            new TagCell('fcTagStable').setText('稳定').setColor('#2f9e63'),
            new TagCell('fcTagBeta').setText('试行').setColor('#d9870d'),
            new TagCell('fcTagRisk').setText('关注').setColor('#B3261E'),
          ]),
        // 日志列表：ListCell 预设，内容超出时滚动（MenuCell 同款 moveY 语义）
        new ListCell('fcLogs').setItems(Array.from({ length: 8 }, (_, i) => ({
          id: `log${i + 1}`,
          title: `系统日志 ${i + 1}：任务调度完成`,
        }))),
      ]),
  ])
  .fill('status', [
    new TextCell('fcStL').setText('就绪').setSize(12).setColor('text-secondary').defaultWidth(140),
    new TextCell('fcStC').setText('数据已同步').setSize(12).setColor('text-muted'),
    new TextCell('fcStR').setText('v1.4.0').setSize(12).setColor('text-secondary').defaultWidth(140),
  ]);

// 挂载顺序：父窗口 floatWin 先挂载，floatModal 才能经 setParent 解析到其父 Box
floatWin.mount(dag._root);
floatComplex.mount(dag._root);

/**
 * 子窗口：ModalCell 预设（页眉内建 chrome：setTitle 标题文本 + 关闭控件），
 * setParent(floatWin) 声明父窗口（父子窗口树模型下恒层叠于父窗口之上）；
 * floatWin 已 operable()，遮罩放行本窗口。
 * @type {ModalCell}
 */
const floatModal = new ModalCell('floatModal')
  .setParent(floatWin)
  .posX(300).posY(220).fixedWidth(240).fixedHeight(160)
  .setTitle('子窗口')
  .fill('body', new TextCell('fmBody')
    .setText('恒层叠于父窗口之上').setSize(12).setColor('text-secondary'));
floatModal.mount(dag._root);

// 浮动视口默认可见，mount 后显式 close() 使其初始隐藏（避免悬浮遮挡默认页），
// 由工作台页挂载/卸载时经 openFloatingDemo/closeFloatingDemo 控制显隐
[floatWin, floatComplex, floatModal].forEach(c => c.close());

/**
 * 打开浮动窗口演示（工作台页挂载时调用）。
 * @returns {void}
 */
const openFloatingDemo = () => {
  floatWin.open();
  floatComplex.open();
  floatModal.open();
};

/**
 * 关闭浮动窗口演示（离开工作台页时调用；关闭父窗口会级联关闭其子窗口，
 * 这里显式逐个关闭以保持对称）。
 * @returns {void}
 */
const closeFloatingDemo = () => {
  floatWin.close();
  floatComplex.close();
  floatModal.close();
};

export { openFloatingDemo, closeFloatingDemo };
