import Store from 'electron-store';
import { v4 as uuidv4 } from 'uuid';

// Interfaccia per una nota
export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  type: 'note';
}

// Interfaccia per una riunione
export interface Meeting {
  id: string;
  title: string;
  description: string;
  date: string;
  participants: string[];
  createdAt: string;
  audioFileId?: string;
  transcriptId?: string;
  minutes?: string;
  type: 'meeting';
}

// Interfaccia per una trascrizione
export interface Transcript {
  id: string;
  meetingId: string;
  audioFileId?: string;
  status: 'queued' | 'processing' | 'completed' | 'error';
  text?: string;
  createdAt: string;
  completedAt?: string;
  assemblyAiId?: string;
  utterances?: Utterance[];
  type: 'transcript';
}

// Interfaccia per una pronuncia (parte di una trascrizione)
export interface Utterance {
  speaker: string;
  text: string;
  start: number;
  end: number;
}

// Interfaccia per un file audio
export interface AudioFile {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  duration?: number;
  meetingId?: string;
  transcriptId?: string;
  createdAt: string;
  type: 'audioFile';
}

// Interfaccia per le minute di riunione
export interface MeetingMinutes {
  id: string;
  meetingId: string;
  transcriptId?: string;
  title: string;
  date: string;
  participants: Array<{
    name: string;
    role?: string;
    attendance?: string;
  }>;
  agenda?: string[];
  keyDiscussions?: Array<{
    topic: string;
    summary: string;
    keyPoints?: string[];
    decisions?: string[];
    concerns?: string[];
  }>;
  actionItems: Array<{
    id?: string;
    action: string;
    owner: string;
    dueDate?: string;
    priority: 'High' | 'Medium' | 'Low';
    status?: string;
    dependencies?: string[];
  }>;
  nextMeeting?: {
    date?: string;
    agenda?: string[];
  };
  metadata?: {
    duration?: string;
    location?: string;
    type?: string;
  };
  executiveSummary?: string;
  keyDecisions?: string[];
  criticalActions?: Array<{
    action: string;
    owner: string;
    dueDate: string;
    impact: string;
  }>;
  risks?: string[];
  nextSteps?: string[];
  followUp?: {
    nextMeeting?: string;
    preparationNeeded?: string[];
  };
  templateUsed?: string;
  aiProvider?: string;
  createdAt: string;
  type: 'meetingMinutes';
}

// Interfaccia per gli appunti knowledge base
export interface KnowledgeEntry {
  id: string;
  meetingId?: string;
  transcriptId?: string;
  title: string;
  summary: string;
  tags: string[];
  category: string;
  keyTopics: Array<{
    topic: string;
    summary: string;
    keyPoints: string[];
    examples?: string[];
    references?: string[];
  }>;
  insights: Array<{
    insight: string;
    context: string;
    applicability: string;
  }>;
  actionableItems: Array<{
    item: string;
    category: 'learn' | 'implement' | 'research';
    priority: 'high' | 'medium' | 'low';
  }>;
  connections: string[];
  questions: string[];
  // Per template di ricerca
  abstract?: string;
  keywords?: string[];
  methodology?: string;
  findings?: Array<{
    finding: string;
    evidence: string;
    significance: string;
  }>;
  concepts?: Array<{
    concept: string;
    definition: string;
    examples: string[];
    relatedConcepts: string[];
  }>;
  hypotheses?: string[];
  futureResearch?: string[];
  bibliography?: string[];
  // Per template personale
  reflection?: string;
  learnings?: Array<{
    learning: string;
    application: string;
    timeline: string;
  }>;
  ideas?: Array<{
    idea: string;
    potential: string;
    nextSteps: string[];
  }>;
  resources?: Array<{
    resource: string;
    type: 'book' | 'article' | 'tool' | 'person';
    priority: 'high' | 'medium' | 'low';
  }>;
  habits?: Array<{
    habit: string;
    reason: string;
    implementation: string;
  }>;
  reminders?: string[];
  templateUsed?: string;
  aiProvider?: string;
  createdAt: string;
  type: 'knowledgeEntry';
}

// Interfaccia per lo schema dello store
interface StoreSchema {
  notes: Record<string, Note>;
  noteIds: string[];
  meetings: Record<string, Meeting>;
  meetingIds: string[];
  transcripts: Record<string, Transcript>;
  transcriptIds: string[];
  audioFiles: Record<string, AudioFile>;
  audioFileIds: string[];
  meetingMinutes: Record<string, MeetingMinutes>;
  meetingMinutesIds: string[];
  knowledgeEntries: Record<string, KnowledgeEntry>;
  knowledgeEntryIds: string[];
  config: {
    watchDirectories: string[];
    assemblyAiKey?: string;
    language?: string; // 'it' o 'en'
    // AI Provider settings
    geminiApiKey?: string;
    claudeApiKey?: string;
    chatgptApiKey?: string;
    aiProvider?: 'gemini' | 'claude' | 'chatgpt'; // Provider attivo
  };
}

// Funzione per generare ID unici
const generateId = (prefix: string): string => {
  return `${prefix}_${uuidv4()}`;
};

// Classe per gestire il database
export class Database {
  private store: Store<StoreSchema>;
  
  constructor() {
    // Inizializza lo store
    this.store = new Store<StoreSchema>({
      name: 'meetings-minuta-db',
      defaults: {
        notes: {},
        noteIds: [],
        meetings: {},
        meetingIds: [],
        transcripts: {},
        transcriptIds: [],
        audioFiles: {},
        audioFileIds: [],
        meetingMinutes: {},
        meetingMinutesIds: [],
        knowledgeEntries: {},
        knowledgeEntryIds: [],
        config: {
          watchDirectories: []
        }
      }
    });
    
    console.log('Database electron-store inizializzato');
  }
  
  // ========== NOTE METHODS ==========
  
  // Salvare una nota
  async saveNote(note: Omit<Note, 'id'> & { id?: string }): Promise<Note> {
    try {
      // Crea un ID se non esiste
      const id = note.id || generateId('note');
      
      // Crea la nota completa
      const completeNote: Note = {
        id,
        title: note.title,
        content: note.content,
        createdAt: note.createdAt || new Date().toISOString(),
        type: 'note'
      };
      
      // Ottieni le note esistenti e aggiungi/aggiorna la nuova nota
      const notes = this.store.get('notes', {});
      notes[id] = completeNote;
      
      // Ottieni gli ID esistenti e aggiungi il nuovo se necessario
      const noteIds = this.store.get('noteIds', []);
      if (!noteIds.includes(id)) {
        noteIds.push(id);
        this.store.set('noteIds', noteIds);
      }
      
      // Salva le note aggiornate
      this.store.set('notes', notes);
      
      console.log('Nota salvata:', completeNote);
      return completeNote;
    } catch (error) {
      console.error('Error while saving note:', error);
      throw error;
    }
  }
  
  // Ottenere tutte le note
  async getAllNotes(): Promise<Note[]> {
    try {
      const notes = this.store.get('notes', {});
      const noteIds = this.store.get('noteIds', []);
      
      // Converte l'oggetto in un array ordinato in base a noteIds
      const noteArray = noteIds
        .filter(id => notes[id]) // Filtra ID non validi
        .map(id => notes[id])
        .sort((a, b) => {
          // Ordina per data di creazione (dal più recente)
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      
      console.log('Note recuperate:', noteArray);
      return noteArray;
    } catch (error) {
      console.error('Error while retrieving notes:', error);
      throw error;
    }
  }
  
  // Ottenere una nota specifica
  async getNoteById(id: string): Promise<Note | null> {
    try {
      const notes = this.store.get('notes', {});
      return notes[id] || null;
    } catch (error) {
      console.error(`Error while retrieving note ${id}:`, error);
      throw error;
    }
  }
  
  // Eliminare una nota
  async deleteNote(id: string): Promise<void> {
    try {
      // Ottieni tutte le note e rimuovi quella con l'ID specificato
      const notes = this.store.get('notes', {});
      delete notes[id];
      
      // Aggiorna le note nello store
      this.store.set('notes', notes);
      
      // Rimuovi l'ID dall'elenco degli ID
      const noteIds = this.store.get('noteIds', []);
      const updatedNoteIds = noteIds.filter(noteId => noteId !== id);
      this.store.set('noteIds', updatedNoteIds);
      
      console.log(`Nota ${id} eliminata`);
    } catch (error) {
      console.error(`Error while deleting note ${id}:`, error);
      throw error;
    }
  }
  
  // ========== MEETING METHODS ==========
  
  // Salvare una riunione
  async saveMeeting(meeting: Omit<Meeting, 'id' | 'type'> & { id?: string }): Promise<Meeting> {
    try {
      // Crea un ID se non esiste
      const id = meeting.id || generateId('meeting');
      
      // Crea la riunione completa
      const completeMeeting: Meeting = {
        id,
        title: meeting.title,
        description: meeting.description,
        date: meeting.date,
        participants: meeting.participants || [],
        createdAt: meeting.createdAt || new Date().toISOString(),
        audioFileId: meeting.audioFileId,
        transcriptId: meeting.transcriptId,
        minutes: meeting.minutes,
        type: 'meeting'
      };
      
      // Ottieni le riunioni esistenti e aggiungi/aggiorna la nuova riunione
      const meetings = this.store.get('meetings', {});
      meetings[id] = completeMeeting;
      
      // Ottieni gli ID esistenti e aggiungi il nuovo se necessario
      const meetingIds = this.store.get('meetingIds', []);
      if (!meetingIds.includes(id)) {
        meetingIds.push(id);
        this.store.set('meetingIds', meetingIds);
      }
      
      // Salva le riunioni aggiornate
      this.store.set('meetings', meetings);
      
      console.log('Riunione salvata:', completeMeeting);
      return completeMeeting;
    } catch (error) {
      console.error('Error while saving meeting:', error);
      throw error;
    }
  }
  
  // Ottenere tutte le riunioni
  async getAllMeetings(): Promise<Meeting[]> {
    try {
      const meetings = this.store.get('meetings', {});
      const meetingIds = this.store.get('meetingIds', []);
      
      // Converte l'oggetto in un array ordinato in base a meetingIds
      const meetingArray = meetingIds
        .filter(id => meetings[id]) // Filtra ID non validi
        .map(id => meetings[id])
        .sort((a, b) => {
          // Ordina per data di riunione (dalla più recente)
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
      
      console.log('Riunioni recuperate:', meetingArray);
      return meetingArray;
    } catch (error) {
      console.error('Error while retrieving meetings:', error);
      throw error;
    }
  }
  
  // Ottenere una riunione specifica
  async getMeetingById(id: string): Promise<Meeting | null> {
    try {
      const meetings = this.store.get('meetings', {});
      return meetings[id] || null;
    } catch (error) {
      console.error(`Error while retrieving meeting ${id}:`, error);
      throw error;
    }
  }
  
  // Eliminare una riunione
  async deleteMeeting(id: string): Promise<void> {
    try {
      // Ottieni tutte le riunioni e rimuovi quella con l'ID specificato
      const meetings = this.store.get('meetings', {});
      delete meetings[id];
      
      // Aggiorna le riunioni nello store
      this.store.set('meetings', meetings);
      
      // Rimuovi l'ID dall'elenco degli ID
      const meetingIds = this.store.get('meetingIds', []);
      const updatedMeetingIds = meetingIds.filter(meetingId => meetingId !== id);
      this.store.set('meetingIds', updatedMeetingIds);
      
      console.log(`Riunione ${id} eliminata`);
    } catch (error) {
      console.error(`Error while deleting meeting ${id}:`, error);
      throw error;
    }
  }
  
  // ========== TRANSCRIPT METHODS ==========
  
  // Salvare una trascrizione
  async saveTranscript(transcript: Omit<Transcript, 'id' | 'type'> & { id?: string }): Promise<Transcript> {
    try {
      // Crea un ID se non esiste
      const id = transcript.id || generateId('transcript');
      
      // Crea la trascrizione completa
      const completeTranscript: Transcript = {
        id,
        meetingId: transcript.meetingId,
        audioFileId: transcript.audioFileId,
        status: transcript.status,
        text: transcript.text,
        createdAt: transcript.createdAt || new Date().toISOString(),
        completedAt: transcript.completedAt,
        assemblyAiId: transcript.assemblyAiId,
        utterances: transcript.utterances || [],
        type: 'transcript'
      };
      
      // Ottieni le trascrizioni esistenti e aggiungi/aggiorna la nuova trascrizione
      const transcripts = this.store.get('transcripts', {});
      transcripts[id] = completeTranscript;
      
      // Ottieni gli ID esistenti e aggiungi il nuovo se necessario
      const transcriptIds = this.store.get('transcriptIds', []);
      if (!transcriptIds.includes(id)) {
        transcriptIds.push(id);
        this.store.set('transcriptIds', transcriptIds);
      }
      
      // Salva le trascrizioni aggiornate
      this.store.set('transcripts', transcripts);
      
      // Se è una trascrizione completa e ha un meetingId, aggiorna anche il meeting
      if (transcript.status === 'completed' && transcript.meetingId) {
        const meetings = this.store.get('meetings', {});
        const meeting = meetings[transcript.meetingId];
        
        if (meeting) {
          meeting.transcriptId = id;
          this.store.set('meetings', meetings);
        }
      }
      
      console.log('Trascrizione salvata:', completeTranscript);
      return completeTranscript;
    } catch (error) {
      console.error('Error while saving transcript:', error);
      throw error;
    }
  }
  
  // Ottenere tutte le trascrizioni
  async getAllTranscripts(): Promise<Transcript[]> {
    try {
      const transcripts = this.store.get('transcripts', {});
      const transcriptIds = this.store.get('transcriptIds', []);
      
      // Converte l'oggetto in un array ordinato in base a transcriptIds
      const transcriptArray = transcriptIds
        .filter(id => transcripts[id]) // Filtra ID non validi
        .map(id => transcripts[id])
        .sort((a, b) => {
          // Ordina per data di creazione (dalla più recente)
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      
      console.log('Trascrizioni recuperate:', transcriptArray);
      return transcriptArray;
    } catch (error) {
      console.error('Error while retrieving transcripts:', error);
      throw error;
    }
  }
  
  // Ottenere una trascrizione specifica
  async getTranscriptById(id: string): Promise<Transcript | null> {
    try {
      const transcripts = this.store.get('transcripts', {});
      return transcripts[id] || null;
    } catch (error) {
      console.error(`Error while retrieving transcript ${id}:`, error);
      throw error;
    }
  }
  
  // Ottenere trascrizioni per una riunione specifica
  async getTranscriptsByMeetingId(meetingId: string): Promise<Transcript[]> {
    try {
      const transcripts = this.store.get('transcripts', {});
      const transcriptIds = this.store.get('transcriptIds', []);
      
      // Filtra le trascrizioni per il meetingId
      const filteredTranscripts = transcriptIds
        .filter(id => transcripts[id] && transcripts[id].meetingId === meetingId)
        .map(id => transcripts[id])
        .sort((a, b) => {
          // Ordina per data di creazione (dalla più recente)
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      
      return filteredTranscripts;
    } catch (error) {
      console.error(`Error while retrieving transcripts for meeting ${meetingId}:`, error);
      throw error;
    }
  }

  // Ottenere trascrizioni per un file audio specifico
  async getTranscriptsByAudioFileId(audioFileId: string): Promise<Transcript[]> {
    try {
      const transcripts = this.store.get('transcripts', {});
      const transcriptIds = this.store.get('transcriptIds', []);
      
      // Filtra le trascrizioni per l'audioFileId
      const filteredTranscripts = transcriptIds
        .filter(id => transcripts[id] && transcripts[id].audioFileId === audioFileId)
        .map(id => transcripts[id])
        .sort((a, b) => {
          // Ordina per data di creazione (dalla più recente)
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      
      return filteredTranscripts;
    } catch (error) {
      console.error(`Error while retrieving transcripts for audio file ${audioFileId}:`, error);
      throw error;
    }
  }
  
  // Eliminare una trascrizione
  async deleteTranscript(id: string): Promise<void> {
    try {
      // Ottieni tutte le trascrizioni e rimuovi quella con l'ID specificato
      const transcripts = this.store.get('transcripts', {});
      const transcript = transcripts[id];
      
      if (transcript && transcript.meetingId) {
        // Rimuovi riferimento dal meeting
        const meetings = this.store.get('meetings', {});
        const meeting = meetings[transcript.meetingId];
        
        if (meeting && meeting.transcriptId === id) {
          meeting.transcriptId = undefined;
          this.store.set('meetings', meetings);
        }
      }
      
      delete transcripts[id];
      
      // Aggiorna le trascrizioni nello store
      this.store.set('transcripts', transcripts);
      
      // Rimuovi l'ID dall'elenco degli ID
      const transcriptIds = this.store.get('transcriptIds', []);
      const updatedTranscriptIds = transcriptIds.filter(transcriptId => transcriptId !== id);
      this.store.set('transcriptIds', updatedTranscriptIds);
      
      console.log(`Trascrizione ${id} eliminata`);
    } catch (error) {
      console.error(`Error while deleting transcript ${id}:`, error);
      throw error;
    }
  }

  // Aggiornare una trascrizione
  async updateTranscript(transcript: Transcript): Promise<Transcript> {
    try {
      const transcripts = this.store.get('transcripts', {});
      
      // Verifica che la trascrizione esista
      if (!transcripts[transcript.id]) {
        throw new Error(`Transcript with ID ${transcript.id} not found`);
      }
      
      // Aggiorna la trascrizione
      transcripts[transcript.id] = transcript;
      this.store.set('transcripts', transcripts);
      
      console.log(`Trascrizione ${transcript.id} aggiornata`);
      return transcript;
    } catch (error) {
      console.error(`Error while updating transcript ${transcript.id}:`, error);
      throw error;
    }
  }
  
  // ========== AUDIO FILE METHODS ==========
  
  // Salvare un file audio
  async saveAudioFile(audioFile: Omit<AudioFile, 'id' | 'type'> & { id?: string }): Promise<AudioFile> {
    try {
      // Crea un ID se non esiste
      const id = audioFile.id || generateId('audioFile');
      
      // Crea il file audio completo
      const completeAudioFile: AudioFile = {
        id,
        fileName: audioFile.fileName,
        filePath: audioFile.filePath,
        fileSize: audioFile.fileSize,
        duration: audioFile.duration,
        meetingId: audioFile.meetingId,
        transcriptId: audioFile.transcriptId,
        createdAt: audioFile.createdAt || new Date().toISOString(),
        type: 'audioFile'
      };
      
      // Ottieni i file audio esistenti e aggiungi/aggiorna il nuovo file audio
      const audioFiles = this.store.get('audioFiles', {});
      audioFiles[id] = completeAudioFile;
      
      // Ottieni gli ID esistenti e aggiungi il nuovo se necessario
      const audioFileIds = this.store.get('audioFileIds', []);
      if (!audioFileIds.includes(id)) {
        audioFileIds.push(id);
        this.store.set('audioFileIds', audioFileIds);
      }
      
      // Salva i file audio aggiornati
      this.store.set('audioFiles', audioFiles);
      
      // Se ha un meetingId, aggiorna anche il meeting
      if (audioFile.meetingId) {
        const meetings = this.store.get('meetings', {});
        const meeting = meetings[audioFile.meetingId];
        
        if (meeting) {
          meeting.audioFileId = id;
          this.store.set('meetings', meetings);
        }
      }
      
      console.log('File audio salvato:', completeAudioFile);
      return completeAudioFile;
    } catch (error) {
      console.error('Error while saving audio file:', error);
      throw error;
    }
  }
  
  // Ottenere tutti i file audio
  async getAllAudioFiles(): Promise<AudioFile[]> {
    try {
      const audioFiles = this.store.get('audioFiles', {});
      const audioFileIds = this.store.get('audioFileIds', []);
      
      // Converte l'oggetto in un array ordinato in base a audioFileIds
      const audioFileArray = audioFileIds
        .filter(id => audioFiles[id]) // Filtra ID non validi
        .map(id => audioFiles[id])
        .sort((a, b) => {
          // Ordina per data di creazione (dal più recente)
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      
      console.log('File audio recuperati:', audioFileArray);
      return audioFileArray;
    } catch (error) {
      console.error('Error while retrieving audio files:', error);
      throw error;
    }
  }
  
  // Ottenere un file audio specifico
  async getAudioFileById(id: string): Promise<AudioFile | null> {
    try {
      const audioFiles = this.store.get('audioFiles', {});
      return audioFiles[id] || null;
    } catch (error) {
      console.error(`Error while retrieving audio file ${id}:`, error);
      throw error;
    }
  }
  
  // Ottenere file audio per una riunione specifica
  async getAudioFileByMeetingId(meetingId: string): Promise<AudioFile | null> {
    try {
      const audioFiles = this.store.get('audioFiles', {});
      const audioFileIds = this.store.get('audioFileIds', []);
      
      // Trova il primo file audio associato alla riunione
      for (const id of audioFileIds) {
        if (audioFiles[id] && audioFiles[id].meetingId === meetingId) {
          return audioFiles[id];
        }
      }
      
      return null;
    } catch (error) {
      console.error(`Error while retrieving audio file for meeting ${meetingId}:`, error);
      throw error;
    }
  }
  
  // Eliminare un file audio
  async deleteAudioFile(id: string): Promise<void> {
    try {
      // Ottieni tutti i file audio e rimuovi quello con l'ID specificato
      const audioFiles = this.store.get('audioFiles', {});
      const audioFile = audioFiles[id];
      
      if (audioFile && audioFile.meetingId) {
        // Rimuovi riferimento dal meeting
        const meetings = this.store.get('meetings', {});
        const meeting = meetings[audioFile.meetingId];
        
        if (meeting && meeting.audioFileId === id) {
          meeting.audioFileId = undefined;
          this.store.set('meetings', meetings);
        }
      }
      
      delete audioFiles[id];
      
      // Aggiorna i file audio nello store
      this.store.set('audioFiles', audioFiles);
      
      // Rimuovi l'ID dall'elenco degli ID
      const audioFileIds = this.store.get('audioFileIds', []);
      const updatedAudioFileIds = audioFileIds.filter(audioFileId => audioFileId !== id);
      this.store.set('audioFileIds', updatedAudioFileIds);
      
      console.log(`File audio ${id} eliminato`);
    } catch (error) {
      console.error(`Error while deleting audio file ${id}:`, error);
      throw error;
    }
  }
  
  // ========== CONFIG METHODS ==========
  
  // Ottenere le directory monitorate
  getWatchDirectories(): string[] {
    return this.store.get('config.watchDirectories', []);
  }
  
  // Aggiungere una directory monitorata
  addWatchDirectory(dirPath: string): string[] {
    const watchDirs = this.store.get('config.watchDirectories', []);
    
    // Aggiungi solo se non esiste già
    if (!watchDirs.includes(dirPath)) {
      const newWatchDirs = [...watchDirs, dirPath];
      this.store.set('config.watchDirectories', newWatchDirs);
      return newWatchDirs;
    }
    
    return watchDirs;
  }
  
  // Rimuovere una directory monitorata
  removeWatchDirectory(dirPath: string): string[] {
    const watchDirs = this.store.get('config.watchDirectories', []);
    const newWatchDirs = watchDirs.filter(dir => dir !== dirPath);
    this.store.set('config.watchDirectories', newWatchDirs);
    return newWatchDirs;
  }
  
  // Ottenere la chiave API AssemblyAI
  getAssemblyAiKey(): string {
    return this.store.get('config.assemblyAiKey', '');
  }
  
  // Impostare la chiave API AssemblyAI
  setAssemblyAiKey(apiKey: string): void {
    this.store.set('config.assemblyAiKey', apiKey);
  }
  
  // Ottenere la lingua dell'interfaccia
  getLanguage(): string {
    return this.store.get('config.language', 'it'); // Default: italiano
  }
  
  // Impostare la lingua dell'interfaccia
  setLanguage(language: string): void {
    this.store.set('config.language', language);
  }

  // ========== AI PROVIDER METHODS ==========

  getGeminiApiKey(): string {
    return this.store.get('config.geminiApiKey', '');
  }

  setGeminiApiKey(apiKey: string): void {
    this.store.set('config.geminiApiKey', apiKey);
    console.log('Gemini API key updated');
  }

  getClaudeApiKey(): string {
    return this.store.get('config.claudeApiKey', '');
  }

  setClaudeApiKey(apiKey: string): void {
    this.store.set('config.claudeApiKey', apiKey);
    console.log('Claude API key updated');
  }

  getChatGPTApiKey(): string {
    return this.store.get('config.chatgptApiKey', '');
  }

  setChatGPTApiKey(apiKey: string): void {
    this.store.set('config.chatgptApiKey', apiKey);
    console.log('ChatGPT API key updated');
  }

  getAIProvider(): 'gemini' | 'claude' | 'chatgpt' | null {
    return this.store.get('config.aiProvider', 'gemini'); // Default: Gemini
  }

  setAIProvider(provider: 'gemini' | 'claude' | 'chatgpt'): void {
    this.store.set('config.aiProvider', provider);
    console.log(`AI provider set to: ${provider}`);
  }

  // ========== MEETING MINUTES METHODS ==========

  // Salvare le minute di un meeting
  async saveMeetingMinutes(minutes: Omit<MeetingMinutes, 'id' | 'type'> & { id?: string }): Promise<MeetingMinutes> {
    try {
      // Crea un ID se non esiste
      const id = minutes.id || generateId('minutes');
      
      // Crea le minute complete
      const completeMinutes: MeetingMinutes = {
        id,
        meetingId: minutes.meetingId,
        transcriptId: minutes.transcriptId,
        title: minutes.title,
        date: minutes.date,
        participants: minutes.participants,
        agenda: minutes.agenda,
        keyDiscussions: minutes.keyDiscussions,
        actionItems: minutes.actionItems,
        nextMeeting: minutes.nextMeeting,
        metadata: minutes.metadata,
        executiveSummary: minutes.executiveSummary,
        keyDecisions: minutes.keyDecisions,
        criticalActions: minutes.criticalActions,
        risks: minutes.risks,
        nextSteps: minutes.nextSteps,
        followUp: minutes.followUp,
        templateUsed: minutes.templateUsed,
        aiProvider: minutes.aiProvider,
        createdAt: minutes.createdAt || new Date().toISOString(),
        type: 'meetingMinutes'
      };
      
      // Ottieni le minute esistenti e aggiungi/aggiorna le nuove
      const meetingMinutes = this.store.get('meetingMinutes', {});
      meetingMinutes[id] = completeMinutes;
      
      // Ottieni gli ID esistenti e aggiungi il nuovo se necessario
      const meetingMinutesIds = this.store.get('meetingMinutesIds', []);
      if (!meetingMinutesIds.includes(id)) {
        meetingMinutesIds.push(id);
        this.store.set('meetingMinutesIds', meetingMinutesIds);
      }
      
      // Salva le minute aggiornate
      this.store.set('meetingMinutes', meetingMinutes);
      
      console.log('Minute salvate:', completeMinutes);
      return completeMinutes;
    } catch (error) {
      console.error('Error while saving meeting minutes:', error);
      throw error;
    }
  }

  // Ottenere tutte le minute
  async getAllMeetingMinutes(): Promise<MeetingMinutes[]> {
    try {
      const meetingMinutes = this.store.get('meetingMinutes', {});
      const meetingMinutesIds = this.store.get('meetingMinutesIds', []);
      
      // Converte l'oggetto in un array ordinato in base a meetingMinutesIds
      const minutesArray = meetingMinutesIds
        .filter(id => meetingMinutes[id]) // Filtra ID non validi
        .map(id => meetingMinutes[id])
        .sort((a, b) => {
          // Ordina per data di creazione (dal più recente)
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      
      console.log('Minute recuperate:', minutesArray);
      return minutesArray;
    } catch (error) {
      console.error('Error while retrieving meeting minutes:', error);
      throw error;
    }
  }

  // Ottenere minute per meeting ID
  async getMeetingMinutesByMeetingId(meetingId: string): Promise<MeetingMinutes[]> {
    try {
      const allMinutes = await this.getAllMeetingMinutes();
      return allMinutes.filter(minutes => minutes.meetingId === meetingId);
    } catch (error) {
      console.error(`Error while retrieving minutes for meeting ${meetingId}:`, error);
      throw error;
    }
  }

  // Eliminare delle minute
  async deleteMeetingMinutes(id: string): Promise<void> {
    try {
      // Ottieni tutte le minute e rimuovi quelle con l'ID specificato
      const meetingMinutes = this.store.get('meetingMinutes', {});
      delete meetingMinutes[id];
      
      // Aggiorna le minute nello store
      this.store.set('meetingMinutes', meetingMinutes);
      
      // Rimuovi l'ID dall'elenco degli ID
      const meetingMinutesIds = this.store.get('meetingMinutesIds', []);
      const updatedIds = meetingMinutesIds.filter(minutesId => minutesId !== id);
      this.store.set('meetingMinutesIds', updatedIds);
      
      console.log(`Minute ${id} eliminate`);
    } catch (error) {
      console.error(`Error while deleting meeting minutes ${id}:`, error);
      throw error;
    }
  }

  // ========== KNOWLEDGE ENTRY METHODS ==========

  // Salvare un'entry di knowledge base
  async saveKnowledgeEntry(entry: Omit<KnowledgeEntry, 'id' | 'type'> & { id?: string }): Promise<KnowledgeEntry> {
    try {
      // Crea un ID se non esiste
      const id = entry.id || generateId('knowledge');
      
      // Crea l'entry completa
      const completeEntry: KnowledgeEntry = {
        id,
        meetingId: entry.meetingId,
        transcriptId: entry.transcriptId,
        title: entry.title,
        summary: entry.summary,
        tags: entry.tags,
        category: entry.category,
        keyTopics: entry.keyTopics,
        insights: entry.insights,
        actionableItems: entry.actionableItems,
        connections: entry.connections,
        questions: entry.questions,
        abstract: entry.abstract,
        keywords: entry.keywords,
        methodology: entry.methodology,
        findings: entry.findings,
        concepts: entry.concepts,
        hypotheses: entry.hypotheses,
        futureResearch: entry.futureResearch,
        bibliography: entry.bibliography,
        reflection: entry.reflection,
        learnings: entry.learnings,
        ideas: entry.ideas,
        resources: entry.resources,
        habits: entry.habits,
        reminders: entry.reminders,
        templateUsed: entry.templateUsed,
        aiProvider: entry.aiProvider,
        createdAt: entry.createdAt || new Date().toISOString(),
        type: 'knowledgeEntry'
      };
      
      // Ottieni le entry esistenti e aggiungi/aggiorna la nuova
      const knowledgeEntries = this.store.get('knowledgeEntries', {});
      knowledgeEntries[id] = completeEntry;
      
      // Ottieni gli ID esistenti e aggiungi il nuovo se necessario
      const knowledgeEntryIds = this.store.get('knowledgeEntryIds', []);
      if (!knowledgeEntryIds.includes(id)) {
        knowledgeEntryIds.push(id);
        this.store.set('knowledgeEntryIds', knowledgeEntryIds);
      }
      
      // Salva le entry aggiornate
      this.store.set('knowledgeEntries', knowledgeEntries);
      
      console.log('Knowledge entry salvata:', completeEntry);
      return completeEntry;
    } catch (error) {
      console.error('Error while saving knowledge entry:', error);
      throw error;
    }
  }

  // Ottenere tutte le knowledge entries
  async getAllKnowledgeEntries(): Promise<KnowledgeEntry[]> {
    try {
      const knowledgeEntries = this.store.get('knowledgeEntries', {});
      const knowledgeEntryIds = this.store.get('knowledgeEntryIds', []);
      
      // Converte l'oggetto in un array ordinato in base a knowledgeEntryIds
      const entriesArray = knowledgeEntryIds
        .filter(id => knowledgeEntries[id]) // Filtra ID non validi
        .map(id => knowledgeEntries[id])
        .sort((a, b) => {
          // Ordina per data di creazione (dal più recente)
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      
      console.log('Knowledge entries recuperate:', entriesArray);
      return entriesArray;
    } catch (error) {
      console.error('Error while retrieving knowledge entries:', error);
      throw error;
    }
  }

  // Cercare knowledge entries per tag o parole chiave
  async searchKnowledgeEntries(query: string): Promise<KnowledgeEntry[]> {
    try {
      const allEntries = await this.getAllKnowledgeEntries();
      const lowerQuery = query.toLowerCase();
      
      return allEntries.filter(entry => {
        // Cerca in titolo, summary, tag, categoria, domande
        const searchFields = [
          entry.title,
          entry.summary,
          entry.category,
          ...entry.tags,
          ...entry.questions,
          ...entry.connections,
          ...(entry.keywords || [])
        ].join(' ').toLowerCase();
        
        // Cerca anche negli insights e key topics
        const insightTexts = entry.insights.map(i => i.insight + ' ' + i.context).join(' ').toLowerCase();
        const topicTexts = entry.keyTopics.map(t => t.topic + ' ' + t.summary + ' ' + t.keyPoints.join(' ')).join(' ').toLowerCase();
        
        const allText = searchFields + ' ' + insightTexts + ' ' + topicTexts;
        
        return allText.includes(lowerQuery);
      });
    } catch (error) {
      console.error('Error while searching knowledge entries:', error);
      throw error;
    }
  }

  // Ottenere knowledge entries per categoria
  async getKnowledgeEntriesByCategory(category: string): Promise<KnowledgeEntry[]> {
    try {
      const allEntries = await this.getAllKnowledgeEntries();
      return allEntries.filter(entry => entry.category.toLowerCase() === category.toLowerCase());
    } catch (error) {
      console.error(`Error while retrieving entries for category ${category}:`, error);
      throw error;
    }
  }

  // Ottenere knowledge entries per tag
  async getKnowledgeEntriesByTag(tag: string): Promise<KnowledgeEntry[]> {
    try {
      const allEntries = await this.getAllKnowledgeEntries();
      return allEntries.filter(entry => 
        entry.tags.some(t => t.toLowerCase() === tag.toLowerCase())
      );
    } catch (error) {
      console.error(`Error while retrieving entries for tag ${tag}:`, error);
      throw error;
    }
  }

  // Eliminare una knowledge entry
  async deleteKnowledgeEntry(id: string): Promise<void> {
    try {
      // Ottieni tutte le entry e rimuovi quella con l'ID specificato
      const knowledgeEntries = this.store.get('knowledgeEntries', {});
      delete knowledgeEntries[id];
      
      // Aggiorna le entry nello store
      this.store.set('knowledgeEntries', knowledgeEntries);
      
      // Rimuovi l'ID dall'elenco degli ID
      const knowledgeEntryIds = this.store.get('knowledgeEntryIds', []);
      const updatedIds = knowledgeEntryIds.filter(entryId => entryId !== id);
      this.store.set('knowledgeEntryIds', updatedIds);
      
      console.log(`Knowledge entry ${id} eliminata`);
    } catch (error) {
      console.error(`Error while deleting knowledge entry ${id}:`, error);
      throw error;
    }
  }
}

// Esportiamo un'istanza singola del database
export const database = new Database(); 