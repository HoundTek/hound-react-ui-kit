/**
 * @file Cell 演示页。展示 Cell 的使用模式与 Phase 2/3 特性。
 *
 *        使用模式（简化版）：
 *        1) 类型作者继承 CellBaseBuilder，构造函数中配置 Box、Schema、Slot、内容组件
 *        2) 页面作者用 fill 内联实例化 Cell（fill 返回 this，可链式嵌套）
 *        3) 根 Cell 调用 mount(dag._root) 自动级联挂载全树，再 react() 渲染
 *        4) 跨 Cell 引用用 cell.find(path) 按路径访问（如 @userProfile 锚点）
 *
 *        Phase 2 演示点（路径与绑定）：
 *        - 命名锚点：ProfileCell setAnchor('userProfile')
 *        - 自动绑定：BoundTitleCell bind: '@userProfile#name'
 *        - 引用节点：RefDemoCell createRefChild 指向 @userProfile
 *        - 实例引用：InstanceRefCell 用 cell.find('@userProfile') 按路径访问
 *
 *        Phase 3 演示点（多 Slot + 多挂载）：
 *        - 多 Slot：PanelCell defineSlot('header', {single:true}) + defineSlot('body')
 *        - 多挂载：profile 变量 fill 到 header（mount 0）+ sidebar（mount 1）
 *        - showChildOverlays：body 插槽隐藏子项拖拽手柄
 */
import React from 'react';
import { CellBaseBuilder, DataDag, useCellData, useNodeData, useText, useI18n } from '../core/ui-kit';

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
 * 导航视图：订阅 items（i18n key 数组），逐项渲染 NavLabel 子组件。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function NavView({ cell }) {
  // items 存 i18n key，由 NavLabel 子组件用 useText 翻译（hook 不可在循环回调内调用）
  const items = useCellData(cell, 'items') || [];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '0 16px', width: '100%', height: '100%',
      color: '#fff', fontSize: 14,
    }}>
      {items.map((key, i) => (
        <NavLabel key={i} itemKey={key} />
      ))}
    </div>
  );
}

/**
 * 导航项标签：用 useText 翻译 i18n key，语言切换时自动重新渲染。
 * 独立子组件而非在 NavView 的 map 回调内调用 hook（遵守 hooks 规则）。
 * @param {{itemKey: string}} props 组件属性
 * @returns {JSX.Element} 标签元素
 */
function NavLabel({ itemKey }) {
  const text = useText(itemKey);
  return <span style={{ cursor: 'pointer', opacity: 0.85 }}>{text}</span>;
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
 * 卡片视图：订阅 title/count，点击按钮时计数 +1。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function CardView({ cell }) {
  const titleKey = useCellData(cell, 'title');
  const count = useCellData(cell, 'count');
  const title = useText(titleKey);
  const clickLabel = useText('card.clickCount');
  const incLabel = useText('card.increment');
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      alignItems: 'flex-start', padding: 12, width: '100%', height: '100%',
      color: '#5a3a1a',
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13 }}>{clickLabel}{count}</div>
      <button
        onClick={() => cell.setCount(count + 1)}
        style={{ marginTop: 8, padding: '4px 10px', cursor: 'pointer' }}
      >
        {incLabel}
      </button>
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
 * 自动绑定演示视图：订阅绑定字段 text（来自 @userProfile#name）并展示。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function BoundTitleView({ cell }) {
  const text = useCellData(cell, 'text');
  const prefix = useText('demo.boundPrefix');
  return (
    <div style={{
      display: 'flex', alignItems: 'center', padding: '0 16px',
      width: '100%', height: '100%',
      color: '#1a5a3a', fontSize: 14, fontWeight: 'bold', backgroundColor: '#e8f5e8',
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
      display: 'flex', alignItems: 'center', padding: '0 16px',
      width: '100%', height: '100%',
      color: '#2a4a6a', fontSize: 13, fontWeight: 'bold', backgroundColor: '#e8f0f5',
    }}>
      {prefix}{role}
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

/** 顶栏 Cell：固定高度 60，水平排列，承载 Logo/导航/用户区 */
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

/** 侧栏 Cell：固定宽度 200，纵向排列，承载菜单项列表 */
class SidebarCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedWidth(200).backgroundColor('#e0e0e0')
      .moveY(false).moveX(false).layout('vertical');
  }
}

/** PanelCell：多 Slot 演示，header（单插槽）+ body（列表插槽，隐藏子项拖拽手柄） */
class PanelCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.layout('vertical').minWidth(300).backgroundColor('#ffffff')
      .moveY(false).moveX(false)
      .defineSlot('header', { fixedHeight: 40, backgroundColor: '#ffe4c4', single: true })
      .defineSlot('body', { minHeight: 100, moveY: true, layout: 'vertical', backgroundColor: '#fff', showChildOverlays: false });
  }
}

/** 内容区 Cell：最小高度 200，水平排列，承载侧栏与主面板 */
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

/** 导航 Cell：声明 items 字段（i18n key 数组）并渲染 NavView */
class NavCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.minWidth(200).defaultWidth(400).backgroundColor('#5aa0e9')
      .schema({ items: { type: 'array', default: ['nav.home', 'nav.docs', 'nav.demo', 'nav.about'] } })
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

/** MenuItemCell：title 字段存 i18n key，由 MenuView 翻译 */
class MenuItemCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(50).backgroundColor('#d8d8d8')
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
    this.fixedHeight(40).backgroundColor('#ffe4c4')
      .schema({ text: { type: 'string', default: 'title.default' } })
      .renderContent(TitleView);
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

/** CardCell：title 字段存 i18n key，由 CardView 翻译 */
class CardCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.minWidth(150).defaultWidth(200).maxWidth(300).backgroundColor('#ffdab9')
      .schema({
        title: { type: 'string', default: 'card.default' },
        count: { type: 'number', default: 0 },
      })
      .renderContent(CardView);
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
 * 构建 Cell 演示树。新建 DataDag，fill 内联装配整棵树（含 profile 多挂载），
 * 根 Cell 调用 mount(dag._root) 一次性级联挂载全树，返回根元素。
 * @returns {JSX.Element} 页面根元素
 */
function buildCellDemo() {
  const dag = new DataDag();

  // profile 需要多挂载（header + sidebar），保留变量
  const profile = new ProfileCell('profile');

  // fill 内联实例化：fill 返回 this，可链式嵌套构造整棵树
  // title/text 字段存 i18n key，由视图组件用 useText 翻译（语言切换时自动更新）
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
        new RefDemoCell('refDemo'),
      ]),
      new PanelCell('main')
        .fill('header', new TitleCell('title').setText('panel.workspace'))
        .fill('body', [
          new BoundTitleCell('boundTitle'),
          new InstanceRefCell('instanceRef'),  // 路径访问，无需 profileCell 参数
          new CardCell('card1').setTitle('card.todo'),
          new CardCell('card2').setTitle('card.messages'),
          new CardCell('card3').setTitle('card.stats'),
        ]),
    ]),
    new FooterCell('footer'),
  ]);

  // 一次性挂载全树（根据 slot 关系自动级联）
  page.mount(dag._root);

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
