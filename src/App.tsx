import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import toast, { Toaster } from 'react-hot-toast';
import Modal from 'react-modal';
import TranscriptionView from './components/TranscriptionView';
import SettingsView from './components/SettingsView';
import MonitoringView from './components/MonitoringView';
import './notes.css';

// Stile personalizzato per i pulsanti disabilitati
import './buttonStyles.css';

// Inizializza react-modal
try {
  Modal.setAppElement('#root');
} catch (error) {
  console.error('Errore nell\'inizializzazione di Modal:', error);
  // Fallback se #root non è disponibile
  try {
    Modal.setAppElement('body');
  } catch (error) {
    console.error('Fallback fallito:', error);
  }
}

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
    save: (audioFile: any) => Promise<AudioFile>;
  };
  transcripts?: {
    getByMeetingId: (meetingId: string) => Promise<Transcript[]>;
    startTranscription: (audioFileId: string) => Promise<Transcript>;
  };
  onNewMeetingCreated?: (handler: (meeting: Meeting) => void) => void;
  onTranscriptionStatusUpdate?: (handler: (transcript: Transcript) => void) => void;
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

// Stile custom per i modali
const customModalStyles = {
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '500px',
    width: '90%',
    border: 'none',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 1000
  }
};

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
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; meetingId?: string }>({
    isOpen: false,
    meetingId: undefined
  });
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'transcription' | 'settings' | 'monitoring'>('list');
  
  // Carica le riunioni all'avvio
  useEffect(() => {
    loadMeetings();
    
    // Registra gli handler per gli eventi dal main process
    const unsubscribeNewMeeting = electronAPI.onNewMeetingCreated?.(handleNewMeetingCreated);
    const unsubscribeTranscriptionUpdate = electronAPI.onTranscriptionStatusUpdate?.(handleTranscriptionStatusUpdate);
    
    // Cleanup
    return () => {
      if (typeof unsubscribeNewMeeting === 'function') unsubscribeNewMeeting();
      if (typeof unsubscribeTranscriptionUpdate === 'function') unsubscribeTranscriptionUpdate();
    };
  }, []);
  
  // Carica le riunioni dal database
  async function loadMeetings() {
    try {
      setIsLoading(true);
      const fetchedMeetings = await electronAPI.meetings?.getAll() || [];
      setMeetings(fetchedMeetings);
    } catch (error) {
      console.error('Errore nel caricamento delle riunioni:', error);
      toast.error('Impossibile caricare le riunioni');
    } finally {
      setIsLoading(false);
    }
  }
  
  // Gestisce la creazione di una nuova riunione
  async function handleCreateMeeting() {
    if (!newMeeting.title || !newMeeting.date) {
      toast.error('Titolo e data sono obbligatori');
      return;
    }
    
    try {
      setIsLoading(true);
      
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
      
      // Notifica successo
      toast.success('Riunione creata con successo');
    } catch (error) {
      console.error('Errore nella creazione della riunione:', error);
      toast.error('Impossibile creare la riunione');
    } finally {
      setIsLoading(false);
    }
  }
  
  // Apre il modale di conferma eliminazione
  function confirmDeleteMeeting(id: string) {
    setDeleteModal({
      isOpen: true,
      meetingId: id
    });
  }
  
  // Gestisce l'eliminazione di una riunione
  async function handleDeleteMeeting() {
    if (!deleteModal.meetingId) return;
    
    try {
      setIsLoading(true);
      await electronAPI.meetings?.delete(deleteModal.meetingId);
      
      // Chiudi il modale
      setDeleteModal({ isOpen: false, meetingId: undefined });
      
      // Ricarica le riunioni
      await loadMeetings();
      
      // Notifica successo
      toast.success('Riunione eliminata con successo');
    } catch (error) {
      console.error('Errore nell\'eliminazione della riunione:', error);
      toast.error('Impossibile eliminare la riunione');
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
      
      // Importa il file audio
      const audioFile = await electronAPI.audioFiles?.import();
      
      if (!audioFile) {
        toast.error('Nessun file audio selezionato');
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
      
      // Notifica successo
      toast.success('File audio importato con successo');
    } catch (error) {
      console.error('Errore nell\'importazione del file audio:', error);
      toast.error('Impossibile importare il file audio');
    } finally {
      setIsLoading(false);
    }
  }
  
  // Formatta una data in formato italiano
  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return format(date, 'dd MMMM yyyy', { locale: it });
  }
  
  // Handler per nuove riunioni create dal main process
  function handleNewMeetingCreated(meeting: Meeting) {
    // Aggiorna la lista delle riunioni senza ricaricare tutto
    setMeetings(prevMeetings => [meeting, ...prevMeetings]);
    
    // Notifica l'utente
    toast.success('Nuova riunione creata da file audio monitorato', {
      duration: 5000,
      icon: '🎙️'
    });
  }
  
  // Handler per aggiornamenti dello stato della trascrizione
  function handleTranscriptionStatusUpdate(transcript: Transcript) {
    // Se la trascrizione è stata completata, notifica l'utente
    if (transcript.status === 'completed') {
      // Trova la riunione associata
      const meeting = meetings.find(m => m.id === transcript.meetingId);
      
      // Notifica l'utente
      toast.success(`Trascrizione completata: ${meeting?.title || 'Riunione'}`, {
        duration: 5000,
        icon: '📝'
      });
      
      // Aggiorna le riunioni se necessario
      if (meeting && !meeting.transcriptId) {
        const updatedMeeting = { ...meeting, transcriptId: transcript.id };
        
        // Aggiorna la riunione nel database
        electronAPI.meetings?.save(updatedMeeting);
        
        // Aggiorna lo stato locale
        setMeetings(prevMeetings => 
          prevMeetings.map(m => m.id === meeting.id ? updatedMeeting : m)
        );
      }
    }
  }
  
  // Gestisce il clic su una riunione per vedere le trascrizioni
  function handleViewTranscription(meetingId: string) {
    setSelectedMeetingId(meetingId);
    setView('transcription');
  }
  
  // Torna alla lista delle riunioni
  function handleBackToList() {
    setSelectedMeetingId(null);
    setView('list');
  }
  
  // Vai alle impostazioni
  function handleGoToSettings() {
    setView('settings');
  }
  
  // Aggiungi un gestore per la vista di monitoraggio
  function handleViewMonitoring() {
    setView('monitoring');
  }
  
  return (
    <div className="flex flex-col min-h-screen bg-[#f8f9fa]">
      {/* Toast container */}
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: '8px',
            background: '#FFF',
            color: '#333',
            boxShadow: '0 3px 10px rgba(0, 0, 0, 0.1)',
            padding: '12px 16px',
          },
          success: {
            iconTheme: {
              primary: '#10B981',
              secondary: '#FFFFFF',
            },
            style: {
              borderLeft: '3px solid #10B981',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#FFFFFF',
            },
            style: {
              borderLeft: '3px solid #EF4444',
            },
          },
        }}
      />
      
      {/* Desktop App Menu Bar */}
      <div className="bg-white border-b border-gray-200 py-3 px-4 flex items-center justify-between">
        {/* Left: App Icon/Logo */}
        <div className="flex items-center">
          <div className="flex items-center text-[#7a5cf0]">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
            <span className="ml-2 font-semibold text-gray-800">Meetings Minuta</span>
          </div>
        </div>
        
        {/* Center: Search (non-functional placeholder) */}
        <div className="max-w-md w-full mx-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Cerca nelle riunioni..."
              className="w-full bg-gray-50 border border-gray-200 rounded-md pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#7a5cf0] focus:border-[#7a5cf0]"
              disabled
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
        
        {/* Right: Settings and Profile */}
        <div className="flex items-center space-x-3">
          <button 
            onClick={handleGoToSettings}
            className="rounded-full bg-gray-100 p-2 text-gray-600 hover:bg-gray-200 transition-colors"
            title="Impostazioni"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          </button>
          
          <button className="rounded-full bg-gray-100 p-2 text-gray-600 hover:bg-gray-200 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Contenuto principale in base alla vista */}
      <div className="flex flex-1">
        {/* Sidebar (mostrata nella vista lista e monitoraggio) */}
        {(view === 'list' || view === 'monitoring') && (
          <div className="w-64 bg-white border-r border-gray-200 h-screen p-4">
            <div className="space-y-2">
              <button
                onClick={() => setView('list')}
                className={`flex items-center p-3 rounded-md w-full ${
                  view === 'list' ? 'bg-[#7a5cf0] text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span>Riunioni</span>
              </button>
              
              <button
                onClick={handleViewMonitoring}
                className={`flex items-center p-3 rounded-md w-full ${
                  view === 'monitoring' ? 'bg-[#7a5cf0] text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
                <span>Monitoraggio</span>
              </button>
              
              <button
                onClick={handleGoToSettings}
                className={`flex items-center p-3 rounded-md w-full ${
                  view === 'settings' ? 'bg-[#7a5cf0] text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Impostazioni</span>
              </button>
            </div>
          </div>
        )}
        
        {/* Vista principale delle riunioni */}
        {view === 'list' && (
          <main className="max-w-4xl mx-auto p-6 w-full flex-1">
            {/* Azioni */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Le mie riunioni</h2>
              <div className="space-x-3">
                <button
                  onClick={() => setIsCreating(true)}
                  disabled={isLoading || isCreating}
                  className="px-4 py-2 bg-[#7a5cf0] text-white rounded-md hover:bg-[#6146d9] transition-colors disabled:opacity-50 disabled:text-gray-800 text-sm font-medium shadow-sm"
                >
                  Nuova riunione
                </button>
                <button
                  onClick={handleImportAudio}
                  disabled={isLoading}
                  className="px-4 py-2 bg-[#38b2ac] text-white rounded-md hover:bg-[#319795] transition-colors disabled:opacity-50 disabled:text-gray-800 text-sm font-medium shadow-sm"
                >
                  Importa Audio
                </button>
              </div>
            </div>
            
            {/* Form per creare una nuova riunione */}
            {isCreating && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-5 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#7a5cf0] mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Crea una nuova riunione
                </h3>
                
                <div className="space-y-5">
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                      Titolo
                    </label>
                    <input
                      type="text"
                      id="title"
                      value={newMeeting.title}
                      onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#7a5cf0] focus:border-[#7a5cf0]"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#7a5cf0] focus:border-[#7a5cf0]"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#7a5cf0] focus:border-[#7a5cf0]"
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
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#7a5cf0] focus:border-[#7a5cf0]"
                        placeholder="Nome del partecipante"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddParticipant()}
                      />
                      <button
                        type="button"
                        onClick={handleAddParticipant}
                        className="px-4 py-2 bg-[#7a5cf0] text-white rounded-md hover:bg-[#6146d9] transition-colors shadow-sm flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        Aggiungi
                      </button>
                    </div>
                    
                    {/* Lista partecipanti */}
                    {newMeeting.participants && newMeeting.participants.length > 0 && (
                      <div className="mt-3">
                        <ul className="space-y-2">
                          {newMeeting.participants.map((participant, index) => (
                            <li key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md border border-gray-100">
                              <span className="text-gray-700">{participant}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveParticipant(index)}
                                className="text-gray-400 hover:text-red-600 transition-colors"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setIsCreating(false)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors shadow-sm"
                    >
                      Annulla
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateMeeting}
                      disabled={isLoading}
                      className="px-4 py-2 bg-[#7a5cf0] text-white rounded-md hover:bg-[#6146d9] transition-colors disabled:opacity-50 disabled:text-gray-800 shadow-sm"
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
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#7a5cf0]"></div>
                <p className="text-gray-500 mt-3">Caricamento in corso...</p>
              </div>
            ) : meetings.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <p className="text-gray-500 text-lg">Nessuna riunione trovata</p>
                <p className="text-gray-500 text-sm mt-2 mb-6">
                  Crea una nuova riunione o importa un file audio per iniziare
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-700 mb-3">Prossime riunioni</h3>
                {meetings.map((meeting) => (
                  <div 
                    key={meeting.id} 
                    className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 hover:shadow transition-shadow cursor-pointer"
                    onClick={() => handleViewTranscription(meeting.id!)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-start space-x-4">
                        <div className="rounded-full bg-[#f0eafb] p-3 mt-1 flex-shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#7a5cf0]" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900">{meeting.title}</h3>
                          <p className="text-gray-500 text-sm">{formatDate(meeting.date)}</p>
                          
                          {meeting.description && (
                            <p className="text-gray-700 mt-2 text-sm line-clamp-2">{meeting.description}</p>
                          )}
                          
                          {meeting.participants && meeting.participants.length > 0 && (
                            <div className="mt-3">
                              <div className="flex flex-wrap gap-1 mt-1">
                                {meeting.participants.map((participant, index) => (
                                  <span key={index} className="inline-block bg-[#eeedfd] text-[#7a5cf0] px-2 py-1 rounded-full text-xs">
                                    {participant}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <div className="flex mt-3 space-x-2">
                            {meeting.audioFileId && (
                              <span className="inline-flex items-center bg-[#e6f7f5] text-[#38b2ac] px-2 py-1 rounded-full text-xs">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                </svg>
                                File audio presente
                              </span>
                            )}
                            
                            {meeting.transcriptId && (
                              <span className="inline-flex items-center bg-[#f0eafb] text-[#7a5cf0] px-2 py-1 rounded-full text-xs">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                </svg>
                                Trascrizione disponibile
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmDeleteMeeting(meeting.id!);
                          }}
                          className="text-gray-400 hover:text-red-600 transition-colors p-1"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        )}
        
        {/* Vista trascrizione */}
        {view === 'transcription' && selectedMeetingId && (
          <TranscriptionView meetingId={selectedMeetingId} onBack={handleBackToList} />
        )}
        
        {/* Vista impostazioni */}
        {view === 'settings' && (
          <SettingsView onBack={handleBackToList} />
        )}
        
        {/* Vista di monitoraggio */}
        {view === 'monitoring' && (
          <MonitoringView onBack={handleBackToList} />
        )}
      </div>
      
      {/* Modale di conferma eliminazione */}
      <Modal
        isOpen={deleteModal.isOpen}
        onRequestClose={() => setDeleteModal({ isOpen: false, meetingId: undefined })}
        style={customModalStyles}
        contentLabel="Conferma eliminazione"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Conferma eliminazione</h2>
          <button 
            onClick={() => setDeleteModal({ isOpen: false, meetingId: undefined })}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        
        <div className="flex items-center space-x-4 mb-6 bg-red-50 p-4 rounded-lg">
          <div className="rounded-full bg-red-100 p-2 flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <p className="text-gray-700">Sei sicuro di voler eliminare questa riunione?</p>
            <p className="text-gray-500 text-sm mt-1">Questa operazione non può essere annullata.</p>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => setDeleteModal({ isOpen: false, meetingId: undefined })}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors shadow-sm"
          >
            Annulla
          </button>
          <button
            onClick={handleDeleteMeeting}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors shadow-sm"
          >
            Elimina
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default App; 