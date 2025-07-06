import axios from 'axios';
import fs from 'fs';
import { database, Transcript, Utterance } from './db';
import { BrowserWindow } from 'electron';


export class AssemblyAIService {
  private apiKey: string;
  private baseURL = 'https://api.assemblyai.com/v2';
  private mainWindow: BrowserWindow | null = null;

  constructor(apiKey = '', mainWindow: BrowserWindow | null = null) {
    this.apiKey = apiKey;
    this.mainWindow = mainWindow;
    console.log('AssemblyAIService inizializzato');
  }

  /**
   * Imposta la chiave API
   * @param apiKey Chiave API di AssemblyAI
   */
  public setApiKey(apiKey: string): void {
    const previousKey = this.apiKey;
    this.apiKey = apiKey;
    console.log('AssemblyAI API key updated:', {
      hasKey: !!apiKey && apiKey.trim().length > 0,
      keyLength: apiKey ? apiKey.length : 0,
      changed: previousKey !== apiKey
    });
  }

  /**
   * Verifica se la chiave API è valida
   * @returns true se la chiave API è impostata
   */
  public hasValidApiKey(): boolean {
    return !!this.apiKey && this.apiKey.trim().length > 0;
  }

  /**
   * Carica un file audio su AssemblyAI
   * @param filePath Percorso del file audio
   * @returns URL del file caricato
   */
  private async uploadAudio(filePath: string): Promise<string> {
    try {
      console.log(`Caricamento file: ${filePath}`);
      
      // Leggi il file come buffer
      const fileData = fs.readFileSync(filePath);
      
      // Ottieni l'URL di upload
      const response = await axios.post(
        `${this.baseURL}/upload`,
        fileData,
        {
          headers: {
            'Authorization': this.apiKey,
            'Content-Type': 'application/octet-stream'
          }
        }
      );
      
      return response.data.upload_url;
    } catch (error) {
      console.error('Error uploading audio file:', error);
      throw new Error(`Error uploading file: ${error.message}`);
    }
  }

  /**
   * Avvia la trascrizione di un file audio
   * @param audioFileId ID del file audio
   * @returns Promise<Transcript>
   */
  public async startTranscription(audioFileId: string): Promise<Transcript> {
    try {
      if (!this.hasValidApiKey()) {
        throw new Error('AssemblyAI API key not set');
      }
      
      // Ottieni il file audio dal database
      const audioFile = await database.getAudioFileById(audioFileId);
      if (!audioFile) {
        throw new Error(`Audio file not found: ${audioFileId}`);
      }

      console.log(`Starting transcription for audioFile ${audioFileId}, meetingId: ${audioFile.meetingId || 'none'}`);

      // Crea una trascrizione in stato "queued"
      const initialTranscript = await database.saveTranscript({
        meetingId: audioFile.meetingId || '',
        audioFileId: audioFileId,
        status: 'queued',
        text: '',
        createdAt: new Date().toISOString()
      });

      console.log(`Created transcript ${initialTranscript.id} with meetingId: ${initialTranscript.meetingId || 'none'}`);

      // Notifica l'UI che la trascrizione è in coda
      this.notifyTranscriptionUpdate(initialTranscript);
      
      // Esegui la trascrizione in background
      this.processTranscription(audioFile.filePath, initialTranscript.id)
        .catch(error => console.error('Error in transcription process:', error));
      
      return initialTranscript;
    } catch (error) {
      console.error('Error starting transcription:', error);
      throw error;
    }
  }

  /**
   * Processa la trascrizione di un file audio
   * @param filePath Percorso del file audio
   * @param transcriptId ID della trascrizione
   */
  private async processTranscription(filePath: string, transcriptId: string): Promise<void> {
    try {
      // Aggiorna lo stato della trascrizione a "processing"
      let transcript = await database.getTranscriptById(transcriptId);
      if (!transcript) {
        throw new Error(`Transcript not found: ${transcriptId}`);
      }
      
      transcript = await database.saveTranscript({
        ...transcript,
        status: 'processing'
      });
      
      // Notifica l'UI che la trascrizione è in elaborazione
      this.notifyTranscriptionUpdate(transcript);
      
      // Carica il file audio su AssemblyAI
      const uploadUrl = await this.uploadAudio(filePath);
      console.log(`File uploaded successfully: ${uploadUrl}`);
      
      // Avvia la trascrizione
      const transcriptionResponse = await axios.post(
        `${this.baseURL}/transcript`,
        {
          audio_url: uploadUrl,
          speaker_labels: true, // Abilita il riconoscimento dei parlanti
          language_code: 'en' // Set English as default language
        },
        {
          headers: {
            'Authorization': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const assemblyAiId = transcriptionResponse.data.id;
      console.log(`Transcription started with ID: ${assemblyAiId}`);
      
      // Aggiorna la trascrizione con l'ID di AssemblyAI
      transcript = await database.saveTranscript({
        ...transcript,
        assemblyAiId
      });
      
      // Polling per verificare lo stato della trascrizione
      await this.pollTranscriptionStatus(assemblyAiId, transcriptId);
    } catch (error) {
      console.error('Error in transcription process:', error);
      
      // Aggiorna lo stato della trascrizione a "error"
      const transcript = await database.getTranscriptById(transcriptId);
      if (transcript) {
        const updatedTranscript = await database.saveTranscript({
          ...transcript,
          status: 'error'
        });
        
        // Notifica l'UI che la trascrizione è in errore
        this.notifyTranscriptionUpdate(updatedTranscript);
      }
    }
  }

  /**
   * Verifica periodicamente lo stato della trascrizione
   * @param assemblyAiId ID della trascrizione su AssemblyAI
   * @param transcriptId ID della trascrizione nel database
   */
  private async pollTranscriptionStatus(assemblyAiId: string, transcriptId: string): Promise<void> {
    try {
      let completed = false;
      let transcriptionProcessed = false;
      
      while (!completed) {
        // Attendi 3 secondi tra ogni richiesta
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Verifica lo stato della trascrizione
        const response = await axios.get(
          `${this.baseURL}/transcript/${assemblyAiId}`,
          {
            headers: {
              'Authorization': this.apiKey
            }
          }
        );
        
        const status = response.data.status;
        console.log(`Transcription status ${assemblyAiId}: ${status}`);
        
        if (status === 'completed') {
          completed = true;
          
          // Estrai il testo della trascrizione
          const text = response.data.text;
          
          // Estrai gli utterances (frasi dei parlanti)
          let utterances: Utterance[] = [];
          
          if (response.data.utterances && response.data.utterances.length > 0) {
            utterances = response.data.utterances.map((u: any) => ({
              speaker: `Speaker ${u.speaker}`,
              text: u.text,
              start: u.start,
              end: u.end
            }));
          }
          
          // Aggiorna la trascrizione nel database
          const transcript = await database.getTranscriptById(transcriptId);
          if (transcript && !transcriptionProcessed) {
            transcriptionProcessed = true; // Segna come elaborata per evitare duplicazioni
            
            const updatedTranscript = await database.saveTranscript({
              ...transcript,
              status: 'completed',
              text,
              utterances,
              completedAt: new Date().toISOString()
            });
            
            // Notifica l'UI che la trascrizione è completata
            this.notifyTranscriptionUpdate(updatedTranscript);
            
            // Se la trascrizione non è associata a una riunione, creane una nuova
            if (!transcript.meetingId || transcript.meetingId === '') {
              console.log(`Transcript ${transcript.id} has no meetingId, creating new meeting. AudioFileId: ${transcript.audioFileId}`);
              
              // Verifica di nuovo se l'audioFile ha un meetingId (potrebbe essere stato aggiornato nel frattempo)
              if (transcript.audioFileId) {
                const currentAudioFile = await database.getAudioFileById(transcript.audioFileId);
                if (currentAudioFile && currentAudioFile.meetingId) {
                  console.log(`AudioFile now has meetingId ${currentAudioFile.meetingId}, updating transcript instead of creating new meeting`);
                  
                  // Aggiorna la trascrizione con il meetingId del file audio
                  await database.saveTranscript({
                    ...updatedTranscript,
                    meetingId: currentAudioFile.meetingId
                  });
                  
                  // Aggiorna anche il meeting con il transcriptId se non ce l'ha già
                  const meeting = await database.getMeetingById(currentAudioFile.meetingId);
                  if (meeting && !meeting.transcriptId) {
                    await database.saveMeeting({
                      ...meeting,
                      transcriptId: transcript.id
                    });
                  }
                  
                  // Invia notifica dell'aggiornamento della trascrizione con il nuovo meetingId
                  const finalTranscript = await database.getTranscriptById(transcript.id);
                  if (finalTranscript) {
                    this.notifyTranscriptionUpdate(finalTranscript);
                  }
                  
                  return; // Non creare una nuova riunione
                }
              }
              
              console.log('Creating new meeting from transcript');
              await this.createMeetingFromTranscription(updatedTranscript);
            } else {
              console.log(`Transcript ${transcript.id} already associated with meeting ${transcript.meetingId}`);
            }
          }
        } else if (status === 'error') {
          completed = true;
          
          // Aggiorna la trascrizione nel database
          const transcript = await database.getTranscriptById(transcriptId);
          if (transcript) {
            const updatedTranscript = await database.saveTranscript({
              ...transcript,
              status: 'error'
            });
            
            // Notifica l'UI che la trascrizione è in errore
            this.notifyTranscriptionUpdate(updatedTranscript);
          }
        }
        // Per stati "queued" o "processing", continua il polling
      }
    } catch (error) {
      console.error('Error in transcription polling:', error);
      
      // In caso di errore, aggiorna lo stato della trascrizione
      try {
        const transcript = await database.getTranscriptById(transcriptId);
        if (transcript) {
          const updatedTranscript = await database.saveTranscript({
            ...transcript,
            status: 'error'
          });
          
          this.notifyTranscriptionUpdate(updatedTranscript);
        }
      } catch (innerError) {
        console.error('Error updating transcript status after polling failure:', innerError);
      }
    }
  }

  /**
   * Crea una nuova riunione a partire da una trascrizione
   * @param transcript La trascrizione completata
   */
  private async createMeetingFromTranscription(transcript: Transcript): Promise<void> {
    try {
      // Ottieni il file audio associato
      if (!transcript.audioFileId) {
        console.log('No audio file ID found in transcript, skipping meeting creation');
        return;
      }
      
      const audioFile = await database.getAudioFileById(transcript.audioFileId);
      if (!audioFile) {
        console.log(`Audio file not found for transcript ${transcript.id}, skipping meeting creation`);
        return;
      }
      
      // Estrai un titolo dal nome del file
      let title = 'Meeting from transcription';
      if (audioFile.fileName) {
        // Rimuovi l'estensione dal nome del file e usa come titolo
        title = `Meeting from ${audioFile.fileName.replace(/\.[^/.]+$/, '')}`;
      }
      
      // Crea la riunione
      const meeting = await database.saveMeeting({
        title,
        description: `Meeting automatically created from audio file ${audioFile.fileName}`,
        date: new Date().toISOString().split('T')[0], // Data corrente
        participants: [],
        createdAt: new Date().toISOString(),
        audioFileId: audioFile.id,
        transcriptId: transcript.id
      });
      
      // Aggiorna la trascrizione con l'ID della riunione
      await database.saveTranscript({
        ...transcript,
        meetingId: meeting.id
      });
      
      // Aggiorna il file audio con l'ID della riunione
      await database.saveAudioFile({
        ...audioFile,
        meetingId: meeting.id,
        transcriptId: transcript.id
      });
      
      // Notifica la creazione della riunione
      if (this.mainWindow) {
        this.mainWindow.webContents.send('meeting:created', meeting);
      }
      
      console.log(`Meeting created from transcript: ${meeting.id}`);
    } catch (error) {
      console.error('Error creating meeting from transcription:', error);
    }
  }

  /**
   * Notifica l'interfaccia utente di un aggiornamento nella trascrizione
   * @param transcript Trascrizione aggiornata
   */
  private notifyTranscriptionUpdate(transcript: Transcript): void {
    if (this.mainWindow) {
      this.mainWindow.webContents.send('transcript:statusChanged', transcript);
    }
  }
} 