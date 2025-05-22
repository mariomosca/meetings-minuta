import path from 'path';
import { promises as fs } from 'fs';
import mm from 'music-metadata';

// Estensioni supportate per i file audio
const SUPPORTED_AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac'];

/**
 * Verifica se un file è un file audio supportato
 * @param filePath Percorso del file
 * @returns true se il file è un file audio supportato
 */
export function isAudioFile(filePath: string): boolean {
  const extension = path.extname(filePath).toLowerCase();
  return SUPPORTED_AUDIO_EXTENSIONS.includes(extension);
}

/**
 * Ottiene i metadati di un file audio
 * @param filePath Percorso del file audio
 * @returns I metadati del file audio
 */
export async function getAudioMetadata(filePath: string): Promise<{ duration?: number }> {
  try {
    // Verifica se il file esiste
    await fs.access(filePath);
    
    // Estrai i metadati
    const metadata = await mm.parseFile(filePath);
    
    return {
      duration: metadata.format.duration
    };
  } catch (error) {
    console.error(`Errore nell'estrazione dei metadati audio: ${error}`);
    return {};
  }
} 