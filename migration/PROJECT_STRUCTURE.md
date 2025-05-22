# Struttura Attuale del Progetto e Piano di Implementazione

Questo documento descrive la struttura attuale del progetto Meetings Minuta e definisce un piano dettagliato per l'implementazione delle funzionalità necessarie a trasformarlo in un'applicazione completa di trascrizione audio.

## Struttura Attuale del Progetto

```
meetings-minuta-electron-app/
├── .vite/                      # Directory generata da Vite
├── node_modules/               # Dipendenze
├── migration/                  # Documentazione di migrazione
│   ├── MIGRATION_SPEC.md       # Specifiche di migrazione
│   ├── ELECTRON_MIGRATION_PLAN.md # Piano di migrazione a Electron
│   ├── UI_MIGRATION.md         # Specifiche per la UI
│   ├── ASSEMBLYAI_INTEGRATION.md # Specifiche per integrazione AssemblyAI
│   ├── UI_DESIGN_SPEC.md       # Nuove specifiche di design UI
│   └── PROJECT_STRUCTURE.md    # Questo file
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

## Tecnologie Attuali

- **Framework**: Electron con electron-forge e Vite
- **Frontend**: React 19 con TypeScript
- **UI**: TailwindCSS 4.x con @tailwindcss/postcss, @headlessui/react, @heroicons/react
- **Database**: electron-store (sistema JSON semplice)
- **Persistenza**: File JSON locali

## Funzionalità Attuali

L'applicazione attualmente implementa:
- UI di base con React e TailwindCSS
- Gestione di note semplici tramite electron-store
- Struttura CRUD base per le note

## Cosa Implementare e Dove

### 1. Estensione del Database electron-store

#### File da Creare/Modificare:
- `src/services/db/index.ts` - Indice dei servizi DB
- `src/services/db/models/meeting.ts` - Modello per riunioni
- `src/services/db/models/transcript.ts` - Modello per trascrizioni
- `src/services/db/models/audioFile.ts` - Modello per file audio

#### Azioni da Eseguire:
1. Mantenere electron-store come soluzione di database
2. Estendere lo schema di electron-store per supportare più collezioni
3. Definire gli schemi dei modelli
4. Implementare metodi CRUD per ciascun modello

```typescript
// Esempio schema Meeting in src/services/db/models/meeting.ts
export interface Meeting {
  id: string;
  title: string;
  description: string;
  date: string;
  participants: string[];
  createdAt: string;
  audioFileName?: string;
  minutes?: string;
  type: 'meeting';
}

export const meetingMethods = {
  async getAll(store: Store<any>): Promise<Meeting[]> {
    const meetings = store.get('meetings', {});
    const meetingIds = store.get('meetingIds', []);
    
    return meetingIds
      .filter(id => meetings[id])
      .map(id => meetings[id])
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },
  // Altri metodi...
};
```

### 2. Nuova Struttura UI/UX

#### File da Creare/Modificare:
- `src/components/` - Nuova directory per componenti React
- `src/components/layout/` - Componenti di layout (sidebar, header, ecc.)
- `src/components/meetings/` - Componenti specifici per riunioni
- `src/components/transcriptions/` - Componenti per trascrizioni
- `src/components/audio/` - Componenti per gestione audio
- `src/pages/` - Componenti pagina
- `src/contexts/` - Context React
- `src/hooks/` - Custom hooks

#### Azioni da Eseguire:
1. Implementare la struttura di layout da UI_DESIGN_SPEC.md
2. Creare componenti per ciascuna vista:
   - Dashboard
   - Elenco Riunioni
   - Vista Riunione singola
   - Vista Trascrizione
   - Impostazioni
3. Implementare sistema di routing
4. Creare context per gestire stato globale e temi

```typescript
// Esempio di componente per la sidebar in src/components/layout/Sidebar.tsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar: React.FC = () => {
  const location = useLocation();
  
  return (
    <aside className="w-64 bg-white dark:bg-gray-800 shadow-md h-screen fixed left-0 top-0 overflow-y-auto">
      <div className="px-4 py-6">
        <h2 className="text-xl font-bold text-blue-600 mb-6">Meetings Minuta</h2>
        
        <nav className="space-y-2">
          <Link 
            to="/" 
            className={`flex items-center px-4 py-2.5 rounded-lg ${
              location.pathname === '/' 
                ? 'text-gray-700 bg-gray-100' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span className="ml-3">Dashboard</span>
          </Link>
          {/* Altri link... */}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
```

### 3. Sistema di Monitoraggio File

#### File da Creare/Modificare:
- `src/services/fileWatcher.ts` - Servizio di monitoraggio file
- `src/main.ts` - Aggiornare per includere FileWatcher
- `src/preload.ts` - Esporre API FileWatcher
- `src/components/settings/DirectoryMonitor.tsx` - UI per configurazione

#### Azioni da Eseguire:
1. Installare `chokidar` per monitoraggio file
2. Implementare servizio di monitoraggio in processo main
3. Creare API IPC per comunicazione con il renderer
4. Costruire UI per configurare directory da monitorare
5. Salvare configurazioni in electron-store

```typescript
// Esempio di handler IPC in src/main.ts
ipcMain.handle('fileWatcher:addDirectory', async (event, dirPath) => {
  try {
    return await fileWatcher.addWatchPath(dirPath);
  } catch (error) {
    console.error('Errore aggiungendo directory:', error);
    throw error;
  }
});
```

### 4. Integrazione AssemblyAI

#### File da Creare/Modificare:
- `src/services/assemblyai.ts` - Servizio per API AssemblyAI
- `src/main.ts` - Aggiornare per includere servizio AssemblyAI
- `src/preload.ts` - Esporre API AssemblyAI
- `src/components/settings/ApiSettings.tsx` - UI per configurazione API key
- `src/components/transcriptions/TranscriptionView.tsx` - UI per visualizzare trascrizioni

#### Azioni da Eseguire:
1. Creare client per API AssemblyAI
2. Implementare funzionalità per:
   - Upload file audio
   - Invio richiesta trascrizione
   - Polling stato trascrizione
   - Parsing e formattazione risultati
3. Salvare trascrizioni in electron-store

```typescript
// Esempio di client AssemblyAI in src/services/assemblyai.ts
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { BrowserWindow } from 'electron';
import { v4 as uuidv4 } from 'uuid'; 

export class AssemblyAiService {
  private apiKey: string;
  private store: Store<any>;
  private mainWindow: BrowserWindow | null;
  private baseUrl: string = 'https://api.assemblyai.com/v2';
  
  constructor(apiKey: string, store: Store<any>, mainWindow: BrowserWindow | null) {
    this.apiKey = apiKey;
    this.store = store;
    this.mainWindow = mainWindow;
  }
  
  // Metodi implementazione...
}
```

### 5. Modello Dati per Meetings Minuta

Sarà implementato in electron-store con le seguenti collezioni:

1. **Meetings** (riunioni)
   - Attributi: id, title, description, date, participants, createdAt, audioFileId, transcriptId
   
2. **Trascrizioni**
   - Attributi: id, meetingId, audioFileId, status, text, createdAt, completedAt, assemblyAiId, utterances
   
3. **File Audio**
   - Attributi: id, fileName, filePath, fileSize, duration, meetingId, transcriptId, createdAt

4. **Configurazione**
   - watchDirectories: array di percorsi monitorati
   - assemblyAiKey: chiave API per AssemblyAI

## Piano di Implementazione

### Fase 1: Migrazione Database e Ristrutturazione

1. Mantenere electron-store come soluzione di database
2. Estendere lo schema di electron-store per supportare più collezioni
3. Definire gli schemi dei modelli
4. Implementare metodi CRUD per ciascun modello

### Fase 2: UI e Routing

1. Implementare sistema di routing
2. Costruire componenti UI da UI_DESIGN_SPEC.md
3. Implementare theme switch
4. Creare componenti pagina per ogni vista
5. Aggiornare App.tsx per utilizzare nuova struttura

### Fase 3: Monitoraggio File e Integrazione AssemblyAI

1. Implementare FileWatcher
2. Creare client AssemblyAI
3. Implementare processo di trascrizione
4. Costruire UI per impostazioni
5. Testare flusso completo

### Fase 4: Audio Player e Editor Trascrizione

1. Implementare player audio personalizzato
2. Creare editor trascrizione con sincronizzazione
3. Implementare funzionalità per correzioni manuali
4. Aggiungere identificazione parlanti
5. Sviluppare UI per visualizzazione trascrizione

### Fase 5: Ottimizzazione e Distribuzione

1. Ottimizzare performance
2. Implementare caching e gestione offline
3. Configurare packaging con electron-forge
4. Testare su diverse piattaforme
5. Preparare per la distribuzione

## Timeline Stimata

- **Fase 1**: 1-2 settimane
- **Fase 2**: 1-2 settimane
- **Fase 3**: 2-3 settimane
- **Fase 4**: 2-3 settimane
- **Fase 5**: 1-2 settimane

Totale: 7-12 settimane a seconda della complessità e dei requisiti specifici che potrebbero emergere durante lo sviluppo. 