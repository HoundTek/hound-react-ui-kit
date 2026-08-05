/**
 * @file 应用根组件。渲染 Cell 演示页（CellRoot 内部已合并 Box 三层渲染）。
 */
import React from 'react';
import CellDemoPage from './demo/cell-demo-page';

/**
 * 应用根组件。CellDemoPage 返回 CellRoot，内部叠加 ContentLayer / EdgeLayer /
 * CornerLayer 三层，因此 App 不再需要手动叠加。
 * @returns {JSX.Element} 应用根节点
 */
const App = () => {
  return <CellDemoPage />;
};

export default App;
