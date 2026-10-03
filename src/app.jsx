/**
 * @file 应用根组件。以 I18nProvider 包裹 Cell 演示页，提供国际化实例；
 *        ThemeProvider 注入主题系统，演示尺寸变化特效（页面窗口 resize /
 *        浮动窗口拖拽缩放时，视口内容按主题声明的特效呈现）。
 *        语言切换控件本身也是 Cell（LanguageSwitchCell），纳入 header 布局。
 */
import React, { useEffect, useState } from 'react';
import CellDemoPage from './demo/cell-demo-page';
import PresetDemoPage from './demo/preset-demo-page';
import { DemoPageFloating } from './demo/box-demo-page';
import { onPageNavSelect, syncPageNav } from './demo/page-nav';
import { I18n, I18nProvider, Theme, ThemeProvider } from './core/ui-kit';

/**
 * 语言包：按语言组织的文本资源（key → 文本）。Cell 内容组件通过 useText 引用 key。
 * @type {Object<string, Object<string, string>>}
 */
const messages = {
  'zh-CN': {
    'app.title': 'Hound UI Kit',
    'nav.presets': '预设展示台',
    'nav.workbench': '工作台',
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
    'app.title': 'Hound UI Kit',
    'nav.presets': 'Preset Gallery',
    'nav.workbench': 'Workbench',
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
 * 应用主题：完整设计令牌（见 docs/theme-shape-design.md），取值基准 Material Design 3
 *（light scheme，MD3 令牌映射见同文档「参考主题」节）。
 * - 形状：统一 g1 圆弧圆角——g2 曲率平滑依赖 CSS corner-shape（仅 Chromium
 *   支持，Firefox/Safari 自动降级回 g1），为保证四浏览器呈现一致，本主题
 *   直接声明 g1；包裹层规范按组件角色给出基准圆角尺度，对齐 MD3 形状尺度——
 *   control 8（small）/ default 12（medium）/ overlay 8（small）/
 *   card 12（medium）/ window 28（extraLarge）/ nav 0（通栏），
 *   元素级圆角经 useShapeRadius 对齐同一尺度
 * - 普适配置：颜色角色表（MD3 规范角色 + 兼容别名同值双写）、材质表
 *   （frosted 毛玻璃）、遮罩（mask 颜色 + 不透明度）；styles 角色样式表
 *   （普适性配置级：Cell 只声明 styleRole，底色等默认值由主题集中给出）
 * - 组件级重写（两级样式体系第二级，见 docs/basic-cell-design.md）：
 *   components 声明 switch 走 'md3-switch' 实现（实现注册表解析），
 *   未声明的 Cell 种类一律走组装 fallback
 * - 动态属性：尺寸变化特效 stretch（投影四角对齐 + 实时追赶）
 * @type {Theme}
 */
const theme = new Theme({
  name: 'hound-md3-light',
  shape: {
    corner: 'g1',
    layers: {
      default: [{ inset: 0, radius: 12 }],
      control: [{ inset: 0, radius: 8 }],
      overlay: [{ inset: 0, radius: 8 }],
      card: [{ inset: 0, radius: 12 }],
      window: [{ inset: 0, radius: 28 }],
      nav: [{ inset: 0, radius: 0 }],
    },
  },
  materials: {
    colors: {
      // MD3 规范角色（light scheme 基准值）
      primary: '#6750A4',
      'on-primary': '#FFFFFF',
      'primary-container': '#EADDFF',
      'on-primary-container': '#21005D',
      surface: '#FEF7FF',
      'on-surface': '#1D1B20',
      'surface-variant': '#E7E0EC',
      'on-surface-variant': '#49454F',
      outline: '#79747E',
      'outline-variant': '#CAC4D0',
      'inverse-surface': '#322F35',
      'inverse-on-surface': '#F5EFF7',
      error: '#B3261E',
      // 兼容别名（既有 Cell/演示引用的角色名，与对应 MD3 角色同值）
      'primary-dark': '#4F378B',
      'primary-soft': '#EADDFF',
      'surface-muted': '#F3EDF7',
      border: '#CAC4D0',
      text: '#1D1B20',
      'text-secondary': '#49454F',
      'text-muted': '#79747E',
      danger: '#B3261E',
      // MD3 之外的语义扩展角色（非 MD3 token，取值自定）
      success: '#2f9e63',
      warning: '#d9870d',
      mask: '#101418',
    },
    material: {
      frosted: { blur: 20, baseOpacity: 0.6 },
    },
    mask: { color: '#101418', opacity: 0.45 },
  },
  styles: {
    window: { color: 'surface' },
    card: { color: 'surface' },
    nav: { color: 'primary' },
  },
  // 元素级样式表（普适性配置的元素级扩展）：基础实现组件内部元素的
  // 默认变体/圆角/阴影，props 显式传入优先于本表
  elements: {
    button: { radius: 'capsule', elevation: 0 },
    input: { variant: 'outlined' },
    slider: { variant: 'md3' },
    list: { variant: 'md3' },
  },
  components: { switch: 'md3-switch' },
  effects: { resize: { type: 'stretch' } },
});

/**
 * 应用根组件。I18nProvider 与 ThemeProvider 并列包裹演示页：
 * - 语言切换经 I18nProvider 注入，Cell 内容组件用 useText 订阅
 * - 主题（拉伸特效）经 ThemeProvider 注入，Box 视口根（页面/浮动窗口）在尺寸
 *   变化时以拉伸特效呈现（投影四角对齐 + 实时追赶）
 * - DemoPageFloating 在页面上层叠加渲染浮动视口演示（独立窗口 + 模态遮罩，
 *   层级由系统管理：后聚焦/出现居上 + 模态序排列）
 * - 页面入口二选一（默认预设展示台）：PresetDemoPage 为 75 个预设 Cell 的分类
 *   速览，CellDemoPage 为数据驱动工作台；页面切换由 UI Kit 体系内的页面导航
 *   （page-nav，NavBarCell）驱动，无体系外控件
 * @returns {JSX.Element} 应用根节点
 */
const App = () => {
  const [page, setPage] = useState('presets');
  useEffect(() => onPageNavSelect(setPage), []);
  useEffect(() => syncPageNav(page), [page]);
  return (
    <I18nProvider i18n={i18n}>
      <ThemeProvider theme={theme}>
        {page === 'presets' ? <PresetDemoPage /> : <CellDemoPage />}
        <DemoPageFloating />
      </ThemeProvider>
    </I18nProvider>
  );
};

export default App;
