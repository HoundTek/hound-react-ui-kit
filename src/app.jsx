import React from 'react';
import DemoPage from './demo/demo-page';

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
      <DemoPage />
    </div>
  );
};

export default App;
