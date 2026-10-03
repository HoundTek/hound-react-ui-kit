/**
 * @file 主题的 React 注入层。
 *        - ThemeContext 持有当前 Theme 实例
 *        - ThemeProvider 提供实例，通常在应用根部包裹一次（可与 I18nProvider 并列）
 *        - useTheme() 取当前 Theme 实例，用于读取主题声明的特效描述
 *        - useThemeColor() / useCornerType()：普适配置的消费 Hook（见
 *          docs/theme-shape-design.md）——Box 级背景由 ContentLayer 自动解析，
 *          这两个 Hook 供 Cell 内容组件内部的元素级用色与圆角
 *
 *        与 Cell/Box 解耦：组件不依赖具体主题包，仅通过 Theme 的 getter
 *        读取声明式描述；主题切换时 Provider value 变化，订阅方重新呈现。
 */
import React, { useContext, createContext } from 'react';

const ThemeContext = createContext(null);

/**
 * 提供 Theme 实例。通常在应用根部包裹一次，子树内任意组件可用 useTheme。
 * @param {Object} props
 * @param {Theme} props.theme Theme 实例
 * @param {React.ReactNode} props.children
 */
function ThemeProvider({ theme, children }) {
  return React.createElement(ThemeContext.Provider, { value: theme }, children);
}

/**
 * 取当前 Theme 实例。
 * @returns {Theme|null} Theme 实例；未在 Provider 内时返回 null
 */
function useTheme() {
  return useContext(ThemeContext);
}

/**
 * 解析颜色角色为色值（普适配置项）。角色未在主题中定义时回退缺省色值，
 * 保证无主题/缺角色时呈现不变。
 * @param {string} role 颜色角色（如 'primary'、'surface'、'text-muted'）
 * @param {string} fallback 缺省色值（通常为迁移前的原色值）
 * @returns {string} 色值
 */
function useThemeColor(role, fallback) {
  const theme = useTheme();
  return theme?.resolveColor(role) ?? fallback;
}

/**
 * 取当前主题的圆角类型（供 cornerStyle 使用）
 * @returns {'g1'|'g2'} 圆角类型；无主题时返回 'g1'
 */
function useCornerType() {
  const theme = useTheme();
  return theme?.getCornerType() || 'g1';
}

/**
 * 取组件角色的基准圆角（主题层规范第 0 层），供元素级圆角按角色
 * 对齐主题半径尺度；角色未声明时回退 fallback
 * @param {string} role 组件角色（如 'control'、'overlay'、'card'）
 * @param {number} fallback 缺省圆角（px，通常为迁移前的原值）
 * @returns {number} 圆角半径（px）
 */
function useShapeRadius(role, fallback) {
  const theme = useTheme();
  return theme?.getBaseRadius(role) ?? fallback;
}

/**
 * 取元素角色的元素级样式默认值（普适性配置的元素级扩展，见
 * docs/theme-shape-design.md）。基础实现组件（XxxImpl）用它解析
 * variant / radius / elevation 的主题默认：props 显式 > 本表 > 内建默认。
 * @param {string} role 元素角色（如 'button'、'input'、'slider'、'list'）
 * @returns {{variant?: string, radius?: number|string, elevation?: number}|null}
 *   元素样式；无主题或未声明返回 null
 */
function useElementStyle(role) {
  const theme = useTheme();
  return theme?.getElementStyle(role) ?? null;
}

export { ThemeProvider, ThemeContext, useTheme, useThemeColor, useCornerType, useShapeRadius, useElementStyle };
