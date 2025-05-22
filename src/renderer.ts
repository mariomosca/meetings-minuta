/**
 * Questo file viene caricato automaticamente da Vite nel contesto "renderer".
 *
 * https://electronjs.org/docs/tutorial/process-model
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.ts` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

import './index.css';

// Log di inizializzazione
console.log('👋 Renderer di Meetings Minuta inizializzato');

// Interfaccia per le API di Electron
interface ElectronAPI {
  appInfo?: {
    name: string;
    version: string;
  };
}

// Accesso alle API esposte dal preload
const electronAPI = (window as any).electronAPI as ElectronAPI;

// Aggiornamento informazioni versione se disponibili
document.addEventListener('DOMContentLoaded', () => {
  try {
    const versionElement = document.querySelector('.app-info');
    if (versionElement && electronAPI?.appInfo) {
      versionElement.textContent = `Versione: ${electronAPI.appInfo.version}`;
    }
  } catch (error) {
    console.error('Errore nell\'accesso alle API di Electron:', error);
  }
});
