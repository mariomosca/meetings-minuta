import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';

// Interfaccia per le API di Electron
interface ElectronAPI {
  settings?: {
    getWatchDirectory: () => Promise<{ directory: string; isEnabled: boolean }>;
    selectWatchDirectory: () => Promise<{ success: boolean; directory?: string; error?: string }>;
    toggleWatching: (isEnabled: boolean) => Promise<{ success: boolean; error?: string }>;
    saveAssemblyAIApiKey: (apiKey: string) => Promise<{ success: boolean }>;
    getAssemblyAIApiKey: () => Promise<string>;
    getLanguage: () => Promise<string>;
    saveLanguage: (language: string) => Promise<{ success: boolean }>;
  };
  config?: {
    getWatchDirectories: () => Promise<string[]>;
    addWatchDirectory: () => Promise<string[]>;
    removeWatchDirectory: (dirPath: string) => Promise<string[]>;
    getAssemblyAiKey: () => Promise<string>;
    setAssemblyAiKey: (apiKey: string) => Promise<boolean>;
    getLanguage: () => Promise<string>;
    setLanguage: (language: string) => Promise<boolean>;
  };
}

// Accesso alle API esposte dal preload
const electronAPI = (window as any).electronAPI as ElectronAPI;

interface SettingsViewProps {
  onBack: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ onBack }) => {
  const { t } = useTranslation();
  const [watchDirectory, setWatchDirectory] = useState<string>('');
  const [isWatchingEnabled, setIsWatchingEnabled] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [language, setLanguage] = useState<string>('it');
  
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
      
      // Carica la lingua corrente
      const savedLanguage = await electronAPI.settings?.getLanguage() || 'it';
      setLanguage(savedLanguage);
      
      // Applica la lingua caricata
      i18n.changeLanguage(savedLanguage);
      
    } catch (error) {
      console.error('Errore nel caricamento delle impostazioni:', error);
      toast.error(t('errors.loadingSettings'));
    } finally {
      setIsLoading(false);
    }
  }
  
  // Seleziona la directory da monitorare
  async function handleSelectDirectory() {
    console.log('handleSelectDirectory chiamato');
    try {
      const result = await electronAPI.settings?.selectWatchDirectory();
      console.log('Risultato ottenuto:', result);
      
      if (result?.success) {
        setWatchDirectory(result.directory || '');
        toast.success(t('settings.monitoring.directorySelected'));
      } else if (result?.error) {
        console.error('Errore:', result.error);
        toast.error(result.error);
      }
    } catch (error) {
      console.error('Errore nella selezione della directory:', error);
      toast.error(t('settings.monitoring.directoryError'));
    }
  }
  
  // Attiva/disattiva il monitoraggio
  async function handleToggleWatching() {
    console.log('handleToggleWatching chiamato');
    try {
      setIsSaving(true);
      const newState = !isWatchingEnabled;
      
      // Se stiamo attivando il monitoraggio ma non abbiamo una directory, mostra un errore
      if (newState && !watchDirectory) {
        toast.error(t('settings.monitoring.noDirectoryError'));
        return;
      }
      
      console.log('Chiamando toggleWatching()');
      const result = await electronAPI.settings?.toggleWatching(newState);
      console.log('Risultato ottenuto:', result);
      
      if (result?.success) {
        setIsWatchingEnabled(newState);
        toast.success(newState ? t('settings.monitoring.enabled') : t('settings.monitoring.disabled'));
      } else if (result?.error) {
        console.error('Errore:', result.error);
        toast.error(result.error);
      }
    } catch (error) {
      console.error('Errore nell\'attivazione/disattivazione del monitoraggio:', error);
      toast.error(t('settings.monitoring.toggleError'));
    } finally {
      setIsSaving(false);
    }
  }
  
  // Salva la chiave API di AssemblyAI
  async function handleSaveApiKey() {
    console.log('handleSaveApiKey chiamato');
    try {
      setIsSaving(true);
      console.log('API utilizzata:', electronAPI.settings ? 'settings' : 'config');
      
      // Prova prima con settings API
      if (electronAPI.settings?.saveAssemblyAIApiKey) {
        console.log('Chiamando settings.saveAssemblyAIApiKey()');
        const result = await electronAPI.settings.saveAssemblyAIApiKey(apiKey);
        console.log('Risultato ottenuto:', result);
        
        if (result.success) {
          toast.success(t('settings.api.keySaved'));
        } else {
          console.error('Errore:', result.error);
          toast.error(result.error);
        }
      } 
      // Prova con config API se settings non è disponibile
      else if (electronAPI.config?.setAssemblyAiKey) {
        console.log('Chiamando config.setAssemblyAiKey()');
        const result = await electronAPI.config.setAssemblyAiKey(apiKey);
        console.log('Risultato ottenuto:', result);
        
        if (result) {
          toast.success(t('settings.api.keySaved'));
        }
      } else {
        console.error('Nessuna API disponibile per salvare la chiave API');
        toast.error(t('settings.api.keyError'));
      }
    } catch (error) {
      console.error('Errore nel salvataggio della chiave API:', error);
      toast.error(t('settings.api.keySaveError'));
    } finally {
      setIsSaving(false);
    }
  }
  
  // Seleziona la lingua
  async function handleSelectLanguage() {
    try {
      setIsSaving(true);
      
      // Aggiorna la lingua nel database
      if (electronAPI.settings?.saveLanguage) {
        const result = await electronAPI.settings.saveLanguage(language);
        
        if (result.success) {
          // Cambia la lingua dell'interfaccia
          i18n.changeLanguage(language);
          toast.success(t('settings.language.changed'));
        }
      } 
      // Fallback al config API
      else if (electronAPI.config?.setLanguage) {
        await electronAPI.config.setLanguage(language);
        
        // Cambia la lingua dell'interfaccia
        i18n.changeLanguage(language);
        toast.success(t('settings.language.changed'));
      } else {
        toast.error(t('settings.language.error'));
      }
    } catch (error) {
      console.error('Errore nella selezione della lingua:', error);
      toast.error(t('settings.language.error'));
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
            <h2 className="text-xl font-semibold text-gray-800">{t('settings.title')}</h2>
            <p className="text-gray-500 text-sm">{t('settings.subtitle')}</p>
          </div>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#7a5cf0]"></div>
          <p className="text-gray-500 ml-3">{t('common.loading')}</p>
        </div>
      ) : (
        <div className="flex-1 space-y-8">
          {/* Sezione di monitoraggio directory */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">{t('settings.monitoring.title')}</h3>
            <p className="text-gray-600 text-sm mb-6">
              {t('settings.monitoring.description')}
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('settings.monitoring.selectedDir')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={watchDirectory}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700"
                    placeholder={t('settings.monitoring.noDirectory')}
                  />
                  <button
                    type="button"
                    onClick={handleSelectDirectory}
                    disabled={isSaving}
                    className="px-4 py-2 bg-[#7a5cf0] text-white rounded-md hover:bg-[#6146d9] transition-colors disabled:opacity-50 shadow-sm"
                  >
                    {t('common.select')}
                  </button>
                </div>
              </div>
              
              <div className="flex items-center">
                <label className="inline-flex relative items-center cursor-pointer mr-4">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={isWatchingEnabled}
                    onChange={handleToggleWatching}
                    disabled={isSaving || !watchDirectory}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-offset-2 peer-focus:ring-[#7a5cf0] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7a5cf0]"></div>
                </label>
                <span className="text-sm font-medium text-gray-700">
                  {isWatchingEnabled ? t('settings.monitoring.enabled') : t('settings.monitoring.disabled')}
                </span>
              </div>
            </div>
          </div>
          
          {/* Sezione AssemblyAI API */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">{t('settings.api.title')}</h3>
            <p className="text-gray-600 text-sm mb-6">
              {t('settings.api.description')}
              <a href="https://www.assemblyai.com/" target="_blank" rel="noopener noreferrer" className="text-[#7a5cf0] hover:underline ml-1">
                {t('settings.api.getKey')}
              </a>
            </p>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('settings.api.key')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    id="apiKey"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#7a5cf0] focus:border-[#7a5cf0]"
                    placeholder={t('settings.api.keyPlaceholder')}
                  />
                  <button
                    type="button"
                    onClick={handleSaveApiKey}
                    disabled={isSaving}
                    className="px-4 py-2 bg-[#7a5cf0] text-white rounded-md hover:bg-[#6146d9] transition-colors disabled:opacity-50 shadow-sm"
                  >
                    {t('common.save')}
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Sezione Lingua */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">{t('settings.language.title')}</h3>
            <p className="text-gray-600 text-sm mb-6">
              {t('settings.language.description')}
            </p>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('settings.language.title')}
                </label>
                <div className="flex gap-2">
                  <select
                    id="language"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#7a5cf0] focus:border-[#7a5cf0]"
                  >
                    <option value="it">{t('settings.language.italian')}</option>
                    <option value="en">{t('settings.language.english')}</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleSelectLanguage}
                    disabled={isSaving}
                    className="px-4 py-2 bg-[#7a5cf0] text-white rounded-md hover:bg-[#6146d9] transition-colors disabled:opacity-50 shadow-sm"
                  >
                    {t('common.select')}
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