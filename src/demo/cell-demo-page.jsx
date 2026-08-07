/**
 * @file Cell 演示页（应用工作台）。集中展示用 Cell 设计交互，覆盖充足应用场景，
 *       并展示完整框架功能。
 *
 *        使用模式：
 *        1) 类型作者继承 CellBaseBuilder，构造函数中配置 Box、Schema、Slot、内容组件
 *        2) 页面作者用 fill 内联实例化 Cell（fill 返回 this，可链式嵌套）
 *        3) 根 Cell 调用 mount(dag._root) 自动级联挂载全树，再 react() 渲染
 *        4) 跨 Cell 引用用 cell.find(path) 按路径访问（如 @userProfile 锚点）
 *
 *        交互演示点（Cell 数据驱动交互）：
 *        - 导航选中：NavCell 点击导航项高亮（activeIndex）
 *        - 菜单选择：MenuItemCell 点击切换 active 高亮
 *        - 统计计数：StatCardCell 点击按钮计数 +1
 *        - 列表联动：TaskListCell 点击选择任务（@taskList 锚点），
 *                    TaskDetailCell 自动绑定 '@taskList#selected' 同步显示详情
 *        - 实时输入：InputCell 输入框内容即时写入数据并回显
 *        - 开关切换：ToggleCell 点击切换开/关状态（i18n 文本联动）
 *        - 用户切换：ProfileCell 切换姓名/角色（@userProfile 锚点 + 多挂载）
 *        - 语言切换：LanguageSwitchCell 切换 zh-CN / en，全部 UI 文本联动刷新
 *
 *        数据特性演示点（Phase 2/3）：
 *        - 命名锚点：ProfileCell setAnchor('userProfile')；TaskListCell setAnchor('taskList')
 *        - 自动绑定：BoundTitleCell bind: '@userProfile#name'；TaskDetailCell bind: '@taskList#selected'
 *        - 引用节点：RefDemoCell createRefChild 指向 @userProfile
 *        - 实例引用：InstanceRefCell 用 cell.find('@userProfile') 按路径访问
 *        - 多 Slot：MainPanelCell defineSlot('header', {single:true}) + defineSlot('body')
 *        - 多挂载：profile 变量 fill 到 header（mount 0）+ sidebar（mount 1）
 *        - showChildOverlays：body 插槽隐藏子项拖拽手柄
 */
import React from 'react';
import {
  CellBaseBuilder, DataDag, useCellData, useNodeData, useText, useI18n,
  ButtonCell, WindowCell, TextCell, ListCell,
} from '../core/ui-kit';

// =========================================================================
//  内容组件
// =========================================================================

/**
 * Logo 视图：订阅并居中展示 LogoCell 的 text 字段。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function LogoView({ cell }) {
  const text = useCellData(cell, 'text');
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: '100%', height: '100%',
      color: '#fff', fontWeight: 'bold', fontSize: 18, letterSpacing: 2,
    }}>
      {text}
    </div>
  );
}

/**
 * 导航视图：订阅 items（i18n key 数组）与 activeIndex，点击导航项切换选中并高亮。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function NavView({ cell }) {
  const items = useCellData(cell, 'items') || [];
  const activeIndex = useCellData(cell, 'activeIndex') ?? 0;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '0 16px', width: '100%', height: '100%',
      color: '#fff', fontSize: 14,
    }}>
      {items.map((key, i) => (
        <NavLabel
          key={key}
          itemKey={key}
          active={i === activeIndex}
          onClick={() => cell.setActiveIndex(i)}
        />
      ))}
    </div>
  );
}

/**
 * 导航项标签：用 useText 翻译 i18n key，active 时高亮；点击回调由 NavView 提供。
 * 独立子组件而非在 NavView 的 map 回调内调用 hook（遵守 hooks 规则）。
 * @param {{itemKey: string, active: boolean, onClick: Function}} props 组件属性
 * @returns {JSX.Element} 标签元素
 */
function NavLabel({ itemKey, active, onClick }) {
  const text = useText(itemKey);
  return (
    <span
      onClick={onClick}
      style={{
        cursor: 'pointer', opacity: active ? 1 : 0.75,
        fontWeight: active ? 'bold' : 'normal',
        borderBottom: active ? '2px solid #fff' : '2px solid transparent',
        paddingBottom: 2, userSelect: 'none',
      }}
    >
      {text}
    </span>
  );
}

/**
 * 用户信息视图：订阅 name/role，点击"切换"按钮在预置名单中循环切换。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function ProfileView({ cell }) {
  const name = useCellData(cell, 'name');
  const role = useCellData(cell, 'role');
  // name/role 为业务数据（人名/角色），不做 i18n；仅"切换"按钮走 i18n
  const switchLabel = useText('profile.switch');
  const names = ['访客', 'Alice', 'Bob', 'Charlie'];
  const roles = ['guest', 'admin', 'editor', 'viewer'];
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      alignItems: 'center', width: '100%', height: '100%',
      color: '#fff', fontSize: 12, gap: 2,
    }}>
      <div style={{ fontWeight: 'bold' }}>{name}</div>
      <div style={{ fontSize: 10, opacity: 0.7 }}>{role}</div>
      <button
        onClick={() => {
          const idx = (names.indexOf(name) + 1) % names.length;
          cell.setName(names[idx]);
          cell.setRole(roles[idx]);
        }}
        style={{ marginTop: 2, padding: '2px 6px', fontSize: 10, cursor: 'pointer', border: 'none', borderRadius: 3 }}
      >
        {switchLabel}
      </button>
    </div>
  );
}

/**
 * 语言切换按钮视图：useI18n 取 I18n 实例调 setLocale 切换语言，
 * useText 订阅按钮文字（显示目标语言名）。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element|null} 视图元素；未处于 Provider 内时返回 null
 */
function LangSwitchView({ cell }) {
  const inst = useI18n();
  const label = useText('lang.switchTo');
  if (!inst) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: '100%', height: '100%',
    }}>
      <button
        onClick={() => inst.setLocale(inst.locale === 'zh-CN' ? 'en' : 'zh-CN')}
        style={{
          padding: '4px 12px', height: 30, cursor: 'pointer',
          border: '1px solid rgba(255,255,255,0.6)', borderRadius: 4,
          background: 'rgba(255,255,255,0.18)', color: '#fff', fontSize: 12,
        }}
      >
        {label}
      </button>
    </div>
  );
}

/**
 * 菜单项视图：订阅 title/active，点击时切换 active 状态并触发高亮重渲染。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function MenuView({ cell }) {
  // title 字段存 i18n key，用 useText 翻译为当前语言文本
  const titleKey = useCellData(cell, 'title');
  const active = useCellData(cell, 'active');
  const title = useText(titleKey);
  return (
    <div
      onClick={() => cell.setActive(!active)}
      style={{
        display: 'flex', alignItems: 'center', padding: '0 16px',
        width: '100%', height: '100%',
        color: active ? '#fff' : '#333',
        backgroundColor: active ? '#357abd' : 'transparent',
        cursor: 'pointer', userSelect: 'none',
      }}
    >
      {title}
    </div>
  );
}

/**
 * 标题视图：订阅 text（i18n key），用 useText 翻译为当前语言文本。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function TitleView({ cell }) {
  const textKey = useCellData(cell, 'text');
  const text = useText(textKey);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', padding: '0 16px',
      width: '100%', height: '100%', color: '#7a5a3a', fontSize: 16, fontWeight: 'bold',
    }}>
      {text}
    </div>
  );
}

/**
 * 统计卡片视图：订阅 title/count，点击按钮时计数 +1（数据驱动交互）。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function StatCardView({ cell }) {
  const titleKey = useCellData(cell, 'title');
  const count = useCellData(cell, 'count');
  const title = useText(titleKey);
  const clickLabel = useText('stat.clickCount');
  const incLabel = useText('stat.increment');
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      alignItems: 'flex-start', padding: 12, width: '100%', height: '100%',
      color: '#5a3a1a', backgroundColor: '#fffdf5',
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 4 }}>{count}</div>
      <button
        onClick={() => cell.setCount(count + 1)}
        style={{ marginTop: 4, padding: '4px 10px', cursor: 'pointer', border: '1px solid #d8b88a', borderRadius: 4, background: '#fff' }}
      >
        {incLabel}
      </button>
      <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>{clickLabel}{count}</div>
    </div>
  );
}

/**
 * 任务列表视图：订阅 items（业务数据）与 selected，点击任务项切换选中，
 * 高亮当前选中项并同步到 @taskList 锚点（供 TaskDetailCell 绑定读取）。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function TaskListView({ cell }) {
  const items = useCellData(cell, 'items') || [];
  const selected = useCellData(cell, 'selected');
  return (
    <div style={{ width: '100%', height: '100%' }}>
      {items.map(item => (
        <div
          key={item.id}
          onClick={() => cell.setSelected(item.id)}
          style={{
            display: 'flex', alignItems: 'center', padding: '0 10px',
            height: 34, fontSize: 13, cursor: 'pointer', userSelect: 'none',
            color: item.id === selected ? '#fff' : '#333',
            backgroundColor: item.id === selected ? '#357abd' : '#f7f7f7',
            borderBottom: '1px solid #e8e8e8',
          }}
        >
          {item.title}
        </div>
      ))}
    </div>
  );
}

/**
 * 任务详情视图：订阅绑定字段 detail（值为 @taskList#selected 选中的任务 id），
 * 经 find('@taskList') 读取任务数据映射出选中任务的详情；无选中时展示空提示。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function TaskDetailView({ cell }) {
  const selectedId = useCellData(cell, 'detail');
  const emptyLabel = useText('task.empty');
  const listCell = cell.find('@taskList');
  const items = listCell ? listCell.getData('items') || [] : [];
  const item = items.find(t => t.id === selectedId);
  if (!item) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '100%', height: '100%', color: '#bbb', fontSize: 13,
      }}>
        {emptyLabel}
      </div>
    );
  }
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      padding: '0 16px', width: '100%', height: '100%', color: '#333', gap: 4,
    }}>
      <div style={{ fontWeight: 'bold', fontSize: 15 }}>{item.title}</div>
      <div style={{ fontSize: 13, color: '#666' }}>{item.desc}</div>
      <div style={{ fontSize: 12, color: item.status === '已完成' ? '#1a8a4a' : '#c07a1a' }}>
        {item.status}
      </div>
    </div>
  );
}

/**
 * 输入演示视图：订阅 value，输入框 onChange 即时写入数据并回显当前值（数据驱动交互）。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function InputView({ cell }) {
  const value = useCellData(cell, 'value');
  const label = useText('input.label');
  const current = useText('input.current', { value: value || '—' });
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      padding: '0 16px', width: '100%', height: '100%', gap: 6,
    }}>
      <div style={{ fontSize: 12, color: '#888' }}>{label}</div>
      <input
        value={value}
        onChange={e => cell.setValue(e.target.value)}
        style={{ padding: '4px 8px', border: '1px solid #ccc', borderRadius: 4, fontSize: 13 }}
      />
      <div style={{ fontSize: 12, color: '#357abd' }}>{current}</div>
    </div>
  );
}

/**
 * 开关视图：订阅 enabled，点击切换开/关状态，状态文本走 i18n 联动。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function ToggleView({ cell }) {
  const enabled = useCellData(cell, 'enabled');
  const label = useText('toggle.label');
  const stateText = useText(enabled ? 'toggle.on' : 'toggle.off');
  return (
    <div
      onClick={() => cell.setEnabled(!enabled)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', width: '100%', height: '100%',
        cursor: 'pointer', userSelect: 'none', fontSize: 13, color: '#333',
      }}
    >
      <span>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: enabled ? '#1a8a4a' : '#c07a1a', fontWeight: 'bold' }}>{stateText}</span>
        <div style={{
          width: 36, height: 20, borderRadius: 10, position: 'relative',
          backgroundColor: enabled ? '#4a90d9' : '#ccc', transition: 'background-color .15s',
        }}>
          <div style={{
            position: 'absolute', top: 2, width: 16, height: 16, borderRadius: 8,
            backgroundColor: '#fff', transition: 'left .15s',
            left: enabled ? 18 : 2,
          }} />
        </div>
      </div>
    </div>
  );
}

/**
 * 自动绑定演示视图：订阅绑定字段 text（来自 @userProfile#name）并展示。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function BoundTitleView({ cell }) {
  const text = useCellData(cell, 'text');
  const prefix = useText('demo.boundPrefix');
  return (
    <div style={{
      display: 'flex', alignItems: 'center', padding: '0 12px',
      width: '100%', height: '100%',
      color: '#1a5a3a', fontSize: 12, fontWeight: 'bold', backgroundColor: '#e8f5e8',
    }}>
      {prefix}{text}
    </div>
  );
}

/**
 * 引用节点演示视图：经引用节点 profileRef（软链接到 @userProfile）订阅 name。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function RefDemoView({ cell }) {
  const refNode = cell.data.getChild('profileRef');
  const name = useNodeData(refNode, 'name');
  const prefix = useText('demo.refPrefix');
  return (
    <div style={{
      display: 'flex', alignItems: 'center', padding: '0 12px',
      width: '100%', height: '100%',
      color: '#4a2a6a', fontSize: 12, backgroundColor: '#f0e8f5',
    }}>
      {prefix}{name}
    </div>
  );
}

/**
 * 实例引用演示视图：通过 cell.find('@userProfile') 按路径访问目标 Cell，
 * 直接订阅其 data 节点的 role 字段（不经绑定转发）。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function InstanceRefView({ cell }) {
  const profileCell = cell.find('@userProfile');
  const role = useNodeData(profileCell ? profileCell.data : null, 'role');
  const prefix = useText('demo.instanceRefPrefix');
  return (
    <div style={{
      display: 'flex', alignItems: 'center', padding: '0 12px',
      width: '100%', height: '100%',
      color: '#2a4a6a', fontSize: 12, fontWeight: 'bold', backgroundColor: '#e8f0f5',
    }}>
      {prefix}{role}
    </div>
  );
}

/**
 * 页脚视图：展示带 {year} 变量插值的版权文案。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function FooterView({ cell }) {
  // 演示变量插值：{year} 由 useText 的 vars 提供
  const text = useText('footer.copyright', { year: 2026 });
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: '100%', height: '100%', color: '#aaa', fontSize: 12,
    }}>
      {text}
    </div>
  );
}

// =========================================================================
//  Cell 类型
// =========================================================================

/** 页面根 Cell：视口布局，纵向排列，锁定双轴滚动 */
class PageCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.layout('vertical').moveY(false).moveX(false).viewport();
  }
}

/** 顶栏 Cell：固定高度 60，水平排列，承载 Logo/导航/用户区/语言切换 */
class HeaderCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(60).backgroundColor('#4a90d9')
      .moveY(false).moveX(false).layout('horizontal');
  }
}

/** 侧栏 Cell：固定宽度 200，纵向滚动，承载菜单与数据联动演示区 */
class SidebarCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedWidth(200).backgroundColor('#f2f2f2')
      .moveY(true).layout('vertical');
  }
}

/** 内容区 Cell：水平排列，承载侧栏与主面板 */
class ContentAreaCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.minHeight(200).backgroundColor('#f0f0f0')
      .moveY(false).moveX(false).layout('horizontal');
  }
}

/** 主面板 Cell：多 Slot 演示，header（单插槽）+ body（列表插槽，隐藏子项拖拽手柄） */
class MainPanelCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.layout('vertical').minWidth(320).backgroundColor('#ffffff')
      .moveY(false).moveX(false)
      .defineSlot('header', { fixedHeight: 44, backgroundColor: '#ffe8cc', single: true })
      .defineSlot('body', { minHeight: 100, moveY: true, layout: 'vertical', backgroundColor: '#fff', showChildOverlays: false });
  }
}

/** 页脚 Cell：固定高度 60，渲染 FooterView 展示版权文案 */
class FooterCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(60).backgroundColor('#333333')
      .renderContent(FooterView);
  }
}

/** Logo Cell：固定宽度 120，声明 text 字段并渲染 LogoView */
class LogoCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedWidth(120).backgroundColor('#357abd')
      .schema({ text: { type: 'string', default: 'HOUND' } })
      .renderContent(LogoView);
  }
}

/** 导航 Cell：items 存 i18n key，点击切换 activeIndex 高亮 */
class NavCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.minWidth(200).defaultWidth(400).backgroundColor('#5aa0e9')
      .schema({
        items: { type: 'array', default: ['nav.home', 'nav.docs', 'nav.demo', 'nav.about'] },
        activeIndex: { type: 'number', default: 0 },
      })
      .renderContent(NavView);
  }
}

/** ProfileCell：命名锚点 @userProfile，多挂载共享数据 */
class ProfileCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedWidth(100).minHeight(60).backgroundColor('#357abd')
      .schema({
        name: { type: 'string', default: '访客' },
        role: { type: 'string', default: 'guest' },
      })
      .setAnchor('userProfile')
      .renderContent(ProfileView);
  }
}

/** MenuItemCell：title 字段存 i18n key，由 MenuView 翻译，点击切换 active */
class MenuItemCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(44).backgroundColor('#e6e6e6')
      .schema({
        title: { type: 'string', default: 'menu.default' },
        active: { type: 'boolean', default: false },
      })
      .renderContent(MenuView);
  }
}

/** TitleCell：text 字段存 i18n key，由 TitleView 翻译 */
class TitleCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(40).backgroundColor('#ffe8cc')
      .schema({ text: { type: 'string', default: 'title.default' } })
      .renderContent(TitleView);
  }
}

/** 统计卡片行 Cell：水平排列、等高卡片，隐藏子项拖拽手柄 */
class StatRowCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(120).backgroundColor('#ffffff')
      .moveY(false).moveX(false).layout('horizontal')
      .showChildOverlays(false);
  }
}

/** 任务联动区 Cell：水平排列，左侧任务列表 + 右侧详情，隐藏子项拖拽手柄 */
class TaskSectionCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(150).backgroundColor('#ffffff')
      .moveY(false).moveX(false).layout('horizontal')
      .showChildOverlays(false);
  }
}

/** 统计卡片 Cell：title 存 i18n key，count 为可点击累加的交互数据 */
class StatCardCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.minWidth(140).defaultWidth(180).maxWidth(260).backgroundColor('#fffdf5')
      .moveY(false).moveX(false)
      .schema({
        title: { type: 'string', default: 'card.default' },
        count: { type: 'number', default: 0 },
      })
      .renderContent(StatCardView);
  }
}

/** TaskListCell：命名锚点 @taskList，items 为业务任务数据，selected 为当前选中任务 id */
class TaskListCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedWidth(200).backgroundColor('#ffffff')
      .moveY(true).layout('vertical')
      .schema({
        items: {
          type: 'array',
          default: [
            { id: 't1', title: '设计 UI 组件', desc: '完成浮动视口的移动与缩放', status: '进行中' },
            { id: 't2', title: '编写设计文档', desc: '补充 Cell 交互设计章节', status: '待办' },
            { id: 't3', title: '发布 0.9.0', desc: '打包 VSIX 验证发布流程', status: '已完成' },
          ],
        },
        selected: { type: 'string', default: 't1' },
      })
      .setAnchor('taskList')
      .renderContent(TaskListView);
  }
}

/** TaskDetailCell：自动绑定 @taskList#selected，经 find 读取任务数据展示详情 */
class TaskDetailCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.moveY(false).backgroundColor('#fbfbfb')
      .schema({ detail: { type: 'string', bind: '@taskList#selected' } })
      .renderContent(TaskDetailView);
  }
}

/** InputCell：value 为输入框内容，实时写入数据并回显 */
class InputCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(96).backgroundColor('#fafafa')
      .schema({ value: { type: 'string', default: '' } })
      .renderContent(InputView);
  }
}

/** ToggleCell：enabled 为开关状态，点击切换（i18n 文本联动） */
class ToggleCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(56).backgroundColor('#fafafa')
      .schema({ enabled: { type: 'boolean', default: true } })
      .renderContent(ToggleView);
  }
}

/** BoundTitleCell：自动绑定 @userProfile#name */
class BoundTitleCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(40)
      .schema({ text: { type: 'string', bind: '@userProfile#name' } })
      .renderContent(BoundTitleView);
  }
}

/** RefDemoCell：引用节点指向 @userProfile */
class RefDemoCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(40)
      .createRefChild('profileRef', '@userProfile')
      .renderContent(RefDemoView);
  }
}

/** InstanceRefCell：通过路径访问 @userProfile，无需构造参数 */
class InstanceRefCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(40).renderContent(InstanceRefView);
  }
}

/** LanguageSwitchCell：语言切换控件，纳入 header 布局 */
class LanguageSwitchCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedWidth(70).backgroundColor('transparent')
      .renderContent(LangSwitchView);
  }
}

// =========================================================================
//  页面装配：fill 内联实例化，mount 自动挂载全树
// =========================================================================

/**
 * 构建 Cell 演示树（应用工作台）。新建 DataDag，fill 内联装配整棵树
 * （含 profile 多挂载、taskList 锚点），根 Cell 调用 mount(dag._root)
 * 一次性级联挂载全树，返回根元素。
 * @returns {JSX.Element} 页面根元素
 */
function buildCellDemo() {
  const dag = new DataDag();

  // profile 需要多挂载（header + sidebar），保留变量
  const profile = new ProfileCell('profile');

  // 独立窗口（内置预设 WindowCell）：标题栏为拖拽点，可移动/缩放/关闭；
  // 作为浮动视口与页面并列挂载（FloatingLayer 渲染），由主面板"打开窗口"按钮唤起
  const windowCell = new WindowCell('demoWin')
    .posX(480).posY(150)
    .fill('title', new TextCell('winTitle').setText('window.title').setColor('#ffffff').setBold(true))
    .fill('body', new ListCell('winList').setItems([
      { id: 'p1', title: '图表页' },
      { id: 'p2', title: '列表页' },
      { id: 'p3', title: '设置页' },
    ]));

  // fill 内联实例化：fill 返回 this，可链式嵌套构造整棵树
  // title/text/items 中的 i18n key 由视图组件用 useText 翻译（语言切换时自动更新）
  const page = new PageCell('cell-demo').fill('_default', [
    new HeaderCell('header').fill('_default', [
      new LogoCell('logo'),
      new NavCell('nav'),
      profile,  // mount 0
      new LanguageSwitchCell('langSwitch'),
    ]),
    new ContentAreaCell('content').fill('_default', [
      new SidebarCell('sidebar').fill('_default', [
        new MenuItemCell('menu1').setTitle('menu.dashboard'),
        new MenuItemCell('menu2').setTitle('menu.projects'),
        new MenuItemCell('menu3').setTitle('menu.settings'),
        profile,  // mount 1（多挂载，共享同一 DataNode）
        new BoundTitleCell('boundTitle'),
        new RefDemoCell('refDemo'),
        new InstanceRefCell('instanceRef'),
      ]),
      new MainPanelCell('main')
        .fill('header', new TitleCell('title').setText('panel.workspace'))
        .fill('body', [
          // 统计卡片区：横向一行三卡，点击 +1 计数（数据驱动交互）
          new StatRowCell('stats').fill('_default', [
            new StatCardCell('stat1').setTitle('stat.todo'),
            new StatCardCell('stat2').setTitle('stat.messages'),
            new StatCardCell('stat3').setTitle('stat.storage'),
          ]),
          // 任务联动区：选择任务 → 详情经 @taskList 锚点自动绑定同步
          new TaskSectionCell('tasks').fill('_default', [
            new TaskListCell('taskList'),
            new TaskDetailCell('taskDetail'),
          ]),
          // 输入与开关：实时数据写入与状态切换
          new InputCell('input'),
          new ToggleCell('toggle'),
          // 浮层交互：点击打开独立窗口（预设 WindowCell，可移动/缩放/关闭）
          new ButtonCell('openWin').setLabel('demo.openWindow').onPress(() => windowCell.open()),
        ]),
    ]),
    new FooterCell('footer'),
  ]);

  // 一次性挂载全树（根据 slot 关系自动级联）
  page.mount(dag._root);
  // 浮动视口 Cell 与页面并列挂载（独立 reflow 根，由 FloatingLayer 渲染）
  windowCell.mount(dag._root);

  // 渲染
  return page.react();
}

/**
 * 模块级构建一次 Cell 树，避免 StrictMode 双调用导致重复构造。
 * @type {JSX.Element}
 */
const _demoElement = buildCellDemo();

/**
 * Cell 演示页组件。直接返回模块级构建好的元素（惰性渲染，避免重复挂载）。
 * @returns {JSX.Element} 页面根元素
 */
const CellDemoPage = () => _demoElement;

export default CellDemoPage;
