/**
 * @file i18n 的 React 注入层。
 *        - I18nContext 持有当前 I18n 实例
 *        - I18nProvider 提供实例，通常在应用根部包裹一次
 *        - useText(key, vars) 订阅语言切换并返回当前译文
 *        - useI18n() 取当前 I18n 实例，用于需要调用 setLocale 等方法的场景
 *
 *        与 Cell/Box 解耦：组件不依赖具体语言包，仅引用 i18n key。
 *        语言切换时由 I18n 广播，useText 触发订阅方重新呈现。
 */
import React, { useContext, useEffect, useReducer, createContext } from 'react';

const I18nContext = createContext(null);

/**
 * 提供 I18n 实例。通常在应用根部包裹一次，子树内任意组件可用 useText。
 * @param {Object} props
 * @param {I18n} props.i18n I18n 实例
 * @param {React.ReactNode} props.children
 */
function I18nProvider({ i18n, children }) {
  return React.createElement(I18nContext.Provider, { value: i18n }, children);
}

/**
 * 取当前 I18n 实例。用于需要调用 setLocale 或访问 locale 的场景。
 * @returns {I18n|null} I18n 实例；未在 Provider 内时返回 null
 */
function useI18n() {
  return useContext(I18nContext);
}

/**
 * 订阅文本资源。返回当前语言下的译文，语言切换时自动重新渲染。
 *
 * vars 每次渲染都以最新值参与翻译（不作为订阅依赖），因此 vars 来自父组件
 * 的 state/props 时，父组件重渲染会自然带动译文更新；语言切换由内部订阅触发。
 * @param {string} key 文本资源标识
 * @param {Object} [vars] 插值变量
 * @returns {string} 当前译文；未在 Provider 内或 key 缺失时返回 key 本身
 */
function useText(key, vars) {
  const i18n = useContext(I18nContext);
  const [, force] = useReducer(x => x + 1, 0);
  useEffect(() => {
    if (!i18n) return;
    return i18n.subscribe(force);
  }, [i18n]);
  return i18n ? i18n.t(key, vars) : key;
}

export { I18nProvider, I18nContext, useText, useI18n };
