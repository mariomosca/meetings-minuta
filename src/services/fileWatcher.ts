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
      
      // Flag to track initial scan completion
      let initialScanComplete = false;
      
      this.watcher = chokidar.watch(directoryPath, {
        ignored: /(^|[/\\])\../, // ignore hidden files
        persistent: true,
        ignoreInitial: false, // process existing files
        awaitWriteFinish: {
          stabilityThreshold: 5000,  // wait 5 seconds of stability
          pollInterval: 1000         // check every second
        }
      });
      
      // Track when initial scan is complete
      this.watcher.on('ready', async () => {
        initialScanComplete = true;
        console.log('Initial file scan completed, now checking for orphaned database entries...');
        
        // Check for files in database that no longer exist in the filesystem
        await this.cleanupOrphanedFiles(directoryPath);
        
        console.log('Cleanup completed, now watching for changes...');
      });

      // Handle 'add' event (new file)
      this.watcher.on('add', async (filePath: string) => {
        const ext = path.extname(filePath).toLowerCase();
        
        // Check if it's a supported audio file
        if (this.supportedExtensions.includes(ext)) {
          const isExistingFile = !initialScanComplete;
          console.log(`${isExistingFile ? 'Existing' : 'New'} audio file detected: ${filePath}`);
          
          try {
            // Process the audio file
            const audioFile = await this.processAudioFile(filePath, isExistingFile);
            
            // Only notify UI for new files (not existing ones during startup)
            if (this.mainWindow && !isExistingFile) {
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

      // Handle 'unlink' event (file removed)
      this.watcher.on('unlink', async (filePath: string) => {
        const ext = path.extname(filePath).toLowerCase();
        
        // Check if it's a supported audio file
        if (this.supportedExtensions.includes(ext)) {
          console.log(`Audio file removed: ${filePath}`);
          
          try {
            // Remove the audio file from database
            const removedFile = await this.removeAudioFile(filePath);
            
            if (removedFile) {
              // Notify the user interface
              if (this.mainWindow) {
                this.mainWindow.webContents.send('directory:filesChanged', { 
                  type: 'remove', 
                  file: removedFile 
                });
              }
            }
          } catch (error) {
            console.error(`Error removing file ${filePath}:`, error);
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
   * @param isExistingFile Whether this is an existing file found during startup scan
   * @returns AudioFile object
   */
  private async processAudioFile(filePath: string, isExistingFile = false): Promise<AudioFile> {
    try {
      // For existing files during startup, skip stability check since they're likely stable
      // For new files, check stability to ensure they're not being written
      if (!isExistingFile) {
        const isStable = await this.checkFileStability(filePath);
        if (!isStable) {
          console.log(`File being modified, will not be processed: ${filePath}`);
          throw new Error("File not stable");
        }
      }
      
      const fileName = path.basename(filePath);
      const stats = fs.statSync(filePath);
      
      // Check if the file already exists in the database (to avoid duplicates)
      const allFiles = await database.getAllAudioFiles();
      const existingFile = allFiles.find(file => file.filePath === filePath);
      
      if (existingFile) {
        console.log(`File already exists in database: ${filePath} ${isExistingFile ? '(startup scan)' : '(duplicate avoided)'}`);
        return existingFile;
      }
      
      // Save the audio file in the database
      const audioFile = await database.saveAudioFile({
        fileName,
        filePath,
        fileSize: stats.size,
        createdAt: new Date().toISOString()
      });
      
      console.log(`Audio file added to database: ${fileName} ${isExistingFile ? '(startup scan)' : '(new file)'}`);
      return audioFile;
    } catch (error) {
      console.error(`Error processing audio file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Remove an audio file from the database
   * @param filePath Path to the removed audio file
   * @returns AudioFile object if found and removed, null otherwise
   */
  private async removeAudioFile(filePath: string): Promise<AudioFile | null> {
    try {
      // Find the file in the database
      const allFiles = await database.getAllAudioFiles();
      const existingFile = allFiles.find(file => file.filePath === filePath);
      
      if (!existingFile) {
        console.log(`File not found in database: ${filePath}`);
        return null;
      }
      
      // Check if there are existing transcripts or meetings
      const transcripts = await database.getTranscriptsByAudioFileId(existingFile.id);
      const hasCompletedTranscripts = transcripts.some(t => t.status === 'completed');
      
      if (hasCompletedTranscripts) {
        console.log(`File ${existingFile.fileName} has completed transcripts, keeping database records but marking file as missing`);
        
        // Instead of deleting, we could mark the file as "missing" if needed
        // For now, we'll just log and return the file without deleting from database
        return existingFile;
      }
      
      // Only remove if there are no completed transcripts
      // This removes incomplete/failed transcripts but preserves valuable completed work
      const incompleteTranscripts = transcripts.filter(t => t.status !== 'completed');
      for (const transcript of incompleteTranscripts) {
        await database.deleteTranscript(transcript.id);
        console.log(`Removed incomplete transcript: ${transcript.id}`);
      }
      
      // Remove the audio file from the database only if no completed transcripts exist
      await database.deleteAudioFile(existingFile.id);
      console.log(`Audio file removed from database: ${existingFile.fileName}`);
      return existingFile;
    } catch (error) {
      console.error(`Error removing audio file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Clean up database entries for files that no longer exist in the filesystem
   * @param directoryPath Directory being monitored
   */
  private async cleanupOrphanedFiles(directoryPath: string): Promise<void> {
    try {
      // Get all audio files from database
      const allFiles = await database.getAllAudioFiles();
      
      // Filter files that should be in the monitored directory
      const monitoredFiles = allFiles.filter(file => 
        file.filePath.startsWith(directoryPath)
      );
      
      console.log(`Found ${monitoredFiles.length} files in database for directory ${directoryPath}`);
      
      // Check each file to see if it still exists
      const orphanedFiles = [];
      for (const file of monitoredFiles) {
        if (!fs.existsSync(file.filePath)) {
          orphanedFiles.push(file);
        }
      }
      
      console.log(`Found ${orphanedFiles.length} orphaned files in database`);
      
      // Remove orphaned files
      for (const orphanedFile of orphanedFiles) {
        console.log(`Cleaning up orphaned file: ${orphanedFile.fileName}`);
        await this.removeAudioFile(orphanedFile.filePath);
      }
      
      if (orphanedFiles.length > 0) {
        // Notify UI that files were removed during cleanup
        if (this.mainWindow) {
          this.mainWindow.webContents.send('directory:filesChanged', { 
            type: 'cleanup',
            removedCount: orphanedFiles.length
          });
        }
      }
    } catch (error) {
      console.error('Error during orphaned files cleanup:', error);
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