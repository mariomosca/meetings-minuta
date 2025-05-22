# Migrazione dell'Interfaccia Utente per Electron

Questo documento descrive il processo di migrazione dell'interfaccia utente dall'attuale applicazione web React a un'interfaccia integrata in Electron.

## Struttura dei Componenti

L'attuale applicazione web contiene diversi componenti React che dovranno essere adattati per funzionare con le API IPC di Electron. Ecco una struttura raccomandata per l'organizzazione dei componenti nell'app Electron:

```
src/renderer/
├── components/             # Componenti riutilizzabili
│   ├── common/             # Componenti UI generici
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   └── ...
│   ├── dashboard/          # Componenti per la dashboard
│   │   ├── MeetingsList.tsx
│   │   ├── MeetingCard.tsx
│   │   └── ...
│   ├── transcription/      # Componenti per la trascrizione
│   │   ├── TranscriptionManager.tsx
│   │   ├── AudioPlayer.tsx
│   │   └── ...
│   └── settings/           # Componenti per le impostazioni
│       └── ApiKeyForm.tsx
├── pages/                  # Pagine principali dell'applicazione
│   ├── Dashboard.tsx       # Homepage/Dashboard
│   ├── MeetingDetails.tsx  # Dettagli di un meeting
│   ├── NewMeeting.tsx      # Creazione nuovo meeting
│   └── Settings.tsx        # Impostazioni applicazione
├── contexts/               # Context React per lo state management
│   ├── MeetingContext.tsx
│   └── TranscriptionContext.tsx
├── services/               # Servizi frontend
│   └── api.ts              # Client API adattato per Electron
├── utils/                  # Utility
│   ├── formatters.ts       # Formattazione date, testi, ecc.
│   └── validators.ts       # Validazione input
├── App.tsx                 # Componente principale
└── main.tsx                # Entry point React
```

## Migrazione dei Componenti

### 1. Adattamento del Router

L'applicazione web attuale utilizza React Router per la navigazione. In Electron manterremo React Router, ma dovremo adattarlo:

```tsx
// src/renderer/App.tsx
import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import MeetingDetails from './pages/MeetingDetails';
import NewMeeting from './pages/NewMeeting';
import Settings from './pages/Settings';
import './App.css';

const App: React.FC = () => {
  return (
    <Router>
      <div className="app-container">
        <aside className="sidebar">
          <h1 className="app-title">AudioTranscriber</h1>
          <nav className="main-nav">
            <a href="#/" className="nav-item">Dashboard</a>
            <a href="#/new-meeting" className="nav-item">Nuova trascrizione</a>
            <a href="#/audio-files" className="nav-item">File audio locali</a>
            <a href="#/settings" className="nav-item">Impostazioni</a>
          </nav>
        </aside>
        
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/meetings/:id" element={<MeetingDetails />} />
            <Route path="/new-meeting" element={<NewMeeting />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
```

### 2. Migrazione della Dashboard

```tsx
// src/renderer/pages/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { meetingApi, Meeting } from '../services/api';
import MeetingsList from '../components/dashboard/MeetingsList';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const loadMeetings = async () => {
      try {
        setLoading(true);
        const data = await meetingApi.getAll();
        setMeetings(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Errore caricando i meeting');
      } finally {
        setLoading(false);
      }
    };
    
    loadMeetings();
    
    // Ascolta gli eventi di aggiornamento meeting
    const unsubscribe = window.electronAPI.on('meeting:updated', (updatedMeeting: Meeting) => {
      setMeetings(prev => 
        prev.map(m => m._id === updatedMeeting._id ? updatedMeeting : m)
      );
    });
    
    return () => {
      unsubscribe();
    };
  }, []);
  
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <Link to="/new-meeting" className="btn-primary">Nuova trascrizione</Link>
      </div>
      
      {error && <div className="error">{error}</div>}
      
      {loading ? (
        <div className="loading">Caricamento...</div>
      ) : (
        <MeetingsList meetings={meetings} />
      )}
    </div>
  );
};

export default Dashboard;
```

### 3. Componente per la Lista dei Meeting

```tsx
// src/renderer/components/dashboard/MeetingsList.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Meeting } from '../../services/api';
import MeetingCard from './MeetingCard';
import './MeetingsList.css';

interface MeetingsListProps {
  meetings: Meeting[];
}

const MeetingsList: React.FC<MeetingsListProps> = ({ meetings }) => {
  if (meetings.length === 0) {
    return (
      <div className="empty-state">
        <p>Nessun meeting disponibile. Crea una nuova trascrizione per iniziare.</p>
        <Link to="/new-meeting" className="btn-primary">Nuova trascrizione</Link>
      </div>
    );
  }
  
  return (
    <div className="meetings-list">
      {meetings.map(meeting => (
        <MeetingCard key={meeting._id} meeting={meeting} />
      ))}
    </div>
  );
};

export default MeetingsList;
```

### 4. Componente per il Form di Creazione Meeting

```tsx
// src/renderer/pages/NewMeeting.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { meetingApi, Meeting } from '../services/api';
import './NewMeeting.css';

const NewMeeting: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<Partial<Meeting>>({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    participants: []
  });
  
  const [participantInput, setParticipantInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const addParticipant = () => {
    if (participantInput.trim()) {
      setFormData(prev => ({
        ...prev,
        participants: [...(prev.participants || []), participantInput.trim()]
      }));
      setParticipantInput('');
    }
  };
  
  const removeParticipant = (index: number) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants?.filter((_, i) => i !== index)
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      // Seleziona file audio
      const paths = await window.electronAPI.system.selectDirectory();
      
      if (!paths || paths.length === 0) {
        setLoading(false);
        return; // Utente ha annullato la selezione
      }
      
      const filePath = paths[0];
      const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || '';
      
      // Crea meeting
      const meeting = await meetingApi.create({
        ...formData,
        audioFileName: fileName
      } as Meeting);
      
      // Avvia trascrizione
      await window.electronAPI.transcripts.create(meeting._id!, filePath);
      
      // Naviga alla pagina del meeting
      navigate(`/meetings/${meeting._id}`);
    } catch (err: any) {
      setError(err.message || 'Errore creando il meeting');
      setLoading(false);
    }
  };
  
  return (
    <div className="new-meeting">
      <h1>Nuova Trascrizione</h1>
      
      {error && <div className="error">{error}</div>}
      
      <form onSubmit={handleSubmit} className="meeting-form">
        <div className="form-group">
          <label htmlFor="title">Titolo</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="description">Descrizione</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="date">Data</label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label>Partecipanti</label>
          <div className="participants-input">
            <input
              type="text"
              value={participantInput}
              onChange={e => setParticipantInput(e.target.value)}
              placeholder="Nome partecipante"
            />
            <button type="button" onClick={addParticipant}>Aggiungi</button>
          </div>
          
          <div className="participants-list">
            {formData.participants?.map((participant, index) => (
              <div key={index} className="participant-tag">
                {participant}
                <button type="button" onClick={() => removeParticipant(index)}>×</button>
              </div>
            ))}
          </div>
        </div>
        
        <div className="form-actions">
          <button type="button" onClick={() => navigate('/')} className="btn-secondary">
            Annulla
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Elaborazione...' : 'Seleziona File Audio e Crea'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewMeeting;
```

### 5. Componente per i Dettagli del Meeting

```tsx
// src/renderer/pages/MeetingDetails.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { meetingApi, Meeting, transcriptApi, Transcript } from '../services/api';
import TranscriptionManager from '../components/transcription/TranscriptionManager';
import './MeetingDetails.css';

const MeetingDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Meeting>>({});
  
  useEffect(() => {
    const loadMeeting = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const data = await meetingApi.getById(id);
        setMeeting(data);
        setFormData(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Errore caricando i dettagli del meeting');
      } finally {
        setLoading(false);
      }
    };
    
    loadMeeting();
    
    // Ascolta gli eventi di aggiornamento meeting
    const unsubscribe = window.electronAPI.on('meeting:minutesGenerated', (updatedMeeting: Meeting) => {
      if (updatedMeeting._id === id) {
        setMeeting(updatedMeeting);
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, [id]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSave = async () => {
    if (!id || !formData) return;
    
    try {
      setLoading(true);
      const updatedMeeting = await meetingApi.update(id, formData as Meeting);
      setMeeting(updatedMeeting);
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || 'Errore aggiornando il meeting');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = async () => {
    if (!id) return;
    
    if (window.confirm('Sei sicuro di voler eliminare questo meeting?')) {
      try {
        await meetingApi.delete(id);
        navigate('/');
      } catch (err: any) {
        setError(err.message || 'Errore eliminando il meeting');
      }
    }
  };
  
  const generateMinutes = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      await meetingApi.generateMinutes(id);
      // Il meeting verrà aggiornato tramite l'evento IPC
    } catch (err: any) {
      setError(err.message || 'Errore generando la minuta');
      setLoading(false);
    }
  };
  
  if (loading && !meeting) {
    return <div className="loading">Caricamento...</div>;
  }
  
  if (error) {
    return <div className="error">{error}</div>;
  }
  
  if (!meeting) {
    return <div className="error">Meeting non trovato</div>;
  }
  
  return (
    <div className="meeting-details">
      <div className="meeting-header">
        <div className="meeting-title">
          {isEditing ? (
            <input
              type="text"
              name="title"
              value={formData.title || ''}
              onChange={handleChange}
              className="edit-title"
            />
          ) : (
            <h1>{meeting.title}</h1>
          )}
          <div className="meeting-date">
            {isEditing ? (
              <input
                type="date"
                name="date"
                value={(formData.date || '').split('T')[0]}
                onChange={handleChange}
              />
            ) : (
              <span>{new Date(meeting.date).toLocaleDateString()}</span>
            )}
          </div>
        </div>
        
        <div className="meeting-actions">
          {isEditing ? (
            <>
              <button onClick={() => setIsEditing(false)} className="btn-secondary">
                Annulla
              </button>
              <button onClick={handleSave} className="btn-primary">
                Salva
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setIsEditing(true)} className="btn-secondary">
                Modifica
              </button>
              <button onClick={handleDelete} className="btn-danger">
                Elimina
              </button>
              {!meeting.minutes && (
                <button 
                  onClick={generateMinutes} 
                  className="btn-primary"
                  disabled={loading}
                >
                  Genera Minuta
                </button>
              )}
            </>
          )}
        </div>
      </div>
      
      <div className="meeting-content">
        <div className="meeting-info">
          <h2>Informazioni</h2>
          
          <div className="info-group">
            <h3>Descrizione</h3>
            {isEditing ? (
              <textarea
                name="description"
                value={formData.description || ''}
                onChange={handleChange}
                rows={4}
              />
            ) : (
              <p>{meeting.description || 'Nessuna descrizione disponibile'}</p>
            )}
          </div>
          
          <div className="info-group">
            <h3>Partecipanti</h3>
            {meeting.participants && meeting.participants.length > 0 ? (
              <ul className="participants-list">
                {meeting.participants.map((participant, index) => (
                  <li key={index}>{participant}</li>
                ))}
              </ul>
            ) : (
              <p>Nessun partecipante registrato</p>
            )}
          </div>
          
          {meeting.minutes && (
            <div className="info-group">
              <h3>Minuta</h3>
              <div className="minutes-content">
                {meeting.minutes.split('\n').map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="meeting-transcriptions">
          <TranscriptionManager meetingId={meeting._id!} />
        </div>
      </div>
    </div>
  );
};

export default MeetingDetails;
```

### 6. Componente per le Impostazioni

```tsx
// src/renderer/pages/Settings.tsx
import React, { useState, useEffect } from 'react';
import { systemApi } from '../services/api';
import './Settings.css';

interface Settings {
  assemblyAiKey: string;
  openAiKey: string;
  watchDirectories: string[];
}

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<Settings>({
    assemblyAiKey: '',
    openAiKey: '',
    watchDirectories: []
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const data = await systemApi.getSettings();
        setSettings(data);
      } catch (err: any) {
        setError(err.message || 'Errore caricando le impostazioni');
      } finally {
        setLoading(false);
      }
    };
    
    loadSettings();
  }, []);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };
  
  const addWatchDirectory = async () => {
    try {
      const paths = await window.electronAPI.system.selectDirectory();
      if (paths && paths.length > 0) {
        setSettings(prev => ({
          ...prev,
          watchDirectories: paths
        }));
      }
    } catch (err: any) {
      setError(err.message || 'Errore selezionando la directory');
    }
  };
  
  const removeWatchDirectory = (index: number) => {
    setSettings(prev => ({
      ...prev,
      watchDirectories: prev.watchDirectories.filter((_, i) => i !== index)
    }));
  };
  
  const saveSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);
      
      // Salva le API keys
      await systemApi.setApiKeys({
        assemblyAiKey: settings.assemblyAiKey,
        openAiKey: settings.openAiKey
      });
      
      setSuccessMessage('Impostazioni salvate con successo');
      
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Errore salvando le impostazioni');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading && Object.keys(settings).length === 0) {
    return <div className="loading">Caricamento...</div>;
  }
  
  return (
    <div className="settings">
      <h1>Impostazioni</h1>
      
      {error && <div className="error">{error}</div>}
      {successMessage && <div className="success">{successMessage}</div>}
      
      <div className="settings-form">
        <div className="form-section">
          <h2>API Keys</h2>
          
          <div className="form-group">
            <label htmlFor="assemblyAiKey">AssemblyAI API Key</label>
            <input
              type="password"
              id="assemblyAiKey"
              name="assemblyAiKey"
              value={settings.assemblyAiKey}
              onChange={handleChange}
              placeholder="Inserisci la tua API key di AssemblyAI"
            />
            <p className="help-text">
              Necessaria per la trascrizione automatica. 
              <a href="https://www.assemblyai.com/" target="_blank" rel="noreferrer">
                Ottieni una chiave
              </a>
            </p>
          </div>
          
          <div className="form-group">
            <label htmlFor="openAiKey">OpenAI API Key</label>
            <input
              type="password"
              id="openAiKey"
              name="openAiKey"
              value={settings.openAiKey}
              onChange={handleChange}
              placeholder="Inserisci la tua API key di OpenAI"
            />
            <p className="help-text">
              Necessaria per la generazione delle minute. 
              <a href="https://platform.openai.com/" target="_blank" rel="noreferrer">
                Ottieni una chiave
              </a>
            </p>
          </div>
        </div>
        
        <div className="form-section">
          <h2>Directory Monitorate</h2>
          <p>I nuovi file audio in queste directory verranno automaticamente rilevati.</p>
          
          <div className="watch-directories">
            {settings.watchDirectories.length > 0 ? (
              <ul className="directories-list">
                {settings.watchDirectories.map((dir, index) => (
                  <li key={index} className="directory-item">
                    <span className="directory-path">{dir}</span>
                    <button 
                      type="button" 
                      onClick={() => removeWatchDirectory(index)}
                      className="btn-icon"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Nessuna directory monitorata</p>
            )}
            
            <button onClick={addWatchDirectory} className="btn-secondary">
              Aggiungi Directory
            </button>
          </div>
        </div>
        
        <div className="form-actions">
          <button 
            onClick={saveSettings} 
            className="btn-primary"
            disabled={loading}
          >
            Salva Impostazioni
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
```

## Adattamento degli Stili CSS

Per garantire che l'applicazione Electron abbia un aspetto nativo, è consigliabile adattare gli stili CSS:

```css
/* src/renderer/App.css */
:root {
  --primary-color: #4a6ee0;
  --primary-hover: #3857b8;
  --secondary-color: #f5f5f5;
  --text-color: #333;
  --light-text: #666;
  --border-color: #ddd;
  --danger-color: #e53935;
  --success-color: #43a047;
  --background-color: #f9f9f9;
  --sidebar-width: 240px;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  color: var(--text-color);
  background-color: var(--background-color);
}

.app-container {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.sidebar {
  width: var(--sidebar-width);
  height: 100%;
  background-color: var(--primary-color);
  color: white;
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.app-title {
  font-size: 24px;
  margin-bottom: 30px;
}

.main-nav {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.nav-item {
  color: white;
  text-decoration: none;
  padding: 10px 0;
  margin-bottom: 5px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.nav-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
  padding-left: 10px;
}

.main-content {
  flex-grow: 1;
  overflow-y: auto;
  padding: 20px;
}

/* Stili dei bottoni */
.btn-primary, .btn-secondary, .btn-danger {
  padding: 8px 16px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
}

.btn-primary:hover {
  background-color: var(--primary-hover);
}

.btn-secondary {
  background-color: var(--secondary-color);
  color: var(--text-color);
}

.btn-secondary:hover {
  background-color: #e5e5e5;
}

.btn-danger {
  background-color: var(--danger-color);
  color: white;
}

.btn-danger:hover {
  background-color: #c62828;
}

/* Stili dei messaggi */
.error, .success, .loading {
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.error {
  background-color: #ffebee;
  color: var(--danger-color);
  border: 1px solid #ffcdd2;
}

.success {
  background-color: #e8f5e9;
  color: var(--success-color);
  border: 1px solid #c8e6c9;
}

.loading {
  background-color: #e3f2fd;
  color: #1976d2;
  border: 1px solid #bbdefb;
}

/* Form styles */
.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 16px;
}

.form-group textarea {
  min-height: 100px;
  resize: vertical;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}
```

## Dichiarazione dei Tipi per le API Electron

Per garantire la type safety quando si utilizza l'API Electron dal renderer, dobbiamo dichiarare i tipi:

```typescript
// src/renderer/electron.d.ts
export {};

declare global {
  interface Window {
    electronAPI: {
      meetings: {
        getAll: () => Promise<any[]>;
        getById: (id: string) => Promise<any>;
        create: (meeting: any) => Promise<any>;
        update: (id: string, meeting: any) => Promise<any>;
        delete: (id: string) => Promise<void>;
        generateMinutes: (id: string) => Promise<any>;
      };
      transcripts: {
        getAll: () => Promise<any[]>;
        getById: (id: string) => Promise<any>;
        getByMeetingId: (meetingId: string) => Promise<any[]>;
        create: (meetingId: string, filePath: string) => Promise<any>;
        delete: (id: string) => Promise<void>;
        forceUpdate: (id: string) => Promise<any>;
      };
      audioFiles: {
        getAll: () => Promise<any[]>;
        getUnprocessed: () => Promise<any[]>;
        process: (id: string) => Promise<any>;
      };
      system: {
        selectDirectory: () => Promise<string[]>;
        setApiKeys: (keys: { assemblyAiKey?: string, openAiKey?: string }) => Promise<any>;
        getSettings: () => Promise<any>;
      };
      on: (channel: string, callback: (...args: any[]) => void) => () => void;
    };
  }
}
```

## Integrazione con Funzionalità Specifiche di Electron

### Menu Contestuale

```typescript
// src/main/menu.ts
import { Menu, MenuItem, BrowserWindow, app } from 'electron';

export function setupContextMenu(mainWindow: BrowserWindow) {
  const ctxMenu = new Menu();
  
  ctxMenu.append(new MenuItem({ 
    label: 'Copia', 
    role: 'copy' 
  }));
  
  ctxMenu.append(new MenuItem({ 
    label: 'Incolla', 
    role: 'paste' 
  }));
  
  mainWindow.webContents.on('context-menu', (e, params) => {
    ctxMenu.popup();
  });
  
  // Menu principale dell'applicazione
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Nuova Trascrizione',
          click: () => {
            mainWindow.webContents.send('menu:newTranscription');
          }
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Modifica',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { type: 'separator' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'Visualizza',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    }
  ];
  
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
```

### Gestione Notifiche Desktop

```typescript
// src/main/notifications.ts
import { Notification } from 'electron';
import path from 'path';

export function showNotification(title: string, body: string) {
  if (Notification.isSupported()) {
    const iconPath = path.join(__dirname, '../../resources/icon.png');
    
    const notification = new Notification({
      title,
      body,
      icon: iconPath
    });
    
    notification.show();
    
    return notification;
  }
  
  return null;
}
```

## Conclusione

La migrazione dell'interfaccia utente dall'app web React a Electron richiede principalmente:

1. **Adattamento delle chiamate API**: passare da Axios a IPC
2. **Implementazione di event listeners**: per ricevere aggiornamenti in tempo reale
3. **Integrazione con funzionalità desktop**: come notifiche, menu, file dialogs
4. **Adattamento CSS**: per migliorare l'esperienza utente nell'ambiente desktop

Seguendo le indicazioni e gli esempi di codice in questo documento, dovresti essere in grado di migrare con successo l'interfaccia utente esistente all'ambiente Electron, preservando la maggior parte della logica di business già implementata e migliorando l'esperienza utente con funzionalità desktop native. 