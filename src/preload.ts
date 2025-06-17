// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';

// Increase the listeners limit to avoid memory leak warning
ipcRenderer.setMaxListeners(20);

// Expose safe APIs to use in the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Application information
  appInfo: {
    name: 'Meetings Minuta',
    version: '1.0.0',
  },
  
  // APIs for notes
  notes: {
    // Get all notes
    getAll: () => ipcRenderer.invoke('notes:getAll'),
    
    // Get a specific note
    getById: (id: string) => ipcRenderer.invoke('notes:getById', id),
    
    // Save a note
    save: (note: any) => ipcRenderer.invoke('notes:save', note),
    
    // Delete a note
    delete: (id: string) => ipcRenderer.invoke('notes:delete', id),
  },
  
  // APIs for meetings
  meetings: {
    // Get all meetings
    getAll: () => ipcRenderer.invoke('meetings:getAll'),
    
    // Get a specific meeting
    getById: (id: string) => ipcRenderer.invoke('meetings:getById', id),
    
    // Save a meeting
    save: (meeting: any) => ipcRenderer.invoke('meetings:save', meeting),
    
    // Update a meeting (alias for save)
    updateMeeting: (meeting: any) => ipcRenderer.invoke('meetings:update', meeting),
    
    // Delete a meeting
    delete: (id: string) => ipcRenderer.invoke('meetings:delete', id),
  },
  
  // APIs for transcripts
  transcripts: {
    // Get all transcripts
    getAll: () => ipcRenderer.invoke('transcripts:getAll'),
    
    // Get a specific transcript
    getById: (id: string) => ipcRenderer.invoke('transcripts:getById', id),
    
    // Get transcripts for a specific meeting
    getByMeetingId: (meetingId: string) => ipcRenderer.invoke('transcripts:getByMeetingId', meetingId),
    
    // Save a transcript
    save: (transcript: any) => ipcRenderer.invoke('transcripts:save', transcript),
    
    // Delete a transcript
    delete: (id: string) => ipcRenderer.invoke('transcripts:delete', id),
    
    // Start a transcription with AssemblyAI
    startTranscription: (audioFileId: string) => ipcRenderer.invoke('transcripts:startTranscription', audioFileId),
    
    // Update a transcript
    update: (transcript: any) => ipcRenderer.invoke('transcripts:update', transcript),
  },
  
  // APIs for audio files
  audioFiles: {
    // Get all audio files
    getAll: () => ipcRenderer.invoke('audioFiles:getAll'),
    
    // Get a specific audio file
    getById: (id: string) => ipcRenderer.invoke('audioFiles:getById', id),
    
    // Get audio files for a specific meeting
    getByMeetingId: (meetingId: string) => ipcRenderer.invoke('audioFiles:getByMeetingId', meetingId),
    
    // Save an audio file
    save: (audioFile: any) => ipcRenderer.invoke('audioFiles:save', audioFile),
    
    // Delete an audio file
    delete: (id: string) => ipcRenderer.invoke('audioFiles:delete', id),
    
    // Import an audio file from the filesystem
    import: () => ipcRenderer.invoke('audioFiles:import'),
  },

  // APIs for meeting minutes
  minutes: {
    // Save meeting minutes
    save: (minutes: any) => ipcRenderer.invoke('minutes:save', minutes),
    
    // Get all minutes
    getAll: () => ipcRenderer.invoke('minutes:getAll'),
    
    // Get minutes by meeting ID
    getByMeetingId: (meetingId: string) => ipcRenderer.invoke('minutes:getByMeetingId', meetingId),
    
    // Delete minutes
    delete: (id: string) => ipcRenderer.invoke('minutes:delete', id),
  },

  // APIs for knowledge base
  knowledge: {
    // Save knowledge entry
    save: (entry: any) => ipcRenderer.invoke('knowledge:save', entry),
    
    // Get all knowledge entries
    getAll: () => ipcRenderer.invoke('knowledge:getAll'),
    
    // Search knowledge entries
    search: (query: string) => ipcRenderer.invoke('knowledge:search', query),
    
    // Get knowledge entries by category
    getByCategory: (category: string) => ipcRenderer.invoke('knowledge:getByCategory', category),
    
    // Get knowledge entries by tag
    getByTag: (tag: string) => ipcRenderer.invoke('knowledge:getByTag', tag),
    
    // Delete knowledge entry
    delete: (id: string) => ipcRenderer.invoke('knowledge:delete', id),
  },
  
  // APIs for configuration
  config: {
    // Get monitored directories
    getWatchDirectories: () => ipcRenderer.invoke('config:getWatchDirectories'),
    
    // Add a monitored directory
    addWatchDirectory: () => ipcRenderer.invoke('config:addWatchDirectory'),
    
    // Remove a monitored directory
    removeWatchDirectory: (dirPath: string) => ipcRenderer.invoke('config:removeWatchDirectory', dirPath),
    
    // Get AssemblyAI API key
    getAssemblyAiKey: () => ipcRenderer.invoke('config:getAssemblyAiKey'),
    
    // Set AssemblyAI API key
    setAssemblyAiKey: (apiKey: string) => ipcRenderer.invoke('config:setAssemblyAiKey', apiKey),
    
    // Get interface language
    getLanguage: () => ipcRenderer.invoke('config:getLanguage'),
    
    // Set interface language
    setLanguage: (language: string) => ipcRenderer.invoke('config:setLanguage', language),
  },
  
  // APIs for file monitoring
  fileWatcher: {
    // Start monitoring a directory
    startWatching: (directoryPath?: string) => ipcRenderer.invoke('fileWatcher:startWatching', directoryPath),
    
    // Stop monitoring
    stopWatching: () => ipcRenderer.invoke('fileWatcher:stopWatching'),
    
    // Check if monitoring is active
    isActive: () => ipcRenderer.invoke('fileWatcher:isActive'),
  },
  
  // APIs for settings (wrapper for config)
  settings: {
    // Get the monitored directory
    getWatchDirectory: async () => {
      console.log('preload: call to getWatchDirectory');
      try {
        const directories = await ipcRenderer.invoke('config:getWatchDirectories');
        const isActive = await ipcRenderer.invoke('fileWatcher:isActive');
        
        console.log('preload: directories obtained:', directories);
        return { 
          directory: directories && directories.length > 0 ? directories[0] : '',
          isEnabled: isActive
        };
      } catch (error) {
        console.error('preload: error in getWatchDirectory:', error);
        return { directory: '', isEnabled: false };
      }
    },
    
    // Select directory to monitor
    selectWatchDirectory: async () => {
      console.log('preload: call to selectWatchDirectory');
      try {
        const directories = await ipcRenderer.invoke('config:addWatchDirectory');
        console.log('preload: result from addWatchDirectory:', directories);
        if (directories && directories.length > 0) {
          return { 
            success: true, 
            directory: directories[directories.length - 1] 
          };
        } else {
          return { success: false, error: 'No directory selected' };
        }
      } catch (error) {
        console.error('preload: error in selectWatchDirectory:', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    },
    
    // Enable/disable monitoring
    toggleWatching: async (isEnabled: boolean) => {
      console.log('preload: call to toggleWatching:', isEnabled);
      try {
        if (isEnabled) {
          // Start monitoring
          const result = await ipcRenderer.invoke('fileWatcher:startWatching');
          return { success: result.success, error: result.error };
        } else {
          // Stop monitoring
          const result = await ipcRenderer.invoke('fileWatcher:stopWatching');
          return { success: result.success, error: result.error };
        }
      } catch (error) {
        console.error('preload: error in toggleWatching:', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    },
    
    // Get AssemblyAI API key
    getAssemblyAIApiKey: async () => {
      console.log('preload: call to getAssemblyAIApiKey');
      try {
        return await ipcRenderer.invoke('config:getAssemblyAiKey');
      } catch (error) {
        console.error('preload: error in getAssemblyAIApiKey:', error);
        return '';
      }
    },
    
    // Save AssemblyAI API key
    saveAssemblyAIApiKey: async (apiKey: string) => {
      console.log('preload: call to saveAssemblyAIApiKey');
      try {
        const result = await ipcRenderer.invoke('config:setAssemblyAiKey', apiKey);
        return { success: !!result };
      } catch (error) {
        console.error('preload: error in saveAssemblyAIApiKey:', error);
        return { success: false };
      }
    },
    
    // Get interface language
    getLanguage: async () => {
      console.log('preload: call to getLanguage');
      try {
        return await ipcRenderer.invoke('config:getLanguage');
      } catch (error) {
        console.error('preload: error in getLanguage:', error);
        return 'it'; // Default: Italian
      }
    },
    
    // Save interface language
    saveLanguage: async (language: string) => {
      console.log('preload: call to saveLanguage');
      try {
        const result = await ipcRenderer.invoke('config:setLanguage', language);
        return { success: !!result };
      } catch (error) {
        console.error('preload: error in saveLanguage:', error);
        return { success: false };
      }
    },

    // ========== AI PROVIDER METHODS ==========

    // Get Gemini API key
    getGeminiApiKey: async () => {
      console.log('preload: call to getGeminiApiKey');
      try {
        return await ipcRenderer.invoke('config:getGeminiApiKey');
      } catch (error) {
        console.error('preload: error in getGeminiApiKey:', error);
        return '';
      }
    },

    // Save Gemini API key
    saveGeminiApiKey: async (apiKey: string) => {
      console.log('preload: call to saveGeminiApiKey');
      try {
        const result = await ipcRenderer.invoke('config:setGeminiApiKey', apiKey);
        return { success: !!result };
      } catch (error) {
        console.error('preload: error in saveGeminiApiKey:', error);
        return { success: false };
      }
    },

    // Get Claude API key
    getClaudeApiKey: async () => {
      console.log('preload: call to getClaudeApiKey');
      try {
        return await ipcRenderer.invoke('config:getClaudeApiKey');
      } catch (error) {
        console.error('preload: error in getClaudeApiKey:', error);
        return '';
      }
    },

    // Save Claude API key
    saveClaudeApiKey: async (apiKey: string) => {
      console.log('preload: call to saveClaudeApiKey');
      try {
        const result = await ipcRenderer.invoke('config:setClaudeApiKey', apiKey);
        return { success: !!result };
      } catch (error) {
        console.error('preload: error in saveClaudeApiKey:', error);
        return { success: false };
      }
    },

    // Get ChatGPT API key
    getChatGPTApiKey: async () => {
      console.log('preload: call to getChatGPTApiKey');
      try {
        return await ipcRenderer.invoke('config:getChatGPTApiKey');
      } catch (error) {
        console.error('preload: error in getChatGPTApiKey:', error);
        return '';
      }
    },

    // Save ChatGPT API key
    saveChatGPTApiKey: async (apiKey: string) => {
      console.log('preload: call to saveChatGPTApiKey');
      try {
        const result = await ipcRenderer.invoke('config:setChatGPTApiKey', apiKey);
        return { success: !!result };
      } catch (error) {
        console.error('preload: error in saveChatGPTApiKey:', error);
        return { success: false };
      }
    },

    // Get AI provider
    getAIProvider: async () => {
      console.log('preload: call to getAIProvider');
      try {
        return await ipcRenderer.invoke('config:getAIProvider');
      } catch (error) {
        console.error('preload: error in getAIProvider:', error);
        return null;
      }
    },

    // Save AI provider
    saveAIProvider: async (provider: 'gemini' | 'claude' | 'chatgpt') => {
      console.log('preload: call to saveAIProvider');
      try {
        const result = await ipcRenderer.invoke('config:setAIProvider', provider);
        return { success: !!result };
      } catch (error) {
        console.error('preload: error in saveAIProvider:', error);
        return { success: false };
      }
    }
  },

  // APIs for AI services
  ai: {
    // Generate meeting title
    generateTitle: async (transcriptText: string) => {
      console.log('preload: call to ai:generateTitle');
      try {
        return await ipcRenderer.invoke('ai:generateTitle', transcriptText);
      } catch (error) {
        console.error('preload: error in ai:generateTitle:', error);
        throw error;
      }
    },

    // Identify speakers
    identifySpeakers: async (transcriptText: string, utterances: any[]) => {
      console.log('preload: call to ai:identifySpeakers');
      try {
        return await ipcRenderer.invoke('ai:identifySpeakers', transcriptText, utterances);
      } catch (error) {
        console.error('preload: error in ai:identifySpeakers:', error);
        throw error;
      }
    },

    // Generate meeting minutes
    generateMinutes: async (transcriptText: string, participants?: string[], meetingDate?: string, templateName?: string) => {
      console.log('preload: call to ai:generateMinutes');
      try {
        return await ipcRenderer.invoke('ai:generateMinutes', transcriptText, participants, meetingDate, templateName);
      } catch (error) {
        console.error('preload: error in ai:generateMinutes:', error);
        throw error;
      }
    },

    // Generate knowledge base
    generateKnowledge: async (transcriptText: string, templateName?: string) => {
      console.log('preload: call to ai:generateKnowledge');
      try {
        return await ipcRenderer.invoke('ai:generateKnowledge', transcriptText, templateName);
      } catch (error) {
        console.error('preload: error in ai:generateKnowledge:', error);
        throw error;
      }
    }
  },
  
  // APIs for events
  events: {
    // Register a callback for an event
    on: (channel: string, callback: (...args: any[]) => void) => {
      // Allowed channels
      const validChannels = [
        'transcript:statusChanged',
        'audioFile:imported',
        'directory:filesChanged',
        'meeting:created'
      ];
      
      if (validChannels.includes(channel)) {
        ipcRenderer.on(channel, (_, ...args) => callback(...args));
      }
    },
    
    // Remove a callback for an event
    off: (channel: string, callback: (...args: any[]) => void) => {
      // Allowed channels
      const validChannels = [
        'transcript:statusChanged',
        'audioFile:imported',
        'directory:filesChanged',
        'meeting:created'
      ];
      
      if (validChannels.includes(channel)) {
        ipcRenderer.removeListener(channel, callback);
      }
    }
  },
  
  // Helper to register a listener for transcript updates
  onTranscriptionStatusUpdate: (handler: (transcript: any) => void) => {
    ipcRenderer.on('transcript:statusChanged', (_, transcript) => handler(transcript));
    
    // Returns a function to remove the listener
    return () => {
      ipcRenderer.removeListener('transcript:statusChanged', handler);
    };
  },
  
  // Helper to register a listener for new meeting creation
  onNewMeetingCreated: (handler: (meeting: any) => void) => {
    ipcRenderer.on('meeting:created', (_, meeting) => handler(meeting));
    
    // Returns a function to remove the listener
    return () => {
      ipcRenderer.removeListener('meeting:created', handler);
    };
  }
});
