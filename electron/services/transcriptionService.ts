import fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';

/**
 * Carica un file audio su AssemblyAI
 * @param filePath Percorso del file audio
 * @param apiKey API key di AssemblyAI
 * @returns URL del file caricato
 */
async function uploadAudioFile(filePath: string, apiKey: string): Promise<string> {
  try {
    console.log(`Caricamento del file: ${filePath}`);
    
    // Prepara i dati del form
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    
    // Effettua la richiesta di upload
    const response = await axios.post('https://api.assemblyai.com/v2/upload', formData, {
      headers: {
        'authorization': apiKey,
        ...formData.getHeaders()
      }
    });
    
    console.log('File caricato con successo');
    return response.data.upload_url;
  } catch (error) {
    console.error('Errore durante il caricamento del file:', error);
    throw new Error('Errore durante il caricamento del file audio');
  }
}

/**
 * Inizia una trascrizione su AssemblyAI
 * @param audioUrl URL del file audio caricato
 * @param apiKey API key di AssemblyAI
 * @returns ID della trascrizione
 */
async function startTranscription(audioUrl: string, apiKey: string): Promise<string> {
  try {
    console.log('Avvio della trascrizione');
    
    // Configura la richiesta di trascrizione
    const response = await axios.post('https://api.assemblyai.com/v2/transcript', {
      audio_url: audioUrl,
      speaker_labels: true,
      language_code: 'it'
    }, {
      headers: {
        'authorization': apiKey,
        'content-type': 'application/json'
      }
    });
    
    console.log('Trascrizione avviata con ID:', response.data.id);
    return response.data.id;
  } catch (error) {
    console.error('Errore durante l\'avvio della trascrizione:', error);
    throw new Error('Errore durante l\'avvio della trascrizione');
  }
}

/**
 * Verifica lo stato di una trascrizione
 * @param transcriptionId ID della trascrizione
 * @param apiKey API key di AssemblyAI
 * @returns Stato e testo della trascrizione
 */
async function checkTranscriptionStatus(transcriptionId: string, apiKey: string): Promise<{ status: string; text?: string }> {
  try {
    const response = await axios.get(`https://api.assemblyai.com/v2/transcript/${transcriptionId}`, {
      headers: {
        'authorization': apiKey
      }
    });
    
    return {
      status: response.data.status,
      text: response.data.text
    };
  } catch (error) {
    console.error('Errore durante il controllo dello stato della trascrizione:', error);
    throw new Error('Errore durante il controllo dello stato della trascrizione');
  }
}

/**
 * Esegue la trascrizione di un file audio
 * @param filePath Percorso del file audio
 * @param apiKey API key di AssemblyAI
 * @param transcriptId ID del record di trascrizione nel database locale
 * @param updateStatusCallback Callback per aggiornare lo stato della trascrizione
 */
export async function transcribeAudio(
  filePath: string, 
  apiKey: string, 
  transcriptId: string,
  updateStatusCallback: (transcriptId: string, status: string, text?: string) => void
): Promise<void> {
  try {
    // Aggiorna lo stato a "processing"
    updateStatusCallback(transcriptId, 'processing');
    
    // Carica il file
    const uploadUrl = await uploadAudioFile(filePath, apiKey);
    
    // Inizia la trascrizione
    const assemblyAITranscriptionId = await startTranscription(uploadUrl, apiKey);
    
    // Controlla lo stato della trascrizione periodicamente
    const checkStatus = async () => {
      try {
        const { status, text } = await checkTranscriptionStatus(assemblyAITranscriptionId, apiKey);
        
        console.log(`Stato trascrizione: ${status}`);
        
        if (status === 'completed') {
          // Trascrizione completata
          updateStatusCallback(transcriptId, 'completed', text);
        } else if (status === 'error') {
          // Errore nella trascrizione
          updateStatusCallback(transcriptId, 'error');
        } else {
          // Continua a controllare lo stato
          setTimeout(checkStatus, 5000);
        }
      } catch (error) {
        console.error('Errore durante il controllo dello stato:', error);
        updateStatusCallback(transcriptId, 'error');
      }
    };
    
    // Avvia il controllo dello stato
    setTimeout(checkStatus, 5000);
    
  } catch (error) {
    console.error('Errore durante la trascrizione:', error);
    updateStatusCallback(transcriptId, 'error');
  }
} 