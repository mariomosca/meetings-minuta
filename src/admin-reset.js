// Script temporaneo per ripulire il database
const Store = require('electron-store');

// Inizializza lo store
const store = new Store({
  name: 'meetings-minuta-db',
  projectName: 'temp_project'
});

// Mostra lo stato attuale
console.log('Stato attuale del database:');
console.log('AudioFiles:', store.get('audioFiles', {}));
console.log('Trascrizioni:', store.get('transcripts', {}));
console.log('Riunioni:', store.get('meetings', {}));

// Pulisci il database
console.log('\nPulizia del database in corso...');

// Rimuovi tutte le riunioni
store.set('meetings', {});
store.set('meetingIds', []);

// Rimuovi tutte le trascrizioni
store.set('transcripts', {});
store.set('transcriptIds', []);

// Rimuovi tutti i file audio
store.set('audioFiles', {});
store.set('audioFileIds', []);

console.log('Database pulito con successo!');
console.log('Ora puoi riavviare l\'applicazione e aggiungere nuovamente il file audio alla directory monitorata.'); 