# Specifiche per la Migrazione a Electron con Database Locale

## Panoramica

Questo documento descrive il processo di migrazione dell'applicazione di trascrizione da un'architettura web client-server a un'applicazione desktop completa basata su Electron con database locale per la persistenza dei dati.

## Tecnologie Attuali

La versione attuale del progetto utilizza:
- **Frontend**: React con TypeScript
- **UI Framework**: TailwindCSS 4.x con @tailwindcss/postcss
- **Database**: electron-store per persistenza dati locale
- **Framework Electron**: electron-forge con plugin vite
- **Componenti UI**: @headlessui/react e @heroicons/react

## Tabella dei contenuti

1. [Architettura attuale vs. nuova](#architettura-attuale-vs-nuova)
2. [Roadmap di migrazione](#roadmap-di-migrazione)
3. [Struttura attuale del progetto](#struttura-attuale-del-progetto)
4. [Migrazione del database](#migrazione-del-database)
5. [Migrazione del frontend](#migrazione-del-frontend)
6. [Migrazione del backend](#migrazione-del-backend)
7. [Sistema di monitoraggio file](#sistema-di-monitoraggio-file)
8. [Integrazione con AssemblyAI](#integrazione-con-assemblyai)
9. [Packaging e distribuzione](#packaging-e-distribuzione)
10. [Testing e validazione](#testing-e-validazione)

## Architettura attuale vs. nuova

### Architettura attuale
- **Frontend**: React con TypeScript integrato in Electron
- **UI Framework**: TailwindCSS 4.x
- **Database**: electron-store (semplice database JSON locale)
- **Deployment**: Applicazione desktop standalone
- **File System**: Accesso tramite API Electron

### Nuova architettura (Evoluzione)
- **Container**: Applicazione Electron desktop con TypeScript
- **Frontend**: React (integrato in Electron)
- **UI Framework**: TailwindCSS (esistente) con design migliorato
- **Database**: PouchDB (sostituendo electron-store, con opzione di sincronizzazione futura)
- **Deployment**: Applicazione desktop standalone ottimizzata
- **File System**: Accesso diretto al file system locale tramite API Electron
- **API Integration**: AssemblyAI per trascrizione automatica

## Struttura attuale del progetto

```
meetings-minuta-electron-app/
├── .vite/                      # Directory generata da Vite
├── node_modules/               # Dipendenze
├── migration/                  # Documentazione di migrazione
├── src/
│   ├── App.tsx                 # Componente principale React
│   ├── renderer.tsx            # Entry point del renderer
│   ├── main.ts                 # Processo principale Electron
│   ├── preload.ts              # Script preload
│   ├── services/
│   │   └── db.ts               # Servizio database con electron-store
│   ├── index.css               # Stili globali con TailwindCSS
│   └── notes.css               # Stili specifici per note
├── .eslintrc.json              # Configurazione ESLint
├── .gitignore                  # Configurazione Git
├── forge.config.ts             # Configurazione electron-forge
├── forge.env.d.ts              # Tipi per electron-forge
├── index.html                  # Entry point HTML
├── package.json                # Dipendenze e script
├── postcss.config.js           # Configurazione PostCSS
├── tailwind.config.js          # Configurazione TailwindCSS
├── tsconfig.json               # Configurazione TypeScript
├── vite.main.config.ts         # Configurazione Vite per processo main
├── vite.preload.config.ts      # Configurazione Vite per preload
└── vite.renderer.config.ts     # Configurazione Vite per renderer
```

## Roadmap di migrazione

### Fase 1: Setup ambiente di sviluppo Electron (Completato)
1. ✅ Creare struttura base Electron con TypeScript
2. ✅ Configurare React con TailwindCSS
3. ✅ Configurare elettron-store per persistenza dati

### Fase 2: Migrazione database a PouchDB
1. Definire schema PouchDB per sostituire electron-store
2. Creare layer di astrazione database
3. Implementare funzionalità di migrazione dati da electron-store a PouchDB

### Fase 3: Implementazione UI completa
1. Implementare design da UI_DESIGN_SPEC.md
2. Sviluppare componenti React per tutte le viste
3. Implementare tema scuro/chiaro
4. Aggiungere animazioni e transizioni

### Fase 4: Sistema di monitoraggio file
1. Implementare servizio di monitoraggio directory
2. Creare interfaccia di configurazione directory
3. Implementare rilevamento automatico file audio

### Fase 5: Integrazione AssemblyAI
1. Implementare client API per AssemblyAI
2. Sviluppare UI per visualizzazione trascrizioni
3. Aggiungere funzionalità per correzioni manuali
4. Implementare gestione parlanti

### Fase 6: Packaging e distribuzione
1. Configurare electron-forge per packaging ottimizzato
2. Implementare aggiornamenti automatici
3. Creare installer per varie piattaforme

## Migrazione del database

### Schema PouchDB

Definizione dei modelli principali:

#### Meeting
```typescript
interface Meeting {
  _id: string;  // Prefisso 'meeting_' + ID unico
  title: string;
  description: string;
  date: string; // ISO 8601
  participants: string[];
  createdAt: string; // ISO 8601
  audioFileName?: string;
  minutes?: string;
  type: 'meeting';
}
```

#### Transcript
```typescript
interface Transcript {
  _id: string; // Prefisso 'transcript_' + ID unico
  meetingId: string;
  assemblyAiId?: string;
  status: 'queued' | 'processing' | 'completed' | 'error';
  fullText?: string;
  utterances: {
    speaker: string;
    text: string;
    start: number; // in millisecondi
    end: number; // in millisecondi
  }[];
  createdAt: string; // ISO 8601
  completedAt?: string; // ISO 8601
  type: 'transcript';
}
```

#### AudioFile
```typescript
interface AudioFile {
  _id: string; // Prefisso 'audiofile_' + ID unico
  filePath: string;
  fileName: string;
  processed: boolean;
  processedAt?: string; // ISO 8601
  transcriptId?: string;
  meetingId?: string;
  fileSize: number; // in bytes
  duration?: number; // in secondi
  type: 'audiofile';
}
```

### Migrazione da electron-store

Electron-store attualmente gestisce solo note semplici. La migrazione a PouchDB dovrà:

1. Creare database PouchDB con struttura appropriata
2. Convertire le note esistenti in oggetti Meeting
3. Aggiungere supporto per le relazioni tra entità

```typescript
// Esempio di migrazione da electron-store a PouchDB
import PouchDB from 'pouchdb';
import { database as oldDb } from './old-db';

// Inizializzazione PouchDB
PouchDB.plugin(require('pouchdb-find'));
const meetingsDb = new PouchDB('meetings');
const transcriptsDb = new PouchDB('transcripts');
const audioFilesDb = new PouchDB('audiofiles');

async function migrateData() {
  // Ottieni tutte le note esistenti
  const notes = await oldDb.getAllNotes();
  
  // Converte note in Meeting e salva in PouchDB
  for (const note of notes) {
    const meeting = {
      _id: `meeting_${note.id}`,
      title: note.title,
      description: note.content,
      date: note.createdAt,
      participants: [],
      createdAt: note.createdAt,
      type: 'meeting'
    };
    
    await meetingsDb.put(meeting);
  }
  
  console.log('Migrazione completata con successo!');
}
```

## Migrazione del frontend

### Struttura directory React/TypeScript

La struttura attuale è già configurata con React e TypeScript, ma verrà estesa:

```
src/
├── components/          # Componenti riutilizzabili
│   ├── common/          # Componenti UI comuni
│   ├── meetings/        # Componenti specifici per riunioni
│   └── transcriptions/  # Componenti specifici per trascrizioni
├── contexts/            # Context React
│   ├── ThemeContext.tsx # Gestione tema chiaro/scuro
│   └── AuthContext.tsx  # Gestione API keys
├── hooks/               # Custom hooks
├── pages/               # Componenti pagina
│   ├── Dashboard.tsx
│   ├── Meetings.tsx
│   ├── Transcription.tsx
│   └── Settings.tsx
├── services/            # Servizi
│   ├── db/              # Layer database (PouchDB)
│   ├── api/             # Client API esterni
│   └── utils/           # Utility
├── App.tsx              # Componente principale
└── renderer.tsx         # Entry point renderer
```

### Componenti necessari

1. **Layout**: Componenti di base per il layout dell'applicazione
2. **Meetings**: Componenti per la gestione delle riunioni
3. **Transcriptions**: Componenti per la visualizzazione e modifica delle trascrizioni
4. **AudioPlayer**: Player audio personalizzato con controlli
5. **Settings**: Componenti per la configurazione dell'applicazione

## Sistema di monitoraggio file

Il sistema di monitoraggio dei file audio utilizzerà l'API Node.js `fs.watch` o la libreria `chokidar` per monitorare le directory specificate dall'utente.

```typescript
import * as chokidar from 'chokidar';
import * as path from 'path';
import * as fs from 'fs';
import { ipcMain, BrowserWindow } from 'electron';
import { database } from './db';

export class FileWatcher {
  private watcher: chokidar.FSWatcher | null = null;
  private watchPaths: string[] = [];
  private mainWindow: BrowserWindow | null = null;
  
  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    
    // Carica i percorsi da monitorare dalle impostazioni
    this.loadWatchPaths();
    
    // Avvia il monitoraggio
    this.start();
    
    // Configurazione handlers IPC
    this.setupIPCHandlers();
  }
  
  private loadWatchPaths() {
    // Carica i percorsi da electron-store o PouchDB
    // ...
  }
  
  private setupIPCHandlers() {
    ipcMain.handle('fileWatcher:addPath', async (event, path) => {
      await this.addWatchPath(path);
      return this.watchPaths;
    });
    
    ipcMain.handle('fileWatcher:removePath', async (event, path) => {
      await this.removeWatchPath(path);
      return this.watchPaths;
    });
    
    ipcMain.handle('fileWatcher:getPaths', () => {
      return this.watchPaths;
    });
  }
  
  private async addWatchPath(dirPath: string) {
    if (!this.watchPaths.includes(dirPath)) {
      this.watchPaths.push(dirPath);
      // Salva in electron-store o PouchDB
      // ...
      this.restart();
    }
  }
  
  private async removeWatchPath(dirPath: string) {
    this.watchPaths = this.watchPaths.filter(p => p !== dirPath);
    // Salva in electron-store o PouchDB
    // ...
    this.restart();
  }
  
  start() {
    if (this.watchPaths.length === 0) return;
    
    this.watcher = chokidar.watch(this.watchPaths, {
      persistent: true,
      ignoreInitial: false,
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100
      }
    });
    
    this.watcher.on('add', async (filePath) => {
      const ext = path.extname(filePath).toLowerCase();
      if (['.mp3', '.wav', '.m4a', '.ogg'].includes(ext)) {
        // Nuovo file audio rilevato
        // ...
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

## Integrazione con AssemblyAI

L'integrazione con AssemblyAI per la trascrizione automatica richiederà:

1. Un client API per comunicare con AssemblyAI
2. Gestione dell'autenticazione e delle chiavi API
3. Funzionalità per caricare file audio
4. Polling dello stato della trascrizione
5. Parsing e visualizzazione dei risultati

```typescript
import axios from 'axios';
import * as fs from 'fs';
import { ipcMain } from 'electron';
import { database } from './db';

export class AssemblyAIService {
  private apiKey: string;
  private baseURL: string = 'https://api.assemblyai.com/v2';
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
    
    // Configurazione handlers IPC
    this.setupIPCHandlers();
  }
  
  private setupIPCHandlers() {
    ipcMain.handle('assemblyai:transcribe', async (event, audioFilePath, meetingId) => {
      try {
        return await this.transcribeAudio(audioFilePath, meetingId);
      } catch (error) {
        console.error('Errore durante la trascrizione:', error);
        throw error;
      }
    });
    
    ipcMain.handle('assemblyai:getTranscription', async (event, transcriptId) => {
      try {
        return await this.getTranscription(transcriptId);
      } catch (error) {
        console.error('Errore durante il recupero della trascrizione:', error);
        throw error;
      }
    });
  }
  
  async uploadAudio(filePath: string) {
    const fileContent = fs.readFileSync(filePath);
    
    const response = await axios.post(`${this.baseURL}/upload`, fileContent, {
      headers: {
        'authorization': this.apiKey,
        'content-type': 'application/octet-stream'
      }
    });
    
    return response.data.upload_url;
  }
  
  async transcribeAudio(filePath: string, meetingId: string) {
    // Upload audio file
    const uploadUrl = await this.uploadAudio(filePath);
    
    // Submit for transcription
    const response = await axios.post(`${this.baseURL}/transcript`, {
      audio_url: uploadUrl,
      speaker_labels: true
    }, {
      headers: {
        'authorization': this.apiKey,
        'content-type': 'application/json'
      }
    });
    
    const assemblyAiId = response.data.id;
    
    // Create transcript record in database
    const transcript = {
      _id: `transcript_${Date.now()}`,
      meetingId,
      assemblyAiId,
      status: 'queued',
      utterances: [],
      createdAt: new Date().toISOString(),
      type: 'transcript'
    };
    
    // Save in PouchDB
    // ...
    
    return transcript;
  }
  
  async getTranscription(assemblyAiId: string) {
    const response = await axios.get(`${this.baseURL}/transcript/${assemblyAiId}`, {
      headers: {
        'authorization': this.apiKey
      }
    });
    
    return response.data;
  }
}
```

## Packaging e distribuzione

Per il packaging e la distribuzione dell'applicazione utilizzeremo electron-forge che è già configurato nel progetto.

```typescript
// forge.config.ts
import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    icon: './assets/icon',
    name: 'Meetings Minuta',
    executableName: 'meetings-minuta',
    appBundleId: 'com.meetingsminuta.app',
    appCategoryType: 'public.app-category.productivity',
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      name: 'meetings-minuta',
      setupIcon: './assets/icon.ico',
      authors: 'Your Name',
      description: 'Automatic audio transcription app'
    }),
    new MakerZIP({}, ['darwin']),
    new MakerRpm({
      options: {
        productName: 'Meetings Minuta',
        categories: ['Office', 'AudioVideo'],
        description: 'Automatic audio transcription app'
      }
    }),
    new MakerDeb({
      options: {
        productName: 'Meetings Minuta',
        section: 'sound',
        priority: 'optional',
        icon: './assets/icon.png',
        categories: ['Office', 'AudioVideo'],
        description: 'Automatic audio transcription app'
      }
    })
  ],
  plugins: [
    new VitePlugin({
      // Configurazione Vite esistente
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    })
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'your-username',
          name: 'meetings-minuta-electron-app'
        },
        prerelease: false
      }
    }
  ]
};

export default config;
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

La migrazione della nostra attuale applicazione Electron con electron-store a una versione più robusta con PouchDB è un processo incrementale che migliorerà significativamente le funzionalità e l'esperienza utente. Questo approccio permetterà di:

1. Mantenere il sistema funzionante localmente senza dipendenza da server
2. Migliorare l'integrazione con il file system locale
3. Offrire un'esperienza utente più fluida e nativa grazie al design moderno
4. Semplificare la distribuzione e l'aggiornamento
5. Preservare la possibilità di estensioni future con sincronizzazione cloud

La roadmap di migrazione presentata mira a minimizzare i rischi preservando le funzionalità esistenti, con un approccio incrementale che permette di validare ogni fase prima di procedere alla successiva. 