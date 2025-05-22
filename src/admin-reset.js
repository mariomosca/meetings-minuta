// Temporary script to clean the database
const Store = require('electron-store');

// Initialize the store
const store = new Store({
  name: 'meetings-minuta-db',
  projectName: 'temp_project'
});

// Show current state
console.log('Current database state:');
console.log('AudioFiles:', store.get('audioFiles', {}));
console.log('Transcripts:', store.get('transcripts', {}));
console.log('Meetings:', store.get('meetings', {}));

// Clean the database
console.log('\nCleaning the database...');

// Remove all meetings
store.set('meetings', {});
store.set('meetingIds', []);

// Remove all transcripts
store.set('transcripts', {});
store.set('transcriptIds', []);

// Remove all audio files
store.set('audioFiles', {});
store.set('audioFileIds', []);

console.log('Database cleaned successfully!');
console.log('You can now restart the application and add the audio file to the monitored directory again.'); 