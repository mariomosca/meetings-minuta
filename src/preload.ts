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
  },
  
  // API per le riunioni
  meetings: {
    // Ottenere tutte le riunioni
    getAll: () => ipcRenderer.invoke('meetings:getAll'),
    
    // Ottenere una riunione specifica
    getById: (id: string) => ipcRenderer.invoke('meetings:getById', id),
    
    // Salvare una riunione
    save: (meeting: any) => ipcRenderer.invoke('meetings:save', meeting),
    
    // Eliminare una riunione
    delete: (id: string) => ipcRenderer.invoke('meetings:delete', id),
  },
  
  // API per le trascrizioni
  transcripts: {
    // Ottenere tutte le trascrizioni
    getAll: () => ipcRenderer.invoke('transcripts:getAll'),
    
    // Ottenere una trascrizione specifica
    getById: (id: string) => ipcRenderer.invoke('transcripts:getById', id),
    
    // Ottenere trascrizioni per una riunione specifica
    getByMeetingId: (meetingId: string) => ipcRenderer.invoke('transcripts:getByMeetingId', meetingId),
    
    // Salvare una trascrizione
    save: (transcript: any) => ipcRenderer.invoke('transcripts:save', transcript),
    
    // Eliminare una trascrizione
    delete: (id: string) => ipcRenderer.invoke('transcripts:delete', id),
    
    // Avviare una trascrizione con AssemblyAI
    startTranscription: (audioFileId: string) => ipcRenderer.invoke('transcripts:startTranscription', audioFileId),
  },
  
  // API per i file audio
  audioFiles: {
    // Ottenere tutti i file audio
    getAll: () => ipcRenderer.invoke('audioFiles:getAll'),
    
    // Ottenere un file audio specifico
    getById: (id: string) => ipcRenderer.invoke('audioFiles:getById', id),
    
    // Ottenere file audio per una riunione specifica
    getByMeetingId: (meetingId: string) => ipcRenderer.invoke('audioFiles:getByMeetingId', meetingId),
    
    // Salvare un file audio
    save: (audioFile: any) => ipcRenderer.invoke('audioFiles:save', audioFile),
    
    // Eliminare un file audio
    delete: (id: string) => ipcRenderer.invoke('audioFiles:delete', id),
    
    // Importare un file audio dal filesystem
    import: () => ipcRenderer.invoke('audioFiles:import'),
  },
  
  // API per la configurazione
  config: {
    // Ottenere le directory monitorate
    getWatchDirectories: () => ipcRenderer.invoke('config:getWatchDirectories'),
    
    // Aggiungere una directory monitorata
    addWatchDirectory: () => ipcRenderer.invoke('config:addWatchDirectory'),
    
    // Rimuovere una directory monitorata
    removeWatchDirectory: (dirPath: string) => ipcRenderer.invoke('config:removeWatchDirectory', dirPath),
    
    // Ottenere la chiave API AssemblyAI
    getAssemblyAiKey: () => ipcRenderer.invoke('config:getAssemblyAiKey'),
    
    // Impostare la chiave API AssemblyAI
    setAssemblyAiKey: (apiKey: string) => ipcRenderer.invoke('config:setAssemblyAiKey', apiKey),
  },
  
  // API per le impostazioni (wrapper per config)
  settings: {
    // Ottenere la directory monitorata
    getWatchDirectory: async () => {
      console.log('preload: chiamata a getWatchDirectory');
      try {
        const directories = await ipcRenderer.invoke('config:getWatchDirectories');
        console.log('preload: directories ottenute:', directories);
        return { 
          directory: directories && directories.length > 0 ? directories[0] : '',
          isEnabled: directories && directories.length > 0 // Considera attivo se c'è almeno una directory
        };
      } catch (error) {
        console.error('preload: errore in getWatchDirectory:', error);
        return { directory: '', isEnabled: false };
      }
    },
    
    // Selezionare la directory da monitorare
    selectWatchDirectory: async () => {
      console.log('preload: chiamata a selectWatchDirectory');
      try {
        const directories = await ipcRenderer.invoke('config:addWatchDirectory');
        console.log('preload: risultato da addWatchDirectory:', directories);
        if (directories && directories.length > 0) {
          return { 
            success: true, 
            directory: directories[directories.length - 1] 
          };
        } else {
          return { success: false, error: 'Nessuna directory selezionata' };
        }
      } catch (error) {
        console.error('preload: errore in selectWatchDirectory:', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Errore sconosciuto' 
        };
      }
    },
    
    // Attivare/disattivare il monitoraggio
    toggleWatching: async (isEnabled: boolean) => {
      console.log('preload: chiamata a toggleWatching:', isEnabled);
      // Questa è una simulazione perché non c'è un endpoint specifico
      // In una vera implementazione, dovremmo gestire l'attivazione/disattivazione del watcher
      return { success: true };
    },
    
    // Ottenere la chiave API AssemblyAI
    getAssemblyAIApiKey: async () => {
      console.log('preload: chiamata a getAssemblyAIApiKey');
      try {
        return await ipcRenderer.invoke('config:getAssemblyAiKey');
      } catch (error) {
        console.error('preload: errore in getAssemblyAIApiKey:', error);
        return '';
      }
    },
    
    // Salvare la chiave API AssemblyAI
    saveAssemblyAIApiKey: async (apiKey: string) => {
      console.log('preload: chiamata a saveAssemblyAIApiKey');
      try {
        const result = await ipcRenderer.invoke('config:setAssemblyAiKey', apiKey);
        return { success: !!result };
      } catch (error) {
        console.error('preload: errore in saveAssemblyAIApiKey:', error);
        return { success: false };
      }
    }
  },
  
  // API per eventi
  events: {
    // Registrare una callback per un evento
    on: (channel: string, callback: (...args: any[]) => void) => {
      // Canali consentiti
      const validChannels = [
        'transcript:statusChanged',
        'audioFile:imported',
        'directory:filesChanged'
      ];
      
      if (validChannels.includes(channel)) {
        ipcRenderer.on(channel, (_, ...args) => callback(...args));
      }
    },
    
    // Rimuovere una callback per un evento
    off: (channel: string, callback: (...args: any[]) => void) => {
      // Canali consentiti
      const validChannels = [
        'transcript:statusChanged',
        'audioFile:imported',
        'directory:filesChanged'
      ];
      
      if (validChannels.includes(channel)) {
        ipcRenderer.removeListener(channel, callback);
      }
    }
  }
});
