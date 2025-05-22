import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { database } from './services/db';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Configurazione degli handler IPC per il database
function setupIPCHandlers() {
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
}

const createWindow = (): void => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
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
};

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
