import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import Modal from 'react-modal';

// Interfaccia per le API di Electron
interface ElectronAPI {
  meetings?: {
    getById: (id: string) => Promise<Meeting>;
  };
  audioFiles?: {
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
    maxWidth: '800px',
    width: '90%',
    border: 'none',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 1000
  }
};

interface TranscriptionViewProps {
  meetingId: string;
  onBack: () => void;
}

const TranscriptionView: React.FC<TranscriptionViewProps> = ({ meetingId, onBack }) => {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [audioFile, setAudioFile] = useState<AudioFile | null>(null);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [activeTranscript, setActiveTranscript] = useState<Transcript | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [highlightedText, setHighlightedText] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFullTextModalOpen, setIsFullTextModalOpen] = useState(false);
  
  const transcriptTextRef = useRef<HTMLDivElement>(null);
  
  // Carica i dati all'avvio
  useEffect(() => {
    loadData();
  }, [meetingId]);
  
  // Carica i dati necessari
  async function loadData() {
    try {
      setIsLoading(true);
      
      // Carica la riunione
      const meetingData = await electronAPI.meetings?.getById(meetingId);
      if (meetingData) {
        setMeeting(meetingData);
      }
      
      // Carica il file audio
      const audioFileData = await electronAPI.audioFiles?.getByMeetingId(meetingId);
      if (audioFileData) {
        setAudioFile(audioFileData);
      }
      
      // Carica le trascrizioni
      const transcriptData = await electronAPI.transcripts?.getByMeetingId(meetingId);
      if (transcriptData && transcriptData.length > 0) {
        setTranscripts(transcriptData);
        
        // Seleziona la trascrizione più recente completata
        const completedTranscripts = transcriptData.filter(t => t.status === 'completed');
        if (completedTranscripts.length > 0) {
          setActiveTranscript(completedTranscripts[0]);
        } else {
          setActiveTranscript(transcriptData[0]);
        }
      }
    } catch (error) {
      console.error('Errore nel caricamento dei dati:', error);
      toast.error('Impossibile caricare i dati della trascrizione');
    } finally {
      setIsLoading(false);
    }
  }
  
  // Avvia la trascrizione
  async function startTranscription() {
    if (!audioFile || !audioFile.id) {
      toast.error('Nessun file audio disponibile per la trascrizione');
      return;
    }
    
    try {
      setIsTranscribing(true);
      const transcript = await electronAPI.transcripts?.startTranscription(audioFile.id);
      
      if (transcript) {
        toast.success('Trascrizione avviata con successo');
        
        // Aggiorna la lista delle trascrizioni
        setTranscripts(prev => [transcript, ...prev]);
        setActiveTranscript(transcript);
        
        // Controlla lo stato ogni 5 secondi
        const intervalId = setInterval(async () => {
          const updatedTranscripts = await electronAPI.transcripts?.getByMeetingId(meetingId);
          if (updatedTranscripts) {
            setTranscripts(updatedTranscripts);
            
            // Aggiorna la trascrizione attiva
            const updatedTranscript = updatedTranscripts.find(t => t.id === transcript.id);
            if (updatedTranscript) {
              setActiveTranscript(updatedTranscript);
              
              // Se la trascrizione è completata o in errore, ferma il polling
              if (updatedTranscript.status === 'completed' || updatedTranscript.status === 'error') {
                clearInterval(intervalId);
                setIsTranscribing(false);
                
                if (updatedTranscript.status === 'completed') {
                  toast.success('Trascrizione completata con successo');
                } else if (updatedTranscript.status === 'error') {
                  toast.error('Errore durante la trascrizione');
                }
              }
            }
          }
        }, 5000);
        
        // Pulisci l'intervallo quando il componente viene smontato
        return () => clearInterval(intervalId);
      }
    } catch (error) {
      console.error('Errore nell\'avvio della trascrizione:', error);
      toast.error('Impossibile avviare la trascrizione');
    } finally {
      setIsTranscribing(false);
    }
  }
  
  // Formatta la data
  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('it-IT');
  }
  
  // Evidenzia il testo cercato
  function highlightSearchTerm(text: string, term: string): JSX.Element {
    if (!term.trim()) return <>{text}</>;
    
    const parts = text.split(new RegExp(`(${term})`, 'gi'));
    
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === term.toLowerCase() ? 
            <mark key={i} className="bg-[#ffec99] text-gray-900 px-1 rounded">{part}</mark> : 
            part
        )}
      </>
    );
  }
  
  // Cerca nel testo
  function searchInTranscript() {
    if (!searchTerm.trim() || !activeTranscript?.text) return;
    
    const text = activeTranscript.text;
    const lowerSearchTerm = searchTerm.toLowerCase();
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes(lowerSearchTerm)) {
      // Trova l'indice della prima occorrenza
      const index = lowerText.indexOf(lowerSearchTerm);
      
      // Estrai il contesto (50 caratteri prima e dopo)
      const start = Math.max(0, index - 50);
      const end = Math.min(text.length, index + searchTerm.length + 50);
      const context = text.substring(start, end);
      
      setHighlightedText(context);
      
      // Scorri alla posizione
      if (transcriptTextRef.current) {
        const textContent = transcriptTextRef.current.textContent || '';
        const textIndex = textContent.toLowerCase().indexOf(lowerSearchTerm);
        
        if (textIndex !== -1) {
          const range = document.createRange();
          const textNode = Array.from(transcriptTextRef.current.childNodes).find(
            node => node.nodeType === Node.TEXT_NODE && 
            (node.textContent || '').toLowerCase().includes(lowerSearchTerm)
          );
          
          if (textNode) {
            const nodeText = textNode.textContent || '';
            const nodeTextLower = nodeText.toLowerCase();
            const termIndex = nodeTextLower.indexOf(lowerSearchTerm);
            
            range.setStart(textNode, termIndex);
            range.setEnd(textNode, termIndex + searchTerm.length);
            
            const selection = window.getSelection();
            if (selection) {
              selection.removeAllRanges();
              selection.addRange(range);
              
              // Scorri alla selezione
              const mark = document.querySelector('mark');
              if (mark) {
                mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }
          }
        }
      }
    } else {
      setHighlightedText(null);
      toast.error('Testo non trovato');
    }
  }
  
  // Gestisce il tasto invio nella ricerca
  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      searchInTranscript();
    }
  }
  
  // Ottieni lo stato della trascrizione
  function getTranscriptionStatus(status: string): JSX.Element {
    switch (status) {
      case 'queued':
        return (
          <span className="inline-flex items-center bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            In coda
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center bg-[#f0eafb] text-[#7a5cf0] px-2 py-1 rounded-full text-xs">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            In elaborazione
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center bg-[#e6f7f5] text-[#38b2ac] px-2 py-1 rounded-full text-xs">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Completata
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center bg-red-50 text-red-700 px-2 py-1 rounded-full text-xs">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Errore
          </span>
        );
      default:
        return <span className="text-gray-500 text-xs">Sconosciuto</span>;
    }
  }
  
  return (
    <div className="h-full flex flex-col">
      {/* Intestazione */}
      <div className="flex items-center justify-between mb-6 pt-2 pb-4 border-b border-gray-200">
        <div className="flex items-center">
          <button
            onClick={onBack}
            className="mr-4 text-gray-600 hover:text-gray-800 transition-colors p-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              {meeting ? meeting.title : 'Caricamento...'}
            </h2>
            {meeting && (
              <p className="text-gray-500 text-sm">{meeting.date}</p>
            )}
          </div>
        </div>
        
        <div className="flex space-x-3">
          {audioFile && (
            <button
              onClick={startTranscription}
              disabled={isTranscribing || isLoading}
              className="px-4 py-2 bg-[#7a5cf0] text-white rounded-md hover:bg-[#6146d9] transition-colors disabled:opacity-50 shadow-sm flex items-center text-sm"
            >
              {isTranscribing ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              )}
              {isTranscribing ? 'Trascrivendo...' : 'Trascrivi Audio'}
            </button>
          )}
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#7a5cf0]"></div>
          <p className="text-gray-500 ml-3">Caricamento in corso...</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="lg:w-1/4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
              <h3 className="text-md font-medium text-gray-800 mb-4">Informazioni</h3>
              
              {audioFile && (
                <div className="mb-4 pb-4 border-b border-gray-100">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">File Audio</h4>
                  <div className="flex items-center space-x-2 bg-[#f0eafb] p-3 rounded-md">
                    <div className="rounded-full bg-[#e0d8f5] p-2 flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#7a5cf0]" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{audioFile.fileName}</p>
                      <p className="text-xs text-gray-500">
                        {Math.round(audioFile.fileSize / 1024 / 1024 * 100) / 100} MB
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Trascrizioni disponibili</h4>
                {transcripts.length === 0 ? (
                  <p className="text-sm text-gray-500">Nessuna trascrizione disponibile</p>
                ) : (
                  <div className="space-y-3">
                    {transcripts.map((transcript) => (
                      <div 
                        key={transcript.id}
                        onClick={() => setActiveTranscript(transcript)}
                        className={`cursor-pointer p-3 rounded-md border transition-colors ${
                          activeTranscript?.id === transcript.id 
                            ? 'border-[#7a5cf0] bg-[#f5f2ff]' 
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-gray-800">
                            Trascrizione #{transcripts.length - transcripts.indexOf(transcript)}
                          </span>
                          {getTranscriptionStatus(transcript.status)}
                        </div>
                        <p className="text-xs text-gray-500">
                          Creata il {formatDate(transcript.createdAt)}
                        </p>
                        {transcript.completedAt && (
                          <p className="text-xs text-gray-500">
                            Completata il {formatDate(transcript.completedAt)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Contenuto principale */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 h-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-800">
                  {activeTranscript ? 'Trascrizione' : 'Nessuna trascrizione selezionata'}
                </h3>
                
                {activeTranscript?.status === 'completed' && activeTranscript.text && (
                  <div className="flex space-x-2">
                    <div className="relative">
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        placeholder="Cerca nel testo..."
                        className="px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#7a5cf0] focus:border-[#7a5cf0] text-sm"
                      />
                      <button
                        onClick={searchInTranscript}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-[#7a5cf0]"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </button>
                    </div>
                    
                    <button 
                      onClick={() => setIsFullTextModalOpen(true)}
                      className="text-[#7a5cf0] hover:text-[#6146d9] transition-colors flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              
              {activeTranscript ? (
                activeTranscript.status === 'completed' && activeTranscript.text ? (
                  <div>
                    {highlightedText && (
                      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-yellow-800">Risultato della ricerca:</span>
                          <button 
                            onClick={() => setHighlightedText(null)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <p className="text-sm text-gray-800">
                          {highlightSearchTerm(highlightedText, searchTerm)}
                        </p>
                      </div>
                    )}
                    
                    <div 
                      ref={transcriptTextRef}
                      className="prose prose-sm max-w-none text-gray-800 overflow-y-auto max-h-[600px] p-1"
                    >
                      {searchTerm && searchTerm.trim() 
                        ? highlightSearchTerm(activeTranscript.text, searchTerm)
                        : activeTranscript.text}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64">
                    {activeTranscript.status === 'processing' ? (
                      <>
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#7a5cf0] mb-4"></div>
                        <p className="text-gray-500 text-center">Trascrizione in corso...</p>
                        <p className="text-gray-400 text-sm text-center mt-2">Questo processo potrebbe richiedere qualche minuto</p>
                      </>
                    ) : activeTranscript.status === 'queued' ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-gray-500 text-center">Trascrizione in coda</p>
                        <p className="text-gray-400 text-sm text-center mt-2">La trascrizione verrà elaborata a breve</p>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p className="text-gray-500 text-center">Si è verificato un errore durante la trascrizione</p>
                        <p className="text-gray-400 text-sm text-center mt-2">Riprova più tardi o contatta l'assistenza</p>
                      </>
                    )}
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center h-64">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  {audioFile ? (
                    <>
                      <p className="text-gray-500 text-center">Nessuna trascrizione disponibile</p>
                      <button
                        onClick={startTranscription}
                        disabled={isTranscribing}
                        className="mt-4 px-4 py-2 bg-[#7a5cf0] text-white rounded-md hover:bg-[#6146d9] transition-colors disabled:opacity-50 shadow-sm flex items-center text-sm"
                      >
                        {isTranscribing ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                          </svg>
                        )}
                        {isTranscribing ? 'Trascrivendo...' : 'Trascrivi Audio'}
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-500 text-center">Nessun file audio disponibile</p>
                      <p className="text-gray-400 text-sm text-center mt-2">Importa un file audio per poter eseguire la trascrizione</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Modale per visualizzare il testo completo */}
      <Modal
        isOpen={isFullTextModalOpen}
        onRequestClose={() => setIsFullTextModalOpen(false)}
        style={customModalStyles}
        contentLabel="Testo completo della trascrizione"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Testo completo della trascrizione</h2>
          <button 
            onClick={() => setIsFullTextModalOpen(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        
        <div className="max-h-[70vh] overflow-y-auto bg-gray-50 p-4 rounded-md">
          {activeTranscript?.text && (
            <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800">
              {searchTerm && searchTerm.trim() 
                ? highlightSearchTerm(activeTranscript.text, searchTerm)
                : activeTranscript.text}
            </pre>
          )}
        </div>
        
        <div className="flex justify-end mt-4">
          <button
            onClick={() => setIsFullTextModalOpen(false)}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors shadow-sm"
          >
            Chiudi
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default TranscriptionView; 