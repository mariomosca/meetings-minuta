import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

// Interfaccia per le API di Electron
interface ElectronAPI {
  audioFiles?: {
    getAll: () => Promise<AudioFile[]>;
  };
  transcripts?: {
    getAll: () => Promise<Transcript[]>;
    startTranscription: (audioFileId: string) => Promise<Transcript>;
  };
  fileWatcher?: {
    isActive: () => Promise<boolean>;
    startWatching: (directoryPath?: string) => Promise<{ success: boolean; directory?: string; error?: string }>;
    stopWatching: () => Promise<{ success: boolean; error?: string }>;
  };
  config?: {
    getWatchDirectories: () => Promise<string[]>;
  };
  events?: {
    on: (channel: string, callback: (...args: any[]) => void) => void;
    off: (channel: string, callback: (...args: any[]) => void) => void;
  };
}

// Interfaccia per il file audio
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

// Interfaccia per la trascrizione
interface Transcript {
  id: string;
  meetingId: string;
  audioFileId?: string;
  status: 'queued' | 'processing' | 'completed' | 'error';
  text?: string;
  createdAt: string;
  completedAt?: string;
}

// Accesso alle API esposte dal preload
const electronAPI = (window as any).electronAPI as ElectronAPI;

interface MonitoringViewProps {
  onBack: () => void;
}

const MonitoringView: React.FC<MonitoringViewProps> = ({ onBack }) => {
  const { t } = useTranslation();
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [isWatching, setIsWatching] = useState<boolean>(false);
  const [watchDirectory, setWatchDirectory] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [logs, setLogs] = useState<{ message: string; timestamp: string }[]>([]);

  // Carica i dati all'avvio
  useEffect(() => {
    loadData();
    
    // Registra listener per gli eventi
    setupEventListeners();
    
    return () => {
      // Rimuovi listener quando il componente viene smontato
      removeEventListeners();
    };
  }, []);
  
  // Configura i listener per gli eventi
  const setupEventListeners = () => {
    if (electronAPI.events) {
      electronAPI.events.on('directory:filesChanged', handleFileChanged);
      electronAPI.events.on('transcript:statusChanged', handleTranscriptStatusChanged);
    }
  };
  
  // Rimuovi i listener per gli eventi
  const removeEventListeners = () => {
    if (electronAPI.events) {
      electronAPI.events.off('directory:filesChanged', handleFileChanged);
      electronAPI.events.off('transcript:statusChanged', handleTranscriptStatusChanged);
    }
  };
  
  // Gestisce l'evento di cambio file
  const handleFileChanged = (data: any) => {
    addLog(`File ${data.type === 'add' ? 'rilevato' : 'errore'}: ${data.file?.fileName || data.error || ''}`);
    
    // Ricarica i file audio se è stato aggiunto un nuovo file
    if (data.type === 'add') {
      loadAudioFiles();
    }
  };
  
  // Gestisce l'evento di cambio stato della trascrizione
  const handleTranscriptStatusChanged = (transcript: Transcript) => {
    addLog(`Trascrizione ${transcript.id} aggiornata: ${transcript.status}`);
    
    // Aggiorna la lista delle trascrizioni
    setTranscripts(prev => {
      const index = prev.findIndex(t => t.id === transcript.id);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = transcript;
        return updated;
      } else {
        return [...prev, transcript];
      }
    });
  };
  
  // Aggiunge un messaggio ai log
  const addLog = (message: string) => {
    setLogs(prev => [
      { message, timestamp: new Date().toISOString() },
      ...prev.slice(0, 99) // Mantieni solo gli ultimi 100 log
    ]);
  };

  // Carica tutti i dati
  const loadData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadAudioFiles(),
        loadTranscripts(),
        loadWatchingStatus()
      ]);
    } catch (error) {
      console.error('Errore nel caricamento dei dati:', error);
      toast.error('Impossibile caricare i dati');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Carica i file audio
  const loadAudioFiles = async () => {
    try {
      if (electronAPI.audioFiles) {
        const files = await electronAPI.audioFiles.getAll();
        setAudioFiles(files);
      }
    } catch (error) {
      console.error('Errore nel caricamento dei file audio:', error);
    }
  };
  
  // Carica le trascrizioni
  const loadTranscripts = async () => {
    try {
      if (electronAPI.transcripts) {
        const transcripts = await electronAPI.transcripts.getAll();
        setTranscripts(transcripts);
      }
    } catch (error) {
      console.error('Errore nel caricamento delle trascrizioni:', error);
    }
  };
  
  // Carica lo stato del monitoraggio
  const loadWatchingStatus = async () => {
    try {
      if (electronAPI.fileWatcher && electronAPI.config) {
        const isActive = await electronAPI.fileWatcher.isActive();
        setIsWatching(isActive);
        
        const directories = await electronAPI.config.getWatchDirectories();
        if (directories.length > 0) {
          setWatchDirectory(directories[0]);
        }
      }
    } catch (error) {
      console.error('Errore nel caricamento dello stato del monitoraggio:', error);
    }
  };
  
  // Avvia/ferma il monitoraggio
  const toggleWatching = async () => {
    try {
      if (!electronAPI.fileWatcher) {
        toast.error('API FileWatcher non disponibile');
        return;
      }
      
      if (isWatching) {
        // Ferma il monitoraggio
        const result = await electronAPI.fileWatcher.stopWatching();
        
        if (result.success) {
          setIsWatching(false);
          addLog('Monitoraggio fermato');
          toast.success('Monitoraggio fermato');
        } else if (result.error) {
          toast.error(result.error);
        }
      } else {
        // Verifica che ci sia una directory da monitorare
        if (!watchDirectory) {
          toast.error('Seleziona una directory prima di attivare il monitoraggio');
          return;
        }
        
        // Avvia il monitoraggio
        const result = await electronAPI.fileWatcher.startWatching(watchDirectory);
        
        if (result.success) {
          setIsWatching(true);
          addLog(`Monitoraggio avviato: ${result.directory}`);
          toast.success('Monitoraggio avviato');
        } else if (result.error) {
          toast.error(result.error);
        }
      }
    } catch (error) {
      console.error('Errore nel toggle del monitoraggio:', error);
      toast.error('Errore nel cambiare lo stato del monitoraggio');
    }
  };
  
  // Avvia la trascrizione di un file audio
  const startTranscription = async (audioFileId: string) => {
    try {
      if (!electronAPI.transcripts) {
        toast.error('API Transcripts non disponibile');
        return;
      }
      
      // Verifica se la trascrizione esiste già
      const existingTranscript = transcripts.find(t => t.audioFileId === audioFileId);
      if (existingTranscript && existingTranscript.status !== 'error') {
        toast.error('Trascrizione già in corso o completata');
        return;
      }
      
      // Avvia la trascrizione
      const transcript = await electronAPI.transcripts.startTranscription(audioFileId);
      
      // Aggiorna la lista delle trascrizioni
      setTranscripts(prev => {
        const index = prev.findIndex(t => t.id === transcript.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = transcript;
          return updated;
        } else {
          return [...prev, transcript];
        }
      });
      
      addLog(`Trascrizione avviata per il file ${audioFileId}`);
      toast.success('Trascrizione avviata');
    } catch (error) {
      console.error('Errore nell\'avvio della trascrizione:', error);
      toast.error('Impossibile avviare la trascrizione');
    }
  };
  
  // Formatta la dimensione del file in modo leggibile
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };
  
  // Formatta la data in modo leggibile
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };
  
  // Ottieni lo stato della trascrizione per un file audio
  const getTranscriptionStatus = (audioFileId: string): JSX.Element => {
    const transcript = transcripts.find(t => t.audioFileId === audioFileId);
    
    if (!transcript) {
      return (
        <button
          onClick={() => startTranscription(audioFileId)}
          className="px-3 py-1 text-sm bg-[#7a5cf0] text-white rounded hover:bg-[#6146d9] transition-colors disabled:bg-gray-300 disabled:text-gray-800"
        >
          {t('transcription.start')}
        </button>
      );
    }
    
    switch (transcript.status) {
      case 'queued':
        return (
          <span className="flex items-center">
            <span className="inline-block w-2 h-2 rounded-full bg-yellow-500 mr-2 animate-pulse"></span>
            <span className="text-yellow-700">{t('transcription.status.queued')}</span>
          </span>
        );
      case 'processing':
        return (
          <span className="flex items-center">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2 animate-pulse"></span>
            <span className="text-blue-700">{t('transcription.status.processing')}</span>
          </span>
        );
      case 'completed':
        return (
          <span className="flex items-center">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>
            <span className="text-green-700">{t('transcription.status.completed')}</span>
          </span>
        );
      case 'error':
        return (
          <div className="flex items-center space-x-2">
            <span className="flex items-center">
              <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-2"></span>
              <span className="text-red-700">{t('transcription.status.error')}</span>
            </span>
            <button
              onClick={() => startTranscription(audioFileId)}
              className="px-2 py-1 text-xs bg-[#7a5cf0] text-white rounded hover:bg-[#6146d9] transition-colors disabled:bg-gray-300 disabled:text-gray-800"
            >
              {t('common.retry')}
            </button>
          </div>
        );
      default:
        return <span className="text-gray-500">{t('transcription.status.unknown')}</span>;
    }
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-auto">
      {/* Intestazione */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
        <div className="flex items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">{t('monitoring.title')}</h2>
            <p className="text-gray-500 text-sm">{t('monitoring.subtitle')}</p>
          </div>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#7a5cf0]"></div>
          <p className="text-gray-500 ml-3">{t('common.loading')}</p>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sezione stato monitoraggio */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">{t('monitoring.status')}</h3>
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className={`inline-block w-3 h-3 rounded-full mr-2 ${
                      isWatching ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                    }`}></span>
                    <span className="text-sm text-gray-600">
                      {isWatching ? t('monitoring.active') : t('monitoring.inactive')}
                    </span>
                  </div>
                  
                  <button
                    type="button"
                    onClick={toggleWatching}
                    className={`px-4 py-2 rounded-md text-white shadow-sm text-sm font-medium transition-colors ${
                      isWatching 
                        ? 'bg-[#ef4444] hover:bg-[#dc2626]' 
                        : 'bg-[#38b2ac] hover:bg-[#319795]'
                    }`}
                  >
                    {isWatching ? t('monitoring.stopWatching') : t('monitoring.startWatching')}
                  </button>
                </div>
              </div>
              
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1">{t('monitoring.directoryPath')}</div>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-gray-800 text-sm">
                  {watchDirectory || t('settings.monitoring.noDirectory')}
                </div>
              </div>
              
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1">{t('monitoring.detectedFiles')}</div>
                <div className="text-xl font-semibold text-[#7a5cf0]">{audioFiles.length}</div>
              </div>
              
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1">{t('transcription.title')}</div>
                <div className="text-xl font-semibold text-[#7a5cf0]">{transcripts.length}</div>
              </div>
            </div>
          </div>
          
          {/* Sezione log */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">{t('monitoring.logs')}</h3>
            
            <div className="h-64 overflow-y-auto border border-gray-200 rounded p-2 bg-gray-50">
              {logs.length === 0 ? (
                <p className="text-gray-500 text-sm italic p-2">{t('monitoring.noLogs')}</p>
              ) : (
                <div className="space-y-1">
                  {logs.map((log, index) => (
                    <div key={index} className="text-xs text-gray-700 p-1 hover:bg-gray-100">
                      <span className="text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      {' - '}
                      <span>{log.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Sezione file audio */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 md:col-span-2">
            <h3 className="text-lg font-medium text-gray-800 mb-4">{t('audio.title')}</h3>
            
            {audioFiles.length === 0 ? (
              <div className="text-center py-8">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <p className="text-gray-500">{t('monitoring.noFiles')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50 text-gray-700 text-sm">
                      <th className="px-4 py-2 w-5/12">{t('monitoring.fileName')}</th>
                      <th className="px-4 py-2 w-2/12">{t('audio.fileSize')}</th>
                      <th className="px-4 py-2 w-3/12">{t('meetings.date')}</th>
                      <th className="px-4 py-2 w-2/12">{t('transcription.status.title')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audioFiles.map((file) => (
                      <tr key={file.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">
                          <div className="font-medium">{file.fileName}</div>
                          <div className="text-gray-500 text-xs truncate" title={file.filePath}>{file.filePath}</div>
                        </td>
                        <td className="px-4 py-3 text-sm">{formatFileSize(file.fileSize)}</td>
                        <td className="px-4 py-3 text-sm">{formatDate(file.createdAt)}</td>
                        <td className="px-4 py-3 text-sm min-w-[120px]">{getTranscriptionStatus(file.id)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MonitoringView; 