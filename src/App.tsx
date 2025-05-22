import React, { useState, useEffect } from 'react';

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

// Interfaccia per una nota
interface Note {
  id?: string;
  title: string;
  content: string;
  createdAt: string;
}

const App: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  
  // Carica le note all'avvio
  useEffect(() => {
    loadNotes();
  }, []);
  
  // Carica le note dal database
  async function loadNotes() {
    try {
      const fetchedNotes = await electronAPI.notes?.getAll() || [];
      setNotes(fetchedNotes);
    } catch (error) {
      console.error('Errore nel caricamento delle note:', error);
    }
  }
  
  // Salva una nuova nota
  async function handleSaveNote(e: React.FormEvent) {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      alert('Titolo e contenuto sono obbligatori');
      return;
    }
    
    const newNote: Note = {
      title,
      content,
      createdAt: new Date().toISOString()
    };
    
    try {
      await electronAPI.notes?.save(newNote);
      setTitle('');
      setContent('');
      await loadNotes();
    } catch (error) {
      console.error('Errore nel salvataggio della nota:', error);
    }
  }
  
  // Elimina una nota
  async function handleDeleteNote(id: string) {
    if (!id) return;
    
    try {
      await electronAPI.notes?.delete(id);
      await loadNotes();
    } catch (error) {
      console.error('Errore nell\'eliminazione della nota:', error);
    }
  }
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-blue-600 text-white p-6 shadow-md">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold">Meetings Minuta</h1>
          <p className="text-sm mt-1 opacity-80">
            {electronAPI.appInfo?.name} v{electronAPI.appInfo?.version}
          </p>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="container mx-auto p-6 flex-1">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Form Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Crea una nuova nota</h2>
            
            <form onSubmit={handleSaveNote} className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Titolo
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Titolo della nota"
                />
              </div>
              
              <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                  Contenuto
                </label>
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  rows={4}
                  placeholder="Contenuto della nota"
                ></textarea>
              </div>
              
              <button
                type="submit"
                className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Salva Nota
              </button>
            </form>
          </div>
          
          {/* Notes List Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Le mie note</h2>
            
            {notes.length === 0 ? (
              <p className="text-gray-500 italic">Nessuna nota salvata</p>
            ) : (
              <ul className="space-y-3">
                {notes.map((note) => (
                  <li key={note.id} className="border-b border-gray-200 pb-3 last:border-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">{note.title}</h3>
                        <p className="text-gray-600 mt-1 text-sm">{note.content}</p>
                        <p className="text-gray-400 text-xs mt-1">
                          {new Date(note.createdAt).toLocaleString('it-IT')}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteNote(note.id!)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Elimina
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-gray-800 text-white p-4 text-center text-sm">
        © 2024 - Meetings Minuta
      </footer>
    </div>
  );
};

export default App; 