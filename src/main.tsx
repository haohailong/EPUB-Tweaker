import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './styles.css';

let notifyUpdate: (() => void) | undefined;
const updateSW = registerSW({ onNeedRefresh: () => notifyUpdate?.() });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App onRegisterUpdate={(callback) => { notifyUpdate = callback; }} updateApp={() => updateSW(true)} />
  </StrictMode>
);
