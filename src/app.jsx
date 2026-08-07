/**
 * @file 应用根组件。以 I18nProvider 包裹 Cell 演示页，提供国际化实例。
 *        语言切换控件本身也是 Cell（LanguageSwitchCell），纳入 header 布局。
 */
import React from 'react';
import CellDemoPage from './demo/cell-demo-page';
import { DemoPageFloating } from './demo/box-demo-page';
import { I18n, I18nProvider } from './core/ui-kit';

/**
 * 语言包：按语言组织的文本资源（key → 文本）。Cell 内容组件通过 useText 引用 key。
 * @type {Object<string, Object<string, string>>}
 */
const messages = {
  'zh-CN': {
    'nav.home': '首页',
    'nav.docs': '文档',
    'nav.demo': '示例',
    'nav.about': '关于',
    'menu.default': '菜单项',
    'menu.dashboard': '仪表盘',
    'menu.projects': '项目列表',
    'menu.settings': '设置',
    'title.default': '标题',
    'panel.workspace': '工作台',
    'card.default': '卡片',
    'stat.todo': '待办任务',
    'stat.messages': '消息中心',
    'stat.storage': '存储空间',
    'stat.clickCount': '点击次数：',
    'stat.increment': '+1',
    'task.empty': '未选择任务',
    'input.label': '实时输入演示：',
    'input.current': '当前输入：{value}',
    'toggle.label': '启用通知',
    'toggle.on': '已开启',
    'toggle.off': '已关闭',
    'demo.openWindow': '打开窗口',
    'window.title': '窗口',
    'profile.switch': '切换',
    'demo.boundPrefix': '绑定字段 → ',
    'demo.refPrefix': '引用节点 → ',
    'demo.instanceRefPrefix': '实例引用 → 角色：',
    'footer.copyright': '© {year} Hound UI Kit · 中文版',
    'lang.switchTo': 'EN',
  },
  'en': {
    'nav.home': 'Home',
    'nav.docs': 'Docs',
    'nav.demo': 'Demo',
    'nav.about': 'About',
    'menu.default': 'Menu Item',
    'menu.dashboard': 'Dashboard',
    'menu.projects': 'Projects',
    'menu.settings': 'Settings',
    'title.default': 'Title',
    'panel.workspace': 'Workspace',
    'card.default': 'Card',
    'stat.todo': 'Todo',
    'stat.messages': 'Messages',
    'stat.storage': 'Storage',
    'stat.clickCount': 'Clicks: ',
    'stat.increment': '+1',
    'task.empty': 'No task selected',
    'input.label': 'Live input demo:',
    'input.current': 'Current: {value}',
    'toggle.label': 'Notifications',
    'toggle.on': 'On',
    'toggle.off': 'Off',
    'demo.openWindow': 'Open Window',
    'window.title': 'Window',
    'profile.switch': 'Switch',
    'demo.boundPrefix': 'Bound → ',
    'demo.refPrefix': 'Ref → ',
    'demo.instanceRefPrefix': 'Instance Ref → Role: ',
    'footer.copyright': '© {year} Hound UI Kit · English',
    'lang.switchTo': '中',
  },
};

/**
 * 模块级 I18n 实例（初始语言 zh-CN）。模块级创建避免 StrictMode 双调用导致重建。
 * @type {I18n}
 */
const i18n = new I18n(messages, 'zh-CN');

/**
 * 应用根组件。以 I18nProvider 包裹 Cell 演示页，子树内任意 Cell 可用 useText；
 * DemoPageFloating 在页面上层叠加渲染浮动视口演示（独立窗口 + 模态遮罩）。
 * @returns {JSX.Element} 应用根节点
 */
const App = () => (
  <I18nProvider i18n={i18n}>
    <CellDemoPage />
    <DemoPageFloating />
  </I18nProvider>
);

export default App;
