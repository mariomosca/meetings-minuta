import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import chokidar from 'chokidar';
import { nanoid } from 'nanoid';
import Store from 'electron-store';
import { isAudioFile, getAudioMetadata } from './utils/audioUtils';
import { transcribeAudio } from './services/transcriptionService';

// Directory del file corrente
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurazione del database
const dbPath = path.join(app.getPath('userData'), 'database.json');

// Store per le impostazioni dell'applicazione
const store = new Store({
  name: 'settings',
  defaults: {
    watchDirectory: '',
    isWatchingEnabled: false,
    assemblyAIApiKey: ''
  }
});

// Inizializza il database se non esiste
if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, JSON.stringify({
    meetings: [],
    audioFiles: [],
    transcripts: []
  }));
}

// Carica il database
let database = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// Salva il database
function saveDatabase() {
  fs.writeFileSync(dbPath, JSON.stringify(database, null, 2));
}

// Crea la finestra principale
let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173/');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Inizializza l'applicazione
app.whenReady().then(() => {
  createWindow();
  
  // Inizializza il monitoraggio della directory se abilitato
  initializeDirectoryWatcher();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Variabile per tenere traccia del watcher
let watcher: any = null;

// Inizializza il monitoraggio della directory
function initializeDirectoryWatcher() {
  const watchDirectory = store.get('watchDirectory') as string;
  const isWatchingEnabled = store.get('isWatchingEnabled') as boolean;
  
  if (isWatchingEnabled && watchDirectory && fs.existsSync(watchDirectory)) {
    startWatching(watchDirectory);
  }
}

// Avvia il monitoraggio della directory
function startWatching(directoryPath: string) {
  // Chiudi il watcher esistente se presente
  if (watcher) {
    watcher.close();
  }
  
  console.log(`Avvio monitoraggio della directory: ${directoryPath}`);
  
  // Crea un nuovo watcher
  watcher = chokidar.watch(directoryPath, {
    ignored: /(^|[\/\\])\../, // ignora file nascosti
    persistent: true,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100
    }
  });
  
  // Quando viene aggiunto un nuovo file
  watcher.on('add', async (filePath: string) => {
    console.log(`File rilevato: ${filePath}`);
    
    // Verifica se è un file audio
    if (isAudioFile(filePath)) {
      console.log(`File audio rilevato: ${filePath}`);
      await processAudioFile(filePath);
    }
  });
  
  // Gestione errori
  watcher.on('error', (error: Error) => {
    console.error(`Errore nel monitoraggio della directory: ${error}`);
  });
}

// Ferma il monitoraggio della directory
function stopWatching() {
  if (watcher) {
    watcher.close();
    watcher = null;
    console.log('Monitoraggio directory interrotto');
  }
}

// Processa un file audio
async function processAudioFile(filePath: string) {
  try {
    console.log(`Elaborazione del file audio: ${filePath}`);
    
    // Ottieni metadati audio
    const metadata = await getAudioMetadata(filePath);
    const fileName = path.basename(filePath);
    
    // Crea un nuovo oggetto AudioFile
    const audioFileId = nanoid();
    const audioFile = {
      id: audioFileId,
      fileName,
      filePath,
      fileSize: fs.statSync(filePath).size,
      duration: metadata.duration || 0,
      createdAt: new Date().toISOString()
    };
    
    // Aggiungi l'audio file al database
    database.audioFiles.push(audioFile);
    saveDatabase();
    
    // Crea una nuova riunione
    const meetingId = nanoid();
    const meeting = {
      id: meetingId,
      title: `Riunione da ${fileName.replace(/\.[^/.]+$/, '')}`,
      description: `Riunione creata automaticamente dal file audio ${fileName}`,
      date: new Date().toISOString().split('T')[0],
      participants: [],
      createdAt: new Date().toISOString(),
      audioFileId
    };
    
    // Aggiungi la riunione al database
    database.meetings.push(meeting);
    
    // Aggiorna l'audio file con l'ID della riunione
    const audioFileIndex = database.audioFiles.findIndex((af: any) => af.id === audioFileId);
    if (audioFileIndex !== -1) {
      database.audioFiles[audioFileIndex].meetingId = meetingId;
    }
    
    saveDatabase();
    
    // Notifica la UI
    if (mainWindow) {
      mainWindow.webContents.send('new-meeting-created', meeting);
    }
    
    // Avvia la trascrizione
    const apiKey = store.get('assemblyAIApiKey') as string;
    if (!apiKey) {
      console.error('API key di AssemblyAI non configurata');
      return;
    }
    
    // Crea un record di trascrizione con stato "queued"
    const transcriptId = nanoid();
    const transcript = {
      id: transcriptId,
      meetingId,
      audioFileId,
      status: 'queued',
      createdAt: new Date().toISOString()
    };
    
    // Aggiorna il database con la nuova trascrizione
    database.transcripts.push(transcript);
    saveDatabase();
    
    // Notifica la UI
    if (mainWindow) {
      mainWindow.webContents.send('transcription-status-update', transcript);
    }
    
    // Avvia il processo di trascrizione
    transcribeAudio(filePath, apiKey, transcriptId, updateTranscriptionStatus);
    
  } catch (error) {
    console.error(`Errore nell'elaborazione del file audio: ${error}`);
  }
}

// Aggiorna lo stato della trascrizione
function updateTranscriptionStatus(transcriptId: string, status: string, text?: string) {
  const transcriptIndex = database.transcripts.findIndex((t: any) => t.id === transcriptId);
  
  if (transcriptIndex !== -1) {
    database.transcripts[transcriptIndex].status = status;
    
    if (text) {
      database.transcripts[transcriptIndex].text = text;
    }
    
    if (status === 'completed' || status === 'error') {
      database.transcripts[transcriptIndex].completedAt = new Date().toISOString();
    }
    
    saveDatabase();
    
    // Notifica la UI
    if (mainWindow) {
      mainWindow.webContents.send('transcription-status-update', database.transcripts[transcriptIndex]);
    }
  }
}

// Handler per le API esposte al renderer
ipcMain.handle('app:getInfo', () => {
  return {
    name: app.getName(),
    version: app.getVersion()
  };
});

// API per le riunioni
ipcMain.handle('meetings:getAll', () => {
  return database.meetings;
});

ipcMain.handle('meetings:getById', (_, id) => {
  return database.meetings.find((meeting: any) => meeting.id === id);
});

ipcMain.handle('meetings:save', (_, meeting) => {
  if (meeting.id) {
    // Aggiorna la riunione esistente
    const index = database.meetings.findIndex((m: any) => m.id === meeting.id);
    if (index !== -1) {
      database.meetings[index] = { ...database.meetings[index], ...meeting };
    }
  } else {
    // Crea una nuova riunione
    meeting.id = nanoid();
    database.meetings.push(meeting);
  }
  
  saveDatabase();
  return meeting;
});

ipcMain.handle('meetings:delete', (_, id) => {
  const index = database.meetings.findIndex((meeting: any) => meeting.id === id);
  if (index !== -1) {
    database.meetings.splice(index, 1);
    saveDatabase();
    return { success: true };
  }
  return { success: false };
});

// API per i file audio
ipcMain.handle('audioFiles:import', async () => {
  if (!mainWindow) return null;
  
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg', 'm4a'] }
    ]
  });
  
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  
  const filePath = result.filePaths[0];
  const metadata = await getAudioMetadata(filePath);
  
  const audioFile = {
    id: nanoid(),
    fileName: path.basename(filePath),
    filePath,
    fileSize: fs.statSync(filePath).size,
    duration: metadata.duration || 0,
    createdAt: new Date().toISOString()
  };
  
  database.audioFiles.push(audioFile);
  saveDatabase();
  
  return audioFile;
});

ipcMain.handle('audioFiles:getByMeetingId', (_, meetingId) => {
  return database.audioFiles.find((audioFile: any) => audioFile.meetingId === meetingId);
});

ipcMain.handle('audioFiles:save', (_, audioFile) => {
  const index = database.audioFiles.findIndex((af: any) => af.id === audioFile.id);
  if (index !== -1) {
    database.audioFiles[index] = { ...database.audioFiles[index], ...audioFile };
    saveDatabase();
  }
  return audioFile;
});

// API per le trascrizioni
ipcMain.handle('transcripts:getByMeetingId', (_, meetingId) => {
  return database.transcripts.filter((transcript: any) => transcript.meetingId === meetingId);
});

ipcMain.handle('transcripts:startTranscription', async (_, audioFileId) => {
  const audioFile = database.audioFiles.find((af: any) => af.id === audioFileId);
  if (!audioFile) {
    throw new Error('File audio non trovato');
  }
  
  const apiKey = store.get('assemblyAIApiKey') as string;
  if (!apiKey) {
    throw new Error('API key di AssemblyAI non configurata');
  }
  
  const transcript = {
    id: nanoid(),
    meetingId: audioFile.meetingId,
    audioFileId,
    status: 'queued',
    createdAt: new Date().toISOString()
  };
  
  database.transcripts.push(transcript);
  saveDatabase();
  
  // Avvia il processo di trascrizione
  transcribeAudio(audioFile.filePath, apiKey, transcript.id, updateTranscriptionStatus);
  
  return transcript;
});

// API per le impostazioni di monitoraggio directory
ipcMain.handle('settings:getWatchDirectory', () => {
  return {
    directory: store.get('watchDirectory'),
    isEnabled: store.get('isWatchingEnabled')
  };
});

ipcMain.handle('settings:selectWatchDirectory', async () => {
  if (!mainWindow) return { success: false };
  
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  
  if (result.canceled || result.filePaths.length === 0) {
    return { success: false };
  }
  
  const directoryPath = result.filePaths[0];
  store.set('watchDirectory', directoryPath);
  
  return { 
    success: true,
    directory: directoryPath
  };
});

ipcMain.handle('settings:toggleWatching', (_, isEnabled) => {
  const directoryPath = store.get('watchDirectory') as string;
  
  store.set('isWatchingEnabled', isEnabled);
  
  if (isEnabled) {
    if (directoryPath && fs.existsSync(directoryPath)) {
      startWatching(directoryPath);
      return { success: true };
    } else {
      return { 
        success: false,
        error: 'Directory non valida o non esistente'
      };
    }
  } else {
    stopWatching();
    return { success: true };
  }
});

ipcMain.handle('settings:saveAssemblyAIApiKey', (_, apiKey) => {
  store.set('assemblyAIApiKey', apiKey);
  return { success: true };
});

ipcMain.handle('settings:getAssemblyAIApiKey', () => {
  return store.get('assemblyAIApiKey');
}); 