/**
 * @file 主题的 React 注入层。
 *        - ThemeContext 持有当前 Theme 实例
 *        - ThemeProvider 提供实例，通常在应用根部包裹一次（可与 I18nProvider 并列）
 *        - useTheme() 取当前 Theme 实例，用于读取主题声明的特效描述
 *
 *        与 Cell/Box 解耦：组件不依赖具体主题包，仅通过 Theme#getResizeEffect()
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

export { ThemeProvider, ThemeContext, useTheme };
