/**
 * @file 应用入口。创建 React 根节点并挂载到 DOM，外层包裹 StrictMode 与
 *        HoveredEdgesProvider（为 Box 边/角覆盖层提供全局悬停状态）。
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app';
import { HoveredEdgesProvider } from './core/box/hovered-edges-context';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <HoveredEdgesProvider>
      <App />
    </HoveredEdgesProvider>
  </React.StrictMode>
);