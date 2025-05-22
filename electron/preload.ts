import { contextBridge, ipcRenderer } from 'electron';

// Espone le API sicure al renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Informazioni sull'app
  appInfo: {
    name: await ipcRenderer.invoke('app:getInfo').then(info => info.name),
    version: await ipcRenderer.invoke('app:getInfo').then(info => info.version)
  },
  
  // API per le riunioni
  meetings: {
    getAll: () => ipcRenderer.invoke('meetings:getAll'),
    getById: (id: string) => ipcRenderer.invoke('meetings:getById', id),
    save: (meeting: any) => ipcRenderer.invoke('meetings:save', meeting),
    delete: (id: string) => ipcRenderer.invoke('meetings:delete', id)
  },
  
  // API per i file audio
  audioFiles: {
    import: () => ipcRenderer.invoke('audioFiles:import'),
    getByMeetingId: (meetingId: string) => ipcRenderer.invoke('audioFiles:getByMeetingId', meetingId),
    save: (audioFile: any) => ipcRenderer.invoke('audioFiles:save', audioFile)
  },
  
  // API per le trascrizioni
  transcripts: {
    getByMeetingId: (meetingId: string) => ipcRenderer.invoke('transcripts:getByMeetingId', meetingId),
    startTranscription: (audioFileId: string) => ipcRenderer.invoke('transcripts:startTranscription', audioFileId)
  },
  
  // API per le impostazioni
  settings: {
    getWatchDirectory: () => ipcRenderer.invoke('settings:getWatchDirectory'),
    selectWatchDirectory: () => ipcRenderer.invoke('settings:selectWatchDirectory'),
    toggleWatching: (isEnabled: boolean) => ipcRenderer.invoke('settings:toggleWatching', isEnabled),
    saveAssemblyAIApiKey: (apiKey: string) => ipcRenderer.invoke('settings:saveAssemblyAIApiKey', apiKey),
    getAssemblyAIApiKey: () => ipcRenderer.invoke('settings:getAssemblyAIApiKey')
  },
  
  // Listeners per eventi dal main process
  onNewMeetingCreated: (callback: (meeting: any) => void) => {
    ipcRenderer.on('new-meeting-created', (_, meeting) => callback(meeting));
    
    // Funzione per rimuovere il listener
    return () => {
      ipcRenderer.removeAllListeners('new-meeting-created');
    };
  },
  
  onTranscriptionStatusUpdate: (callback: (transcript: any) => void) => {
    ipcRenderer.on('transcription-status-update', (_, transcript) => callback(transcript));
    
    // Funzione per rimuovere il listener
    return () => {
      ipcRenderer.removeAllListeners('transcription-status-update');
    };
  }
}); 