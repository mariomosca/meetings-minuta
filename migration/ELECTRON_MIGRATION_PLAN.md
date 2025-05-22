# Piano di Migrazione a Electron con Force

## Panoramica

Questo documento delinea il piano specifico per migrare l'applicazione AudioTranscriber da un'architettura web client-server a un'applicazione desktop completa basata su Electron con PouchDB come database. Utilizzeremo electron-forge come framework di scaffolding per semplificare la configurazione e il deployment.

## File e Directory Necessari

### Struttura del Progetto Electron

```
electron-app/
├── package.json                # Configurazione principale
├── forge.config.js             # Configurazione electron-forge
├── .gitignore
├── tsconfig.json               # Configurazione TypeScript
├── src/
│   ├── main/                   # Processo principale di Electron
│   │   ├── index.ts            # Entry point del processo principale
│   │   ├── ipc/                # Gestori IPC
│   │   │   ├── meetingHandlers.ts
│   │   │   ├── transcriptHandlers.ts
│   │   │   └── audioFileHandlers.ts
│   │   ├── db/                 # Layer database
│   │   │   ├── pouchdb.ts      # Configurazione PouchDB
│   │   │   ├── migrator.ts     # Script di migrazione dati
│   │   │   └── models/         # Modelli per PouchDB
│   │   │       ├── meeting.ts
│   │   │       ├── transcript.ts
│   │   │       └── audioFile.ts
│   │   ├── services/           # Servizi backend
│   │   │   ├── assemblyAi.ts   # Integrazione AssemblyAI
│   │   │   ├── fileWatcher.ts  # Sistema di monitoraggio file
│   │   │   └── openAi.ts       # Integrazione OpenAI
│   │   └── utils/              # Utility
│   │       └── logger.ts
│   ├── preload/                # Script preload
│   │   ├── index.ts            # Entry point preload
│   │   └── api.ts              # API esposte al renderer
│   └── renderer/               # Frontend React
│       ├── index.html          # HTML principale
│       ├── App.tsx             # Componente principale
│       ├── main.tsx            # Entry point React
│       ├── services/           # Servizi frontend
│       │   └── api.ts          # Client API adattato per Electron
│       ├── components/         # Componenti UI (migrati dal frontend attuale)
│       ├── pages/              # Pagine (migrate dal frontend attuale)
│       ├── contexts/           # Context e state management
│       └── assets/             # Risorse statiche
└── resources/                  # Risorse applicazione
    └── icon.png                # Icona applicazione
```

## File Principali da Creare

### 1. package.json

```json
{
  "name": "audio-transcriber",
  "productName": "AudioTranscriber",
  "version": "1.0.0",
  "description": "App desktop per la trascrizione automatica di file audio",
  "main": ".webpack/main",
  "scripts": {
    "start": "electron-forge start",
    "package": "electron-forge package",
    "make": "electron-forge make",
    "publish": "electron-forge publish",
    "lint": "eslint --ext .ts,.tsx ."
  },
  "keywords": [],
  "author": {
    "name": "Your Name",
    "email": "your.email@example.com"
  },
  "license": "MIT",
  "devDependencies": {
    "@electron-forge/cli": "^6.4.2",
    "@electron-forge/maker-deb": "^6.4.2",
    "@electron-forge/maker-rpm": "^6.4.2",
    "@electron-forge/maker-squirrel": "^6.4.2",
    "@electron-forge/maker-zip": "^6.4.2",
    "@electron-forge/plugin-webpack": "^6.4.2",
    "@typescript-eslint/eslint-plugin": "^5.62.0",
    "@typescript-eslint/parser": "^5.62.0",
    "electron": "^28.0.0",
    "eslint": "^8.56.0",
    "eslint-plugin-import": "^2.29.1",
    "eslint-plugin-react": "^7.33.2",
    "fork-ts-checker-webpack-plugin": "^7.3.0",
    "node-loader": "^2.0.0",
    "ts-loader": "^9.5.1",
    "typescript": "~5.1.6"
  },
  "dependencies": {
    "assemblyai": "^4.12.2",
    "axios": "^1.9.0",
    "chokidar": "^4.0.3",
    "electron-squirrel-startup": "^1.0.0",
    "electron-store": "^8.1.0",
    "openai": "^4.100.0",
    "pouchdb": "^8.0.1",
    "pouchdb-find": "^8.0.1",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.1",
    "uuid": "^9.0.1"
  }
}
```

### 2. forge.config.js

```javascript
module.exports = {
  packagerConfig: {
    asar: true,
    icon: './resources/icon',
    executableName: 'AudioTranscriber',
    extraResource: [
      './resources'
    ]
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        iconUrl: 'https://raw.githubusercontent.com/yourusername/audio-transcriber/main/resources/icon.ico',
        setupIcon: './resources/icon.ico'
      }
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin']
    },
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          icon: './resources/icon.png'
        }
      }
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {}
    }
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-webpack',
      config: {
        mainConfig: './webpack.main.config.js',
        renderer: {
          config: './webpack.renderer.config.js',
          entryPoints: [
            {
              html: './src/renderer/index.html',
              js: './src/renderer/main.tsx',
              name: 'main_window',
              preload: {
                js: './src/preload/index.ts'
              }
            }
          ]
        }
      }
    }
  ]
};
```

### 3. src/main/index.ts

```typescript
import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { setupDatabase } from './db/pouchdb';
import { setupMeetingHandlers } from './ipc/meetingHandlers';
import { setupTranscriptHandlers } from './ipc/transcriptHandlers';
import { setupAudioFileHandlers } from './ipc/audioFileHandlers';
import { FileWatcher } from './services/fileWatcher';
import { AssemblyAiService } from './services/assemblyAi';
import Store from 'electron-store';

// Impedisci multiple istanze
if (!app.requestSingleInstanceLock()) {
  app.quit();
}

// Configurazione store
const store = new Store({
  defaults: {
    watchDirectories: [],
    assemblyAiKey: '',
    openAiKey: ''
  }
});

// Variabili globali
let mainWindow: BrowserWindow | null = null;
let fileWatcher: FileWatcher | null = null;
let assemblyAiService: AssemblyAiService | null = null;
let databases: any = null;

// Crea finestra principale
const createWindow = async (): Promise<void> => {
  // Inizializza database
  databases = await setupDatabase();

  // Crea finestra browser
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  // Configura IPC handlers
  setupMeetingHandlers(ipcMain, databases, mainWindow);
  setupTranscriptHandlers(ipcMain, databases, mainWindow);
  setupAudioFileHandlers(ipcMain, databases, mainWindow);

  // Configurazione FileWatcher
  fileWatcher = new FileWatcher(databases, mainWindow);
  const watchDirs = store.get('watchDirectories') as string[];
  if (watchDirs.length > 0) {
    fileWatcher.setWatchPaths(watchDirs);
  }

  // Configurazione AssemblyAI
  const assemblyAiKey = store.get('assemblyAiKey') as string;
  if (assemblyAiKey) {
    assemblyAiService = new AssemblyAiService(assemblyAiKey, databases, mainWindow);
  }

  // Handler per selezionare directory da monitorare
  ipcMain.handle('dialog:selectDirectory', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory']
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      const watchDirs = store.get('watchDirectories') as string[];
      const newDirs = [...new Set([...watchDirs, ...result.filePaths])];
      store.set('watchDirectories', newDirs);
      
      if (fileWatcher) {
        fileWatcher.setWatchPaths(newDirs);
      }
      
      return newDirs;
    }
    
    return store.get('watchDirectories');
  });
  
  // Handler per impostare API keys
  ipcMain.handle('settings:setApiKeys', (event, { assemblyAiKey, openAiKey }) => {
    if (assemblyAiKey) {
      store.set('assemblyAiKey', assemblyAiKey);
      assemblyAiService = new AssemblyAiService(assemblyAiKey, databases, mainWindow);
    }
    
    if (openAiKey) {
      store.set('openAiKey', openAiKey);
    }
    
    return {
      assemblyAiKey: store.get('assemblyAiKey'),
      openAiKey: store.get('openAiKey')
    };
  });
  
  // Carica l'app
  if (MAIN_WINDOW_WEBPACK_ENTRY) {
    await mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  }
  
  // Apri DevTools in modalità development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
};

// Quando Electron è pronto
app.whenReady().then(createWindow);

// Gestione chiusura finestre
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
```

### 4. src/preload/api.ts

```typescript
import { contextBridge, ipcRenderer } from 'electron';

// Definizione API sicure esposte al renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Meeting API
  meetings: {
    getAll: () => ipcRenderer.invoke('meetings:getAll'),
    getById: (id: string) => ipcRenderer.invoke('meetings:getById', id),
    create: (meeting: any) => ipcRenderer.invoke('meetings:create', meeting),
    update: (id: string, meeting: any) => ipcRenderer.invoke('meetings:update', id, meeting),
    delete: (id: string) => ipcRenderer.invoke('meetings:delete', id),
    generateMinutes: (id: string) => ipcRenderer.invoke('meetings:generateMinutes', id)
  },
  
  // Transcript API
  transcripts: {
    getAll: () => ipcRenderer.invoke('transcripts:getAll'),
    getById: (id: string) => ipcRenderer.invoke('transcripts:getById', id),
    getByMeetingId: (meetingId: string) => ipcRenderer.invoke('transcripts:getByMeetingId', meetingId),
    create: (meetingId: string, filePath: string) => ipcRenderer.invoke('transcripts:create', meetingId, filePath),
    delete: (id: string) => ipcRenderer.invoke('transcripts:delete', id),
    forceUpdate: (id: string) => ipcRenderer.invoke('transcripts:forceUpdate', id)
  },
  
  // AudioFile API
  audioFiles: {
    getAll: () => ipcRenderer.invoke('audioFiles:getAll'),
    getUnprocessed: () => ipcRenderer.invoke('audioFiles:getUnprocessed'),
    process: (id: string) => ipcRenderer.invoke('audioFiles:process', id)
  },
  
  // System API
  system: {
    selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),
    setApiKeys: (keys: { assemblyAiKey?: string, openAiKey?: string }) => 
      ipcRenderer.invoke('settings:setApiKeys', keys),
    getSettings: () => ipcRenderer.invoke('settings:get')
  },
  
  // Eventi
  on: (channel: string, callback: (...args: any[]) => void) => {
    const validChannels = [
      'file:newAudioDetected',
      'transcript:statusChanged',
      'meeting:minutesGenerated'
    ];
    
    if (validChannels.includes(channel)) {
      const subscription = (_event: any, ...args: any[]) => callback(...args);
      ipcRenderer.on(channel, subscription);
      
      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    }
  }
});
```

### 5. src/renderer/services/api.ts

```typescript
// Tipo per meeting
export interface Meeting {
  _id?: string;
  title: string;
  description: string;
  date: string;
  participants: string[];
  createdAt?: string;
  audioFileName?: string;
  minutes?: string;
}

// Tipo per utterance
export interface Utterance {
  speaker: string;
  text: string;
  start: number;
  end: number;
}

// Tipo per trascrizione
export interface Transcript {
  _id?: string;
  meetingId: string;
  assemblyAiId: string;
  status: 'queued' | 'processing' | 'completed' | 'error';
  fullText?: string;
  utterances?: Utterance[];
  createdAt?: string;
  completedAt?: string;
}

// Tipo per file audio
export interface AudioFile {
  _id?: string;
  filePath: string;
  fileName: string;
  processed: boolean;
  processedAt?: string;
  transcriptId?: string;
  meetingId?: string;
  fileSize: number;
  duration?: number;
}

// API per i meeting
export const meetingApi = {
  // Ottieni tutti i meeting
  getAll: async (): Promise<Meeting[]> => {
    return window.electronAPI.meetings.getAll();
  },

  // Ottieni un meeting specifico
  getById: async (id: string): Promise<Meeting> => {
    return window.electronAPI.meetings.getById(id);
  },

  // Crea un nuovo meeting
  create: async (meeting: Meeting): Promise<Meeting> => {
    return window.electronAPI.meetings.create(meeting);
  },

  // Aggiorna un meeting esistente
  update: async (id: string, meeting: Meeting): Promise<Meeting> => {
    return window.electronAPI.meetings.update(id, meeting);
  },

  // Elimina un meeting
  delete: async (id: string): Promise<void> => {
    return window.electronAPI.meetings.delete(id);
  },
  
  // Genera minuta per un meeting
  generateMinutes: async (id: string): Promise<Meeting> => {
    return window.electronAPI.meetings.generateMinutes(id);
  }
};

// API per le trascrizioni
export const transcriptApi = {
  // Ottieni tutte le trascrizioni
  getAll: async (): Promise<Transcript[]> => {
    return window.electronAPI.transcripts.getAll();
  },

  // Ottieni una trascrizione specifica
  getById: async (id: string): Promise<Transcript> => {
    return window.electronAPI.transcripts.getById(id);
  },

  // Ottieni trascrizioni per un meeting specifico
  getByMeetingId: async (meetingId: string): Promise<Transcript[]> => {
    return window.electronAPI.transcripts.getByMeetingId(meetingId);
  },

  // Avvia una nuova trascrizione
  create: async (meetingId: string, filePath: string): Promise<Transcript> => {
    return window.electronAPI.transcripts.create(meetingId, filePath);
  },

  // Elimina una trascrizione
  delete: async (id: string): Promise<void> => {
    return window.electronAPI.transcripts.delete(id);
  },
  
  // Forza aggiornamento di una trascrizione
  forceUpdate: async (id: string): Promise<Transcript> => {
    return window.electronAPI.transcripts.forceUpdate(id);
  }
};

// API per i file audio
export const audioFileApi = {
  // Ottieni tutti i file audio
  getAll: async (): Promise<AudioFile[]> => {
    return window.electronAPI.audioFiles.getAll();
  },
  
  // Ottieni file audio non processati
  getUnprocessed: async (): Promise<AudioFile[]> => {
    return window.electronAPI.audioFiles.getUnprocessed();
  },
  
  // Processa un file audio
  process: async (id: string): Promise<AudioFile> => {
    return window.electronAPI.audioFiles.process(id);
  }
};

// API di sistema
export const systemApi = {
  // Seleziona directory da monitorare
  selectDirectory: async (): Promise<string[]> => {
    return window.electronAPI.system.selectDirectory();
  },
  
  // Imposta chiavi API
  setApiKeys: async (keys: { assemblyAiKey?: string, openAiKey?: string }): Promise<any> => {
    return window.electronAPI.system.setApiKeys(keys);
  },
  
  // Ottieni impostazioni
  getSettings: async (): Promise<any> => {
    return window.electronAPI.system.getSettings();
  }
};
```

### 6. src/main/db/pouchdb.ts

```typescript
import PouchDB from 'pouchdb';
import PouchDBFind from 'pouchdb-find';
import path from 'path';
import { app } from 'electron';

// Registra plugin
PouchDB.plugin(PouchDBFind);

// Path per il database
const getDBPath = () => {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'databases');
};

// Setup delle collezioni database
export const setupDatabase = async () => {
  const dbPath = getDBPath();
  
  const meetingsDb = new PouchDB(path.join(dbPath, 'meetings'));
  const transcriptsDb = new PouchDB(path.join(dbPath, 'transcripts'));
  const audioFilesDb = new PouchDB(path.join(dbPath, 'audiofiles'));
  
  // Crea indici
  await meetingsDb.createIndex({
    index: { fields: ['type', 'date'] }
  });
  
  await transcriptsDb.createIndex({
    index: { fields: ['type', 'meetingId'] }
  });
  
  await audioFilesDb.createIndex({
    index: { fields: ['type', 'processed'] }
  });
  
  return {
    meetingsDb,
    transcriptsDb,
    audioFilesDb
  };
};

// Definizione ID document con prefisso
export const generateId = (prefix: string): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};
```

### 7. src/main/ipc/meetingHandlers.ts

```typescript
import { ipcMain, BrowserWindow } from 'electron';
import { generateId } from '../db/pouchdb';
import { OpenAIService } from '../services/openAi';
import Store from 'electron-store';

const store = new Store();

export const setupMeetingHandlers = (ipcMain: Electron.IpcMain, databases: any, mainWindow: BrowserWindow | null) => {
  const { meetingsDb, transcriptsDb } = databases;
  
  // Get all meetings
  ipcMain.handle('meetings:getAll', async () => {
    try {
      const result = await meetingsDb.find({
        selector: { type: 'meeting' },
        sort: [{ date: 'desc' }]
      });
      return result.docs;
    } catch (error) {
      console.error('Error getting meetings:', error);
      throw new Error('Failed to get meetings');
    }
  });
  
  // Get meeting by ID
  ipcMain.handle('meetings:getById', async (event, id) => {
    try {
      return await meetingsDb.get(id);
    } catch (error) {
      console.error(`Error getting meeting ${id}:`, error);
      throw new Error('Meeting not found');
    }
  });
  
  // Create new meeting
  ipcMain.handle('meetings:create', async (event, meetingData) => {
    try {
      const meeting = {
        _id: generateId('meeting'),
        ...meetingData,
        createdAt: new Date().toISOString(),
        type: 'meeting'
      };
      
      const result = await meetingsDb.put(meeting);
      return {
        ...meeting,
        _rev: result.rev
      };
    } catch (error) {
      console.error('Error creating meeting:', error);
      throw new Error('Failed to create meeting');
    }
  });
  
  // Update meeting
  ipcMain.handle('meetings:update', async (event, id, meetingData) => {
    try {
      const existingMeeting = await meetingsDb.get(id);
      
      const updatedMeeting = {
        ...existingMeeting,
        ...meetingData
      };
      
      const result = await meetingsDb.put(updatedMeeting);
      return {
        ...updatedMeeting,
        _rev: result.rev
      };
    } catch (error) {
      console.error(`Error updating meeting ${id}:`, error);
      throw new Error('Failed to update meeting');
    }
  });
  
  // Delete meeting
  ipcMain.handle('meetings:delete', async (event, id) => {
    try {
      const meeting = await meetingsDb.get(id);
      return await meetingsDb.remove(meeting);
    } catch (error) {
      console.error(`Error deleting meeting ${id}:`, error);
      throw new Error('Failed to delete meeting');
    }
  });
  
  // Generate minutes
  ipcMain.handle('meetings:generateMinutes', async (event, id) => {
    try {
      const meeting = await meetingsDb.get(id);
      
      // Get transcript for meeting
      const transcriptResult = await transcriptsDb.find({
        selector: {
          type: 'transcript',
          meetingId: id,
          status: 'completed'
        }
      });
      
      if (transcriptResult.docs.length === 0) {
        throw new Error('No completed transcript found for this meeting');
      }
      
      const transcript = transcriptResult.docs[0];
      
      // Generate minutes using OpenAI
      const openAiKey = store.get('openAiKey') as string;
      if (!openAiKey) {
        throw new Error('OpenAI API key not configured');
      }
      
      const openAIService = new OpenAIService(openAiKey);
      const minutes = await openAIService.generateMinutes(transcript.fullText, meeting.participants);
      
      // Update meeting with minutes
      const updatedMeeting = {
        ...meeting,
        minutes
      };
      
      const result = await meetingsDb.put(updatedMeeting);
      
      // Notify renderer
      if (mainWindow) {
        mainWindow.webContents.send('meeting:minutesGenerated', {
          ...updatedMeeting,
          _rev: result.rev
        });
      }
      
      return {
        ...updatedMeeting,
        _rev: result.rev
      };
    } catch (error) {
      console.error(`Error generating minutes for meeting ${id}:`, error);
      throw new Error('Failed to generate minutes');
    }
  });
};
```

## Servizi Principali da Implementare

### src/main/services/fileWatcher.ts

```typescript
import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs';
import { BrowserWindow } from 'electron';
import { generateId } from '../db/pouchdb';
import { AssemblyAiService } from './assemblyAi';

export class FileWatcher {
  private databases: any;
  private mainWindow: BrowserWindow | null;
  private watchPaths: string[];
  private watcher: chokidar.FSWatcher | null;
  private assemblyAiService: AssemblyAiService | null;
  
  constructor(databases: any, mainWindow: BrowserWindow | null) {
    this.databases = databases;
    this.mainWindow = mainWindow;
    this.watchPaths = [];
    this.watcher = null;
    this.assemblyAiService = null;
  }
  
  setAssemblyAiService(service: AssemblyAiService) {
    this.assemblyAiService = service;
  }
  
  setWatchPaths(paths: string[]) {
    this.watchPaths = paths;
    this.restart();
  }
  
  start() {
    if (this.watchPaths.length === 0) return;
    
    this.watcher = chokidar.watch(this.watchPaths, {
      persistent: true,
      ignoreInitial: false,
      awaitWriteFinish: {
        stabilityThreshold: 60000, // 60 secondi
        pollInterval: 1000
      }
    });
    
    this.watcher.on('add', async (filePath) => {
      const ext = path.extname(filePath).toLowerCase();
      if (['.mp3', '.wav', '.m4a', '.ogg'].includes(ext)) {
        try {
          const { audioFilesDb } = this.databases;
          
          // Verifica se il file esiste già nel database
          const result = await audioFilesDb.find({
            selector: {
              filePath: filePath,
              type: 'audiofile'
            }
          });
          
          if (result.docs.length === 0) {
            // File nuovo trovato
            const fileName = path.basename(filePath);
            const stats = fs.statSync(filePath);
            
            const audioFile = {
              _id: generateId('audiofile'),
              filePath: filePath,
              fileName: fileName,
              processed: false,
              fileSize: stats.size,
              createdAt: new Date().toISOString(),
              type: 'audiofile'
            };
            
            await audioFilesDb.put(audioFile);
            
            // Notifica il frontend
            if (this.mainWindow) {
              this.mainWindow.webContents.send('file:newAudioDetected', audioFile);
            }
          }
        } catch (error) {
          console.error('Errore processando nuovo file audio:', error);
        }
      }
    });
  }
  
  stop() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }
  
  restart() {
    this.stop();
    this.start();
  }
}
```

## Funzionalità Specifiche per Electron

Per completare la migrazione, questi file saranno fondamentali per garantire che l'applicazione possa funzionare come un'app desktop completa e autonoma utilizzando electron-forge.

L'uso di electron-forge semplifica notevolmente il processo di configurazione e distribuzione dell'applicazione Electron, fornendo strumenti integrati per il packaging e la distribuzione su diverse piattaforme. 