import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import Modal from 'react-modal';
import { Button, MinutesDetailModal, KnowledgeDetailModal } from './ui';

// Interface for Electron APIs
interface ElectronAPI {
  meetings?: {
    getById: (id: string) => Promise<Meeting>;
    updateMeeting: (meeting: Meeting) => Promise<Meeting>;
  };
  audioFiles?: {
    getByMeetingId: (meetingId: string) => Promise<AudioFile | null>;
  };
  transcripts?: {
    getByMeetingId: (meetingId: string) => Promise<Transcript[]>;
    startTranscription: (audioFileId: string) => Promise<Transcript>;
    update: (transcript: Transcript) => Promise<Transcript>;
  };
  events?: {
    on: (event: string, listener: (...args: any[]) => void) => void;
    off: (event: string, listener: (...args: any[]) => void) => void;
  };
  ai?: {
    generateTitle: (transcriptText: string) => Promise<{ title: string; confidence: number }>;
    identifySpeakers: (transcriptText: string, utterances: any[]) => Promise<{
      speakers: Array<{
        originalName: string;
        suggestedName: string;
        confidence: number;
        reasoning: string;
      }>;
    }>;
    generateMinutes: (transcriptText: string, participants?: string[], meetingDate?: string, templateName?: string) => Promise<any>;
    generateKnowledge: (transcriptText: string, templateName?: string) => Promise<any>;
  };
  minutes?: {
    save: (minutes: any) => Promise<any>;
    getByMeetingId: (meetingId: string) => Promise<any[]>;
  };
  knowledge?: {
    save: (entry: any) => Promise<any>;
    search: (query: string) => Promise<any[]>;
  };
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
  utterances?: Utterance[];
  createdAt: string;
  completedAt?: string;
}

// Interface for an utterance (part of a transcript)
interface Utterance {
  speaker: string;
  text: string;
  start: number;
  end: number;
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

// Component to display utterances of a transcript
const UtterancesList: React.FC<{ utterances: Utterance[] }> = ({ utterances }) => {
  if (!utterances || utterances.length === 0) {
    return <p className="text-gray-600 italic">No utterances available</p>;
  }

  return (
    <div className="space-y-4 mt-4">
      {utterances.map((utterance, index) => {
        // Calculate time in mm:ss format
        const formatTime = (ms: number) => {
          const totalSeconds = Math.floor(ms / 1000);
          const minutes = Math.floor(totalSeconds / 60);
          const seconds = totalSeconds % 60;
          return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        };

        return (
          <div 
            key={index} 
            className={`p-3 rounded-lg ${
              utterance.speaker === 'Speaker 1' 
                ? 'bg-blue-50 border-l-4 border-blue-300' 
                : 'bg-green-50 border-l-4 border-green-300'
            }`}
          >
            <div className="flex justify-between mb-1">
              <span className="font-medium text-gray-800">{utterance.speaker}</span>
              <span className="text-xs text-gray-600">
                {formatTime(utterance.start)} - {formatTime(utterance.end)}
              </span>
            </div>
            <p className="text-gray-700">{utterance.text}</p>
          </div>
        );
      })}
    </div>
  );
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
  const [viewMode, setViewMode] = useState<'utterances' | 'fulltext'>('utterances');
  
  // AI states
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [isIdentifyingSpeakers, setIsIdentifyingSpeakers] = useState(false);
  const [speakerSuggestions, setSpeakerSuggestions] = useState<any[]>([]);
  const [showSpeakerSuggestions, setShowSpeakerSuggestions] = useState(false);
  const [isGeneratingMinutes, setIsGeneratingMinutes] = useState(false);
  const [isGeneratingKnowledge, setIsGeneratingKnowledge] = useState(false);
  const [showMinutesModal, setShowMinutesModal] = useState(false);
  const [showKnowledgeModal, setShowKnowledgeModal] = useState(false);
  const [savedMinutes, setSavedMinutes] = useState<any[]>([]);
  const [savedKnowledge, setSavedKnowledge] = useState<any[]>([]);
  const [generatedMinutes, setGeneratedMinutes] = useState<any>(null);
  const [generatedKnowledge, setGeneratedKnowledge] = useState<any>(null);
  const [selectedSavedMinute, setSelectedSavedMinute] = useState<any>(null);
  const [selectedSavedKnowledge, setSelectedSavedKnowledge] = useState<any>(null);
  const [showSavedMinutesDetail, setShowSavedMinutesDetail] = useState(false);
  const [showSavedKnowledgeDetail, setShowSavedKnowledgeDetail] = useState(false);
  
  // Stati per l'editing del titolo
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  
  const transcriptTextRef = useRef<HTMLDivElement>(null);
  
  // Format file size in readable format
  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  }
  
  // Load data on startup
  useEffect(() => {
    loadData();
    
    // Set up event listener for transcript updates
    if (electronAPI.events) {
      electronAPI.events.on('transcript:statusChanged', handleTranscriptStatusChanged);
    }
    
    // Cleanup function
    return () => {
      if (electronAPI.events) {
        electronAPI.events.off('transcript:statusChanged', handleTranscriptStatusChanged);
      }
    };
  }, [meetingId]);

  // Keyboard shortcut for going back (Esc key)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Don't trigger if user is editing title or in a modal
        if (!isEditingTitle && !showMinutesModal && !showKnowledgeModal && !isFullTextModalOpen && !showSavedMinutesDetail && !showSavedKnowledgeDetail) {
          onBack();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onBack, isEditingTitle, showMinutesModal, showKnowledgeModal, isFullTextModalOpen, showSavedMinutesDetail, showSavedKnowledgeDetail]);
  
  // Load necessary data
  async function loadData() {
    try {
      setIsLoading(true);
      
      // Load meeting
      const meetingData = await electronAPI.meetings?.getById(meetingId);
      if (meetingData) {
        setMeeting(meetingData);
      }
      
      // Load audio file
      const audioFileData = await electronAPI.audioFiles?.getByMeetingId(meetingId);
      if (audioFileData) {
        setAudioFile(audioFileData);
      }
      
      // Load transcripts
      const transcriptData = await electronAPI.transcripts?.getByMeetingId(meetingId);
      if (transcriptData && transcriptData.length > 0) {
        setTranscripts(transcriptData);
        
        // Select the most recent completed transcript
        const completedTranscripts = transcriptData.filter(t => t.status === 'completed');
        if (completedTranscripts.length > 0) {
          setActiveTranscript(completedTranscripts[0]);
        } else {
          setActiveTranscript(transcriptData[0]);
        }
      }

      // Load saved minutes and knowledge for this meeting
      const minutesData = await electronAPI.minutes?.getByMeetingId(meetingId);
      if (minutesData) {
        setSavedMinutes(minutesData);
      }

      // Non c'è un getByMeetingId per knowledge, quindi dobbiamo filtrare localmente
      const allKnowledge = await electronAPI.knowledge?.getAll();
      if (allKnowledge) {
        const meetingKnowledge = allKnowledge.filter((k: any) => k.meetingId === meetingId);
        setSavedKnowledge(meetingKnowledge);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Unable to load transcription data');
    } finally {
      setIsLoading(false);
    }
  }
  
  // Start transcription
  async function startTranscription() {
    if (!audioFile || !audioFile.id) {
      toast.error('No audio file available for transcription');
      return;
    }
    
    try {
      setIsTranscribing(true);
      const transcript = await electronAPI.transcripts?.startTranscription(audioFile.id);
      
      if (transcript) {
        toast.success('Transcription started successfully');
        
        // Update transcript list
        setTranscripts(prev => [transcript, ...prev]);
        setActiveTranscript(transcript);
      }
    } catch (error) {
      console.error('Error starting transcription:', error);
      toast.error('Unable to start transcription');
    } finally {
      setIsTranscribing(false);
    }
  }
  
  // Format date
  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('en-US');
  }
  
  // Highlight searched text
  function highlightSearchTerm(text: string, term: string): JSX.Element {
    if (!term.trim()) return <>{text}</>;
    
    const parts = text.split(new RegExp(`(${term})`, 'gi'));
    
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === term.toLowerCase() ? 
            <mark key={i} className="bg-warning-100 text-gray-900 px-1 rounded">{part}</mark> : 
            part
        )}
      </>
    );
  }
  
  // Search in text
  function searchInTranscript() {
    if (!searchTerm.trim() || !activeTranscript?.text) return;
    
    const text = activeTranscript.text;
    const lowerSearchTerm = searchTerm.toLowerCase();
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes(lowerSearchTerm)) {
      // Find index of first occurrence
      const index = lowerText.indexOf(lowerSearchTerm);
      
      // Extract context (50 characters before and after)
      const start = Math.max(0, index - 50);
      const end = Math.min(text.length, index + searchTerm.length + 50);
      const context = text.substring(start, end);
      
      setHighlightedText(context);
      
      // Scroll to position
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
              
              // Scroll to selection
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
      toast.error('Text not found');
    }
  }
  
  // Handle enter key in search
  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      searchInTranscript();
    }
  }
  
  // Get transcription status
  function getTranscriptionStatus(status: string): JSX.Element {
    switch (status) {
      case 'queued':
        return (
          <span className="inline-flex items-center bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            In queue
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center bg-primary-50 text-primary-500 px-2 py-1 rounded-full text-xs">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            In processing
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center bg-success-50 text-success-500 px-2 py-1 rounded-full text-xs">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Completed
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center bg-red-50 text-red-700 px-2 py-1 rounded-full text-xs">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Error
          </span>
        );
      default:
        return <span className="text-gray-600 text-xs">Unknown</span>;
    }
  }
  
  // Handle transcript status change event
  const handleTranscriptStatusChanged = (transcript: Transcript) => {
    // Only update if this transcript belongs to the current meeting
    if (transcript.meetingId === meetingId) {
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
      
      // Update active transcript if it's the same one
      setActiveTranscript(current => {
        if (current && current.id === transcript.id) {
          return transcript;
        }
        return current;
      });
      
      // Handle state updates but NOT notifications (handled by App.tsx)
      if (transcript.status === 'completed' || transcript.status === 'error') {
        setIsTranscribing(false);
      }
    }
  };

  // AI Functions
  async function generateMeetingTitle() {
    if (!activeTranscript?.text || !electronAPI.ai) {
      toast.error('Nessuna trascrizione disponibile per generare il titolo');
      return;
    }

    try {
      setIsGeneratingTitle(true);
      const result = await electronAPI.ai.generateTitle(activeTranscript.text);
      
      if (meeting && electronAPI.meetings?.updateMeeting) {
        const updatedMeeting: Meeting = {
          ...meeting,
          title: result.title
        };
        
        await electronAPI.meetings.updateMeeting(updatedMeeting);
        setMeeting(updatedMeeting);
        
        toast.success(`Titolo generato: "${result.title}" (${Math.round(result.confidence * 100)}% confidence)`);
      }
    } catch (error) {
      console.error('Error generating title:', error);
      
      const errorMessage = (error as Error).message;
      
      // Gestione errori specifici per configurazione AI
      if (errorMessage.includes('AI_CONFIG_MISSING')) {
        const parts = errorMessage.split(':');
        const provider = parts[1];
        const message = parts[2];
        
        toast.error(
          <div>
            <div className="font-medium">⚙️ Configurazione AI Richiesta</div>
            <div className="text-sm mt-1">{message}</div>
            <div className="text-xs mt-2 opacity-75">Vai in Impostazioni → AI Provider → {provider}</div>
          </div>, 
          { duration: 6000 }
        );
      } else {
        toast.error('Errore durante la generazione del titolo: ' + errorMessage);
      }
    } finally {
      setIsGeneratingTitle(false);
    }
  }

  async function identifySpeakers() {
    if (!activeTranscript?.utterances || !activeTranscript?.text || !electronAPI.ai) {
      toast.error('Nessuna trascrizione disponibile per identificare gli speaker');
      return;
    }

    try {
      setIsIdentifyingSpeakers(true);
      const result = await electronAPI.ai.identifySpeakers(activeTranscript.text, activeTranscript.utterances);
      
      setSpeakerSuggestions(result.speakers);
      setShowSpeakerSuggestions(true);
      
      toast.success(`Identificati ${result.speakers.length} speaker potenziali`);
    } catch (error) {
      console.error('Error identifying speakers:', error);
      
      const errorMessage = (error as Error).message;
      
      // Gestione errori specifici per configurazione AI
      if (errorMessage.includes('AI_CONFIG_MISSING')) {
        const parts = errorMessage.split(':');
        const provider = parts[1];
        const message = parts[2];
        
        toast.error(
          <div>
            <div className="font-medium">⚙️ Configurazione AI Richiesta</div>
            <div className="text-sm mt-1">{message}</div>
            <div className="text-xs mt-2 opacity-75">Vai in Impostazioni → AI Provider → {provider}</div>
          </div>, 
          { duration: 6000 }
        );
      } else {
        toast.error('Errore durante l\'identificazione degli speaker: ' + errorMessage);
      }
    } finally {
            setIsIdentifyingSpeakers(false);
    }
  }

  // Applica i suggerimenti degli speaker
  async function applySpeakerSuggestion(originalName: string, suggestedName: string) {
    if (!activeTranscript?.utterances || !electronAPI.transcripts?.update) {
      toast.error('Impossibile applicare il suggerimento');
      return;
    }

    try {
      // Aggiorna le utterances sostituendo il nome dello speaker
      const updatedUtterances = activeTranscript.utterances.map(utterance => ({
        ...utterance,
        speaker: utterance.speaker === originalName ? suggestedName : utterance.speaker
      }));

      // Aggiorna il transcript nel database
      const updatedTranscript = {
        ...activeTranscript,
        utterances: updatedUtterances
      };

      await electronAPI.transcripts.update(updatedTranscript);
      
      // Aggiorna lo stato locale
      setActiveTranscript(updatedTranscript);
      setTranscripts(prev => prev.map(t => t.id === updatedTranscript.id ? updatedTranscript : t));
      
      // Rimuovi il suggerimento applicato dalla lista
      setSpeakerSuggestions(prev => prev.filter(s => s.originalName !== originalName));
      
      toast.success(`Speaker "${originalName}" rinominato in "${suggestedName}"`);
    } catch (error) {
      console.error('Error applying speaker suggestion:', error);
      toast.error('Errore durante l\'applicazione del suggerimento');
    }
  }

  // Applica tutti i suggerimenti speaker con confidence alta
  async function applyAllHighConfidenceSuggestions() {
    const highConfidenceSuggestions = speakerSuggestions.filter(s => s.confidence > 0.7);
    
    if (highConfidenceSuggestions.length === 0) {
      toast.error('Nessun suggerimento con confidence sufficiente (>70%)');
      return;
    }

    try {
      for (const suggestion of highConfidenceSuggestions) {
        await applySpeakerSuggestion(suggestion.originalName, suggestion.suggestedName);
      }
      toast.success(`Applicati ${highConfidenceSuggestions.length} suggerimenti con alta confidence`);
    } catch (error) {
      console.error('Error applying all suggestions:', error);
      toast.error('Errore durante l\'applicazione dei suggerimenti');
    }
  }

  // Gestione editing del titolo
  function startEditingTitle() {
    if (meeting) {
      setEditedTitle(meeting.title);
      setIsEditingTitle(true);
    }
  }

  function cancelEditingTitle() {
    setIsEditingTitle(false);
    setEditedTitle('');
  }

  async function saveEditedTitle() {
    if (!meeting || !electronAPI.meetings?.updateMeeting) {
      toast.error('Impossibile aggiornare il titolo');
      return;
    }

    if (editedTitle.trim() === '') {
      toast.error('Il titolo non può essere vuoto');
      return;
    }

    try {
      const updatedMeeting = {
        ...meeting,
        title: editedTitle.trim()
      };

      await electronAPI.meetings.updateMeeting(updatedMeeting);
      setMeeting(updatedMeeting);
      setIsEditingTitle(false);
      setEditedTitle('');
      toast.success('Titolo aggiornato con successo');
    } catch (error) {
      console.error('Error updating meeting title:', error);
      toast.error('Errore durante l\'aggiornamento del titolo');
    }
  }

  function handleTitleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      saveEditedTitle();
    } else if (e.key === 'Escape') {
      cancelEditingTitle();
    }
  }

  // Generate meeting minutes
  async function generateMeetingMinutes() {
    if (!activeTranscript?.text || activeTranscript.status !== 'completed') {
      toast.error('Per generare le minute è necessaria una trascrizione completata');
      return;
    }

    try {
      setIsGeneratingMinutes(true);

      const participants = meeting?.participants || [];
      const meetingDate = meeting?.date || new Date().toISOString().split('T')[0];

      const result = await electronAPI.ai?.generateMinutes(
        activeTranscript.text,
        participants,
        meetingDate
      );

      if (result) {
        setGeneratedMinutes(result);
        setShowMinutesModal(true);
        toast.success('Minute generate con successo!');
      }
    } catch (error: any) {
      console.error('Error generating minutes:', error);
      
      if (error.message?.includes('AI_CONFIG_MISSING')) {
        const [, provider, message] = error.message.split(':');
        toast.error(
          <div className="space-y-2">
            <div className="font-medium">⚙️ Configurazione AI Richiesta</div>
            <div className="text-sm">{message || `Per utilizzare la funzionalità AI, configura prima l'API key di ${provider} nelle Impostazioni.`}</div>
            <div className="text-xs text-gray-600">Vai in Impostazioni → AI Provider → {provider}</div>
          </div>,
          { duration: 6000 }
        );
      } else {
        toast.error('Errore nella generazione delle minute: ' + (error.message || 'Errore sconosciuto'));
      }
    } finally {
      setIsGeneratingMinutes(false);
    }
  }

  // Generate knowledge base entry
  async function generateKnowledgeBase() {
    if (!activeTranscript?.text || activeTranscript.status !== 'completed') {
      toast.error('Per generare la knowledge base è necessaria una trascrizione completata');
      return;
    }

    try {
      setIsGeneratingKnowledge(true);

      const result = await electronAPI.ai?.generateKnowledge(
        activeTranscript.text
      );

      if (result) {
        setGeneratedKnowledge(result);
        setShowKnowledgeModal(true);
        toast.success('Knowledge base generata con successo!');
      }
    } catch (error: any) {
      console.error('Error generating knowledge:', error);
      
      if (error.message?.includes('AI_CONFIG_MISSING')) {
        const [, provider, message] = error.message.split(':');
        toast.error(
          <div className="space-y-2">
            <div className="font-medium">⚙️ Configurazione AI Richiesta</div>
            <div className="text-sm">{message || `Per utilizzare la funzionalità AI, configura prima l'API key di ${provider} nelle Impostazioni.`}</div>
            <div className="text-xs text-gray-600">Vai in Impostazioni → AI Provider → {provider}</div>
          </div>,
          { duration: 6000 }
        );
      } else {
        toast.error('Errore nella generazione della knowledge base: ' + (error.message || 'Errore sconosciuto'));
      }
    } finally {
      setIsGeneratingKnowledge(false);
    }
  }

  // Save minutes to database
  async function saveMinutes() {
    if (!generatedMinutes || !meetingId) return;

    try {
      const minutesToSave = {
        ...generatedMinutes,
        meetingId,
        transcriptId: activeTranscript?.id,
        aiProvider: 'gemini', // This could be dynamic based on current provider
        templateUsed: 'default'
      };

      await electronAPI.minutes?.save(minutesToSave);
      toast.success('Minute salvate con successo!');
      setShowMinutesModal(false);
      
      // Ricarica le minute salvate
      const minutesData = await electronAPI.minutes?.getByMeetingId(meetingId);
      if (minutesData) {
        setSavedMinutes(minutesData);
      }
    } catch (error) {
      console.error('Error saving minutes:', error);
      toast.error('Errore nel salvataggio delle minute');
    }
  }

  // Save knowledge to database
  async function saveKnowledge() {
    if (!generatedKnowledge || !meetingId) return;

    try {
      const knowledgeToSave = {
        ...generatedKnowledge,
        meetingId,
        transcriptId: activeTranscript?.id,
        aiProvider: 'gemini', // This could be dynamic based on current provider
        templateUsed: 'default'
      };

      await electronAPI.knowledge?.save(knowledgeToSave);
      toast.success('Knowledge base salvata con successo!');
      setShowKnowledgeModal(false);
      
      // Ricarica gli appunti salvati
      const allKnowledge = await electronAPI.knowledge?.getAll();
      if (allKnowledge) {
        const meetingKnowledge = allKnowledge.filter((k: any) => k.meetingId === meetingId);
        setSavedKnowledge(meetingKnowledge);
      }
    } catch (error) {
      console.error('Error saving knowledge:', error);
      toast.error('Errore nel salvataggio della knowledge base');
    }
  }

  // Functions for saved content detail modals
  function openSavedMinutesDetail(minute: any) {
    setSelectedSavedMinute(minute);
    setShowSavedMinutesDetail(true);
  }

  function openSavedKnowledgeDetail(knowledge: any) {
    setSelectedSavedKnowledge(knowledge);
    setShowSavedKnowledgeDetail(true);
  }

  function closeSavedMinutesDetail() {
    setShowSavedMinutesDetail(false);
    setSelectedSavedMinute(null);
  }

  function closeSavedKnowledgeDetail() {
    setShowSavedKnowledgeDetail(false);
    setSelectedSavedKnowledge(null);
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pt-2 pb-4 border-b border-gray-200">
        <div className="flex items-center flex-1">
          <button 
            onClick={onBack}
            className="mr-4 flex items-center px-3 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-200 hover:shadow-sm border border-gray-300 group"
            title="Torna alla lista riunioni (Esc)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 group-hover:transform group-hover:-translate-x-1 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="text-sm font-medium">Indietro</span>
          </button>
          <div className="flex-1">
            {/* Breadcrumb */}
            <nav className="flex items-center text-sm text-gray-500 mb-2">
              <button 
                onClick={onBack}
                className="hover:text-gray-700 transition-colors"
              >
                Monitoraggio
              </button>
              <svg className="mx-2 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 111.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <button 
                onClick={onBack}
                className="hover:text-gray-700 transition-colors"
              >
                Riunioni
              </button>
              <svg className="mx-2 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 111.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span className="font-medium text-gray-700">
                {meeting ? meeting.title : 'Riunione'}
              </span>
            </nav>
            
            <div className="flex items-center gap-3">
              {isEditingTitle ? (
                <div className="flex items-center gap-2">
                  <div className="relative">
                    {/* Elemento nascosto per misurare la larghezza del testo */}
                    <span 
                      className="invisible absolute text-xl font-semibold whitespace-pre px-2 py-1"
                      style={{ top: 0, left: 0, pointerEvents: 'none' }}
                    >
                      {editedTitle || 'A'}
                    </span>
                    <input
                      type="text"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      onKeyDown={handleTitleKeyDown}
                      className="text-xl font-semibold text-gray-800 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      style={{ 
                        width: `${Math.max((editedTitle?.length || 1) * 12 + 24, 200)}px`,
                        minWidth: '200px',
                        maxWidth: '100%'
                      }}
                      autoFocus
                    />
                  </div>
                  <button
                    onClick={saveEditedTitle}
                    className="p-1 text-green-600 hover:text-green-700 transition-colors flex-shrink-0"
                    title="Salva"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <button
                    onClick={cancelEditingTitle}
                    className="p-1 text-red-600 hover:text-red-700 transition-colors flex-shrink-0"
                    title="Annulla"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold text-gray-800">
                    {meeting ? meeting.title : 'Loading...'}
                  </h2>
                  {meeting && (
                    <button
                      onClick={startEditingTitle}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                      title="Modifica titolo"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>
            {meeting && (
              <p className="text-gray-600 text-sm mt-1">{meeting.date}</p>
            )}
          </div>
        </div>
        

      </div>

      {/* Sezione AI Actions dedicata */}
      {activeTranscript?.status === 'completed' && (
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v-.07zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-gray-800">Azioni AI</h3>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={generateMeetingTitle}
                disabled={isGeneratingTitle}
                variant="primary"
                size="sm"
                isLoading={isGeneratingTitle}
                className="shadow-none hover:shadow-none !bg-blue-100 !text-gray-900 hover:!bg-blue-200 border border-blue-400"
              >
                🤖 Genera titolo
              </Button>
              
              <Button
                onClick={identifySpeakers}
                disabled={isIdentifyingSpeakers}
                variant="primary"
                size="sm"
                isLoading={isIdentifyingSpeakers}
                className="shadow-none hover:shadow-none !bg-purple-100 !text-gray-900 hover:!bg-purple-200 border border-purple-400"
              >
                👥 Identifica speaker
              </Button>

              <Button
                onClick={generateMeetingMinutes}
                disabled={isGeneratingMinutes}
                variant="primary"
                size="sm"
                isLoading={isGeneratingMinutes}
                className="shadow-none hover:shadow-none !bg-green-100 !text-gray-900 hover:!bg-green-200 border border-green-400"
              >
                📋 Genera minuta
              </Button>

              <Button
                onClick={generateKnowledgeBase}
                disabled={isGeneratingKnowledge}
                variant="primary"
                size="sm"
                isLoading={isGeneratingKnowledge}
                className="shadow-none hover:shadow-none !bg-yellow-100 !text-gray-900 hover:!bg-yellow-200 border border-yellow-400"
              >
                🧠 Genera appunti
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
          <p className="text-gray-600 ml-3">Loading...</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-auto">
          <div className="lg:w-1/4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
              <h3 className="text-md font-medium text-gray-800 mb-4">Information</h3>
              
              {audioFile && (
                <div className="mb-4 pb-4 border-b border-gray-100">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Audio File</h4>
                  <div className="flex items-center space-x-2 bg-primary-50 p-3 rounded-md mb-3">
                    <div className="rounded-full bg-primary-100 p-2 flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate" title={audioFile.fileName}>
                        {audioFile.fileName}
                      </p>
                      <p className="text-xs text-gray-600">{formatFileSize(audioFile.fileSize)}</p>
                    </div>
                  </div>
                  <Button
                    onClick={startTranscription}
                    disabled={isTranscribing || transcripts.some(t => t.status === 'processing' || t.status === 'queued')}
                    variant="primary"
                    size="sm"
                    isLoading={isTranscribing}
                    className="w-full shadow-none hover:shadow-none !bg-orange-100 !text-gray-900 hover:!bg-orange-200 border border-orange-400"
                  >
                    {isTranscribing ? 'Transcribing...' : 'Transcribe Audio'}
                  </Button>
                </div>
              )}
              
              {/* Saved Content Section */}
              {(savedMinutes.length > 0 || savedKnowledge.length > 0) && (
                <div className="mb-4 pb-4 border-b border-gray-100">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Contenuti Salvati</h4>
                  
                  <div className="space-y-3">
                    {/* Saved Minutes */}
                    {savedMinutes.length > 0 && (
                      <div>
                        <h5 className="text-xs font-medium text-green-700 mb-2 flex items-center">
                          <span className="mr-1">📋</span>
                          Minute ({savedMinutes.length})
                        </h5>
                        <div className="space-y-2">
                          {savedMinutes.slice(0, 2).map((minute: any) => (
                            <div 
                              key={minute.id} 
                              onClick={() => openSavedMinutesDetail(minute)}
                              className="bg-green-50 border border-green-200 rounded-md p-2 cursor-pointer hover:bg-green-100 transition-colors"
                              title="Clicca per visualizzare i dettagli"
                            >
                              <p className="text-xs font-medium text-gray-900 truncate" title={minute.title}>
                                {minute.title}
                              </p>
                              <p className="text-xs text-gray-600">
                                {new Date(minute.createdAt).toLocaleDateString('it-IT')}
                              </p>
                            </div>
                          ))}
                          {savedMinutes.length > 2 && (
                            <p className="text-xs text-gray-500">+{savedMinutes.length - 2} altre</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Saved Knowledge */}
                    {savedKnowledge.length > 0 && (
                      <div>
                        <h5 className="text-xs font-medium text-yellow-700 mb-2 flex items-center">
                          <span className="mr-1">🧠</span>
                          Appunti ({savedKnowledge.length})
                        </h5>
                        <div className="space-y-2">
                          {savedKnowledge.slice(0, 2).map((knowledge: any) => (
                            <div 
                              key={knowledge.id} 
                              onClick={() => openSavedKnowledgeDetail(knowledge)}
                              className="bg-yellow-50 border border-yellow-200 rounded-md p-2 cursor-pointer hover:bg-yellow-100 transition-colors"
                              title="Clicca per visualizzare i dettagli"
                            >
                              <p className="text-xs font-medium text-gray-900 truncate" title={knowledge.title}>
                                {knowledge.title}
                              </p>
                              <p className="text-xs text-gray-600">
                                {knowledge.category}
                              </p>
                            </div>
                          ))}
                          {savedKnowledge.length > 2 && (
                            <p className="text-xs text-gray-500">+{savedKnowledge.length - 2} altri</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Available transcripts</h4>
                {transcripts.length === 0 ? (
                  <p className="text-sm text-gray-600">No transcripts available</p>
                ) : (
                  <div className="space-y-3">
                    {transcripts.map(transcript => (
                      <div 
                        key={transcript.id}
                        onClick={() => setActiveTranscript(transcript)}
                        className={`p-3 rounded-md cursor-pointer transition-colors ${
                          activeTranscript?.id === transcript.id 
                            ? 'bg-primary-50 border-l-4 border-primary-500' 
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-gray-800">
                            Transcript #{transcripts.length - transcripts.indexOf(transcript)}
                          </span>
                          {getTranscriptionStatus(transcript.status)}
                        </div>
                        <p className="text-xs text-gray-600">
                          Created at {formatDate(transcript.createdAt)}
                        </p>
                        {transcript.completedAt && (
                          <p className="text-xs text-gray-600">
                            Completed at {formatDate(transcript.completedAt)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Main content */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 h-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-800">
                  {activeTranscript ? 'Transcript' : 'No transcript selected'}
                </h3>
                
                {activeTranscript?.status === 'completed' && (
                  <div className="relative">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        placeholder="Search in text..."
                        className="px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-sm"
                      />
                      <Button
                        onClick={searchInTranscript}
                        variant="primary"
                        size="sm"
                        className="shadow-none hover:shadow-none !bg-orange-100 !text-gray-900 hover:!bg-orange-200 border border-orange-400"
                        leftIcon={
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <div className="h-full overflow-y-auto pb-8" ref={transcriptTextRef}>
                {activeTranscript ? (
                  <>
                    {highlightedText && (
                      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-yellow-800">Search result:</span>
                          <button 
                            onClick={() => setHighlightedText(null)}
                            className="text-gray-600 hover:text-gray-600"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        {highlightSearchTerm(highlightedText, searchTerm)}
                      </div>
                    )}
                    
                    {activeTranscript.status === 'completed' ? (
                      <>
                        <div className="mb-4 border-b border-gray-200 pb-2">
                          <div className="flex justify-between items-center">
                            <div className="flex space-x-4">
                              <button
                                onClick={() => setViewMode('utterances')}
                                className={`px-4 py-2 ${viewMode === 'utterances' ? 'border-b-2 border-primary-500 text-primary-500 font-medium' : 'text-gray-600 hover:text-gray-700'}`}
                              >
                                Transcript with speakers
                              </button>
                              <button
                                onClick={() => setViewMode('fulltext')}
                                className={`px-4 py-2 ${viewMode === 'fulltext' ? 'border-b-2 border-primary-500 text-primary-500 font-medium' : 'text-gray-600 hover:text-gray-700'}`}
                              >
                                Full text
                              </button>
                            </div>
                            <button
                              onClick={() => setIsFullTextModalOpen(true)}
                              className="text-sm text-gray-600 hover:text-gray-700 flex items-center"
                              title="View in modal"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                              </svg>
                              Expand
                            </button>
                          </div>
                        </div>
                        
                        {viewMode === 'utterances' ? (
                          activeTranscript.utterances && activeTranscript.utterances.length > 0 ? (
                            <UtterancesList utterances={activeTranscript.utterances} />
                          ) : (
                            <div className="prose prose-sm max-w-none text-gray-700">
                              {activeTranscript.text?.split('\n').map((paragraph, idx) => (
                                <p key={idx}>{paragraph}</p>
                              ))}
                            </div>
                          )
                        ) : (
                          <div className="prose prose-sm max-w-none text-gray-700">
                            {activeTranscript.text?.split('\n').map((paragraph, idx) => (
                              <p key={idx}>{paragraph}</p>
                            ))}
                          </div>
                        )}
                      </>
                    ) : activeTranscript.status === 'processing' ? (
                      <>
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500 mb-4"></div>
                        <p className="text-gray-600 text-center">Transcription in progress...</p>
                        <p className="text-gray-600 text-sm text-center mt-2">This process may take a few minutes</p>
                      </>
                    ) : activeTranscript.status === 'queued' ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-gray-600 text-center">Transcription in queue</p>
                        <p className="text-gray-600 text-sm text-center mt-2">The transcription will be processed soon</p>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-red-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p className="text-gray-600 text-center">An error occurred during transcription</p>
                        <p className="text-gray-600 text-sm text-center mt-2">Try again later or contact support</p>
                      </>
                    )}
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    
                    {audioFile ? (
                      <>
                        <p className="text-gray-600 text-center">No transcription available</p>
                        <Button
                          onClick={startTranscription}
                          disabled={isTranscribing}
                          variant="primary"
                          size="md"
                          isLoading={isTranscribing}
                          className="mt-4 shadow-none hover:shadow-none !bg-orange-100 !text-gray-900 hover:!bg-orange-200 border border-orange-400"
                        >
                          {isTranscribing ? 'Transcribing...' : 'Transcribe Audio'}
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="text-gray-600 text-center">No audio file available</p>
                        <p className="text-gray-600 text-sm text-center mt-2">Import an audio file to perform transcription</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal to display full text */}
      <Modal
        isOpen={isFullTextModalOpen}
        onRequestClose={() => setIsFullTextModalOpen(false)}
        style={customModalStyles}
        contentLabel="Full transcription text"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            {viewMode === 'utterances' ? 'Transcript with speakers' : 'Full transcription text'}
          </h2>
          <button 
            onClick={() => setIsFullTextModalOpen(false)}
            className="text-gray-600 hover:text-gray-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        
        <div className="mb-4 border-b border-gray-200 pb-2">
          <div className="flex space-x-4">
            <button
              onClick={() => setViewMode('utterances')}
              className={`px-4 py-2 ${viewMode === 'utterances' ? 'border-b-2 border-primary-500 text-primary-500 font-medium' : 'text-gray-600 hover:text-gray-700'}`}
            >
              Transcript with speakers
            </button>
            <button
              onClick={() => setViewMode('fulltext')}
              className={`px-4 py-2 ${viewMode === 'fulltext' ? 'border-b-2 border-primary-500 text-primary-500 font-medium' : 'text-gray-600 hover:text-gray-700'}`}
            >
              Full text
            </button>
          </div>
        </div>
        
        <div className="max-h-[500px] overflow-y-auto mb-4">
          {viewMode === 'utterances' && activeTranscript?.utterances ? (
            <UtterancesList utterances={activeTranscript.utterances} />
          ) : (
            <div className="prose prose-sm max-w-none text-gray-700">
              {activeTranscript?.text?.split('\n').map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          )}
        </div>
        
        <button 
          onClick={() => setIsFullTextModalOpen(false)}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors shadow-sm"
        >
          Close
        </button>
      </Modal>

      {/* Meeting Minutes Modal */}
      {showMinutesModal && generatedMinutes && (
        <Modal
          isOpen={showMinutesModal}
          onRequestClose={() => setShowMinutesModal(false)}
          style={customModalStyles}
          contentLabel="Meeting Minutes"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">📋 Minuta Meeting Generata</h2>
            <button 
              onClick={() => setShowMinutesModal(false)}
              className="text-gray-600 hover:text-gray-600 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          <div className="space-y-6 max-h-[500px] overflow-y-auto">
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-semibold text-gray-900">{generatedMinutes.title}</h3>
              <p className="text-sm text-gray-600">Data: {generatedMinutes.date}</p>
            </div>

            {generatedMinutes.participants && generatedMinutes.participants.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Partecipanti</h4>
                <div className="space-y-1">
                  {generatedMinutes.participants.map((participant: any, index: number) => (
                    <div key={index} className="text-sm text-gray-700">
                      • {participant.name} {participant.role && `(${participant.role})`}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {generatedMinutes.agenda && generatedMinutes.agenda.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Agenda</h4>
                <div className="space-y-1">
                  {generatedMinutes.agenda.map((item: string, index: number) => (
                    <div key={index} className="text-sm text-gray-700">• {item}</div>
                  ))}
                </div>
              </div>
            )}

            {generatedMinutes.keyDiscussions && generatedMinutes.keyDiscussions.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Discussioni Principali</h4>
                <div className="space-y-3">
                  {generatedMinutes.keyDiscussions.map((discussion: any, index: number) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-lg">
                      <h5 className="font-medium text-gray-800">{discussion.topic}</h5>
                      <p className="text-sm text-gray-700 mt-1">{discussion.summary}</p>
                      {discussion.decisions && discussion.decisions.length > 0 && (
                        <div className="mt-2">
                          <span className="text-xs font-medium text-green-700">Decisioni:</span>
                          {discussion.decisions.map((decision: string, i: number) => (
                            <div key={i} className="text-xs text-green-600 ml-2">• {decision}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {generatedMinutes.actionItems && generatedMinutes.actionItems.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Azioni da Intraprendere</h4>
                <div className="space-y-2">
                  {generatedMinutes.actionItems.map((action: any, index: number) => (
                    <div key={index} className="bg-blue-50 p-3 rounded-lg flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{action.action}</p>
                        <p className="text-xs text-gray-600 mt-1">Responsabile: {action.owner}</p>
                        {action.dueDate && (
                          <p className="text-xs text-gray-600">Scadenza: {action.dueDate}</p>
                        )}
                      </div>
                      <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                        action.priority === 'High' ? 'bg-red-100 text-red-700' :
                        action.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {action.priority}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {generatedMinutes.nextMeeting && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Prossima Riunione</h4>
                <div className="bg-gray-50 p-3 rounded-lg">
                  {generatedMinutes.nextMeeting.date && (
                    <p className="text-sm text-gray-700">Data: {generatedMinutes.nextMeeting.date}</p>
                  )}
                  {generatedMinutes.nextMeeting.agenda && generatedMinutes.nextMeeting.agenda.length > 0 && (
                    <div className="mt-2">
                      <span className="text-sm font-medium text-gray-700">Agenda prevista:</span>
                      {generatedMinutes.nextMeeting.agenda.map((item: string, i: number) => (
                        <div key={i} className="text-sm text-gray-600 ml-2">• {item}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={() => setShowMinutesModal(false)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors shadow-sm"
            >
              Chiudi
            </button>
            <Button
              onClick={saveMinutes}
              variant="primary"
              className="shadow-none hover:shadow-none !bg-green-600 hover:!bg-green-700 text-white"
            >
              💾 Salva Minuta
            </Button>
          </div>
        </Modal>
      )}

      {/* Knowledge Base Modal */}
      {showKnowledgeModal && generatedKnowledge && (
        <Modal
          isOpen={showKnowledgeModal}
          onRequestClose={() => setShowKnowledgeModal(false)}
          style={customModalStyles}
          contentLabel="Knowledge Base"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">🧠 Appunti Knowledge Base Generati</h2>
            <button 
              onClick={() => setShowKnowledgeModal(false)}
              className="text-gray-600 hover:text-gray-600 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          <div className="space-y-6 max-h-[500px] overflow-y-auto">
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-semibold text-gray-900">{generatedKnowledge.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{generatedKnowledge.summary}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {generatedKnowledge.tags?.map((tag: string, index: number) => (
                  <span key={index} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {generatedKnowledge.keyTopics && generatedKnowledge.keyTopics.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Argomenti Principali</h4>
                <div className="space-y-4">
                  {generatedKnowledge.keyTopics.map((topic: any, index: number) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg">
                      <h5 className="font-medium text-gray-800 mb-2">{topic.topic}</h5>
                      <p className="text-sm text-gray-700 mb-2">{topic.summary}</p>
                      {topic.keyPoints && topic.keyPoints.length > 0 && (
                        <div>
                          <span className="text-xs font-medium text-gray-600">Punti chiave:</span>
                          <div className="mt-1 space-y-1">
                            {topic.keyPoints.map((point: string, i: number) => (
                              <div key={i} className="text-xs text-gray-600 ml-2">• {point}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {generatedKnowledge.insights && generatedKnowledge.insights.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Insights</h4>
                <div className="space-y-3">
                  {generatedKnowledge.insights.map((insight: any, index: number) => (
                    <div key={index} className="bg-yellow-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-gray-900">{insight.insight}</p>
                      <p className="text-xs text-gray-600 mt-1">Contesto: {insight.context}</p>
                      <p className="text-xs text-gray-600">Applicabilità: {insight.applicability}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {generatedKnowledge.actionableItems && generatedKnowledge.actionableItems.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Azioni da Intraprendere</h4>
                <div className="space-y-2">
                  {generatedKnowledge.actionableItems.map((item: any, index: number) => (
                    <div key={index} className="flex items-center justify-between bg-blue-50 p-3 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.item}</p>
                        <p className="text-xs text-gray-600">Categoria: {item.category}</p>
                      </div>
                      <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                        item.priority === 'high' ? 'bg-red-100 text-red-700' :
                        item.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {item.priority}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {generatedKnowledge.questions && generatedKnowledge.questions.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Domande per Approfondimenti</h4>
                <div className="space-y-1">
                  {generatedKnowledge.questions.map((question: string, index: number) => (
                    <div key={index} className="text-sm text-gray-700">❓ {question}</div>
                  ))}
                </div>
              </div>
            )}

            {generatedKnowledge.connections && generatedKnowledge.connections.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Collegamenti</h4>
                <div className="space-y-1">
                  {generatedKnowledge.connections.map((connection: string, index: number) => (
                    <div key={index} className="text-sm text-gray-700">🔗 {connection}</div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={() => setShowKnowledgeModal(false)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors shadow-sm"
            >
              Chiudi
            </button>
            <Button
              onClick={saveKnowledge}
              variant="primary"
              className="shadow-none hover:shadow-none !bg-yellow-600 hover:!bg-yellow-700 text-white"
            >
              💾 Salva Appunti
            </Button>
          </div>
        </Modal>
      )}

      {/* Detail Modals for Saved Content */}
      <MinutesDetailModal
        isOpen={showSavedMinutesDetail}
        onRequestClose={closeSavedMinutesDetail}
        minutes={selectedSavedMinute}
      />

      <KnowledgeDetailModal
        isOpen={showSavedKnowledgeDetail}
        onRequestClose={closeSavedKnowledgeDetail}
        knowledge={selectedSavedKnowledge}
      />

      {/* Modal per le suggerimenti degli speaker */}
      <Modal
        isOpen={showSpeakerSuggestions}
        onRequestClose={() => setShowSpeakerSuggestions(false)}
        style={customModalStyles}
        contentLabel="Speaker suggestions"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">🤖 Suggerimenti Speaker AI</h2>
          <div className="flex items-center gap-3">
            <Button
              onClick={applyAllHighConfidenceSuggestions}
              variant="primary"
              size="sm"
              disabled={speakerSuggestions.filter(s => s.confidence > 0.7).length === 0}
              className="shadow-none hover:shadow-none !bg-green-100 !text-gray-900 hover:!bg-green-200 border border-green-400"
            >
                              ✅ Applica Tutti (&gt;70%)
            </Button>
            <button 
              onClick={() => setShowSpeakerSuggestions(false)}
              className="text-gray-600 hover:text-gray-600 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="mb-4">
          <p className="text-gray-600 text-sm mb-4">
            L'AI ha analizzato la trascrizione e suggerisce questi nomi per gli speaker:
          </p>
          
          {speakerSuggestions.length > 0 ? (
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {speakerSuggestions.map((suggestion, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                        {suggestion.originalName}
                      </span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                        {suggestion.suggestedName}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center">
                        <div className={`h-2 w-2 rounded-full mr-2 ${
                          suggestion.confidence > 0.7 ? 'bg-green-400' : 
                          suggestion.confidence > 0.4 ? 'bg-yellow-400' : 'bg-red-400'
                        }`}></div>
                        <span className="text-xs text-gray-500">
                          {Math.round(suggestion.confidence * 100)}%
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => applySpeakerSuggestion(suggestion.originalName, suggestion.suggestedName)}
                          variant="primary"
                          size="sm"
                          className="shadow-none hover:shadow-none !bg-green-100 !text-gray-900 hover:!bg-green-200 border border-green-400"
                        >
                          ✅ Applica
                        </Button>
                        <Button
                          onClick={() => setSpeakerSuggestions(prev => prev.filter(s => s.originalName !== suggestion.originalName))}
                          variant="secondary"
                          size="sm"
                          className="shadow-none hover:shadow-none !bg-red-100 !text-gray-900 hover:!bg-red-200 border border-red-400"
                        >
                          ❌ Rifiuta
                        </Button>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                    <span className="font-medium text-gray-700">Ragionamento:</span> {suggestion.reasoning}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">✅</div>
              <p className="text-gray-500 font-medium">Tutti i suggerimenti sono stati gestiti!</p>
              <p className="text-gray-400 text-sm mt-1">Puoi chiudere questa finestra</p>
            </div>
          )}
        </div>
        
        <div className="flex justify-between">
          <button 
            onClick={() => setShowSpeakerSuggestions(false)}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors shadow-sm"
          >
            Chiudi
          </button>
          <div className="text-xs text-gray-500 flex items-center">
            💡 Questi sono solo suggerimenti basati sull'analisi del contenuto
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TranscriptionView; 