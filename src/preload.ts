// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';

// Espone API sicure da utilizzare nel processo renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Informazioni sull'applicazione
  appInfo: {
    name: 'Meetings Minuta',
    version: '1.0.0',
  },
  
  // API per le note
  notes: {
    // Ottenere tutte le note
    getAll: () => ipcRenderer.invoke('notes:getAll'),
    
    // Ottenere una nota specifica
    getById: (id: string) => ipcRenderer.invoke('notes:getById', id),
    
    // Salvare una nota
    save: (note: any) => ipcRenderer.invoke('notes:save', note),
    
    // Eliminare una nota
    delete: (id: string) => ipcRenderer.invoke('notes:delete', id),
  }
});
