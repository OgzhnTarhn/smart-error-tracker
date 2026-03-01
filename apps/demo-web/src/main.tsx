import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { init, installGlobalHandlers } from '@smart-error-tracker/browser';
import App from './App';
import './index.css';

// Initialize SDK
init({
    baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
    apiKey: import.meta.env.VITE_API_KEY || '',
    environment: import.meta.env.VITE_ENVIRONMENT || 'dev',
    release: import.meta.env.VITE_RELEASE || '0.0.0-demo',
});

// Install automatic global error handlers
installGlobalHandlers();

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
