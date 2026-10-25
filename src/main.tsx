import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app/App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register Service Worker in production for offline PWA operation
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  const registerSW = () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('[SaudaSamrat] ServiceWorker registered:', registration.scope);
      })
      .catch((error) => {
        console.error('[SaudaSamrat] ServiceWorker registration failed:', error);
      });
  };

  if (document.readyState === 'complete') {
    registerSW();
  } else {
    window.addEventListener('load', registerSW);
  }
}
