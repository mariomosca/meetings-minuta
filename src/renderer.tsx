/**
 * Questo file viene caricato automaticamente da Vite nel contesto "renderer".
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
// Importa il modulo i18n (deve essere importato prima del rendering)
import './i18n';

// Log di inizializzazione
console.log('👋 Renderer di Meetings Minuta inizializzato');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
); 