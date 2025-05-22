import axios from 'axios';
import fs from 'fs';
import { database, Transcript, Utterance } from './db';
import { BrowserWindow } from 'electron';

export class AssemblyAIService {
  private apiKey: string;
  private baseURL: string = 'https://api.assemblyai.com/v2';
  private mainWindow: BrowserWindow | null = null;

  constructor(apiKey: string = '', mainWindow: BrowserWindow | null = null) {
    this.apiKey = apiKey;
    this.mainWindow = mainWindow;
    console.log('AssemblyAIService inizializzato');
  }

  /**
   * Imposta la chiave API
   * @param apiKey Chiave API di AssemblyAI
   */
  public setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
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
      console.error('Errore nel caricamento del file audio:', error);
      throw new Error(`Errore nel caricamento del file: ${error.message}`);
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
        throw new Error('Chiave API di AssemblyAI non impostata');
      }
      
      // Ottieni il file audio dal database
      const audioFile = await database.getAudioFileById(audioFileId);
      if (!audioFile) {
        throw new Error(`File audio non trovato: ${audioFileId}`);
      }
      
      // Crea una trascrizione in stato "queued"
      const initialTranscript = await database.saveTranscript({
        meetingId: audioFile.meetingId || '',
        audioFileId: audioFileId,
        status: 'queued',
        text: '',
        createdAt: new Date().toISOString()
      });
      
      // Notifica l'UI che la trascrizione è in coda
      this.notifyTranscriptionUpdate(initialTranscript);
      
      // Esegui la trascrizione in background
      this.processTranscription(audioFile.filePath, initialTranscript.id)
        .catch(error => console.error('Errore nel processo di trascrizione:', error));
      
      return initialTranscript;
    } catch (error) {
      console.error('Errore nell\'avvio della trascrizione:', error);
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
        throw new Error(`Trascrizione non trovata: ${transcriptId}`);
      }
      
      transcript = await database.saveTranscript({
        ...transcript,
        status: 'processing'
      });
      
      // Notifica l'UI che la trascrizione è in elaborazione
      this.notifyTranscriptionUpdate(transcript);
      
      // Carica il file audio su AssemblyAI
      const uploadUrl = await this.uploadAudio(filePath);
      console.log(`File caricato con successo: ${uploadUrl}`);
      
      // Avvia la trascrizione
      const transcriptionResponse = await axios.post(
        `${this.baseURL}/transcript`,
        {
          audio_url: uploadUrl,
          speaker_labels: true, // Abilita il riconoscimento dei parlanti
          language_code: 'it' // Imposta l'italiano come lingua
        },
        {
          headers: {
            'Authorization': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const assemblyAiId = transcriptionResponse.data.id;
      console.log(`Trascrizione avviata con ID: ${assemblyAiId}`);
      
      // Aggiorna la trascrizione con l'ID di AssemblyAI
      transcript = await database.saveTranscript({
        ...transcript,
        assemblyAiId
      });
      
      // Polling per verificare lo stato della trascrizione
      await this.pollTranscriptionStatus(assemblyAiId, transcriptId);
    } catch (error) {
      console.error('Errore nel processo di trascrizione:', error);
      
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
        console.log(`Stato trascrizione ${assemblyAiId}: ${status}`);
        
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
          if (transcript) {
            const updatedTranscript = await database.saveTranscript({
              ...transcript,
              status: 'completed',
              text,
              utterances,
              completedAt: new Date().toISOString()
            });
            
            // Notifica l'UI che la trascrizione è completata
            this.notifyTranscriptionUpdate(updatedTranscript);
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
        // Continua il polling per gli stati 'queued' o 'processing'
      }
    } catch (error) {
      console.error('Errore nel polling della trascrizione:', error);
      
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