import Store from 'electron-store';

// Interfaccia per una nota (semplice esempio)
export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  type: 'note';
}

// Interfaccia per lo schema dello store
interface StoreSchema {
  notes: Record<string, Note>;
  noteIds: string[]; // Array di ID per mantenere l'ordine
}

// Classe per gestire il database
export class Database {
  private store: Store<StoreSchema>;
  
  constructor() {
    // Inizializza lo store
    this.store = new Store<StoreSchema>({
      name: 'meetings-minuta-db',
      defaults: {
        notes: {},
        noteIds: []
      }
    });
    
    console.log('Database electron-store inizializzato');
  }
  
  // Salvare una nota
  async saveNote(note: Omit<Note, 'id'> & { id?: string }): Promise<Note> {
    try {
      // Crea un ID se non esiste
      const id = note.id || `note_${Date.now()}`;
      
      // Crea la nota completa
      const completeNote: Note = {
        id,
        title: note.title,
        content: note.content,
        createdAt: note.createdAt || new Date().toISOString(),
        type: 'note'
      };
      
      // Ottieni le note esistenti e aggiungi/aggiorna la nuova nota
      const notes = this.store.get('notes', {});
      notes[id] = completeNote;
      
      // Ottieni gli ID esistenti e aggiungi il nuovo se necessario
      const noteIds = this.store.get('noteIds', []);
      if (!noteIds.includes(id)) {
        noteIds.push(id);
        this.store.set('noteIds', noteIds);
      }
      
      // Salva le note aggiornate
      this.store.set('notes', notes);
      
      console.log('Nota salvata:', completeNote);
      return completeNote;
    } catch (error) {
      console.error('Errore durante il salvataggio della nota:', error);
      throw error;
    }
  }
  
  // Ottenere tutte le note
  async getAllNotes(): Promise<Note[]> {
    try {
      const notes = this.store.get('notes', {});
      const noteIds = this.store.get('noteIds', []);
      
      // Converte l'oggetto in un array ordinato in base a noteIds
      const noteArray = noteIds
        .filter(id => notes[id]) // Filtra ID non validi
        .map(id => notes[id])
        .sort((a, b) => {
          // Ordina per data di creazione (dal più recente)
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      
      console.log('Note recuperate:', noteArray);
      return noteArray;
    } catch (error) {
      console.error('Errore durante il recupero delle note:', error);
      throw error;
    }
  }
  
  // Ottenere una nota specifica
  async getNoteById(id: string): Promise<Note | null> {
    try {
      const notes = this.store.get('notes', {});
      return notes[id] || null;
    } catch (error) {
      console.error(`Errore durante il recupero della nota ${id}:`, error);
      throw error;
    }
  }
  
  // Eliminare una nota
  async deleteNote(id: string): Promise<void> {
    try {
      // Ottieni tutte le note e rimuovi quella con l'ID specificato
      const notes = this.store.get('notes', {});
      delete notes[id];
      
      // Aggiorna le note nello store
      this.store.set('notes', notes);
      
      // Rimuovi l'ID dall'elenco degli ID
      const noteIds = this.store.get('noteIds', []);
      const updatedNoteIds = noteIds.filter(noteId => noteId !== id);
      this.store.set('noteIds', updatedNoteIds);
      
      console.log(`Nota ${id} eliminata`);
    } catch (error) {
      console.error(`Errore durante l'eliminazione della nota ${id}:`, error);
      throw error;
    }
  }
}

// Esportiamo un'istanza singola del database
export const database = new Database(); 