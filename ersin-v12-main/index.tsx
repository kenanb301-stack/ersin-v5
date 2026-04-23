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

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(reg => console.log('SW Ready:', reg.scope))
      .catch(err => console.error('SW Error:', err));
  });
}
