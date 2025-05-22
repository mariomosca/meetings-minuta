// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge } from 'electron';

// Espone API sicure da utilizzare nel processo renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Informazioni sull'applicazione
  appInfo: {
    name: 'Meetings Minuta',
    version: '1.0.0',
  },
});
