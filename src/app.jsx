/**
 * @file 应用根组件。以 I18nProvider 包裹 Cell 演示页，提供国际化实例；
 *        ThemeProvider 注入主题系统，演示尺寸变化特效（页面窗口 resize /
 *        浮动窗口拖拽缩放时，视口内容按主题声明的特效呈现）。
 *        语言切换控件本身也是 Cell（LanguageSwitchCell），纳入 header 布局；
 *        主题切换控件为右上角浮动小面板（演示工具，非 Cell）。
 */
import React, { useState } from 'react';
import CellDemoPage from './demo/cell-demo-page';
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
 * 预置主题：仅声明尺寸变化特效（声明式描述，由特效注册表解析为具体实现）。
 * 每个主题的特效不同，切换主题即可观察不同特效（三者共用"拉伸缩放四角对齐"的
 * 投影呈现，差异仅在真实布局的追赶时机）：
 * - stretch     拉伸：投影四角对齐 + 实时追赶——不冻结，真实布局实时计算，
 *               reflow 就绪（下一帧）立即把当前屏上的拉伸替换为新布局（无防抖）
 * - blur        拉伸 + 模糊：呈现同 stretch，尺寸变化期间整体模糊遮盖重排、
 *               稳定后恢复清晰
 * - freezeZoom  冻结缩放：变化期间布局冻结 + transform 投影实时四角对齐（GPU
 *               合成，零延迟），稳定后 JS reflow 追赶一次精确布局并无缝交接。
 *               默认启用
 * @type {Object<string, Theme>}
 */
const themes = {
  stretch: new Theme({ name: 'stretch', effects: { resize: { type: 'stretch' } } }),
  blur: new Theme({ name: 'blur', effects: { resize: { type: 'blur', blur: 10 } } }),
  freezeZoom: new Theme({ name: 'freezeZoom', effects: { resize: { type: 'freezeZoom' } } }),
};

/** 主题切换控件的按钮文案（演示工具，直接中文标注） */
const THEME_LABELS = {
  stretch: '拉伸',
  blur: '模糊',
  freezeZoom: '冻结缩放',
};

/**
 * 主题切换控件：右上角固定小面板，点击切换当前主题（演示不同主题不同特效）。
 * @param {Object} props 组件属性
 * @param {string} props.current 当前主题名
 * @param {(name: string) => void} props.onChange 切换回调
 * @returns {JSX.Element} 切换面板元素
 */
const ThemeSwitcher = ({ current, onChange }) => (
  <div
    style={{
      position: 'fixed',
      right: 12,
      top: 72,
      zIndex: 3000,
      display: 'flex',
      gap: 6,
      padding: 8,
      borderRadius: 8,
      background: 'rgba(40, 44, 52, 0.9)',
      boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
    }}
  >
    {Object.keys(themes).map(name => (
      <button
        key={name}
        onClick={() => onChange(name)}
        style={{
          padding: '4px 10px',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
          fontSize: 12,
          color: current === name ? '#fff' : '#bbb',
          backgroundColor: current === name ? '#4a90d9' : 'transparent',
        }}
      >
        {THEME_LABELS[name]}
      </button>
    ))}
  </div>
);

/**
 * 应用根组件。I18nProvider 与 ThemeProvider 并列包裹演示页：
 * - 语言切换经 I18nProvider 注入，Cell 内容组件用 useText 订阅
 * - 主题切换经 ThemeProvider 注入，Box 视口根（页面/浮动窗口）按主题声明呈现尺寸变化特效
 * - DemoPageFloating 在页面上层叠加渲染浮动视口演示（独立窗口 + 模态遮罩）
 * @returns {JSX.Element} 应用根节点
 */
const App = () => {
  const [themeName, setThemeName] = useState('freezeZoom');
  return (
    <I18nProvider i18n={i18n}>
      <ThemeProvider theme={themes[themeName]}>
        <CellDemoPage />
        <DemoPageFloating />
        <ThemeSwitcher current={themeName} onChange={setThemeName} />
      </ThemeProvider>
    </I18nProvider>
  );
};

export default App;
