#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

// Configurazione dei percorsi database multipli
const DATABASE_PATHS = [
  // Database di sviluppo (npm start)
  path.join(os.homedir(), 'Library/Application Support/meetings_minuta/meetings-minuta-db.json'),
  // Database dell'app pacchettizzata
  path.join(os.homedir(), 'Library/Application Support/Meetings Minuta/meetings-minuta-db.json'),
  // Database alternativo in Preferences
  path.join(os.homedir(), 'Library/Preferences/meetings-minuta-db.json')
];

console.log('🔄 Avvio reset database...\n');

// Template del database pulito con chiavi API preservate
const defaultConfig = {
  notes: {},
  noteIds: [],
  meetings: {},
  meetingIds: [],
  transcripts: {},
  transcriptIds: [],
  audioFiles: {},
  audioFileIds: [],
  meetingMinutes: {},
  meetingMinutesIds: [],
  knowledgeEntries: {},
  knowledgeEntryIds: [],
  config: {
    watchDirectories: [], // Inizia vuoto, l'utente può configurarlo dalle preferenze
    language: "en", // Default inglese per screenshot portfolio
    assemblyAiKey: "8096fb81aee54cccabdcdaf27bf9b720",
    geminiApiKey: "AIzaSyBDGTIu5c1uxwxXty3CExukm8s7FZ0LaAo"
  }
};

function resetDatabase(dbPath) {
  try {
    if (fs.existsSync(dbPath)) {
      console.log(`📁 Trovato database: ${dbPath}`);
      
      // Leggi la configurazione attuale per preservare le chiavi API
      let currentData = {};
      try {
        const currentContent = fs.readFileSync(dbPath, 'utf8');
        currentData = JSON.parse(currentContent);
      } catch (error) {
        console.log(`⚠️  Errore lettura database esistente: ${error.message}`);
      }

      // Preserva le chiavi API se esistono
      const resetData = { ...defaultConfig };
      if (currentData.config) {
        if (currentData.config.assemblyAiKey) {
          resetData.config.assemblyAiKey = currentData.config.assemblyAiKey;
        }
        if (currentData.config.geminiApiKey) {
          resetData.config.geminiApiKey = currentData.config.geminiApiKey;
        }
        if (currentData.config.watchDirectories) {
          resetData.config.watchDirectories = currentData.config.watchDirectories;
        }
      }

      // Scrivi il database pulito
      fs.writeFileSync(dbPath, JSON.stringify(resetData, null, 2));
      console.log(`✅ Database reset completato: ${dbPath}\n`);
      
      return true;
    } else {
      console.log(`ℹ️  Database non trovato: ${dbPath}\n`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Errore durante il reset di ${dbPath}:`, error.message);
    return false;
  }
}

// Reset di tutti i database
let resetCount = 0;
console.log('🔍 Cercando database in tutte le location...\n');

DATABASE_PATHS.forEach(dbPath => {
  if (resetDatabase(dbPath)) {
    resetCount++;
  }
});

console.log(`\n🎉 Reset completato!`);
console.log(`📊 Database processati: ${resetCount}/${DATABASE_PATHS.length}`);
console.log(`🌍 Lingua predefinita: Inglese (en)`);
console.log(`🔑 Chiavi API: Preservate`);
console.log(`📁 Directory monitorate: Preservate`);
console.log(`\n✨ L'app è ora pronta per screenshot portfolio puliti!\n`); 