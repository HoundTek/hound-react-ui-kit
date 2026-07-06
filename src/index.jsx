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