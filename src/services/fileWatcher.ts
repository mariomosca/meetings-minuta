import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs';
import { BrowserWindow } from 'electron';
import { database, AudioFile } from './db';

export class FileWatcher {
  private watcher: chokidar.FSWatcher | null = null;
  private isWatching = false;
  private supportedExtensions: string[] = ['.mp3', '.wav', '.m4a', '.ogg'];
  private mainWindow: BrowserWindow | null = null;

  constructor(mainWindow: BrowserWindow | null = null) {
    this.mainWindow = mainWindow;
    console.log('FileWatcher initialized');
  }

  /**
   * Start monitoring a directory
   * @param directoryPath Directory to monitor
   * @returns true if monitoring started successfully
   */
  public startWatching(directoryPath: string): boolean {
    try {
      if (this.isWatching && this.watcher) {
        this.stopWatching();
      }

      // Verify that the directory exists
      if (!fs.existsSync(directoryPath)) {
        console.error(`Directory ${directoryPath} does not exist`);
        return false;
      }

      console.log(`Starting directory monitoring: ${directoryPath}`);
      
      this.watcher = chokidar.watch(directoryPath, {
        ignored: /(^|[/\\])\../, // ignore hidden files
        persistent: true,
        ignoreInitial: false, // process existing files
        awaitWriteFinish: {
          stabilityThreshold: 5000,  // wait 5 seconds of stability
          pollInterval: 1000         // check every second
        }
      });

      // Handle 'add' event (new file)
      this.watcher.on('add', async (filePath: string) => {
        const ext = path.extname(filePath).toLowerCase();
        
        // Check if it's a supported audio file
        if (this.supportedExtensions.includes(ext)) {
          console.log(`New audio file detected: ${filePath}`);
          
          try {
            // Process the audio file
            const audioFile = await this.processAudioFile(filePath);
            
            // Notify the user interface
            if (this.mainWindow) {
              this.mainWindow.webContents.send('directory:filesChanged', { 
                type: 'add', 
                file: audioFile 
              });
            }
          } catch (error) {
            console.error(`Error processing file ${filePath}:`, error);
          }
        }
      });

      // Error handling
      this.watcher.on('error', (error: Error) => {
        console.error(`Monitoring error:`, error);
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
      console.error('Error starting monitoring:', error);
      return false;
    }
  }

  /**
   * Stop monitoring
   */
  public stopWatching(): void {
    if (this.watcher) {
      console.log('Stopping directory monitoring');
      this.watcher.close();
      this.watcher = null;
      this.isWatching = false;
    }
  }

  /**
   * Check if monitoring is active
   */
  public isActive(): boolean {
    return this.isWatching;
  }

  /**
   * Process an audio file and add it to the database
   * @param filePath Path to the audio file
   * @returns AudioFile object
   */
  private async processAudioFile(filePath: string): Promise<AudioFile> {
    try {
      // Further check that the file is stable before processing
      const isStable = await this.checkFileStability(filePath);
      if (!isStable) {
        console.log(`File being modified, will not be processed: ${filePath}`);
        throw new Error("File not stable");
      }
      
      const fileName = path.basename(filePath);
      const stats = fs.statSync(filePath);
      
      // Check if the file already exists in the database (to avoid duplicates)
      const allFiles = await database.getAllAudioFiles();
      const existingFile = allFiles.find(file => file.filePath === filePath);
      
      if (existingFile) {
        console.log(`File already exists in database: ${filePath}`);
        return existingFile;
      }
      
      // Save the audio file in the database
      const audioFile = await database.saveAudioFile({
        fileName,
        filePath,
        fileSize: stats.size,
        createdAt: new Date().toISOString()
      });
      
      console.log(`Audio file added to database: ${fileName}`);
      return audioFile;
    } catch (error) {
      console.error(`Error processing audio file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Verify that the file size remains stable over time
   * @param filePath Path to the file to check
   * @returns true if the file is stable
   */
  private async checkFileStability(filePath: string): Promise<boolean> {
    // First file size
    let size1 = 0;
    try {
      const stats = fs.statSync(filePath);
      size1 = stats.size;
    } catch (error) {
      return false; // File not accessible
    }

    // Wait 10 seconds
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Second file size
    let size2 = 0;
    try {
      const stats = fs.statSync(filePath);
      size2 = stats.size;
    } catch (error) {
      return false; // File not accessible
    }
    
    // If sizes are equal, the file is stable
    console.log(`File stability check ${filePath}: initial size ${size1}, final size ${size2}`);
    return size1 === size2 && size1 > 0;
  }
} 