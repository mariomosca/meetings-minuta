# Meetings Minuta - App di Trascrizione Audio

Un'applicazione desktop per la trascrizione automatica di registrazioni audio di riunioni, sviluppata con Electron, Vite e TypeScript.

## Caratteristiche

- Interfaccia desktop moderna e intuitiva
- Trascrizione automatica di file audio
- Generazione di verbali di riunioni
- Gestione e archiviazione delle trascrizioni

## Tecnologie utilizzate

- [Electron](https://www.electronjs.org/) - Framework per sviluppare applicazioni desktop con tecnologie web
- [Electron Forge](https://www.electronforge.io/) - Toolchain completa per applicazioni Electron
- [Vite](https://vitejs.dev/) - Build tool e server di sviluppo
- [TypeScript](https://www.typescriptlang.org/) - Linguaggio di programmazione tipizzato

## Requisiti di sviluppo

- Node.js ≥ v16.4.0
- npm o yarn

## Installazione

```bash
# Clona il repository
git clone https://github.com/tuousername/meetings-minuta-electron-app.git
cd meetings-minuta-electron-app

# Installa le dipendenze
npm install
```

## Avvio dell'applicazione in modalità sviluppo

```bash
npm start
```

## Packaging dell'applicazione

```bash
npm run make
```

## Struttura del progetto

- `src/main.ts` - Processo principale di Electron
- `src/preload.ts` - Script di preload per esporre API sicure
- `src/renderer.ts` - Codice del renderer per l'interfaccia utente
- `src/index.css` - Stili dell'applicazione

## Licenza

MIT 