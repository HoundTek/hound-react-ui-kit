import React from 'react';
import { DemoPageContent, DemoPageEdge, DemoPageCorner } from './demo/box-demo-page';

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
