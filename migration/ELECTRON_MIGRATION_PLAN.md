# Piano di Migrazione a Electron con Forge

## Panoramica

Questo documento delinea il piano specifico per migrare l'applicazione AudioTranscriber da un'architettura web client-server a un'applicazione desktop completa basata su Electron con electron-store come database. Utilizzeremo electron-forge come framework di scaffolding per semplificare la configurazione e il deployment.

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
│   │   │   ├── store.ts        # Configurazione electron-store
│   │   │   └── models/         # Modelli per electron-store
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
import { setupDatabase } from './db/store';
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
let assemblyAi: AssemblyAiService | null = null;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

// Inizializza l'app
app.whenReady().then(() => {
  // Inizializza database
  const { meetingsDb, transcriptsDb, audioFilesDb } = setupDatabase(store);
  
  // Inizializza servizi
  fileWatcher = new FileWatcher(store, (filePath) => {
    if (assemblyAi) {
      // Logica per processare nuovi file audio
    }
  });
  
  // Inizializza AssemblyAI se la chiave è presente
  const assemblyAiKey = store.get('assemblyAiKey') as string;
  if (assemblyAiKey) {
    assemblyAi = new AssemblyAiService(
      assemblyAiKey,
      { store, meetingsDb, transcriptsDb, audioFilesDb },
      mainWindow
    );
  }
  
  // Configura handler IPC
  setupMeetingHandlers(ipcMain, meetingsDb);
  setupTranscriptHandlers(ipcMain, transcriptsDb, assemblyAi);
  setupAudioFileHandlers(ipcMain, audioFilesDb);
  
  // Registra handler IPC per fileWatcher
  ipcMain.handle('fileWatcher:getDirectories', () => {
    return store.get('watchDirectories');
  });
  
  ipcMain.handle('fileWatcher:addDirectory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      const dir = result.filePaths[0];
      await fileWatcher?.addWatchPath(dir);
      return true;
    }
    
    return false;
  });
  
  ipcMain.handle('fileWatcher:removeDirectory', async (_event, dir) => {
    await fileWatcher?.removeWatchPath(dir);
    return true;
  });
  
  // Registra handler IPC per AssemblyAI
  ipcMain.handle('assemblyai:setApiKey', (_event, apiKey) => {
    store.set('assemblyAiKey', apiKey);
    
    // Ricrea il servizio con la nuova API key
    assemblyAi = new AssemblyAiService(
      apiKey,
      { store, meetingsDb, transcriptsDb, audioFilesDb },
      mainWindow
    );
    
    return true;
  });
  
  ipcMain.handle('assemblyai:getApiKey', () => {
    return store.get('assemblyAiKey', '');
  });
  
  createWindow();
});

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

### 4. src/main/db/store.ts

```typescript
import Store from 'electron-store';
import { v4 as uuidv4 } from 'uuid';

// Funzione per generare ID unici
export const generateId = (prefix: string): string => {
  return `${prefix}_${uuidv4()}`;
};

// Funzione per configurare il database
export function setupDatabase(store: Store<any>) {
  // Garantire che lo store abbia le strutture di base
  if (!store.has('meetings')) {
    store.set('meetings', {});
  }
  
  if (!store.has('meetingIds')) {
    store.set('meetingIds', []);
  }
  
  if (!store.has('transcripts')) {
    store.set('transcripts', {});
  }
  
  if (!store.has('transcriptIds')) {
    store.set('transcriptIds', []);
  }
  
  if (!store.has('audioFiles')) {
    store.set('audioFiles', {});
  }
  
  if (!store.has('audioFileIds')) {
    store.set('audioFileIds', []);
  }
  
  // Database meetings
  const meetingsDb = {
    async getAll() {
      const meetings = store.get('meetings', {});
      const meetingIds = store.get('meetingIds', []);
      
      return meetingIds
        .filter(id => meetings[id])
        .map(id => meetings[id])
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
    
    async get(id: string) {
      const meetings = store.get('meetings', {});
      return meetings[id] || null;
    },
    
    async put(meeting: any) {
      // Genera ID se non esiste
      if (!meeting.id) {
        meeting.id = generateId('meeting');
      }
      
      // Assicura che il tipo sia corretto
      meeting.type = 'meeting';
      
      // Aggiorna data di creazione se necessario
      if (!meeting.createdAt) {
        meeting.createdAt = new Date().toISOString();
      }
      
      // Ottieni meetings e meetingIds esistenti
      const meetings = store.get('meetings', {});
      const meetingIds = store.get('meetingIds', []);
      
      // Aggiungi o aggiorna il meeting
      meetings[meeting.id] = meeting;
      
      // Aggiungi l'ID all'elenco se non esiste
      if (!meetingIds.includes(meeting.id)) {
        meetingIds.push(meeting.id);
        store.set('meetingIds', meetingIds);
      }
      
      // Salva meetings
      store.set('meetings', meetings);
      
      return { id: meeting.id, ok: true };
    },
    
    async delete(id: string) {
      // Ottieni meetings e meetingIds esistenti
      const meetings = store.get('meetings', {});
      const meetingIds = store.get('meetingIds', []);
      
      // Rimuovi il meeting
      delete meetings[id];
      
      // Rimuovi l'ID dall'elenco
      const updatedMeetingIds = meetingIds.filter(meetingId => meetingId !== id);
      
      // Salva i dati aggiornati
      store.set('meetings', meetings);
      store.set('meetingIds', updatedMeetingIds);
      
      return { id, ok: true };
    }
  };
  
  // Database transcripts
  const transcriptsDb = {
    // Implementazione simile per trascrizioni
    // ...
  };
  
  // Database audioFiles
  const audioFilesDb = {
    // Implementazione simile per file audio
    // ...
  };
  
  return {
    meetingsDb,
    transcriptsDb,
    audioFilesDb
  };
}
```

### 5. src/main/ipc/meetingHandlers.ts

```typescript
import { IpcMain } from 'electron';

export function setupMeetingHandlers(ipcMain: IpcMain, meetingsDb: any) {
  // Handler per ottenere tutte le riunioni
  ipcMain.handle('meetings:getAll', async () => {
    try {
      return await meetingsDb.getAll();
    } catch (error) {
      console.error('Errore in meetings:getAll:', error);
      throw error;
    }
  });
  
  // Handler per ottenere una riunione specifica
  ipcMain.handle('meetings:get', async (_event, id) => {
    try {
      return await meetingsDb.get(id);
    } catch (error) {
      console.error('Errore in meetings:get:', error);
      throw error;
    }
  });
  
  // Handler per salvare una riunione
  ipcMain.handle('meetings:save', async (_event, meeting) => {
    try {
      return await meetingsDb.put(meeting);
    } catch (error) {
      console.error('Errore in meetings:save:', error);
      throw error;
    }
  });
  
  // Handler per eliminare una riunione
  ipcMain.handle('meetings:delete', async (_event, id) => {
    try {
      return await meetingsDb.delete(id);
    } catch (error) {
      console.error('Errore in meetings:delete:', error);
      throw error;
    }
  });
}
```

## Servizi Principali da Implementare

### src/main/services/fileWatcher.ts

```typescript
import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs';
import { BrowserWindow } from 'electron';
import { generateId } from '../db/store';
import { AssemblyAiService } from './assemblyAi';

export class FileWatcher {
  private store: any;
  private mainWindow: BrowserWindow | null;
  private watchPaths: string[];
  private watcher: chokidar.FSWatcher | null;
  private assemblyAiService: AssemblyAiService | null;
  
  constructor(store: any, mainWindow: BrowserWindow | null) {
    this.store = store;
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
          const { audioFilesDb } = this.store;
          
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