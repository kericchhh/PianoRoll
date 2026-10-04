import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import '@fontsource/barlow/latin-400.css';
import '@fontsource/barlow/latin-700.css';
import '@/styles/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
