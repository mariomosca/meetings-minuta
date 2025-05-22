import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

// Interfaccia per le API di Electron
interface ElectronAPI {
  settings?: {
    getWatchDirectory: () => Promise<{ directory: string; isEnabled: boolean }>;
    selectWatchDirectory: () => Promise<{ success: boolean; directory?: string; error?: string }>;
    toggleWatching: (isEnabled: boolean) => Promise<{ success: boolean; error?: string }>;
    saveAssemblyAIApiKey: (apiKey: string) => Promise<{ success: boolean }>;
    getAssemblyAIApiKey: () => Promise<string>;
  };
  config?: {
    getWatchDirectories: () => Promise<string[]>;
    addWatchDirectory: () => Promise<string[]>;
    removeWatchDirectory: (dirPath: string) => Promise<string[]>;
    getAssemblyAiKey: () => Promise<string>;
    setAssemblyAiKey: (apiKey: string) => Promise<boolean>;
  };
}

// Accesso alle API esposte dal preload
const electronAPI = (window as any).electronAPI as ElectronAPI;

interface SettingsViewProps {
  onBack: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ onBack }) => {
  const [watchDirectory, setWatchDirectory] = useState<string>('');
  const [isWatchingEnabled, setIsWatchingEnabled] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  
  // Carica le impostazioni all'avvio
  useEffect(() => {
    loadSettings();
  }, []);
  
  // Carica le impostazioni
  async function loadSettings() {
    try {
      setIsLoading(true);
      
      // DEBUG: Controlla se le API sono disponibili
      console.log('electronAPI disponibile:', electronAPI);
      console.log('settings API:', electronAPI.settings);
      console.log('config API:', electronAPI.config);
      
      // Carica le impostazioni della directory di monitoraggio
      const watchDirSettings = await electronAPI.settings?.getWatchDirectory() || { directory: '', isEnabled: false };
      setWatchDirectory(watchDirSettings.directory);
      setIsWatchingEnabled(watchDirSettings.isEnabled);
      
      // Carica la chiave API di AssemblyAI
      const savedApiKey = await electronAPI.settings?.getAssemblyAIApiKey() || '';
      setApiKey(savedApiKey);
      
    } catch (error) {
      console.error('Errore nel caricamento delle impostazioni:', error);
      toast.error('Impossibile caricare le impostazioni');
    } finally {
      setIsLoading(false);
    }
  }
  
  // Seleziona la directory da monitorare
  async function handleSelectDirectory() {
    console.log('handleSelectDirectory chiamato');
    try {
      setIsSaving(true);
      console.log('API utilizzata:', electronAPI.settings ? 'settings' : 'config');
      
      // Prova prima con settings API
      if (electronAPI.settings?.selectWatchDirectory) {
        console.log('Chiamando settings.selectWatchDirectory()');
        const result = await electronAPI.settings.selectWatchDirectory();
        console.log('Risultato ottenuto:', result);
        
        if (result.success && result.directory) {
          setWatchDirectory(result.directory);
          toast.success('Directory selezionata con successo');
        } else if (result.error) {
          console.error('Errore:', result.error);
          toast.error(result.error);
        }
      } 
      // Prova con config API se settings non è disponibile
      else if (electronAPI.config?.addWatchDirectory) {
        console.log('Chiamando config.addWatchDirectory()');
        const directories = await electronAPI.config.addWatchDirectory();
        console.log('Directories ottenute:', directories);
        
        if (directories && directories.length > 0) {
          setWatchDirectory(directories[directories.length - 1]);
          toast.success('Directory selezionata con successo');
        }
      } else {
        console.error('Nessuna API disponibile per selezionare la directory');
        toast.error('Funzionalità non disponibile');
      }
    } catch (error) {
      console.error('Errore nella selezione della directory:', error);
      toast.error('Impossibile selezionare la directory');
    } finally {
      setIsSaving(false);
    }
  }
  
  // Attiva/disattiva il monitoraggio
  async function handleToggleWatching() {
    try {
      setIsSaving(true);
      
      // Se stiamo abilitando il monitoraggio ma non c'è una directory selezionata
      if (!isWatchingEnabled && !watchDirectory) {
        toast.error('Seleziona una directory prima di attivare il monitoraggio');
        return;
      }
      
      const result = await electronAPI.settings?.toggleWatching(!isWatchingEnabled) || { success: false };
      
      if (result.success) {
        setIsWatchingEnabled(!isWatchingEnabled);
        toast.success(isWatchingEnabled ? 'Monitoraggio disattivato' : 'Monitoraggio attivato');
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch (error) {
      console.error('Errore nell\'attivazione/disattivazione del monitoraggio:', error);
      toast.error('Impossibile modificare lo stato del monitoraggio');
    } finally {
      setIsSaving(false);
    }
  }
  
  // Salva la chiave API di AssemblyAI
  async function handleSaveApiKey() {
    try {
      setIsSaving(true);
      
      if (!apiKey.trim()) {
        toast.error('Inserisci una chiave API valida');
        return;
      }
      
      let success = false;
      
      // Prova prima con settings API
      if (electronAPI.settings?.saveAssemblyAIApiKey) {
        const result = await electronAPI.settings.saveAssemblyAIApiKey(apiKey.trim());
        success = result.success;
      } 
      // Prova con config API se settings non è disponibile
      else if (electronAPI.config?.setAssemblyAiKey) {
        success = await electronAPI.config.setAssemblyAiKey(apiKey.trim());
      }
      
      if (success) {
        toast.success('Chiave API salvata con successo');
      } else {
        toast.error('Impossibile salvare la chiave API');
      }
    } catch (error) {
      console.error('Errore nel salvataggio della chiave API:', error);
      toast.error('Impossibile salvare la chiave API');
    } finally {
      setIsSaving(false);
    }
  }
  
  return (
    <div className="h-full flex flex-col p-6 overflow-auto">
      {/* Intestazione */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
        <div className="flex items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Impostazioni</h2>
            <p className="text-gray-500 text-sm">Configura le opzioni dell'applicazione</p>
          </div>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#7a5cf0]"></div>
          <p className="text-gray-500 ml-3">Caricamento in corso...</p>
        </div>
      ) : (
        <div className="flex-1 space-y-8">
          {/* Sezione di monitoraggio directory */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Monitoraggio Directory</h3>
            <p className="text-gray-600 text-sm mb-6">
              Configura una directory da monitorare per nuovi file audio. 
              Quando un nuovo file audio viene aggiunto, verrà automaticamente elaborato.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Directory Selezionata
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={watchDirectory}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700"
                    placeholder="Nessuna directory selezionata"
                  />
                  <button
                    type="button"
                    onClick={handleSelectDirectory}
                    disabled={isSaving}
                    className="px-4 py-2 bg-[#7a5cf0] text-white rounded-md hover:bg-[#6146d9] transition-colors disabled:opacity-50 shadow-sm"
                  >
                    Seleziona
                  </button>
                </div>
              </div>
              
              <div className="flex items-center pt-4">
                <button
                  type="button"
                  onClick={handleToggleWatching}
                  disabled={isSaving}
                  className={`px-4 py-2 rounded-md transition-colors shadow-sm ${
                    isWatchingEnabled
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {isWatchingEnabled ? 'Disattiva Monitoraggio' : 'Attiva Monitoraggio'}
                </button>
                
                <div className="ml-4 flex items-center">
                  <span className={`inline-block w-3 h-3 rounded-full mr-2 ${
                    isWatchingEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                  }`}></span>
                  <span className="text-sm text-gray-600">
                    {isWatchingEnabled ? 'Monitoraggio attivo' : 'Monitoraggio non attivo'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Sezione API AssemblyAI */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">API AssemblyAI</h3>
            <p className="text-gray-600 text-sm mb-6">
              Configura la chiave API di AssemblyAI per la trascrizione dei file audio.
              Puoi ottenere una chiave API registrandoti su <a href="https://www.assemblyai.com/" target="_blank" rel="noopener noreferrer" className="text-[#7a5cf0] hover:underline">AssemblyAI</a>.
            </p>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
                  Chiave API
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    id="apiKey"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#7a5cf0] focus:border-[#7a5cf0]"
                    placeholder="Inserisci la chiave API di AssemblyAI"
                  />
                  <button
                    type="button"
                    onClick={handleSaveApiKey}
                    disabled={isSaving}
                    className="px-4 py-2 bg-[#7a5cf0] text-white rounded-md hover:bg-[#6146d9] transition-colors disabled:opacity-50 shadow-sm"
                  >
                    Salva
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView; 