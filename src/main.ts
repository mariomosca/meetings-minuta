import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import fs from 'fs';
import { database } from './services/db';
import { FileWatcher } from './services/fileWatcher';
import { AssemblyAIService } from './services/assemblyAI';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Variabili globali per i servizi
let mainWindow: BrowserWindow | null = null;
let fileWatcher: FileWatcher | null = null;
let assemblyAIService: AssemblyAIService | null = null;

// Configurazione degli handler IPC per il database
function setupIPCHandlers() {
  // ==================== NOTE HANDLERS ====================
  
  // Ottenere tutte le note
  ipcMain.handle('notes:getAll', async () => {
    try {
      return await database.getAllNotes();
    } catch (error) {
      console.error('Errore nell\'handler notes:getAll:', error);
      throw error;
    }
  });

  // Ottenere una nota specifica
  ipcMain.handle('notes:getById', async (_event, id) => {
    try {
      return await database.getNoteById(id);
    } catch (error) {
      console.error(`Errore nell'handler notes:getById (${id}):`, error);
      throw error;
    }
  });

  // Salvare una nota
  ipcMain.handle('notes:save', async (_event, note) => {
    try {
      return await database.saveNote(note);
    } catch (error) {
      console.error('Errore nell\'handler notes:save:', error);
      throw error;
    }
  });

  // Eliminare una nota
  ipcMain.handle('notes:delete', async (_event, id) => {
    try {
      await database.deleteNote(id);
      return { success: true, id };
    } catch (error) {
      console.error(`Errore nell'handler notes:delete (${id}):`, error);
      throw error;
    }
  });
  
  // ==================== MEETINGS HANDLERS ====================
  
  // Ottenere tutte le riunioni
  ipcMain.handle('meetings:getAll', async () => {
    try {
      return await database.getAllMeetings();
    } catch (error) {
      console.error('Errore nell\'handler meetings:getAll:', error);
      throw error;
    }
  });
  
  // Ottenere una riunione specifica
  ipcMain.handle('meetings:getById', async (_event, id) => {
    try {
      return await database.getMeetingById(id);
    } catch (error) {
      console.error(`Errore nell'handler meetings:getById (${id}):`, error);
      throw error;
    }
  });
  
  // Salvare una riunione
  ipcMain.handle('meetings:save', async (_event, meeting) => {
    try {
      return await database.saveMeeting(meeting);
    } catch (error) {
      console.error('Errore nell\'handler meetings:save:', error);
      throw error;
    }
  });
  
  // Eliminare una riunione
  ipcMain.handle('meetings:delete', async (_event, id) => {
    try {
      await database.deleteMeeting(id);
      return { success: true, id };
    } catch (error) {
      console.error(`Errore nell'handler meetings:delete (${id}):`, error);
      throw error;
    }
  });
  
  // ==================== TRANSCRIPTS HANDLERS ====================
  
  // Ottenere tutte le trascrizioni
  ipcMain.handle('transcripts:getAll', async () => {
    try {
      return await database.getAllTranscripts();
    } catch (error) {
      console.error('Errore nell\'handler transcripts:getAll:', error);
      throw error;
    }
  });
  
  // Ottenere una trascrizione specifica
  ipcMain.handle('transcripts:getById', async (_event, id) => {
    try {
      return await database.getTranscriptById(id);
    } catch (error) {
      console.error(`Errore nell'handler transcripts:getById (${id}):`, error);
      throw error;
    }
  });
  
  // Ottenere trascrizioni per una riunione specifica
  ipcMain.handle('transcripts:getByMeetingId', async (_event, meetingId) => {
    try {
      return await database.getTranscriptsByMeetingId(meetingId);
    } catch (error) {
      console.error(`Errore nell'handler transcripts:getByMeetingId (${meetingId}):`, error);
      throw error;
    }
  });
  
  // Salvare una trascrizione
  ipcMain.handle('transcripts:save', async (_event, transcript) => {
    try {
      return await database.saveTranscript(transcript);
    } catch (error) {
      console.error('Errore nell\'handler transcripts:save:', error);
      throw error;
    }
  });
  
  // Eliminare una trascrizione
  ipcMain.handle('transcripts:delete', async (_event, id) => {
    try {
      await database.deleteTranscript(id);
      return { success: true, id };
    } catch (error) {
      console.error(`Errore nell'handler transcripts:delete (${id}):`, error);
      throw error;
    }
  });
  
  // ==================== AUDIO FILES HANDLERS ====================
  
  // Ottenere tutti i file audio
  ipcMain.handle('audioFiles:getAll', async () => {
    try {
      return await database.getAllAudioFiles();
    } catch (error) {
      console.error('Errore nell\'handler audioFiles:getAll:', error);
      throw error;
    }
  });
  
  // Ottenere un file audio specifico
  ipcMain.handle('audioFiles:getById', async (_event, id) => {
    try {
      return await database.getAudioFileById(id);
    } catch (error) {
      console.error(`Errore nell'handler audioFiles:getById (${id}):`, error);
      throw error;
    }
  });
  
  // Ottenere file audio per una riunione specifica
  ipcMain.handle('audioFiles:getByMeetingId', async (_event, meetingId) => {
    try {
      return await database.getAudioFileByMeetingId(meetingId);
    } catch (error) {
      console.error(`Errore nell'handler audioFiles:getByMeetingId (${meetingId}):`, error);
      throw error;
    }
  });
  
  // Salvare un file audio
  ipcMain.handle('audioFiles:save', async (_event, audioFile) => {
    try {
      return await database.saveAudioFile(audioFile);
    } catch (error) {
      console.error('Errore nell\'handler audioFiles:save:', error);
      throw error;
    }
  });
  
  // Eliminare un file audio
  ipcMain.handle('audioFiles:delete', async (_event, id) => {
    try {
      await database.deleteAudioFile(id);
      return { success: true, id };
    } catch (error) {
      console.error(`Errore nell'handler audioFiles:delete (${id}):`, error);
      throw error;
    }
  });
  
  // Importare un file audio dal filesystem
  ipcMain.handle('audioFiles:import', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
          { name: 'File Audio', extensions: ['mp3', 'wav', 'm4a', 'ogg'] }
        ]
      });
      
      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }
      
      const filePath = result.filePaths[0];
      const fileName = path.basename(filePath);
      const stats = fs.statSync(filePath);
      
      // Salva il file audio nel database
      const audioFile = await database.saveAudioFile({
        fileName,
        filePath,
        fileSize: stats.size,
        createdAt: new Date().toISOString()
      });
      
      return audioFile;
    } catch (error) {
      console.error('Errore nell\'handler audioFiles:import:', error);
      throw error;
    }
  });
  
  // ==================== CONFIG HANDLERS ====================
  
  // Ottenere le directory monitorate
  ipcMain.handle('config:getWatchDirectories', () => {
    try {
      return database.getWatchDirectories();
    } catch (error) {
      console.error('Errore nell\'handler config:getWatchDirectories:', error);
      throw error;
    }
  });
  
  // Aggiungere una directory monitorata
  ipcMain.handle('config:addWatchDirectory', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
      });
      
      if (result.canceled || result.filePaths.length === 0) {
        return database.getWatchDirectories();
      }
      
      const dirPath = result.filePaths[0];
      return database.addWatchDirectory(dirPath);
    } catch (error) {
      console.error('Errore nell\'handler config:addWatchDirectory:', error);
      throw error;
    }
  });
  
  // Rimuovere una directory monitorata
  ipcMain.handle('config:removeWatchDirectory', (_event, dirPath) => {
    try {
      return database.removeWatchDirectory(dirPath);
    } catch (error) {
      console.error(`Errore nell'handler config:removeWatchDirectory (${dirPath}):`, error);
      throw error;
    }
  });
  
  // Ottenere la chiave API AssemblyAI
  ipcMain.handle('config:getAssemblyAiKey', () => {
    try {
      return database.getAssemblyAiKey();
    } catch (error) {
      console.error('Errore nell\'handler config:getAssemblyAiKey:', error);
      throw error;
    }
  });
  
  // Impostare la chiave API AssemblyAI
  ipcMain.handle('config:setAssemblyAiKey', (_event, apiKey) => {
    try {
      database.setAssemblyAiKey(apiKey);
      return true;
    } catch (error) {
      console.error('Errore nell\'handler config:setAssemblyAiKey:', error);
      throw error;
    }
  });

  // Ottenere la lingua dell'interfaccia
  ipcMain.handle('config:getLanguage', () => {
    try {
      return database.getLanguage();
    } catch (error) {
      console.error('Errore nell\'handler config:getLanguage:', error);
      throw error;
    }
  });
  
  // Impostare la lingua dell'interfaccia
  ipcMain.handle('config:setLanguage', (_event, language) => {
    try {
      database.setLanguage(language);
      return true;
    } catch (error) {
      console.error('Errore nell\'handler config:setLanguage:', error);
      throw error;
    }
  });

  // ==================== FILE WATCHER HANDLERS ====================

  // Avviare il monitoraggio di una directory
  ipcMain.handle('fileWatcher:startWatching', (_event, directoryPath) => {
    try {
      if (!fileWatcher) {
        console.error('FileWatcher non inizializzato');
        return { success: false, error: 'FileWatcher non inizializzato' };
      }
      
      // Se directoryPath non è specificato, usa la prima directory dai watchDirectories
      let dirToWatch = directoryPath;
      if (!dirToWatch) {
        const watchDirs = database.getWatchDirectories();
        if (watchDirs.length === 0) {
          return { success: false, error: 'Nessuna directory da monitorare' };
        }
        dirToWatch = watchDirs[0];
      }
      
      const success = fileWatcher.startWatching(dirToWatch);
      return { success, directory: dirToWatch };
    } catch (error) {
      console.error('Errore nell\'handler fileWatcher:startWatching:', error);
      return { success: false, error: error.message };
    }
  });

  // Fermare il monitoraggio
  ipcMain.handle('fileWatcher:stopWatching', () => {
    try {
      if (!fileWatcher) {
        console.error('FileWatcher non inizializzato');
        return { success: false, error: 'FileWatcher non inizializzato' };
      }
      
      fileWatcher.stopWatching();
      return { success: true };
    } catch (error) {
      console.error('Errore nell\'handler fileWatcher:stopWatching:', error);
      return { success: false, error: error.message };
    }
  });

  // Verificare se il monitoraggio è attivo
  ipcMain.handle('fileWatcher:isActive', () => {
    try {
      if (!fileWatcher) {
        return false;
      }
      
      return fileWatcher.isActive();
    } catch (error) {
      console.error('Errore nell\'handler fileWatcher:isActive:', error);
      return false;
    }
  });

  // ==================== ASSEMBLY AI HANDLERS ====================

  // Avviare una trascrizione con AssemblyAI
  ipcMain.handle('transcripts:startTranscription', async (_event, audioFileId) => {
    try {
      if (!assemblyAIService) {
        throw new Error('AssemblyAIService non inizializzato');
      }
      
      return await assemblyAIService.startTranscription(audioFileId);
    } catch (error) {
      console.error(`Errore nell'handler transcripts:startTranscription (${audioFileId}):`, error);
      throw error;
    }
  });
}

const createWindow = (): void => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: MAIN_WINDOW_VITE_DEV_SERVER_URL
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../renderer/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    console.log('Caricamento da URL del dev server:', MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    const indexPath = path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`);
    console.log('Caricamento da file:', indexPath);
    mainWindow.loadFile(indexPath);
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
  
  // Inizializza i servizi
  initializeServices();
};

// Inizializza i servizi dell'applicazione
function initializeServices() {
  if (!mainWindow) {
    console.error('MainWindow non inizializzata');
    return;
  }
  
  // Inizializza FileWatcher
  fileWatcher = new FileWatcher(mainWindow);
  
  // Inizializza AssemblyAIService
  const apiKey = database.getAssemblyAiKey();
  assemblyAIService = new AssemblyAIService(apiKey, mainWindow);
  
  // Avvia il monitoraggio se ci sono directory configurate
  const watchDirs = database.getWatchDirectories();
  if (watchDirs.length > 0) {
    fileWatcher.startWatching(watchDirs[0]);
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Configurare gli handler IPC
  setupIPCHandlers();
  
  // Creare la finestra principale
  createWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
