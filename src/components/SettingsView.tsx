import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { Button } from './ui';

// Interface for Electron APIs
interface ElectronAPI {
  settings?: {
    getWatchDirectory: () => Promise<{ directory: string; isEnabled: boolean }>;
    selectWatchDirectory: () => Promise<{ success: boolean; directory?: string; error?: string }>;
    toggleWatching: (isEnabled: boolean) => Promise<{ success: boolean; error?: string }>;
    saveAssemblyAIApiKey: (apiKey: string) => Promise<{ success: boolean }>;
    getAssemblyAIApiKey: () => Promise<string>;
    getLanguage: () => Promise<string>;
    saveLanguage: (language: string) => Promise<{ success: boolean }>;
    // AI Provider methods
    getGeminiApiKey: () => Promise<string>;
    saveGeminiApiKey: (apiKey: string) => Promise<{ success: boolean }>;
    getClaudeApiKey: () => Promise<string>;
    saveClaudeApiKey: (apiKey: string) => Promise<{ success: boolean }>;
    getChatGPTApiKey: () => Promise<string>;
    saveChatGPTApiKey: (apiKey: string) => Promise<{ success: boolean }>;
    getAIProvider: () => Promise<string | null>;
    saveAIProvider: (provider: 'gemini' | 'claude' | 'chatgpt') => Promise<{ success: boolean }>;
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

// Access to APIs exposed by preload
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
  const [language, setLanguage] = useState<string>('en');
  
  // AI Provider states
  const [geminiApiKey, setGeminiApiKey] = useState<string>('');
  const [claudeApiKey, setClaudeApiKey] = useState<string>('');
  const [chatgptApiKey, setChatgptApiKey] = useState<string>('');
  const [aiProvider, setAiProvider] = useState<'gemini' | 'claude' | 'chatgpt' | null>('gemini');
  
  // Load settings on startup
  useEffect(() => {
    loadSettings();
  }, []);
  
  // Load settings
  async function loadSettings() {
    try {
      setIsLoading(true);
      
      // DEBUG: Check if APIs are available
      console.log('electronAPI available:', electronAPI);
      console.log('settings API:', electronAPI.settings);
      console.log('config API:', electronAPI.config);
      
      // Load monitoring directory settings
      const watchDirSettings = await electronAPI.settings?.getWatchDirectory() || { directory: '', isEnabled: false };
      setWatchDirectory(watchDirSettings.directory);
      setIsWatchingEnabled(watchDirSettings.isEnabled);
      
      // Load AssemblyAI API key
      const savedApiKey = await electronAPI.settings?.getAssemblyAIApiKey() || '';
      setApiKey(savedApiKey);
      
      // Load current language
      const savedLanguage = await electronAPI.settings?.getLanguage() || 'en';
      setLanguage(savedLanguage);
      
      // Apply loaded language
      i18n.changeLanguage(savedLanguage);
      
      // Load AI Provider settings
      const savedGeminiKey = await electronAPI.settings?.getGeminiApiKey() || '';
      setGeminiApiKey(savedGeminiKey);
      
      const savedClaudeKey = await electronAPI.settings?.getClaudeApiKey() || '';
      setClaudeApiKey(savedClaudeKey);
      
      const savedChatGPTKey = await electronAPI.settings?.getChatGPTApiKey() || '';
      setChatgptApiKey(savedChatGPTKey);
      
      const savedAIProvider = await electronAPI.settings?.getAIProvider();
      const defaultProvider = savedAIProvider as 'gemini' | 'claude' | 'chatgpt' || 'gemini';
      setAiProvider(defaultProvider);
      
      // Se non è mai stato configurato un provider, imposta Gemini come default e salvalo
      if (!savedAIProvider && electronAPI.settings?.saveAIProvider) {
        await electronAPI.settings.saveAIProvider('gemini');
      }
      
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error(t('errors.loadingSettings'));
    } finally {
      setIsLoading(false);
    }
  }
  
  // Select directory to monitor
  async function handleSelectDirectory() {
    console.log('handleSelectDirectory called');
    try {
      const result = await electronAPI.settings?.selectWatchDirectory();
      console.log('Result obtained:', result);
      
      if (result?.success) {
        setWatchDirectory(result.directory || '');
        toast.success(t('settings.monitoring.directorySelected'));
      } else if (result?.error) {
        console.error('Error:', result.error);
        toast.error(result.error);
      }
    } catch (error) {
      console.error('Error selecting directory:', error);
      toast.error(t('settings.monitoring.directoryError'));
    }
  }
  
  // Enable/disable monitoring
  async function handleToggleWatching() {
    console.log('handleToggleWatching called');
    try {
      setIsSaving(true);
      const newState = !isWatchingEnabled;
      
      // If we're enabling monitoring but don't have a directory, show an error
      if (newState && !watchDirectory) {
        toast.error(t('settings.monitoring.noDirectoryError'));
        return;
      }
      
      console.log('Calling toggleWatching()');
      const result = await electronAPI.settings?.toggleWatching(newState);
      console.log('Result obtained:', result);
      
      if (result?.success) {
        setIsWatchingEnabled(newState);
        toast.success(newState ? t('settings.monitoring.enabled') : t('settings.monitoring.disabled'));
      } else if (result?.error) {
        console.error('Error:', result.error);
        toast.error(result.error);
      }
    } catch (error) {
      console.error('Error enabling/disabling monitoring:', error);
      toast.error(t('settings.monitoring.toggleError'));
    } finally {
      setIsSaving(false);
    }
  }
  
  // Save AssemblyAI API key
  async function handleSaveApiKey() {
    console.log('handleSaveApiKey called');
    try {
      setIsSaving(true);
      console.log('API used:', electronAPI.settings ? 'settings' : 'config');
      
      // Try first with settings API
      if (electronAPI.settings?.saveAssemblyAIApiKey) {
        console.log('Calling settings.saveAssemblyAIApiKey()');
        const result = await electronAPI.settings.saveAssemblyAIApiKey(apiKey);
        console.log('Result obtained:', result);
        
        if (result.success) {
          toast.success(t('settings.api.keySaved'));
        } else {
          // Handle potential error message, even if not defined in the type
          const errorMessage = (result as any).error;
          if (errorMessage) {
            console.error('Error:', errorMessage);
            toast.error(errorMessage);
          }
        }
      } 
      // Try with config API if settings is not available
      else if (electronAPI.config?.setAssemblyAiKey) {
        console.log('Calling config.setAssemblyAiKey()');
        const result = await electronAPI.config.setAssemblyAiKey(apiKey);
        console.log('Result obtained:', result);
        
        if (result) {
          toast.success(t('settings.api.keySaved'));
        }
      } else {
        console.error('No API available to save API key');
        toast.error(t('settings.api.keyError'));
      }
    } catch (error) {
      console.error('Error saving API key:', error);
      toast.error(t('settings.api.keySaveError'));
    } finally {
      setIsSaving(false);
    }
  }
  
  // Select language
  async function handleSelectLanguage() {
    try {
      setIsSaving(true);
      
      // Update language in database
      if (electronAPI.settings?.saveLanguage) {
        const result = await electronAPI.settings.saveLanguage(language);
        
        if (result.success) {
          // Change interface language
          i18n.changeLanguage(language);
          toast.success(t('settings.language.changed'));
        }
      } 
      // Fallback to config API
      else if (electronAPI.config?.setLanguage) {
        await electronAPI.config.setLanguage(language);
        
        // Change interface language
        i18n.changeLanguage(language);
        toast.success(t('settings.language.changed'));
      } else {
        toast.error(t('settings.language.error'));
      }
    } catch (error) {
      console.error('Error selecting language:', error);
      toast.error(t('settings.language.error'));
    } finally {
      setIsSaving(false);
    }
  }

  // Save AI Provider selection
  async function handleSaveAIProvider() {
    try {
      setIsSaving(true);
      
      if (electronAPI.settings?.saveAIProvider && aiProvider) {
        const result = await electronAPI.settings.saveAIProvider(aiProvider);
        
        if (result.success) {
          toast.success('AI Provider saved successfully');
        }
      }
    } catch (error) {
      console.error('Error saving AI provider:', error);
      toast.error('Error saving AI provider');
    } finally {
      setIsSaving(false);
    }
  }

  // Save Gemini API key
  async function handleSaveGeminiKey() {
    try {
      setIsSaving(true);
      
      if (electronAPI.settings?.saveGeminiApiKey) {
        const result = await electronAPI.settings.saveGeminiApiKey(geminiApiKey);
        
        if (result.success) {
          toast.success('Gemini API key saved successfully');
        }
      }
    } catch (error) {
      console.error('Error saving Gemini API key:', error);
      toast.error('Error saving Gemini API key');
    } finally {
      setIsSaving(false);
    }
  }

  // Save Claude API key
  async function handleSaveClaudeKey() {
    try {
      setIsSaving(true);
      
      if (electronAPI.settings?.saveClaudeApiKey) {
        const result = await electronAPI.settings.saveClaudeApiKey(claudeApiKey);
        
        if (result.success) {
          toast.success('Claude API key saved successfully');
        }
      }
    } catch (error) {
      console.error('Error saving Claude API key:', error);
      toast.error('Error saving Claude API key');
    } finally {
      setIsSaving(false);
    }
  }

  // Save ChatGPT API key
  async function handleSaveChatGPTKey() {
    try {
      setIsSaving(true);
      
      if (electronAPI.settings?.saveChatGPTApiKey) {
        const result = await electronAPI.settings.saveChatGPTApiKey(chatgptApiKey);
        
        if (result.success) {
          toast.success('ChatGPT API key saved successfully');
        }
      }
    } catch (error) {
      console.error('Error saving ChatGPT API key:', error);
      toast.error('Error saving ChatGPT API key');
    } finally {
      setIsSaving(false);
    }
  }
  
  return (
    <div className="h-full flex flex-col overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
        <div className="flex items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">{t('settings.title')}</h2>
            <p className="text-gray-600 text-sm">{t('settings.subtitle')}</p>
          </div>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
          <p className="text-gray-600 ml-3">{t('common.loading')}</p>
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
                  <Button
                    onClick={handleSelectDirectory}
                    disabled={isSaving}
                    variant="primary"
                    size="md"
                    className="shadow-none hover:shadow-none !bg-orange-100 !text-gray-900 hover:!bg-orange-200 border border-orange-400"
                  >
                    {t('common.select')}
                  </Button>
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
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-offset-2 peer-focus:ring-primary-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
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
              <a href="https://www.assemblyai.com/" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:underline ml-1">
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
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    placeholder={t('settings.api.keyPlaceholder')}
                  />
                  <Button
                    onClick={handleSaveApiKey}
                    disabled={isSaving}
                    variant="primary"
                    size="md"
                    isLoading={isSaving}
                    className="shadow-none hover:shadow-none !bg-orange-100 !text-gray-900 hover:!bg-orange-200 border border-orange-400"
                  >
                    {t('common.save')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Sezione AI Provider */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-800">AI Provider</h3>
              {(!geminiApiKey && aiProvider === 'gemini') && (
                <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                  ⚠️ Configurazione Richiesta
                </span>
              )}
            </div>
            <p className="text-gray-600 text-sm mb-6">
              Configura il provider AI per generazione titoli e identificazione speaker.
              {(!geminiApiKey && aiProvider === 'gemini') && (
                <span className="block mt-2 text-yellow-600 text-sm font-medium">
                  💡 Per utilizzare le funzionalità AI, è necessario configurare una API key di Gemini.
                </span>
              )}
            </p>
            
            <div className="space-y-6">
              {/* Selezione Provider */}
              <div>
                <label htmlFor="aiProvider" className="block text-sm font-medium text-gray-700 mb-2">
                  Provider attivo
                </label>
                <div className="flex gap-2">
                  <select
                    id="aiProvider"
                    value={aiProvider || 'gemini'}
                    onChange={(e) => setAiProvider(e.target.value as 'gemini' | 'claude' | 'chatgpt')}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="gemini">Google Gemini</option>
                    <option value="claude">Anthropic Claude</option>
                    <option value="chatgpt">OpenAI ChatGPT</option>
                  </select>
                  <Button
                    onClick={handleSaveAIProvider}
                    disabled={isSaving}
                    variant="primary"
                    size="md"
                    isLoading={isSaving}
                    className="shadow-none hover:shadow-none !bg-orange-100 !text-gray-900 hover:!bg-orange-200 border border-orange-400"
                  >
                    {t('common.save')}
                  </Button>
                </div>
              </div>
              
              {/* Gemini API Key */}
              <div>
                <label htmlFor="geminiApiKey" className="block text-sm font-medium text-gray-700 mb-1">
                  Gemini API Key
                  <span className={`ml-2 px-2 py-1 text-xs rounded-full ${aiProvider === 'gemini' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {aiProvider === 'gemini' ? 'Attivo' : 'Inattivo'}
                  </span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    id="geminiApiKey"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Inserisci la tua API key Gemini"
                  />
                  <Button
                    onClick={handleSaveGeminiKey}
                    disabled={isSaving}
                    variant="primary"
                    size="md"
                    isLoading={isSaving}
                    className="shadow-none hover:shadow-none !bg-orange-100 !text-gray-900 hover:!bg-orange-200 border border-orange-400"
                  >
                    {t('common.save')}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:underline">
                    Ottieni la tua API key qui →
                  </a>
                </p>
              </div>
              
              {/* Claude API Key */}
              <div>
                <label htmlFor="claudeApiKey" className="block text-sm font-medium text-gray-700 mb-1">
                  Claude API Key
                  <span className={`ml-2 px-2 py-1 text-xs rounded-full ${aiProvider === 'claude' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {aiProvider === 'claude' ? 'Attivo' : 'Inattivo'}
                  </span>
                  <span className="ml-2 px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">
                    In sviluppo
                  </span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    id="claudeApiKey"
                    value={claudeApiKey}
                    onChange={(e) => setClaudeApiKey(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 opacity-50"
                    placeholder="Inserisci la tua API key Claude"
                    disabled
                  />
                  <Button
                    onClick={handleSaveClaudeKey}
                    disabled={true}
                    variant="primary"
                    size="md"
                    className="shadow-none hover:shadow-none !bg-orange-100 !text-gray-900 hover:!bg-orange-200 border border-orange-400 opacity-50"
                  >
                    {t('common.save')}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Claude support coming soon</p>
              </div>
              
              {/* ChatGPT API Key */}
              <div>
                <label htmlFor="chatgptApiKey" className="block text-sm font-medium text-gray-700 mb-1">
                  ChatGPT API Key
                  <span className={`ml-2 px-2 py-1 text-xs rounded-full ${aiProvider === 'chatgpt' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {aiProvider === 'chatgpt' ? 'Attivo' : 'Inattivo'}
                  </span>
                  <span className="ml-2 px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">
                    In sviluppo
                  </span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    id="chatgptApiKey"
                    value={chatgptApiKey}
                    onChange={(e) => setChatgptApiKey(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 opacity-50"
                    placeholder="Inserisci la tua API key OpenAI"
                    disabled
                  />
                  <Button
                    onClick={handleSaveChatGPTKey}
                    disabled={true}
                    variant="primary"
                    size="md"
                    className="shadow-none hover:shadow-none !bg-orange-100 !text-gray-900 hover:!bg-orange-200 border border-orange-400 opacity-50"
                  >
                    {t('common.save')}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">OpenAI support coming soon</p>
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
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="it">{t('settings.language.italian')}</option>
                    <option value="en">{t('settings.language.english')}</option>
                  </select>
                  <Button
                    onClick={handleSelectLanguage}
                    disabled={isSaving}
                    variant="primary"
                    size="md"
                    isLoading={isSaving}
                    className="shadow-none hover:shadow-none !bg-orange-100 !text-gray-900 hover:!bg-orange-200 border border-orange-400"
                  >
                    {t('common.select')}
                  </Button>
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