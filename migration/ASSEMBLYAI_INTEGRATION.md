# Integrazione AssemblyAI in Electron

Questo documento descrive in dettaglio come implementare l'integrazione con AssemblyAI nel contesto di un'applicazione Electron, sostituendo l'attuale implementazione basata su web.

## Service AssemblyAI

Il file principale che gestisce l'integrazione con AssemblyAI è `src/main/services/assemblyAi.ts`. Ecco l'implementazione completa:

```typescript
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { BrowserWindow } from 'electron';
import { generateId } from '../db/pouchdb';

export class AssemblyAiService {
  private apiKey: string;
  private databases: any;
  private mainWindow: BrowserWindow | null;
  private baseUrl: string = 'https://api.assemblyai.com/v2';
  
  constructor(apiKey: string, databases: any, mainWindow: BrowserWindow | null) {
    this.apiKey = apiKey;
    this.databases = databases;
    this.mainWindow = mainWindow;
  }
  
  /**
   * Avvia il processo di trascrizione per un file audio
   */
  async transcribeAudioFile(filePath: string, audioFileId: string): Promise<void> {
    try {
      const { audioFilesDb, transcriptsDb, meetingsDb } = this.databases;
      
      // Recupera record del file audio
      const audioFile = await audioFilesDb.get(audioFileId);
      
      // Crea meeting automatico se non associato
      let meetingId = audioFile.meetingId;
      if (!meetingId) {
        const fileName = path.basename(filePath, path.extname(filePath));
        const meeting = {
          _id: generateId('meeting'),
          title: `Auto: ${fileName}`,
          description: 'Trascrizione automatica',
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
        _id: generateId('transcript'),
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
  
  /**
   * Carica un file audio su AssemblyAI
   */
  async uploadFile(filePath: string): Promise<string> {
    try {
      const fileData = fs.readFileSync(filePath);
      const headers = {
        'Authorization': this.apiKey,
        'Content-Type': 'application/octet-stream'
      };
      
      const response = await axios.post(`${this.baseUrl}/upload`, fileData, { headers });
      return response.data.upload_url;
    } catch (error) {
      console.error('Errore caricando il file su AssemblyAI:', error);
      throw error;
    }
  }
  
  /**
   * Avvia una trascrizione utilizzando l'URL di upload
   */
  async startTranscription(audioUrl: string): Promise<string> {
    try {
      const headers = {
        'Authorization': this.apiKey,
        'Content-Type': 'application/json'
      };
      
      const data = {
        audio_url: audioUrl,
        speaker_labels: true,
        language_code: 'it'
      };
      
      const response = await axios.post(`${this.baseUrl}/transcript`, data, { headers });
      return response.data.id;
    } catch (error) {
      console.error('Errore avviando la trascrizione con AssemblyAI:', error);
      throw error;
    }
  }
  
  /**
   * Verifica lo stato di una trascrizione
   */
  async getTranscriptionStatus(transcriptId: string): Promise<any> {
    try {
      const headers = {
        'Authorization': this.apiKey
      };
      
      const response = await axios.get(`${this.baseUrl}/transcript/${transcriptId}`, { headers });
      return response.data;
    } catch (error) {
      console.error('Errore verificando lo stato della trascrizione:', error);
      throw error;
    }
  }
  
  /**
   * Polling continuo dello stato della trascrizione fino al completamento
   */
  async pollTranscriptionStatus(assemblyAiId: string, transcriptDbId: string): Promise<void> {
    try {
      const { transcriptsDb } = this.databases;
      
      // Ottieni trascrizione dal database
      const transcript = await transcriptsDb.get(transcriptDbId);
      
      // Verifica lo stato in AssemblyAI
      const statusData = await this.getTranscriptionStatus(assemblyAiId);
      
      if (statusData.status === 'completed') {
        // Trascrizione completata
        transcript.status = 'completed';
        transcript.fullText = statusData.text;
        transcript.utterances = statusData.utterances || [];
        transcript.completedAt = new Date().toISOString();
        
        await transcriptsDb.put(transcript);
        
        // Aggiorna stato file audio
        await this.updateAudioFileStatus(transcript.meetingId, transcriptDbId);
        
        // Notifica il frontend
        if (this.mainWindow) {
          this.mainWindow.webContents.send('transcript:statusChanged', transcript);
        }
        
        return;
      } else if (statusData.status === 'error') {
        // Errore nella trascrizione
        transcript.status = 'error';
        await transcriptsDb.put(transcript);
        
        // Notifica il frontend
        if (this.mainWindow) {
          this.mainWindow.webContents.send('transcript:statusChanged', transcript);
        }
        
        return;
      }
      
      // Se ancora in elaborazione, continua il polling
      setTimeout(() => {
        this.pollTranscriptionStatus(assemblyAiId, transcriptDbId);
      }, 5000); // Controlla ogni 5 secondi
      
    } catch (error) {
      console.error('Errore nel polling della trascrizione:', error);
    }
  }
  
  /**
   * Aggiorna lo stato del file audio dopo il completamento della trascrizione
   */
  async updateAudioFileStatus(meetingId: string, transcriptId: string): Promise<void> {
    try {
      const { audioFilesDb } = this.databases;
      
      // Trova il file audio associato a questa trascrizione
      const result = await audioFilesDb.find({
        selector: {
          transcriptId: transcriptId,
          type: 'audiofile'
        }
      });
      
      if (result.docs.length > 0) {
        const audioFile = result.docs[0];
        audioFile.processed = true;
        audioFile.processedAt = new Date().toISOString();
        
        await audioFilesDb.put(audioFile);
      }
    } catch (error) {
      console.error('Errore aggiornando lo stato del file audio:', error);
    }
  }
  
  /**
   * Forza aggiornamento di una trascrizione esistente
   */
  async forceTranscriptUpdate(transcriptId: string): Promise<void> {
    try {
      const { transcriptsDb } = this.databases;
      
      // Ottieni trascrizione dal database
      const transcript = await transcriptsDb.get(transcriptId);
      
      if (!transcript.assemblyAiId) {
        throw new Error('Questa trascrizione non ha un ID AssemblyAI associato');
      }
      
      // Verifica lo stato in AssemblyAI
      const statusData = await this.getTranscriptionStatus(transcript.assemblyAiId);
      
      // Aggiorna i dati della trascrizione
      transcript.status = statusData.status;
      
      if (statusData.status === 'completed') {
        transcript.fullText = statusData.text;
        transcript.utterances = statusData.utterances || [];
        transcript.completedAt = new Date().toISOString();
      }
      
      await transcriptsDb.put(transcript);
      
      // Notifica il frontend
      if (this.mainWindow) {
        this.mainWindow.webContents.send('transcript:statusChanged', transcript);
      }
      
    } catch (error) {
      console.error('Errore forzando aggiornamento trascrizione:', error);
      throw error;
    }
  }
}
```

## Handler IPC per le Trascrizioni

Per integrare il servizio AssemblyAI con l'interfaccia utente, è necessario implementare gli handler IPC in `src/main/ipc/transcriptHandlers.ts`:

```typescript
import { ipcMain, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import { generateId } from '../db/pouchdb';
import { AssemblyAiService } from '../services/assemblyAi';
import Store from 'electron-store';

const store = new Store();

export const setupTranscriptHandlers = (
  ipcMain: Electron.IpcMain, 
  databases: any, 
  mainWindow: BrowserWindow | null
) => {
  const { transcriptsDb } = databases;
  
  // Get all transcripts
  ipcMain.handle('transcripts:getAll', async () => {
    try {
      const result = await transcriptsDb.find({
        selector: { type: 'transcript' }
      });
      return result.docs;
    } catch (error) {
      console.error('Error getting transcripts:', error);
      throw new Error('Failed to get transcripts');
    }
  });
  
  // Get transcript by ID
  ipcMain.handle('transcripts:getById', async (event, id) => {
    try {
      return await transcriptsDb.get(id);
    } catch (error) {
      console.error(`Error getting transcript ${id}:`, error);
      throw new Error('Transcript not found');
    }
  });
  
  // Get transcripts by meeting ID
  ipcMain.handle('transcripts:getByMeetingId', async (event, meetingId) => {
    try {
      const result = await transcriptsDb.find({
        selector: {
          type: 'transcript',
          meetingId: meetingId
        }
      });
      return result.docs;
    } catch (error) {
      console.error(`Error getting transcripts for meeting ${meetingId}:`, error);
      throw new Error('Failed to get meeting transcripts');
    }
  });
  
  // Create new transcript from file
  ipcMain.handle('transcripts:create', async (event, meetingId, filePath) => {
    try {
      // Verifica che il file esista
      if (!fs.existsSync(filePath)) {
        throw new Error('File not found');
      }
      
      // Crea record per il file audio
      const { audioFilesDb } = databases;
      const fileName = path.basename(filePath);
      const stats = fs.statSync(filePath);
      
      const audioFile = {
        _id: generateId('audiofile'),
        filePath: filePath,
        fileName: fileName,
        processed: false,
        fileSize: stats.size,
        meetingId: meetingId,
        createdAt: new Date().toISOString(),
        type: 'audiofile'
      };
      
      const audioResult = await audioFilesDb.put(audioFile);
      
      // Avvia la trascrizione
      const assemblyAiKey = store.get('assemblyAiKey') as string;
      if (!assemblyAiKey) {
        throw new Error('AssemblyAI API key not configured');
      }
      
      const assemblyAiService = new AssemblyAiService(assemblyAiKey, databases, mainWindow);
      assemblyAiService.transcribeAudioFile(filePath, audioFile._id);
      
      return {
        ...audioFile,
        _rev: audioResult.rev
      };
    } catch (error) {
      console.error('Error creating transcript:', error);
      throw new Error('Failed to create transcript');
    }
  });
  
  // Delete transcript
  ipcMain.handle('transcripts:delete', async (event, id) => {
    try {
      const transcript = await transcriptsDb.get(id);
      return await transcriptsDb.remove(transcript);
    } catch (error) {
      console.error(`Error deleting transcript ${id}:`, error);
      throw new Error('Failed to delete transcript');
    }
  });
  
  // Force update of transcript
  ipcMain.handle('transcripts:forceUpdate', async (event, id) => {
    try {
      const assemblyAiKey = store.get('assemblyAiKey') as string;
      if (!assemblyAiKey) {
        throw new Error('AssemblyAI API key not configured');
      }
      
      const assemblyAiService = new AssemblyAiService(assemblyAiKey, databases, mainWindow);
      await assemblyAiService.forceTranscriptUpdate(id);
      
      // Return updated transcript
      return await transcriptsDb.get(id);
    } catch (error) {
      console.error(`Error forcing update of transcript ${id}:`, error);
      throw new Error('Failed to update transcript');
    }
  });
};
```

## Tipo AssemblyAI per TypeScript

Per garantire la type safety, è utile definire le interfacce per le risposte di AssemblyAI in un file separato:

```typescript
// src/main/types/assemblyai.ts

export interface AssemblyAiUtterance {
  speaker: string;
  text: string;
  start: number;
  end: number;
}

export interface AssemblyAiTranscriptResponse {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'error';
  text: string;
  audio_url: string;
  utterances?: AssemblyAiUtterance[];
  error?: string;
}
```

## Configurazione dell'API Key

L'API key di AssemblyAI deve essere memorizzata in modo sicuro usando electron-store:

```typescript
// Esempio di come gestire la configurazione delle API key
import Store from 'electron-store';

const store = new Store({
  encryptionKey: 'your-encryption-key', // Per maggiore sicurezza
  schema: {
    assemblyAiKey: {
      type: 'string'
    },
    openAiKey: {
      type: 'string'
    }
  }
});

// Salvataggio chiave
store.set('assemblyAiKey', 'YOUR_API_KEY');

// Recupero chiave
const apiKey = store.get('assemblyAiKey');
```

## Componente React per la Gestione delle Trascrizioni

Ecco un esempio di componente React che utilizza l'API Electron per gestire le trascrizioni:

```tsx
// src/renderer/components/TranscriptionManager.tsx
import React, { useState, useEffect } from 'react';
import { transcriptApi, Transcript } from '../services/api';

const TranscriptionManager: React.FC<{ meetingId: string }> = ({ meetingId }) => {
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Carica trascrizioni
  const loadTranscripts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await transcriptApi.getByMeetingId(meetingId);
      setTranscripts(data);
    } catch (err: any) {
      setError(err.message || 'Errore caricando le trascrizioni');
    } finally {
      setLoading(false);
    }
  };
  
  // Avvia nuova trascrizione
  const startTranscription = async (filePath: string) => {
    try {
      setLoading(true);
      setError(null);
      await transcriptApi.create(meetingId, filePath);
      // La lista si aggiornerà tramite evento IPC
    } catch (err: any) {
      setError(err.message || 'Errore avviando la trascrizione');
      setLoading(false);
    }
  };
  
  // Forza aggiornamento di una trascrizione
  const forceUpdate = async (transcriptId: string) => {
    try {
      setLoading(true);
      setError(null);
      await transcriptApi.forceUpdate(transcriptId);
      // I dati si aggiorneranno tramite evento IPC
    } catch (err: any) {
      setError(err.message || 'Errore aggiornando la trascrizione');
      setLoading(false);
    }
  };
  
  // Ascolta gli eventi di aggiornamento trascrizione
  useEffect(() => {
    const unsubscribe = window.electronAPI.on('transcript:statusChanged', (updatedTranscript: Transcript) => {
      if (updatedTranscript.meetingId === meetingId) {
        setTranscripts(prev => 
          prev.map(t => t._id === updatedTranscript._id ? updatedTranscript : t)
        );
        
        // Se la trascrizione era in caricamento e ora è completata, aggiorna lo stato
        if (updatedTranscript.status === 'completed' || updatedTranscript.status === 'error') {
          setLoading(false);
        }
      }
    });
    
    // Carica trascrizioni all'avvio
    loadTranscripts();
    
    return () => {
      unsubscribe();
    };
  }, [meetingId]);
  
  return (
    <div className="transcription-manager">
      <h2>Trascrizioni</h2>
      
      {error && <div className="error">{error}</div>}
      
      <button 
        onClick={() => window.electronAPI.system.selectDirectory()
          .then(paths => {
            if (paths && paths.length > 0) {
              startTranscription(paths[0]);
            }
          })
        }
        disabled={loading}
      >
        Seleziona File Audio
      </button>
      
      {loading && <div className="loading">Elaborazione in corso...</div>}
      
      <div className="transcripts-list">
        {transcripts.map(transcript => (
          <div key={transcript._id} className={`transcript-item status-${transcript.status}`}>
            <div className="transcript-status">
              Stato: {
                transcript.status === 'queued' ? 'In coda' :
                transcript.status === 'processing' ? 'In elaborazione' :
                transcript.status === 'completed' ? 'Completata' : 'Errore'
              }
            </div>
            
            {transcript.status === 'completed' && (
              <div className="transcript-content">
                <h3>Testo completo</h3>
                <div className="transcript-text">{transcript.fullText}</div>
                
                {transcript.utterances && transcript.utterances.length > 0 && (
                  <div className="utterances">
                    <h3>Dialogo</h3>
                    {transcript.utterances.map((utterance, idx) => (
                      <div key={idx} className="utterance">
                        <div className="speaker">Speaker {utterance.speaker}</div>
                        <div className="text">{utterance.text}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {(transcript.status === 'error' || transcript.status === 'processing') && (
              <button 
                onClick={() => forceUpdate(transcript._id!)}
                disabled={loading}
              >
                Forza Aggiornamento
              </button>
            )}
          </div>
        ))}
        
        {transcripts.length === 0 && !loading && (
          <p>Nessuna trascrizione disponibile. Carica un file audio per iniziare.</p>
        )}
      </div>
    </div>
  );
};

export default TranscriptionManager;
```

## Gestione degli Errori

È importante gestire adeguatamente gli errori durante l'interazione con AssemblyAI:

1. **Errori di connessione**: Verificare che la connessione internet sia attiva.
2. **Errori di autenticazione**: Verificare che l'API key sia valida.
3. **Errori nel formato file**: Verificare che il file audio sia in un formato supportato.
4. **Errori di dimensione file**: Verificare che il file non superi i limiti di dimensione.

Esempio di implementazione per la gestione degli errori:

```typescript
// Esempio di helper per la gestione degli errori AssemblyAI
const handleAssemblyAIError = (error: any) => {
  if (error.response) {
    // Errore di risposta API
    const status = error.response.status;
    const data = error.response.data;
    
    if (status === 401) {
      return 'API key non valida o scaduta. Verifica le impostazioni.';
    } else if (status === 413) {
      return 'File audio troppo grande. Il limite è di 100MB.';
    } else {
      return `Errore AssemblyAI (${status}): ${data.error || 'Errore sconosciuto'}`;
    }
  } else if (error.request) {
    // Nessuna risposta ricevuta
    return 'Impossibile contattare il servizio AssemblyAI. Verifica la connessione internet.';
  } else {
    // Errore in fase di configurazione della richiesta
    return `Errore: ${error.message}`;
  }
};
```

## Conclusione

L'integrazione di AssemblyAI in un'applicazione Electron richiede una serie di passaggi per garantire una gestione efficace del processo di trascrizione. Questo documento fornisce le linee guida e gli esempi di codice necessari per implementare questa integrazione nel contesto dell'applicazione AudioTranscriber. 