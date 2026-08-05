/**
 * @file 应用根组件。叠加渲染 Box 内容层、边覆盖层与角覆盖层三层结构。
 */
import React from 'react';
import { DemoPageContent, DemoPageEdge, DemoPageCorner } from './demo/box-demo-page';

/**
 * 应用根组件。
 * 三层覆盖结构：内容层（布局）+ 边覆盖层（拖拽分界线）+ 角覆盖层（双轴交点），
 * 三者通过绝对定位叠加在同一根容器内。
 * @returns {JSX.Element} 应用根节点
 */
const App = () => {
  return (
    <div id="app" className="app"
    style={{
      position: 'relative',
      width: "100vw",
      height: "100vh",
      backgroundColor: "aqua",
    }}>
      <DemoPageContent />
      <DemoPageEdge />
      <DemoPageCorner />
    </div>
  );
};

export default App;
