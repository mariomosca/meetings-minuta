import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

// Interfaccia per le API di Electron
interface ElectronAPI {
  appInfo?: {
    name: string;
    version: string;
  };
  meetings?: {
    getAll: () => Promise<Meeting[]>;
    getById: (id: string) => Promise<Meeting>;
    save: (meeting: any) => Promise<Meeting>;
    delete: (id: string) => Promise<any>;
  };
  audioFiles?: {
    import: () => Promise<AudioFile | null>;
    getByMeetingId: (meetingId: string) => Promise<AudioFile | null>;
  };
  transcripts?: {
    getByMeetingId: (meetingId: string) => Promise<Transcript[]>;
    startTranscription: (audioFileId: string) => Promise<Transcript>;
  };
}

// Accesso alle API esposte dal preload
const electronAPI = (window as any).electronAPI as ElectronAPI;

// Interfaccia per una riunione
interface Meeting {
  id?: string;
  title: string;
  description: string;
  date: string;
  participants: string[];
  createdAt: string;
  audioFileId?: string;
  transcriptId?: string;
}

// Interfaccia per un file audio
interface AudioFile {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  duration?: number;
  meetingId?: string;
  transcriptId?: string;
  createdAt: string;
}

// Interfaccia per una trascrizione
interface Transcript {
  id: string;
  meetingId: string;
  audioFileId?: string;
  status: 'queued' | 'processing' | 'completed' | 'error';
  text?: string;
  createdAt: string;
  completedAt?: string;
}

const App: React.FC = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newMeeting, setNewMeeting] = useState<Partial<Meeting>>({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    participants: [],
  });
  const [newParticipant, setNewParticipant] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Carica le riunioni all'avvio
  useEffect(() => {
    loadMeetings();
  }, []);
  
  // Carica le riunioni dal database
  async function loadMeetings() {
    try {
      setIsLoading(true);
      setError(null);
      const fetchedMeetings = await electronAPI.meetings?.getAll() || [];
      setMeetings(fetchedMeetings);
    } catch (error) {
      console.error('Errore nel caricamento delle riunioni:', error);
      setError('Impossibile caricare le riunioni. Riprova più tardi.');
    } finally {
      setIsLoading(false);
    }
  }
  
  // Gestisce la creazione di una nuova riunione
  async function handleCreateMeeting() {
    if (!newMeeting.title || !newMeeting.date) {
      setError('Titolo e data sono obbligatori');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const meeting = {
        ...newMeeting,
        createdAt: new Date().toISOString()
      };
      
      await electronAPI.meetings?.save(meeting);
      
      // Resetta il form
      setNewMeeting({
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        participants: [],
      });
      setNewParticipant('');
      setIsCreating(false);
      
      // Ricarica le riunioni
      await loadMeetings();
    } catch (error) {
      console.error('Errore nella creazione della riunione:', error);
      setError('Impossibile creare la riunione. Riprova più tardi.');
    } finally {
      setIsLoading(false);
    }
  }
  
  // Gestisce l'eliminazione di una riunione
  async function handleDeleteMeeting(id: string) {
    if (!id) return;
    
    if (!confirm('Sei sicuro di voler eliminare questa riunione?')) {
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      await electronAPI.meetings?.delete(id);
      await loadMeetings();
    } catch (error) {
      console.error('Errore nell\'eliminazione della riunione:', error);
      setError('Impossibile eliminare la riunione. Riprova più tardi.');
    } finally {
      setIsLoading(false);
    }
  }
  
  // Gestisce l'aggiunta di un partecipante
  function handleAddParticipant() {
    if (!newParticipant.trim()) return;
    
    setNewMeeting({
      ...newMeeting,
      participants: [...(newMeeting.participants || []), newParticipant.trim()]
    });
    setNewParticipant('');
  }
  
  // Gestisce la rimozione di un partecipante
  function handleRemoveParticipant(index: number) {
    const updatedParticipants = [...(newMeeting.participants || [])];
    updatedParticipants.splice(index, 1);
    setNewMeeting({
      ...newMeeting,
      participants: updatedParticipants
    });
  }
  
  // Gestisce l'importazione di un file audio e la creazione di una riunione
  async function handleImportAudio() {
    try {
      setIsLoading(true);
      setError(null);
      
      // Importa il file audio
      const audioFile = await electronAPI.audioFiles?.import();
      
      if (!audioFile) {
        setError('Nessun file audio selezionato');
        setIsLoading(false);
        return;
      }
      
      // Crea una nuova riunione con il file audio
      const fileName = audioFile.fileName.replace(/\.[^/.]+$/, ''); // Rimuovi estensione
      
      const meeting = {
        title: `Riunione da ${fileName}`,
        description: `Riunione creata automaticamente da file audio ${audioFile.fileName}`,
        date: new Date().toISOString().split('T')[0],
        participants: [],
        createdAt: new Date().toISOString(),
        audioFileId: audioFile.id
      };
      
      // Salva la riunione
      const savedMeeting = await electronAPI.meetings?.save(meeting);
      
      // Aggiorna il file audio con l'ID della riunione
      if (savedMeeting && audioFile) {
        await electronAPI.audioFiles?.save({
          ...audioFile,
          meetingId: savedMeeting.id
        });
      }
      
      // Ricarica le riunioni
      await loadMeetings();
    } catch (error) {
      console.error('Errore nell\'importazione del file audio:', error);
      setError('Impossibile importare il file audio. Riprova più tardi.');
    } finally {
      setIsLoading(false);
    }
  }
  
  // Formatta una data in formato italiano
  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return format(date, 'dd MMMM yyyy', { locale: it });
  }
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-blue-600 text-white p-6 shadow-md">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold">Meetings Minuta</h1>
          <p className="text-sm mt-1 opacity-80">
            {electronAPI.appInfo?.name} v{electronAPI.appInfo?.version}
          </p>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="container mx-auto p-6 flex-1">
        {/* Azioni */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Le mie riunioni</h2>
          <div className="space-x-2">
            <button
              onClick={() => setIsCreating(true)}
              disabled={isLoading || isCreating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Nuova riunione
            </button>
            <button
              onClick={handleImportAudio}
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Importa Audio
            </button>
          </div>
        </div>
        
        {/* Messaggio di errore */}
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
            {error}
          </div>
        )}
        
        {/* Form per creare una nuova riunione */}
        {isCreating && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Crea una nuova riunione</h3>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Titolo
                </label>
                <input
                  type="text"
                  id="title"
                  value={newMeeting.title}
                  onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Titolo della riunione"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Descrizione
                </label>
                <textarea
                  id="description"
                  value={newMeeting.description}
                  onChange={(e) => setNewMeeting({ ...newMeeting, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Descrizione della riunione"
                ></textarea>
              </div>
              
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                  Data
                </label>
                <input
                  type="date"
                  id="date"
                  value={newMeeting.date}
                  onChange={(e) => setNewMeeting({ ...newMeeting, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Partecipanti
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newParticipant}
                    onChange={(e) => setNewParticipant(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Nome del partecipante"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddParticipant()}
                  />
                  <button
                    type="button"
                    onClick={handleAddParticipant}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Aggiungi
                  </button>
                </div>
                
                {/* Lista partecipanti */}
                {newMeeting.participants && newMeeting.participants.length > 0 && (
                  <div className="mt-2">
                    <ul className="space-y-1">
                      {newMeeting.participants.map((participant, index) => (
                        <li key={index} className="flex items-center justify-between bg-gray-100 px-3 py-1 rounded">
                          <span>{participant}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveParticipant(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            ✕
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={handleCreateMeeting}
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Salva
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Elenco riunioni */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Caricamento in corso...</p>
          </div>
        ) : meetings.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-500">Nessuna riunione trovata</p>
            <p className="text-gray-500 text-sm mt-2">
              Crea una nuova riunione o importa un file audio per iniziare
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {meetings.map((meeting) => (
              <div key={meeting.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800">{meeting.title}</h3>
                    <p className="text-gray-500 text-sm mt-1">{formatDate(meeting.date)}</p>
                  </div>
                  <div>
                    <button
                      onClick={() => handleDeleteMeeting(meeting.id!)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Elimina
                    </button>
                  </div>
                </div>
                
                {meeting.description && (
                  <p className="text-gray-700 mt-2">{meeting.description}</p>
                )}
                
                {meeting.participants && meeting.participants.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-gray-700">Partecipanti:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {meeting.participants.map((participant, index) => (
                        <span key={index} className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                          {participant}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {meeting.audioFileId && (
                  <div className="mt-3">
                    <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                      File audio presente
                    </span>
                  </div>
                )}
                
                {meeting.transcriptId && (
                  <div className="mt-1">
                    <span className="inline-block bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">
                      Trascrizione disponibile
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="bg-gray-800 text-white p-4 text-center text-sm">
        © 2024 - Meetings Minuta
      </footer>
    </div>
  );
};

export default App; 