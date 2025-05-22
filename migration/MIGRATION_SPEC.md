# Specifiche per la Migrazione a Electron con PouchDB

## Panoramica

Questo documento descrive il processo di migrazione dell'applicazione di trascrizione da un'architettura web client-server a un'applicazione desktop completa basata su Electron con PouchDB come database.

## Tabella dei contenuti

1. [Architettura attuale vs. nuova](#architettura-attuale-vs-nuova)
2. [Roadmap di migrazione](#roadmap-di-migrazione)
3. [Migrazione del database](#migrazione-del-database)
4. [Migrazione del frontend](#migrazione-del-frontend)
5. [Migrazione del backend](#migrazione-del-backend)
6. [Sistema di monitoraggio file](#sistema-di-monitoraggio-file)
7. [Integrazione con AssemblyAI](#integrazione-con-assemblyai)
8. [Packaging e distribuzione](#packaging-e-distribuzione)
9. [Testing e validazione](#testing-e-validazione)

## Architettura attuale vs. nuova

### Architettura attuale
- **Frontend**: React (browser-based)
- **Backend**: Node.js/Express
- **Database**: MongoDB
- **Deployment**: Servizi separati (frontend, backend, database)
- **File System**: Monitoraggio directory su macchina locale

### Nuova architettura (Electron)
- **Container**: Applicazione Electron desktop
- **Frontend**: React (integrato in Electron)
- **Backend**: Node.js/Express (incorporato in Electron)
- **Database**: PouchDB (integrato in Electron, con opzione di sincronizzazione futura)
- **Deployment**: Applicazione desktop standalone
- **File System**: Accesso diretto al file system locale tramite API Electron

## Roadmap di migrazione

### Fase 1: Setup ambiente di sviluppo Electron
1. Creare struttura base Electron
2. Integrare Express come server interno
3. Configurare PouchDB con adapter appropriati

### Fase 2: Migrazione database e modelli
1. Definire schema PouchDB equivalente a MongoDB
2. Creare script di migrazione dati
3. Implementare layer di astrazione database

### Fase 3: Migrazione backend
1. Adattare controller esistenti per PouchDB
2. Integrare API in ambiente Electron
3. Migrare servizi di analisi AI

### Fase 4: Migrazione frontend
1. Incorporare React in Electron
2. Adattare chiamate API
3. Aggiungere funzionalità desktop-specifiche

### Fase 5: Funzionalità Electron specifiche
1. Implementare monitoraggio file system
2. Aggiungere menu, tray icon e hotkeys
3. Sviluppare sistema di notifiche desktop

### Fase 6: Packaging e distribuzione
1. Configurare electron-builder
2. Implementare aggiornamenti automatici
3. Creare installer per varie piattaforme

## Migrazione del database

### Schema PouchDB

Definizione dei modelli principali:

#### Meeting
```javascript
{
  _id: 'meeting_123456',  // Prefisso per identificare il tipo
  title: 'Nome riunione',
  description: 'Descrizione',
  date: '2023-08-15T14:30:00.000Z',
  participants: ['Nome 1', 'Nome 2'],
  createdAt: '2023-08-15T14:30:00.000Z',
  audioFileName: 'recording.mp3',
  minutes: 'Contenuto verbale...',
  type: 'meeting'  // Tipo documento per query
}
```

#### Transcript
```javascript
{
  _id: 'transcript_123456',
  meetingId: 'meeting_123456',
  assemblyAiId: 'assembly_id',
  status: 'completed',
  fullText: 'Testo completo...',
  utterances: [
    {
      speaker: '1',
      text: 'Testo parlato',
      start: 120,
      end: 145
    }
    // Altri utterances...
  ],
  createdAt: '2023-08-15T14:30:00.000Z',
  completedAt: '2023-08-15T15:00:00.000Z',
  type: 'transcript'
}
```

#### AudioFile
```javascript
{
  _id: 'audiofile_123456',
  filePath: '/percorso/completo/file.mp3',
  fileName: 'file.mp3',
  processed: true,
  processedAt: '2023-08-15T15:00:00.000Z',
  transcriptId: 'transcript_123456',
  meetingId: 'meeting_123456',
  fileSize: 1024000,
  duration: 120.5,
  type: 'audiofile'
}
```

### Script di migrazione dati

Creare uno script che:
1. Estrae i dati dal MongoDB attuale
2. Converte al formato PouchDB (aggiunge prefissi e campi tipo)
3. Inserisce in PouchDB

```javascript
// Esempio concettuale per script di migrazione
const { MongoClient } = require('mongodb');
const PouchDB = require('pouchdb');
const fs = require('fs');

// Inizializzazione PouchDB
PouchDB.plugin(require('pouchdb-find'));
const meetingsDb = new PouchDB('meetings');
const transcriptsDb = new PouchDB('transcripts');
const audioFilesDb = new PouchDB('audiofiles');

async function migrateData() {
  // Connessione a MongoDB
  const mongo = await MongoClient.connect('mongodb://localhost:27017/trascrizioni');
  const db = mongo.db();
  
  // Migrazione meeting
  const meetings = await db.collection('meetings').find({}).toArray();
  for (const meeting of meetings) {
    await meetingsDb.put({
      _id: `meeting_${meeting._id}`,
      title: meeting.title,
      description: meeting.description,
      date: meeting.date,
      participants: meeting.participants || [],
      createdAt: meeting.createdAt,
      audioFileName: meeting.audioFileName,
      minutes: meeting.minutes,
      type: 'meeting'
    });
  }
  
  // Migrazione trascrizioni
  const transcripts = await db.collection('transcripts').find({}).toArray();
  for (const transcript of transcripts) {
    await transcriptsDb.put({
      _id: `transcript_${transcript._id}`,
      meetingId: `meeting_${transcript.meetingId}`,
      assemblyAiId: transcript.assemblyAiId,
      status: transcript.status,
      fullText: transcript.fullText,
      utterances: transcript.utterances || [],
      createdAt: transcript.createdAt,
      completedAt: transcript.completedAt,
      type: 'transcript'
    });
  }
  
  // Migrazione file audio
  const audioFiles = await db.collection('audiofiles').find({}).toArray();
  for (const audioFile of audioFiles) {
    await audioFilesDb.put({
      _id: `audiofile_${audioFile._id}`,
      filePath: audioFile.filePath,
      fileName: audioFile.fileName,
      processed: audioFile.processed,
      processedAt: audioFile.processedAt,
      transcriptId: audioFile.transcriptId ? `transcript_${audioFile.transcriptId}` : null,
      meetingId: audioFile.meetingId ? `meeting_${audioFile.meetingId}` : null,
      fileSize: audioFile.fileSize,
      duration: audioFile.duration,
      type: 'audiofile'
    });
  }
  
  // Chiudi connessione MongoDB
  await mongo.close();
  
  console.log('Migrazione completata con successo!');
}

migrateData().catch(console.error);
```

## Migrazione del frontend

### Struttura directory

```
electron-app/
├── package.json
├── main.js                   # Entry point Electron
├── preload.js                # Script preload
├── server/                   # Backend incorporato
│   ├── api/                  # Controller API
│   ├── services/             # Servizi
│   └── db/                   # Layer DB
├── renderer/                 # Frontend React
│   ├── public/
│   ├── src/
│   │   ├── components/       # Componenti React (riciclati dall'app attuale)
│   │   ├── pages/            # Pagine React (riciclate dall'app attuale)
│   │   ├── services/         # Servizi frontend (adattati per Electron)
│   │   └── App.tsx
│   └── package.json
└── resources/                # Risorse applicazione
```

### Adattamento chiamate API

Modificare il servizio API nel frontend:

```typescript
// Prima
// api.ts
import axios from 'axios';

const API_URL = 'http://localhost:5001/api';

export const meetingApi = {
  getAll: async (): Promise<MeetingB[]> => {
    const response = await axios.get(`${API_URL}/meetings`);
    return response.data;
  },
  // ...altri metodi...
};

// Dopo 
// api.ts per Electron
export const meetingApi = {
  getAll: async (): Promise<MeetingB[]> => {
    // Usa l'API context bridge esposta tramite preload
    const response = await window.electronAPI.invoke('meetings:getAll');
    return response;
  },
  // ...altri metodi adattati...
};
```

### Modifiche a preload.js

```javascript
// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Meeting API
  invoke: (channel, data) => {
    const validChannels = [
      'meetings:getAll', 'meetings:getById', 'meetings:create', 
      'transcripts:getAll', 'transcripts:getByMeetingId',
      // Altri canali...
    ];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, data);
    }
  },
  
  // Eventi
  on: (channel, func) => {
    const validChannels = [
      'file:newAudioDetected',
      'transcript:statusChanged',
      // Altri eventi...
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
  
  // File system
  selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),
});
```

## Migrazione del backend

### Gestione delle API in main.js

```javascript
// main.js (partial)
const { app, BrowserWindow, ipcMain } = require('electron');
const PouchDB = require('pouchdb');
const { setupDatabases } = require('./server/db/setup');
const { setupMeetingHandlers } = require('./server/api/meetings');
const { setupTranscriptHandlers } = require('./server/api/transcripts');

let mainWindow;
let databases;

async function createWindow() {
  // Setup database
  databases = await setupDatabases();
  
  // Setup IPC handlers
  setupMeetingHandlers(ipcMain, databases);
  setupTranscriptHandlers(ipcMain, databases);
  
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile('./renderer/build/index.html');
  }
}

// Esempio di handler API
// ./server/api/meetings.js
exports.setupMeetingHandlers = (ipcMain, databases) => {
  const { meetingsDb } = databases;
  
  // Get all meetings
  ipcMain.handle('meetings:getAll', async () => {
    const result = await meetingsDb.find({
      selector: { type: 'meeting' },
      sort: [{ date: 'desc' }]
    });
    return result.docs;
  });
  
  // Get meeting by ID
  ipcMain.handle('meetings:getById', async (event, id) => {
    try {
      return await meetingsDb.get(id);
    } catch (error) {
      if (error.name === 'not_found') {
        throw new Error('Meeting not found');
      }
      throw error;
    }
  });
  
  // ... altri handler ...
};
```

## Sistema di monitoraggio file

### Implementazione in Electron

```javascript
// fileWatcher.js
const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');

class FileWatcher {
  constructor(databases, mainWindow) {
    this.databases = databases;
    this.mainWindow = mainWindow;
    this.watchPaths = [];
    this.watcher = null;
  }
  
  setWatchPaths(paths) {
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
              _id: `audiofile_${new Date().getTime()}`,
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
            
            // Processa il file
            this.processAudioFile(filePath, audioFile._id);
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
  
  async processAudioFile(filePath, audioFileId) {
    // Implementazione elaborazione file...
  }
}

module.exports = FileWatcher;
```

## Integrazione con AssemblyAI

L'integrazione con AssemblyAI rimarrà sostanzialmente invariata, ma verrà spostata all'interno del processo Electron principale.

```javascript
// assemblyAiService.js
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

class AssemblyAiService {
  constructor(apiKey, databases, mainWindow) {
    this.apiKey = apiKey;
    this.databases = databases;
    this.mainWindow = mainWindow;
    this.baseUrl = 'https://api.assemblyai.com/v2';
  }
  
  async transcribeAudioFile(filePath, audioFileId) {
    try {
      const { audioFilesDb, transcriptsDb, meetingsDb } = this.databases;
      
      // Recupera record del file audio
      const audioFile = await audioFilesDb.get(audioFileId);
      
      // Crea meeting automatico se non associato
      let meetingId = audioFile.meetingId;
      if (!meetingId) {
        const fileName = path.basename(filePath, path.extname(filePath));
        const meeting = {
          _id: `meeting_${new Date().getTime()}`,
          title: `Auto: ${fileName}`,
          description: 'Trascrizione automatica - in attesa di analisi AI',
          date: new Date().toISOString(),
          participants: [],
          createdAt: new Date().toISOString(),
          audioFileName: fileName,
          type: 'meeting'
        };
        
        const meetingResult = await meetingsDb.put(meeting);
        meetingId = meeting._id;
        
        // Aggiorna audioFile con meetingId
        audioFile.meetingId = meetingId;
        await audioFilesDb.put(audioFile);
      }
      
      // Crea record trascrizione
      const transcript = {
        _id: `transcript_${new Date().getTime()}`,
        meetingId: meetingId,
        assemblyAiId: '',
        status: 'queued',
        createdAt: new Date().toISOString(),
        type: 'transcript'
      };
      
      const transcriptResult = await transcriptsDb.put(transcript);
      
      // Aggiorna audioFile con transcriptId
      audioFile.transcriptId = transcript._id;
      await audioFilesDb.put(audioFile);
      
      // Upload file ad AssemblyAI
      const uploadUrl = await this.uploadFile(filePath);
      
      // Avvia trascrizione
      const assemblyAiId = await this.startTranscription(uploadUrl);
      
      // Aggiorna transcription con assemblyAiId
      transcript.assemblyAiId = assemblyAiId;
      transcript.status = 'processing';
      await transcriptsDb.put(transcript);
      
      // Notifica il frontend
      if (this.mainWindow) {
        this.mainWindow.webContents.send('transcript:statusChanged', transcript);
      }
      
      // Avvia polling per stato trascrizione
      this.pollTranscriptionStatus(assemblyAiId, transcript._id);
      
    } catch (error) {
      console.error('Errore nella trascrizione:', error);
    }
  }
  
  async uploadFile(filePath) {
    // Implementazione upload...
  }
  
  async startTranscription(audioUrl) {
    // Implementazione inizio trascrizione...
  }
  
  async pollTranscriptionStatus(assemblyAiId, transcriptId) {
    // Implementazione polling stato...
  }
}

module.exports = AssemblyAiService;
```

## Packaging e distribuzione

### Configurazione electron-builder

Configurare `package.json` per il packaging:

```json
{
  "name": "trascrizioni-app",
  "version": "1.0.0",
  "description": "App per trascrizioni audio",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "build": "electron-builder",
    "build:mac": "electron-builder --mac",
    "build:win": "electron-builder --win",
    "build:linux": "electron-builder --linux"
  },
  "build": {
    "appId": "com.trascrizioni.app",
    "productName": "Trascrizioni App",
    "directories": {
      "output": "dist"
    },
    "files": [
      "main.js",
      "preload.js",
      "server/**/*",
      "renderer/build/**/*",
      "resources/**/*",
      "node_modules/**/*"
    ],
    "mac": {
      "category": "public.app-category.productivity",
      "icon": "resources/icon.icns",
      "hardenedRuntime": true,
      "gatekeeperAssess": false,
      "entitlements": "build/entitlements.mac.plist",
      "entitlementsInherit": "build/entitlements.mac.plist"
    },
    "win": {
      "icon": "resources/icon.ico",
      "target": [
        "nsis"
      ]
    },
    "linux": {
      "icon": "resources/icon.png",
      "target": [
        "AppImage",
        "deb"
      ]
    },
    "publish": {
      "provider": "github",
      "owner": "tuoUsername",
      "repo": "trascrizioni-app"
    }
  },
  "dependencies": {
    "chokidar": "^3.5.3",
    "electron-log": "^4.4.8",
    "electron-updater": "^5.3.0",
    "pouchdb": "^7.3.1",
    "pouchdb-find": "^7.3.1"
  },
  "devDependencies": {
    "electron": "^23.1.0",
    "electron-builder": "^24.0.0"
  }
}
```

## Testing e validazione

### Test di migrazione dati
1. Eseguire script di migrazione in ambiente di test
2. Verificare integrità dei dati migrati
3. Convalidare le relazioni tra le entità

### Test funzionali
1. Testare flusso completo: rilevamento file -> trascrizione -> generazione minuta
2. Verificare funzionalità offline
3. Testare su diversi sistemi operativi

### Test di performance
1. Valutare tempi di risposta per operazioni comuni
2. Testare con dataset di grandi dimensioni
3. Ottimizzare se necessario

## Conclusione

La migrazione da un'architettura web client-server a un'applicazione Electron standalone con PouchDB è un processo complesso ma fattibile. Questo approccio permetterà di:

1. Mantenere il sistema funzionante localmente senza dipendenza da server
2. Migliorare l'integrazione con il file system locale
3. Offrire un'esperienza utente più fluida e nativa
4. Semplificare la distribuzione e l'aggiornamento
5. Preservare la possibilità di estensioni future con sincronizzazione cloud

La roadmap di migrazione presentata mira a minimizzare i rischi preservando le funzionalità esistenti, con un approccio incrementale che permette di validare ogni fase prima di procedere alla successiva. 