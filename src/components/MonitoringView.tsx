import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Button } from './ui';

// Interface for Electron APIs
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

// Interface for audio file
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

// Interface for transcript
interface Transcript {
  id: string;
  meetingId: string;
  audioFileId?: string;
  status: 'queued' | 'processing' | 'completed' | 'error';
  text?: string;
  createdAt: string;
  completedAt?: string;
}

// Access to APIs exposed by preload
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
  const [showPath, setShowPath] = useState<boolean>(false);

  // Load data on startup
  useEffect(() => {
    loadData();
    
    // Register event listeners
    setupEventListeners();
    
    return () => {
      // Remove listeners when component is unmounted
      removeEventListeners();
    };
  }, []);
  
  // Set up event listeners
  const setupEventListeners = () => {
    if (electronAPI.events) {
      electronAPI.events.on('directory:filesChanged', handleFileChanged);
      electronAPI.events.on('transcript:statusChanged', handleTranscriptStatusChanged);
    }
  };
  
  // Remove event listeners
  const removeEventListeners = () => {
    if (electronAPI.events) {
      electronAPI.events.off('directory:filesChanged', handleFileChanged);
      electronAPI.events.off('transcript:statusChanged', handleTranscriptStatusChanged);
    }
  };
  
  // Handle file change event
  const handleFileChanged = (data: any) => {
    addLog(`File ${data.type === 'add' ? 'detected' : 'error'}: ${data.file?.fileName || data.error || ''}`);
    
    // Reload audio files if a new file was added
    if (data.type === 'add') {
      loadAudioFiles();
    }
  };
  
  // Handle transcript status change event
  const handleTranscriptStatusChanged = (transcript: Transcript) => {
    addLog(`Transcript ${transcript.id} updated: ${transcript.status}`);
    
    // Update transcripts list
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
    
    // NO toast notifications here - handled by App.tsx
  };
  
  // Add a message to logs
  const addLog = (message: string) => {
    setLogs(prev => [
      { message, timestamp: new Date().toISOString() },
      ...prev.slice(0, 99) // Keep only the last 100 logs
    ]);
  };

  // Load all data
  const loadData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadAudioFiles(),
        loadTranscripts(),
        loadWatchingStatus()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Unable to load data');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load audio files
  const loadAudioFiles = async () => {
    try {
      if (electronAPI.audioFiles) {
        const files = await electronAPI.audioFiles.getAll();
        setAudioFiles(files);
      }
    } catch (error) {
      console.error('Error loading audio files:', error);
    }
  };
  
  // Load transcripts
  const loadTranscripts = async () => {
    try {
      if (electronAPI.transcripts) {
        const transcripts = await electronAPI.transcripts.getAll();
        setTranscripts(transcripts);
      }
    } catch (error) {
      console.error('Error loading transcripts:', error);
    }
  };
  
  // Load monitoring status
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
      console.error('Error loading monitoring status:', error);
    }
  };
  
  // Start/stop monitoring
  const toggleWatching = async () => {
    try {
      if (!electronAPI.fileWatcher) {
        toast.error('FileWatcher API not available');
        return;
      }
      
      if (isWatching) {
        // Stop monitoring
        const result = await electronAPI.fileWatcher.stopWatching();
        
        if (result.success) {
          setIsWatching(false);
          addLog('Monitoring stopped');
          toast.success('Monitoring stopped');
        } else if (result.error) {
          toast.error(result.error);
        }
      } else {
        // Check if there's a directory to monitor
        if (!watchDirectory) {
          toast.error('Select a directory before enabling monitoring');
          return;
        }
        
        // Start monitoring
        const result = await electronAPI.fileWatcher.startWatching(watchDirectory);
        
        if (result.success) {
          setIsWatching(true);
          addLog(`Monitoring started: ${result.directory}`);
          toast.success('Monitoring started');
        } else if (result.error) {
          toast.error(result.error);
        }
      }
    } catch (error) {
      console.error('Error toggling monitoring:', error);
      toast.error('Error changing monitoring status');
    }
  };
  
  // Start transcription of an audio file
  const startTranscription = async (audioFileId: string) => {
    try {
      if (!electronAPI.transcripts) {
        toast.error('Transcripts API not available');
        return;
      }
      
      // Check if transcription already exists
      const existingTranscript = transcripts.find(t => t.audioFileId === audioFileId);
      if (existingTranscript && existingTranscript.status !== 'error') {
        toast.error('Transcription already in progress or completed');
        return;
      }
      
      // Start transcription
      const transcript = await electronAPI.transcripts.startTranscription(audioFileId);
      
      // Update transcripts list
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
      
      addLog(`Transcription started for file ${audioFileId}`);
      toast.success('Transcription started');
    } catch (error) {
      console.error('Error starting transcription:', error);
      toast.error('Unable to start transcription');
    }
  };
  
  // Format file size in readable format
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };
  
  // Format date in readable format
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };
  
  // Get transcription status for an audio file
  function getTranscriptionStatus(audioFileId: string): React.ReactElement {
    const transcript = transcripts.find(t => t.audioFileId === audioFileId);
    
    if (!transcript) {
      return (
        <Button
          onClick={() => startTranscription(audioFileId)}
          variant="primary"
          size="sm"
          className="rounded-full bg-orange-100 hover:bg-orange-200 border border-orange-400 text-gray-900 transform hover:scale-105 shadow-none hover:shadow-none !bg-orange-100 !text-gray-900 hover:!bg-orange-200"
        >
          {t('transcription.start')}
        </Button>
      );
    }
    
    switch (transcript.status) {
      case 'queued':
        return (
          <div className="flex items-center px-3 py-1 bg-orange-500 border border-orange-400 rounded-full w-fit">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white mr-2 animate-pulse" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            <span className="text-gray-900 font-medium">{t('transcription.status.queued')}</span>
          </div>
        );
      case 'processing':
        return (
          <div className="flex items-center px-3 py-1 bg-primary-50 border border-primary-200 rounded-full w-fit">
            <span className="inline-block w-2 h-2 rounded-full bg-primary-500 mr-2 animate-pulse"></span>
            <span className="text-primary-700 font-medium">{t('transcription.status.processing')}</span>
          </div>
        );
      case 'completed':
        return (
          <div className="flex items-center px-3 py-1 bg-success-50 border border-success-200 rounded-full w-fit">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-success-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span className="text-success-700 font-medium">{t('transcription.status.completed')}</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center space-x-2">
            <div className="flex items-center px-3 py-1 bg-error-50 border border-error-200 rounded-full">
              <span className="inline-block w-2 h-2 rounded-full bg-error-500 mr-2"></span>
              <span className="text-error-700 font-medium">{t('transcription.status.error')}</span>
            </div>
            <button
              onClick={() => startTranscription(audioFileId)}
              className="p-1 text-red-600 hover:text-red-800 rounded-full hover:bg-red-50 transition-colors"
              title={t('common.retry')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        );
      default:
        return <span className="text-gray-600">{t('transcription.status.unknown')}</span>;
    }
  }

  return (
    <div className="h-full flex flex-col p-6 overflow-auto bg-gray-50">
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-500"></div>
          <p className="text-gray-600 ml-3 font-medium">{t('common.loading')}</p>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 gap-6">
          {/* Monitoring Status Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-0 flex flex-col overflow-hidden">
            <div className="bg-white py-3 px-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-0">{t('monitoring.status')}</h3>
            </div>
            
            <div className="p-4 space-y-3 flex-grow">
              {/* Status Indicator and Control in single row */}
              <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                    isWatching ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      isWatching ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                    }`}></div>
                  </div>
                  <span className={`text-sm font-medium ${isWatching ? 'text-green-700' : 'text-gray-600'}`}>
                    {isWatching ? t('monitoring.active') : t('monitoring.inactive')}
                  </span>
                </div>
                
                <button
                  onClick={toggleWatching}
                  className={`px-4 py-2 rounded-full text-sm font-medium transform hover:scale-105 transition-all duration-200 border-2 text-gray-900 ${
                    isWatching 
                      ? 'border-red-500 bg-red-50 hover:bg-red-100' 
                      : 'border-green-500 bg-green-50 hover:bg-green-100'
                  }`}
                >
                  {isWatching ? t('monitoring.stopWatching') : t('monitoring.startWatching')}
                </button>
              </div>
              
              {/* Directory Path - collapsible */}
              <div>
                <button
                  onClick={() => setShowPath(!showPath)}
                  className="w-full flex items-center justify-between bg-gray-50 rounded-lg p-3 text-left hover:bg-gray-100 transition-colors"
                                  >
                    <span className="text-xs font-medium text-gray-600">{t('monitoring.directoryPath')}</span>
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className={`h-4 w-4 text-gray-600 transform transition-transform ${showPath ? 'rotate-180' : ''}`} 
                      viewBox="0 0 20 20" 
                      fill="currentColor"
                    >
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                
                {showPath && (
                  <div className="mt-1 px-3 py-2 bg-gray-50 rounded-lg text-gray-700 text-xs break-all">
                    {watchDirectory || t('settings.monitoring.noDirectory')}
                  </div>
                )}
              </div>
              
              {/* Statistics - combined in a single row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-primary-50 rounded-lg p-3 border border-primary-100">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-medium text-primary-800">{t('monitoring.detectedFiles')}</div>
                    <div className="flex items-center">
                      <div className="text-2xl font-bold text-primary-700">{audioFiles.length}</div>
                      <div className="text-primary-500 ml-1 text-xs">files</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-success-50 rounded-lg p-3 border border-success-100">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-medium text-success-800">{t('transcription.title')}</div>
                    <div className="flex items-center">
                      <div className="text-2xl font-bold text-success-700">{transcripts.length}</div>
                      <div className="text-success-500 ml-1 text-xs">transcripts</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Audio Files Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-0 flex flex-col overflow-hidden">
            <div className="bg-white p-4 flex justify-between items-center border-b border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900 mb-0">{t('audio.title')}</h3>
              <div className="text-gray-700 text-sm bg-gray-100 px-3 py-1 rounded-full">
                {audioFiles.length} {audioFiles.length === 1 ? 'file' : 'files'}
              </div>
            </div>
            
            <div className="p-4">
              {audioFiles.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="bg-gray-50 rounded-full h-20 w-20 flex items-center justify-center mx-auto mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <p className="text-gray-600 font-medium text-lg mb-2">{t('monitoring.noFiles')}</p>
                  <p className="text-gray-600 text-sm max-w-md mx-auto">When audio files are detected in the monitored directory, they will appear here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {audioFiles.map((file) => (
                    <div key={file.id} className="bg-white border border-gray-100 rounded-lg p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center flex-1 min-w-0">
                          <div className="mr-3 text-primary-500 flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-gray-900 truncate">{file.fileName}</div>
                            <div className="text-gray-600 text-sm truncate" title={file.filePath}>{file.filePath}</div>
                            <div className="text-gray-600 text-xs mt-1">
                              {formatFileSize(file.fileSize)} • {formatDate(file.createdAt)}
                            </div>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          {getTranscriptionStatus(file.id)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonitoringView; 