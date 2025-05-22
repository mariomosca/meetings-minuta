/**
 * Questo file viene caricato automaticamente da Vite nel contesto "renderer".
 *
 * https://electronjs.org/docs/tutorial/process-model
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.ts` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

import './index.css';
import './notes.css'; // Creeremo questo file dopo

// Log di inizializzazione
console.log('👋 Renderer di Meetings Minuta inizializzato');

// Interfaccia per le API di Electron
interface ElectronAPI {
  appInfo?: {
    name: string;
    version: string;
  };
  notes?: {
    getAll: () => Promise<any[]>;
    getById: (id: string) => Promise<any>;
    save: (note: any) => Promise<any>;
    delete: (id: string) => Promise<any>;
  };
}

// Accesso alle API esposte dal preload
const electronAPI = (window as any).electronAPI as ElectronAPI;

// Carica le note esistenti
async function loadNotes() {
  try {
    const notes = await electronAPI.notes?.getAll() || [];
    const notesList = document.getElementById('notes-list');
    
    if (notesList) {
      notesList.innerHTML = '';
      
      if (notes.length === 0) {
        notesList.innerHTML = '<p class="no-notes">Nessuna nota trovata. Crea la tua prima nota!</p>';
        return;
      }
      
      notes.forEach(note => {
        const noteElement = document.createElement('div');
        noteElement.className = 'note-item';
        noteElement.innerHTML = `
          <h3>${note.title}</h3>
          <p>${note.content}</p>
          <div class="note-actions">
            <button class="delete-note" data-id="${note.id}">Elimina</button>
          </div>
        `;
        notesList.appendChild(noteElement);
      });
      
      // Aggiungi event listener per i pulsanti di eliminazione
      document.querySelectorAll('.delete-note').forEach(button => {
        button.addEventListener('click', async (e) => {
          const id = (e.target as HTMLButtonElement).dataset.id;
          if (id) {
            await deleteNote(id);
          }
        });
      });
    }
  } catch (error) {
    console.error('Errore durante il caricamento delle note:', error);
    showError('Impossibile caricare le note');
  }
}

// Salva una nuova nota
async function saveNote(event: Event) {
  event.preventDefault();
  
  const titleInput = document.getElementById('note-title') as HTMLInputElement;
  const contentInput = document.getElementById('note-content') as HTMLTextAreaElement;
  
  if (!titleInput || !contentInput) return;
  
  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  
  if (!title || !content) {
    showError('Titolo e contenuto sono obbligatori');
    return;
  }
  
  try {
    await electronAPI.notes?.save({
      title,
      content,
      createdAt: new Date().toISOString(),
      type: 'note'
    });
    
    // Pulisci il form
    titleInput.value = '';
    contentInput.value = '';
    
    // Ricarica le note
    await loadNotes();
    
    showSuccess('Nota salvata con successo');
  } catch (error) {
    console.error('Errore durante il salvataggio della nota:', error);
    showError('Impossibile salvare la nota');
  }
}

// Elimina una nota
async function deleteNote(id: string) {
  try {
    await electronAPI.notes?.delete(id);
    await loadNotes();
    showSuccess('Nota eliminata con successo');
  } catch (error) {
    console.error(`Errore durante l'eliminazione della nota ${id}:`, error);
    showError('Impossibile eliminare la nota');
  }
}

// Mostra un messaggio di successo
function showSuccess(message: string) {
  const notification = document.getElementById('notification');
  if (notification) {
    notification.textContent = message;
    notification.className = 'notification success';
    setTimeout(() => {
      notification.textContent = '';
      notification.className = 'notification';
    }, 3000);
  }
}

// Mostra un messaggio di errore
function showError(message: string) {
  const notification = document.getElementById('notification');
  if (notification) {
    notification.textContent = message;
    notification.className = 'notification error';
    setTimeout(() => {
      notification.textContent = '';
      notification.className = 'notification';
    }, 3000);
  }
}

// Aggiornamento informazioni versione se disponibili
document.addEventListener('DOMContentLoaded', () => {
  try {
    // Aggiorna versione
    const versionElement = document.querySelector('.app-info');
    if (versionElement && electronAPI?.appInfo) {
      versionElement.textContent = `Versione: ${electronAPI.appInfo.version}`;
    }
    
    // Aggiungi l'interfaccia delle note alla pagina
    const welcomeSection = document.querySelector('.welcome');
    if (welcomeSection) {
      const notesSection = document.createElement('section');
      notesSection.className = 'notes-section';
      notesSection.innerHTML = `
        <h2>Gestione Note</h2>
        
        <div class="notification" id="notification"></div>
        
        <form id="note-form" class="note-form">
          <div class="form-group">
            <label for="note-title">Titolo</label>
            <input type="text" id="note-title" placeholder="Inserisci un titolo">
          </div>
          <div class="form-group">
            <label for="note-content">Contenuto</label>
            <textarea id="note-content" placeholder="Inserisci il contenuto della nota"></textarea>
          </div>
          <button type="submit" id="save-note">Salva Nota</button>
        </form>
        
        <h3>Le tue note</h3>
        <div id="notes-list" class="notes-list">
          <p class="loading">Caricamento note...</p>
        </div>
      `;
      
      // Inserisci dopo la sezione di benvenuto
      welcomeSection.parentNode?.insertBefore(notesSection, welcomeSection.nextSibling);
      
      // Aggiungi event listener al form
      const noteForm = document.getElementById('note-form');
      if (noteForm) {
        noteForm.addEventListener('submit', saveNote);
      }
      
      // Carica le note
      loadNotes();
    }
  } catch (error) {
    console.error('Errore nell\'inizializzazione dell\'interfaccia:', error);
  }
});
