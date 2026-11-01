/**
 * @file theme-mode.js —— 演示应用的亮/暗模式状态桥（模式同 page-nav.js）
 *
 *        主题实例由 App 持有（ThemeProvider 注入），切换控件是演示树内的
 *        Cell（ThemeSwitchCell）：控件经本模块广播模式变化，App 订阅后
 *        切换 ThemeProvider 的 theme 值——context 变化驱动全部 useTheme
 *        订阅方重新呈现，Cell 树与数据无需重建。
 */

/** @type {boolean} 当前是否暗色模式 */
let _dark = false;

/** @type {Set<(dark: boolean) => void>} 模式变化订阅者 */
const _listeners = new Set();

/**
 * 切换亮/暗模式并广播。
 * @returns {boolean} 切换后的暗色标志
 */
function toggleThemeMode() {
  _dark = !_dark;
  _listeners.forEach((cb) => cb(_dark));
  return _dark;
}

/**
 * 订阅模式变化。
 * @param {(dark: boolean) => void} cb 回调
 * @returns {() => void} 退订函数
 */
function onThemeModeChange(cb) {
  _listeners.add(cb);
  return () => _listeners.delete(cb);
}

export { toggleThemeMode, onThemeModeChange };
