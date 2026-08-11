/**
 * @file 应用根组件。以 I18nProvider 包裹 Cell 演示页，提供国际化实例；
 *        ThemeProvider 注入主题系统，演示尺寸变化特效（页面窗口 resize /
 *        浮动窗口拖拽缩放时，视口内容按主题声明的特效呈现）。
 *        语言切换控件本身也是 Cell（LanguageSwitchCell），纳入 header 布局。
 */
import React, { useState } from 'react';
import CellDemoPage from './demo/cell-demo-page';
import PresetDemoPage from './demo/preset-demo-page';
import { DemoPageFloating } from './demo/box-demo-page';
import { I18n, I18nProvider, Theme, ThemeProvider } from './core/ui-kit';

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
 * 应用主题：固定使用"拉伸"尺寸变化特效（stretch）。
 * 投影四角对齐 + 实时追赶——不冻结，真实布局实时计算，reflow 就绪（下一帧）
 * 立即把当前屏上的拉伸替换为新布局（无防抖），拖拽全程一段连续拉伸。
 * @type {Theme}
 */
const theme = new Theme({ name: 'stretch', effects: { resize: { type: 'stretch' } } });

/**
 * 应用根组件。I18nProvider 与 ThemeProvider 并列包裹演示页：
 * - 语言切换经 I18nProvider 注入，Cell 内容组件用 useText 订阅
 * - 主题（拉伸特效）经 ThemeProvider 注入，Box 视口根（页面/浮动窗口）在尺寸
 *   变化时以拉伸特效呈现（投影四角对齐 + 实时追赶）
 * - DemoPageFloating 在页面上层叠加渲染浮动视口演示（独立窗口 + 模态遮罩，
 *   层级由系统管理：后聚焦/出现居上 + 模态序排列）
 * - 页面入口二选一（默认预设展示台，可经右下角按钮切回工作台）：
 *   PresetDemoPage 为 75 个预设 Cell 的分类速览，CellDemoPage 为数据驱动工作台
 * @returns {JSX.Element} 应用根节点
 */
const App = () => {
  const [page, setPage] = useState('presets');
  const switchBtn = { position: 'fixed', right: 12, bottom: 12, zIndex: 9000, padding: '6px 12px', borderRadius: 4, border: '1px solid #4a90d9', background: '#4a90d9', color: '#fff', fontSize: 12, cursor: 'pointer' };
  return (
    <I18nProvider i18n={i18n}>
      <ThemeProvider theme={theme}>
        {page === 'presets' ? <PresetDemoPage /> : <CellDemoPage />}
        <DemoPageFloating />
        <button style={switchBtn} onClick={() => setPage(page === 'presets' ? 'workbench' : 'presets')}>
          {page === 'presets' ? '切换到工作台' : '切换到预设展示台'}
        </button>
      </ThemeProvider>
    </I18nProvider>
  );
};

export default App;
