import React from 'react';
import CellDemoPage from './demo/cell-demo-page';

const App = () => {
  return (
    <div id="app" className="app"
    style={{
      display: "flex",
      width: "100vw",
      height: "100vh",
      backgroundColor: "aqua", 
      justifyContent: "center",
      alignItems: "center",
    }}>
      <CellDemoPage />
    </div>
  );
};

export default App;