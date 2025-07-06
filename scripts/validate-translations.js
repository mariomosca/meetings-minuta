#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Colori per l'output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Funzione per ottenere tutte le chiavi annidate da un oggetto
function getAllKeys(obj, prefix = '') {
  const keys = [];
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        keys.push(...getAllKeys(obj[key], fullKey));
      } else {
        keys.push(fullKey);
      }
    }
  }
  
  return keys;
}

// Funzione per validare le traduzioni
function validateTranslations() {
  try {
    // Carica i file di traduzione
    const enPath = path.join(__dirname, '../src/locales/en.json');
    const itPath = path.join(__dirname, '../src/locales/it.json');
    
    if (!fs.existsSync(enPath)) {
      log('red', '❌ File inglese non trovato: ' + enPath);
      return false;
    }
    
    if (!fs.existsSync(itPath)) {
      log('red', '❌ File italiano non trovato: ' + itPath);
      return false;
    }
    
    const enContent = fs.readFileSync(enPath, 'utf8');
    const itContent = fs.readFileSync(itPath, 'utf8');
    
    // Parse JSON
    let enTranslations, itTranslations;
    
    try {
      enTranslations = JSON.parse(enContent);
    } catch (error) {
      log('red', '❌ Errore parsing file inglese: ' + error.message);
      return false;
    }
    
    try {
      itTranslations = JSON.parse(itContent);
    } catch (error) {
      log('red', '❌ Errore parsing file italiano: ' + error.message);
      return false;
    }
    
    // Ottieni tutte le chiavi
    const enKeys = getAllKeys(enTranslations).sort();
    const itKeys = getAllKeys(itTranslations).sort();
    
    log('blue', `\n📊 Statistiche traduzioni:`);
    log('cyan', `   Chiavi inglese: ${enKeys.length}`);
    log('cyan', `   Chiavi italiano: ${itKeys.length}`);
    
    // Trova chiavi mancanti
    const missingInIt = enKeys.filter(key => !itKeys.includes(key));
    const missingInEn = itKeys.filter(key => !enKeys.includes(key));
    
    let hasErrors = false;
    
    if (missingInIt.length > 0) {
      hasErrors = true;
      log('red', `\n❌ Chiavi mancanti nel file italiano (${missingInIt.length}):`);
      missingInIt.forEach(key => log('red', `   - ${key}`));
    }
    
    if (missingInEn.length > 0) {
      hasErrors = true;
      log('red', `\n❌ Chiavi mancanti nel file inglese (${missingInEn.length}):`);
      missingInEn.forEach(key => log('red', `   - ${key}`));
    }
    
    // Controlla valori vuoti
    const emptyInEn = enKeys.filter(key => {
      const value = getNestedValue(enTranslations, key);
      return !value || value.trim() === '';
    });
    
    const emptyInIt = itKeys.filter(key => {
      const value = getNestedValue(itTranslations, key);
      return !value || value.trim() === '';
    });
    
    if (emptyInEn.length > 0) {
      hasErrors = true;
      log('yellow', `\n⚠️  Valori vuoti nel file inglese (${emptyInEn.length}):`);
      emptyInEn.forEach(key => log('yellow', `   - ${key}`));
    }
    
    if (emptyInIt.length > 0) {
      hasErrors = true;
      log('yellow', `\n⚠️  Valori vuoti nel file italiano (${emptyInIt.length}):`);
      emptyInIt.forEach(key => log('yellow', `   - ${key}`));
    }
    
    if (!hasErrors) {
      log('green', '\n✅ Tutte le traduzioni sono sincronizzate!');
      log('green', `   Totale chiavi: ${enKeys.length}`);
    }
    
    return !hasErrors;
    
  } catch (error) {
    log('red', '❌ Errore durante la validazione: ' + error.message);
    return false;
  }
}

// Funzione helper per ottenere valori annidati
function getNestedValue(obj, key) {
  return key.split('.').reduce((current, prop) => {
    return current && current[prop] !== undefined ? current[prop] : undefined;
  }, obj);
}

// Esegui la validazione
if (require.main === module) {
  log('magenta', '🔍 Validazione traduzioni...\n');
  const isValid = validateTranslations();
  process.exit(isValid ? 0 : 1);
}

module.exports = { validateTranslations, getAllKeys }; 