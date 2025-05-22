import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs';
import { BrowserWindow } from 'electron';
import { database, AudioFile } from './db';

export class FileWatcher {
  private watcher: chokidar.FSWatcher | null = null;
  private isWatching: boolean = false;
  private supportedExtensions: string[] = ['.mp3', '.wav', '.m4a', '.ogg'];
  private mainWindow: BrowserWindow | null = null;

  constructor(mainWindow: BrowserWindow | null = null) {
    this.mainWindow = mainWindow;
    console.log('FileWatcher inizializzato');
  }

  /**
   * Avvia il monitoraggio di una directory
   * @param directoryPath Directory da monitorare
   * @returns true se il monitoraggio è stato avviato con successo
   */
  public startWatching(directoryPath: string): boolean {
    try {
      if (this.isWatching && this.watcher) {
        this.stopWatching();
      }

      // Verifica che la directory esista
      if (!fs.existsSync(directoryPath)) {
        console.error(`La directory ${directoryPath} non esiste`);
        return false;
      }

      console.log(`Avvio monitoraggio directory: ${directoryPath}`);
      
      this.watcher = chokidar.watch(directoryPath, {
        ignored: /(^|[\/\\])\../, // ignora file nascosti
        persistent: true,
        ignoreInitial: false, // processa i file esistenti
        awaitWriteFinish: {
          stabilityThreshold: 5000,  // attendi 5 secondi di stabilità
          pollInterval: 1000         // controlla ogni secondo
        }
      });

      // Gestione dell'evento 'add' (nuovo file)
      this.watcher.on('add', async (filePath: string) => {
        const ext = path.extname(filePath).toLowerCase();
        
        // Verifica se è un file audio supportato
        if (this.supportedExtensions.includes(ext)) {
          console.log(`Nuovo file audio rilevato: ${filePath}`);
          
          try {
            // Processa il file audio
            const audioFile = await this.processAudioFile(filePath);
            
            // Notifica l'interfaccia utente
            if (this.mainWindow) {
              this.mainWindow.webContents.send('directory:filesChanged', { 
                type: 'add', 
                file: audioFile 
              });
            }
          } catch (error) {
            console.error(`Errore nel processare il file ${filePath}:`, error);
          }
        }
      });

      // Gestione degli errori
      this.watcher.on('error', (error: Error) => {
        console.error(`Errore nel monitoraggio:`, error);
        if (this.mainWindow) {
          this.mainWindow.webContents.send('directory:filesChanged', { 
            type: 'error', 
            error: error.message 
          });
        }
      });

      this.isWatching = true;
      return true;
    } catch (error) {
      console.error('Errore nell\'avvio del monitoraggio:', error);
      return false;
    }
  }

  /**
   * Ferma il monitoraggio
   */
  public stopWatching(): void {
    if (this.watcher) {
      console.log('Arresto monitoraggio directory');
      this.watcher.close();
      this.watcher = null;
      this.isWatching = false;
    }
  }

  /**
   * Verifica se il monitoraggio è attivo
   */
  public isActive(): boolean {
    return this.isWatching;
  }

  /**
   * Processa un file audio e lo aggiunge al database
   * @param filePath Percorso del file audio
   * @returns Oggetto AudioFile
   */
  private async processAudioFile(filePath: string): Promise<AudioFile> {
    try {
      // Controlla ulteriormente che il file sia stabile prima di elaborarlo
      const isStable = await this.checkFileStability(filePath);
      if (!isStable) {
        console.log(`File in fase di modifica, non verrà elaborato: ${filePath}`);
        throw new Error("File non stabile");
      }
      
      const fileName = path.basename(filePath);
      const stats = fs.statSync(filePath);
      
      // Verifica se il file esiste già nel database (per evitare duplicati)
      const allFiles = await database.getAllAudioFiles();
      const existingFile = allFiles.find(file => file.filePath === filePath);
      
      if (existingFile) {
        console.log(`File già presente nel database: ${filePath}`);
        return existingFile;
      }
      
      // Salva il file audio nel database
      const audioFile = await database.saveAudioFile({
        fileName,
        filePath,
        fileSize: stats.size,
        createdAt: new Date().toISOString()
      });
      
      console.log(`File audio aggiunto al database: ${fileName}`);
      return audioFile;
    } catch (error) {
      console.error(`Errore nel processare il file audio ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Verifica che la dimensione del file rimanga stabile nel tempo
   * @param filePath Percorso del file da controllare
   * @returns true se il file è stabile
   */
  private async checkFileStability(filePath: string): Promise<boolean> {
    // Prima dimensione del file
    let size1 = 0;
    try {
      const stats = fs.statSync(filePath);
      size1 = stats.size;
    } catch (error) {
      return false; // File non accessibile
    }

    // Attendi 10 secondi
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Seconda dimensione del file
    let size2 = 0;
    try {
      const stats = fs.statSync(filePath);
      size2 = stats.size;
    } catch (error) {
      return false; // File non accessibile
    }
    
    // Se le dimensioni sono uguali, il file è stabile
    console.log(`Controllo stabilità file ${filePath}: dimensione iniziale ${size1}, dimensione finale ${size2}`);
    return size1 === size2 && size1 > 0;
  }
} 