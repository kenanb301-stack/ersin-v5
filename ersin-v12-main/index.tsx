import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './ersin-v11-main/ersin-v10-main/ersin-v4-main/App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);