import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import toast, { Toaster } from 'react-hot-toast';
import Modal from 'react-modal';
import { useTranslation } from 'react-i18next';
import TranscriptionView from './components/TranscriptionView';
import SettingsView from './components/SettingsView';
import MonitoringView from './components/MonitoringView';
import { 
  Button, 
  Input, 
  TextArea, 
  Modal as UIModal, 
  Loading, 
  PageLoading,
  Header,
  Sidebar,
  type SidebarSection
} from './components/ui';


// Initialize react-modal
try {
  Modal.setAppElement('#root');
} catch (error) {
  console.error('Error initializing Modal:', error);
  // Fallback if #root is not available
  try {
    Modal.setAppElement('body');
  } catch (error) {
    console.error('Fallback failed:', error);
  }
}

// Interface for Electron APIs
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

// Access to APIs exposed by preload
const electronAPI = (window as any).electronAPI as ElectronAPI;

// Interface for a meeting
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

// Interface for an audio file
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

// Interface for a transcript
interface Transcript {
  id: string;
  meetingId: string;
  audioFileId?: string;
  status: 'queued' | 'processing' | 'completed' | 'error';
  text?: string;
  createdAt: string;
  completedAt?: string;
}

// Custom style for modals
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
  const { t } = useTranslation();
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
  
  // Load meetings on startup
  useEffect(() => {
    loadMeetings();
    
    // Register handlers for events from main process
    if (electronAPI.onNewMeetingCreated) {
      electronAPI.onNewMeetingCreated(handleNewMeetingCreated);
    }
    
    if (electronAPI.onTranscriptionStatusUpdate) {
      electronAPI.onTranscriptionStatusUpdate(handleTranscriptionStatusUpdate);
    }
    
    // Note: Cleanup functions would need to be implemented in preload.ts
    // to properly remove event listeners when component unmounts
  }, []);
  
  // Load meetings from database
  async function loadMeetings() {
    try {
      setIsLoading(true);
      const meetingsData = await electronAPI.meetings?.getAll();
      if (meetingsData) {
        setMeetings(meetingsData);
      }
    } catch (error) {
      console.error('Error loading meetings:', error);
      toast.error('Unable to load meetings');
    } finally {
      setIsLoading(false);
    }
  }
  
  // Handle creating a new meeting
  async function handleCreateMeeting() {
    if (!newMeeting.title || !newMeeting.date) {
      toast.error('Title and date are required');
      return;
    }
    
    try {
      setIsLoading(true);
      
      const meeting = {
        ...newMeeting,
        createdAt: new Date().toISOString()
      };
      
      await electronAPI.meetings?.save(meeting);
      
      // Reset form
      setNewMeeting({
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        participants: [],
      });
      setNewParticipant('');
      setIsCreating(false);
      
      // Reload meetings
      await loadMeetings();
      
      // Success notification
      toast.success('Meeting created successfully');
    } catch (error) {
      console.error('Error creating meeting:', error);
      toast.error('Unable to create meeting');
    } finally {
      setIsLoading(false);
    }
  }
  
  // Open delete confirmation modal
  function confirmDeleteMeeting(id: string) {
    setDeleteModal({
      isOpen: true,
      meetingId: id
    });
  }
  
  // Handle meeting deletion
  async function handleDeleteMeeting() {
    if (!deleteModal.meetingId) return;
    
    try {
      setIsLoading(true);
      await electronAPI.meetings?.delete(deleteModal.meetingId);
      
      // Close modal
      setDeleteModal({ isOpen: false, meetingId: undefined });
      
      // Reload meetings
      await loadMeetings();
      
      // Success notification
      toast.success('Meeting deleted successfully');
    } catch (error) {
      console.error('Error deleting meeting:', error);
      toast.error('Unable to delete meeting');
    } finally {
      setIsLoading(false);
    }
  }
  
  // Handle adding a participant
  function handleAddParticipant() {
    if (!newParticipant.trim()) return;
    
    setNewMeeting({
      ...newMeeting,
      participants: [...(newMeeting.participants || []), newParticipant.trim()]
    });
    setNewParticipant('');
  }
  
  // Handle removing a participant
  function handleRemoveParticipant(index: number) {
    const updatedParticipants = [...(newMeeting.participants || [])];
    updatedParticipants.splice(index, 1);
    setNewMeeting({
      ...newMeeting,
      participants: updatedParticipants
    });
  }
  
  // Handle audio file import and meeting creation
  async function handleImportAudio() {
    try {
      setIsLoading(true);
      
      // Import audio file
      const audioFile = await electronAPI.audioFiles?.import();
      
      if (!audioFile) {
        toast.error('No audio file selected');
        setIsLoading(false);
        return;
      }
      
      // Create a new meeting with the audio file
      const fileName = audioFile.fileName.replace(/\.[^/.]+$/, ''); // Remove extension
      
      const meeting = {
        title: `Meeting from ${fileName}`,
        description: `Meeting automatically created from audio file ${audioFile.fileName}`,
        date: new Date().toISOString().split('T')[0],
        participants: [],
        createdAt: new Date().toISOString(),
        audioFileId: audioFile.id
      };
      
      // Save the meeting
      const savedMeeting = await electronAPI.meetings?.save(meeting);
      
      // Update the audio file with the meeting ID
      if (savedMeeting && audioFile) {
        await electronAPI.audioFiles?.save({
          ...audioFile,
          meetingId: savedMeeting.id
        });
      }
      
      // Add the new meeting to the state directly instead of reloading all meetings
      if (savedMeeting) {
        setMeetings(prevMeetings => {
          // Check if meeting already exists to avoid duplicates
          const existingMeeting = prevMeetings.find(m => m.id === savedMeeting.id);
          if (existingMeeting) {
            return prevMeetings; // Don't add duplicate
          }
          return [savedMeeting, ...prevMeetings];
        });
      }
      
      // Success notification
      toast.success('Audio file imported successfully');
    } catch (error) {
      console.error('Error importing audio file:', error);
      toast.error('Unable to import audio file');
    } finally {
      setIsLoading(false);
    }
  }
  
  // Format a date in Italian format
  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return format(date, 'dd MMMM yyyy', { locale: it });
  }
  
  // Handler for new meetings created by main process
  function handleNewMeetingCreated(meeting: Meeting) {
    // Check if meeting already exists in the state to avoid duplicates
    const existingMeeting = meetings.find(m => m.id === meeting.id);
    
    if (!existingMeeting) {
      // Update meetings list without reloading everything
      setMeetings(prevMeetings => {
        // Double-check for duplicates inside the state update
        const stillExists = prevMeetings.find(m => m.id === meeting.id);
        if (stillExists) {
          return prevMeetings; // Don't add duplicate
        }
        return [meeting, ...prevMeetings];
      });
      
      // Notify user
      toast.success('New meeting created from monitored audio file', {
        duration: 5000,
        icon: '🎙️'
      });
    } else {
      console.log(`Meeting ${meeting.id} already exists in state, skipping duplicate`);
    }
  }
  
  // Handler for transcript status updates
  function handleTranscriptionStatusUpdate(transcript: Transcript) {
    // If the transcript is completed, notify the user
    if (transcript.status === 'completed') {
      // Find associated meeting
      const meeting = meetings.find(m => m.id === transcript.meetingId);
      
      // Notify user
      toast.success(`Transcription completed: ${meeting?.title || 'Meeting'}`, {
        duration: 5000,
        icon: '📝'
      });
      
      // Update meetings if needed (only update local state, don't save to database again)
      if (meeting && !meeting.transcriptId) {
        const updatedMeeting = { ...meeting, transcriptId: transcript.id };
        
        // Only update local state - the database should already be updated by the AssemblyAI service
        setMeetings(prevMeetings => 
          prevMeetings.map(m => m.id === meeting.id ? updatedMeeting : m)
        );
      }
    }
  }
  
  // Handle click on a meeting to view transcriptions
  function handleViewTranscription(meetingId: string) {
    setSelectedMeetingId(meetingId);
    setView('transcription');
  }
  
  // Go back to meetings list
  function handleBackToList() {
    setSelectedMeetingId(null);
    setView('list');
  }
  
  // Go to settings
  function handleGoToSettings() {
    setView('settings');
  }
  
  // Add handler for monitoring view
  function handleViewMonitoring() {
    setView('monitoring');
  }
  
  const meetingsTitle = t('meetings.title');
  const monitoringTitle = t('monitoring.title');
  const settingsTitle = t('settings.title');

  // Sidebar configuration
  const sidebarSections: SidebarSection[] = [
    {
      items: [
        {
          id: 'meetings',
          label: meetingsTitle,
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          ),
          onClick: () => setView('list'),
          isActive: view === 'list'
        },
        {
          id: 'monitoring',
          label: monitoringTitle,
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
          ),
          onClick: handleViewMonitoring,
          isActive: view === 'monitoring'
        }
      ]
    }
  ];

  // Sidebar footer with settings
  const sidebarFooter = (
    <button
      onClick={handleGoToSettings}
      className={`
        flex items-center justify-start p-3 rounded-md w-full transition-all duration-200 group border-2
        ${view === 'settings' 
          ? 'bg-white text-gray-900 border-primary-500' 
          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 border-transparent'
        }
      `}
    >
      <div className={`
        ${view === 'settings' ? 'text-primary-600' : 'text-gray-600 group-hover:text-gray-700'}
        mr-3 flex-shrink-0
      `}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
      <span className="font-medium truncate">
        {settingsTitle}
      </span>
    </button>
  );
  
  return (
    <div className="flex flex-col h-screen bg-gray-50">
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
      
      {/* Desktop App Menu Bar - FIXED */}
      <div className="bg-white border-b border-gray-200 py-3 px-4 flex items-center justify-between flex-shrink-0 z-20">
        {/* Left: App Icon/Logo */}
        <div className="flex items-center">
          <div className="flex items-center text-primary-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
            <span className="ml-2 font-semibold text-gray-800">{t('app.title')}</span>
          </div>
        </div>
        
        {/* Right: Profile only */}
        <div className="flex items-center space-x-3">
          <button className="rounded-full bg-gray-100 p-2 text-gray-600 hover:bg-gray-200 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Contenuto principale in base alla vista */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar (mostrata nella vista lista, monitoraggio e impostazioni) - FIXED */}
        {(view === 'list' || view === 'monitoring' || view === 'settings') && (
          <div className="flex-shrink-0 h-full">
            <Sidebar 
              sections={sidebarSections}
              footer={sidebarFooter}
            />
          </div>
        )}
        
        {/* Vista principale delle riunioni */}
        {view === 'list' && (
          <main className="flex-1 flex flex-col overflow-hidden">
            {/* Header fisso */}
            <div className="flex-shrink-0">
              <Header
                title={t('meetings.list')}
                showSearch={true}
                onSearch={(query) => {
                  // Search functionality will be implemented later
                  console.log('Search query:', query);
                }}
                searchPlaceholder={t('meetings.search')}
                actions={
                  <div className="flex items-center space-x-3">
                    <Button
                      onClick={() => setIsCreating(true)}
                      disabled={isLoading}
                      variant="outline"
                      className="border-primary-500 text-primary-600 hover:bg-primary-50 focus:ring-primary-500"
                      leftIcon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                      }
                    >
                      {t('meetings.new')}
                    </Button>
                    <Button
                      onClick={handleImportAudio}
                      disabled={isLoading}
                      variant="outline"
                      className="border-teal-500 text-teal-600 hover:bg-teal-50 focus:ring-teal-500"
                    >
                      {t('audio.import')}
                    </Button>
                  </div>
                }
              />
            </div>
            
            {/* Contenuto scrollabile */}
            <div className="flex-1 overflow-y-auto p-6">
            
            {/* Form per creare una nuova riunione */}
            {isCreating && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-5 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  {t('meetings.new')}
                </h3>
                
                <div className="space-y-5">
                  <Input
                    label={t('meetings.title')}
                    type="text"
                    value={newMeeting.title || ''}
                    onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}
                    placeholder={t('meetings.title')}
                    required
                  />
                  
                  <TextArea
                    label={t('meetings.description')}
                    value={newMeeting.description || ''}
                    onChange={(e) => setNewMeeting({ ...newMeeting, description: e.target.value })}
                    placeholder={t('meetings.description')}
                    rows={3}
                  />
                  
                  <Input
                    label={t('meetings.date')}
                    type="date"
                    value={newMeeting.date || ''}
                    onChange={(e) => setNewMeeting({ ...newMeeting, date: e.target.value })}
                    required
                  />
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      {t('meetings.participants')}
                    </label>
                    <div className="flex space-x-2 mb-3">
                      <Input
                        value={newParticipant}
                        onChange={(e) => setNewParticipant(e.target.value)}
                        placeholder={t('meetings.addParticipant')}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        onClick={handleAddParticipant}
                        size="md"
                        variant="primary"
                        leftIcon={
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                          </svg>
                        }
                      >
                        {t('common.add')}
                      </Button>
                    </div>
                    
                    {newMeeting.participants && newMeeting.participants.length > 0 ? (
                      <div className="space-y-2">
                        {newMeeting.participants.map((participant, index) => (
                          <div key={index} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                            <span className="text-sm">{participant}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveParticipant(index)}
                              className="text-red-500 hover:text-red-700 transition-colors"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600">{t('meetings.empty')}</p>
                    )}
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                  <Button
                    variant="secondary"
                    onClick={() => setIsCreating(false)}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    onClick={handleCreateMeeting}
                    isLoading={isLoading}
                    variant="primary"
                  >
                    {t('common.save')}
                  </Button>
                </div>
              </div>
            )}
            
            {/* Elenco riunioni */}
            {isLoading ? (
              <PageLoading text={t('common.loading')} />
            ) : meetings.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <p className="text-gray-600 text-lg">{t('meetings.empty')}</p>
                <p className="text-gray-600 text-sm mt-2 mb-6">
                  {t('meetings.emptyDescription')}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-700 mb-3">{t('meetings.upcoming')}</h3>
                {meetings.map((meeting) => (
                  <div 
                    key={meeting.id} 
                    className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 hover:shadow transition-shadow cursor-pointer"
                    onClick={() => handleViewTranscription(meeting.id!)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-start space-x-4">
                        <div className="rounded-full bg-primary-50 p-3 mt-1 flex-shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900">{meeting.title}</h3>
                          <p className="text-gray-600 text-sm">{formatDate(meeting.date)}</p>
                          
                          {meeting.description && (
                            <p className="text-gray-700 mt-2 text-sm line-clamp-2">{meeting.description}</p>
                          )}
                          
                          {meeting.participants && meeting.participants.length > 0 && (
                            <div className="mt-3">
                              <div className="flex flex-wrap gap-1 mt-1">
                                {meeting.participants.map((participant, index) => (
                                  <span key={index} className="inline-block bg-primary-50 text-primary-500 px-2 py-1 rounded-full text-xs">
                                    {participant}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <div className="flex mt-3 space-x-2">
                            {meeting.audioFileId && (
                              <span className="inline-flex items-center bg-success-50 text-success-500 px-2 py-1 rounded-full text-xs">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                </svg>
                                {t('meetings.hasAudio')}
                              </span>
                            )}
                            
                            {meeting.transcriptId && (
                              <span className="inline-flex items-center bg-primary-50 text-primary-500 px-2 py-1 rounded-full text-xs">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                </svg>
                                {t('meetings.hasTranscript')}
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
                          className="text-gray-600 hover:text-red-600 transition-colors p-1"
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
            </div>
          </main>
        )}
        
        {/* Vista trascrizione */}
        {view === 'transcription' && selectedMeetingId && (
          <TranscriptionView meetingId={selectedMeetingId} onBack={handleBackToList} />
        )}
        
        {/* Vista impostazioni */}
        {view === 'settings' && (
          <main className="flex-1 flex flex-col overflow-hidden">
            <SettingsView onBack={handleBackToList} />
          </main>
        )}
        
        {/* Vista di monitoraggio */}
        {view === 'monitoring' && (
          <main className="flex-1 flex flex-col overflow-hidden">
            <MonitoringView onBack={handleBackToList} />
          </main>
        )}
      </div>
      
      {/* Modale di conferma eliminazione */}
      <Modal
        isOpen={deleteModal.isOpen}
        onRequestClose={() => setDeleteModal({ isOpen: false, meetingId: undefined })}
        style={customModalStyles}
        contentLabel={t('meetings.deleteConfirmTitle')}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">{t('meetings.deleteConfirmTitle')}</h2>
          <button 
            onClick={() => setDeleteModal({ isOpen: false, meetingId: undefined })}
            className="text-gray-600 hover:text-gray-600 transition-colors"
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
            <p className="text-gray-700">{t('meetings.confirmDelete')}</p>
            <p className="text-gray-600 text-sm mt-1">{t('meetings.deleteWarning')}</p>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3">
          <Button
            variant="secondary"
            onClick={() => setDeleteModal({ isOpen: false, meetingId: undefined })}
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteMeeting}
            isLoading={isLoading}
          >
            {t('common.delete')}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default App; 