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

### 1. Estensione del Database

#### File da Creare/Modificare:
- `src/services/db/index.ts` - Indice dei servizi DB
- `src/services/db/pouchdb.ts` - Configurazione PouchDB
- `src/services/db/models/meeting.ts` - Modello per riunioni
- `src/services/db/models/transcript.ts` - Modello per trascrizioni
- `src/services/db/models/audioFile.ts` - Modello per file audio
- `src/services/db/migrator.ts` - Script per migrare da electron-store a PouchDB

#### Azioni da Eseguire:
1. Installare le dipendenze: `pouchdb`, `pouchdb-find` e i tipi corrispondenti
2. Implementare la configurazione PouchDB base
3. Definire gli schemi dei modelli
4. Creare funzioni di migrazione dai dati attuali
5. Implementare metodi CRUD per ciascun modello

```typescript
// Esempio schema Meeting in src/services/db/models/meeting.ts
export interface Meeting {
  _id: string;
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
  async getAll(db: PouchDB.Database): Promise<Meeting[]> {
    const result = await db.find({
      selector: { type: 'meeting' },
      sort: [{ createdAt: 'desc' }]
    });
    return result.docs as Meeting[];
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
5. Salvare configurazioni in database

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
3. Creare UI per configurare API key
4. Implementare processo di trascrizione automatica per nuovi file

```typescript
// Esempio di metodo per avviare trascrizione in src/services/assemblyai.ts
async transcribeAudio(filePath: string, meetingId: string) {
  // Caricare file su AssemblyAI
  const uploadUrl = await this.uploadAudio(filePath);
  
  // Avviare trascrizione
  const response = await axios.post(`${this.baseURL}/transcript`, {
    audio_url: uploadUrl,
    speaker_labels: true
  }, {
    headers: {
      'authorization': this.apiKey,
      'content-type': 'application/json'
    }
  });
  
  // Salva informazioni trascrizione
  // ...
  
  return response.data;
}
```

### 5. Audio Player Personalizzato

#### File da Creare/Modificare:
- `src/components/audio/AudioPlayer.tsx` - Componente player audio
- `src/hooks/useAudioPlayer.ts` - Hook per gestire player audio
- `src/components/transcriptions/TranscriptionEditor.tsx` - Editor con sincronizzazione

#### Azioni da Eseguire:
1. Implementare player audio personalizzato con controlli
2. Creare funzionalità per sincronizzare la riproduzione con la trascrizione
3. Implementare evidenziazione del testo in base al timestamp corrente
4. Aggiungere controlli per velocità di riproduzione, salto, ecc.

```typescript
// Esempio di hook per player audio in src/hooks/useAudioPlayer.ts
export function useAudioPlayer(audioUrl: string) {
  const [audio] = useState(new Audio(audioUrl));
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // Gestione eventi...
  
  return {
    audio,
    playing,
    currentTime,
    duration,
    play: () => {
      audio.play();
      setPlaying(true);
    },
    pause: () => {
      audio.pause();
      setPlaying(false);
    },
    seek: (time: number) => {
      audio.currentTime = time;
      setCurrentTime(time);
    }
  };
}
```

### 6. Sistema di Routing

#### File da Creare/Modificare:
- `src/App.tsx` - Aggiornare per configurare il routing
- `src/routes.tsx` - Definire le rotte dell'applicazione

#### Azioni da Eseguire:
1. Installare `react-router-dom`
2. Definire struttura delle rotte:
   - `/` - Dashboard
   - `/meetings` - Elenco riunioni
   - `/meetings/:id` - Dettaglio riunione
   - `/transcriptions/:id` - Editor trascrizione
   - `/settings` - Impostazioni
3. Implementare componente layout con sidebar

```typescript
// Esempio di configurazione rotte in src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import MeetingsList from './pages/MeetingsList';
import MeetingDetail from './pages/MeetingDetail';
import TranscriptionEditor from './pages/TranscriptionEditor';
import Settings from './pages/Settings';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="meetings" element={<MeetingsList />} />
          <Route path="meetings/:id" element={<MeetingDetail />} />
          <Route path="transcriptions/:id" element={<TranscriptionEditor />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

### 7. Aggiornamento Tailwind e UI

#### File da Creare/Modificare:
- `tailwind.config.js` - Aggiornare con nuova palette colori
- `src/index.css` - Aggiornare stili globali
- `src/themes.css` - Creare per gestire tema chiaro/scuro

#### Azioni da Eseguire:
1. Aggiornare configurazione Tailwind con palette colori da UI_DESIGN_SPEC.md
2. Implementare supporto per tema chiaro/scuro
3. Creare componenti UI base riutilizzabili:
   - Button
   - Card
   - Input
   - Select
   - Modal
   - Toast

```typescript
// Esempio di componente Button in src/components/common/Button.tsx
import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };
  
  return (
    <button
      className={`
        ${baseClasses} 
        ${variantClasses[variant]} 
        ${sizeClasses[size]}
        ${isLoading ? 'opacity-75 cursor-wait' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
};

export default Button;
```

## Piano di Implementazione

### Fase 1: Migrazione Database e Ristrutturazione

1. Installare e configurare PouchDB
2. Convertire modello note in nuovi modelli (Meeting, Transcript, AudioFile)
3. Implementare migrazione dati
4. Aggiornare preload.ts per esporre nuove API
5. Creare componenti base e layout

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