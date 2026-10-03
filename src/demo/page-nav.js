/**
 * @file page-nav.js —— 页面级导航（UI Kit 体系内的页面切换）
 *
 * 替代原 app.jsx 右下角的原生 <button>（不属于 UI Kit 体系的控件）。
 * 每个演示页树顶部各挂一个 NavBarCell 实例（预设展示台 / 工作台两项），
 * 点击经订阅回调通知 app.jsx 切换页面；两页树模块级常驻，页面切换后
 * 经 syncPageNav 同步全部实例的选中态。
 */
import { NavBarCell } from '../core/ui-kit';

/** @type {NavBarCell[]} 已创建的页面导航实例（每页一个） */
const _instances = [];

/** @type {Set<(page: string) => void>} 页面切换订阅者 */
const _listeners = new Set();

/**
 * 创建一个页面导航 NavBarCell（title 与导航项均为 i18n key，经 useText 翻译）。
 * @param {string} activePage 所在页面标识（'presets' | 'workbench'）
 * @returns {NavBarCell} 页面导航实例
 */
function createPageNav(activePage) {
  const nav = new NavBarCell(`page-nav-${activePage}`);
  nav.setTitle('app.title');
  nav.setItems([
    { id: 'presets', title: 'nav.presets' },
    { id: 'workbench', title: 'nav.workbench' },
  ]);
  nav.setActiveId(activePage);
  nav.onSelect((id) => _listeners.forEach(cb => cb(id)));
  _instances.push(nav);
  return nav;
}

/**
 * 订阅页面切换：导航项被点击时回调 cb(pageId)。
 * @param {(page: string) => void} cb 切换回调
 * @returns {() => void} 退订函数
 */
function onPageNavSelect(cb) {
  _listeners.add(cb);
  return () => _listeners.delete(cb);
}

/**
 * 同步全部页面导航实例的选中态（页面切换后调用，含隐藏页的常驻实例）。
 * @param {string} activePage 当前页面标识
 * @returns {void}
 */
function syncPageNav(activePage) {
  _instances.forEach(nav => nav.setActiveId(activePage));
}

export { createPageNav, onPageNavSelect, syncPageNav };
