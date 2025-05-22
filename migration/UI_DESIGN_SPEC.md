# Specifiche di Design UI per Meetings Minuta

## Concetto di Design
L'applicazione Meetings Minuta deve avere un'interfaccia moderna, professionale e facile da usare che si allinea ai principi di design delle applicazioni desktop moderne. Questo documento delinea le specifiche di design UI che utilizzeranno React con TailwindCSS.

## Layout e Componenti Principali

### 1. Layout a Sidebar
Una sidebar laterale per la navigazione principale con:
- Dashboard/Home
- Elenco Riunioni
- Trascrizioni
- Impostazioni
- Monitoraggio File

```tsx
// Esempio di implementazione della sidebar
<aside className="w-64 bg-white dark:bg-gray-800 shadow-md h-screen fixed left-0 top-0 overflow-y-auto">
  <div className="px-4 py-6">
    <h2 className="text-xl font-bold text-blue-600 mb-6">Meetings Minuta</h2>
    
    <nav className="space-y-2">
      <a href="#" className="flex items-center px-4 py-2.5 text-gray-700 bg-gray-100 rounded-lg">
        <span className="ml-3">Dashboard</span>
      </a>
      <a href="#" className="flex items-center px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg">
        <span className="ml-3">Riunioni</span>
      </a>
      <a href="#" className="flex items-center px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg">
        <span className="ml-3">Trascrizioni</span>
      </a>
      <a href="#" className="flex items-center px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg">
        <span className="ml-3">Monitoraggio File</span>
      </a>
      <a href="#" className="flex items-center px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg">
        <span className="ml-3">Impostazioni</span>
      </a>
    </nav>
  </div>
</aside>
```

### 2. Vista Dashboard
- Area di riepilogo con statistiche (numero di riunioni, trascrizioni completate, ecc.)
- Card per "Riunioni Recenti" e "Trascrizioni in corso"
- Pulsante grande per "Nuova Riunione" o "Importa Audio"

```tsx
// Esempio di implementazione dashboard
<div className="ml-64 p-8">
  <div className="mb-8">
    <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
    <p className="text-gray-600">Benvenuto in Meetings Minuta</p>
  </div>
  
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-2">Riunioni</h3>
      <p className="text-3xl font-bold">12</p>
    </div>
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-2">Trascrizioni Completate</h3>
      <p className="text-3xl font-bold">8</p>
    </div>
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-2">In Elaborazione</h3>
      <p className="text-3xl font-bold">3</p>
    </div>
  </div>
  
  <div className="flex justify-end mb-8">
    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
      + Nuova Riunione
    </button>
  </div>
  
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Riunioni Recenti</h2>
      {/* Lista riunioni recenti */}
    </div>
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Trascrizioni in Corso</h2>
      {/* Lista trascrizioni in corso */}
    </div>
  </div>
</div>
```

### 3. Vista Riunioni
- Visualizzazione a griglia o lista delle riunioni
- Card per ogni riunione con:
  - Titolo
  - Data/ora
  - Durata
  - Stato (Trascritta, In elaborazione, In attesa)
  - Miniatura o icona rappresentativa

```tsx
// Esempio di card per riunione
<div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Riunione di Progetto</h3>
  <p className="text-sm text-gray-500 dark:text-gray-400">22/05/2025, 14:30</p>
  <div className="mt-4 flex items-center">
    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
      Trascritta
    </span>
    <span className="ml-auto text-sm text-gray-500">45:22</span>
  </div>
  <div className="mt-4 flex justify-end">
    <button className="text-blue-600 hover:text-blue-800">Visualizza</button>
    <button className="ml-4 text-red-600 hover:text-red-800">Elimina</button>
  </div>
</div>
```

### 4. Vista Trascrizione
- Player audio integrato con controlli di riproduzione
- Visualizzazione della trascrizione con:
  - Identificazione dei parlanti
  - Timestamp sincronizzati
  - Evidenziazione del testo durante la riproduzione
  - Editor di testo integrato per correzioni
- Barra laterale per la navigazione rapida nella trascrizione
- Strumenti di editing (correzione testo, aggiunta parlanti, modifica timestamp)

```tsx
// Layout per la vista trascrizione
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  {/* Player audio */}
  <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
    <div className="mb-4">
      <h3 className="text-lg font-semibold mb-2">Audio</h3>
      <div className="aspect-w-16 aspect-h-9 bg-gray-200 rounded mb-2">
        {/* Player audio */}
      </div>
      <div className="flex items-center justify-between">
        <button className="p-2 rounded-full bg-blue-600 text-white">
          {/* Icona play */}
        </button>
        <div className="h-2 flex-1 mx-4 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 w-1/3"></div>
        </div>
        <span className="text-sm">12:34 / 45:22</span>
      </div>
    </div>
    
    <div>
      <h3 className="text-lg font-semibold mb-2">Parlanti</h3>
      <div className="space-y-2">
        <div className="flex items-center p-2 bg-gray-100 rounded">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white">
            A
          </div>
          <span className="ml-2">Moderatore</span>
        </div>
        <div className="flex items-center p-2 bg-gray-100 rounded">
          <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white">
            B
          </div>
          <span className="ml-2">Partecipante 1</span>
        </div>
      </div>
    </div>
  </div>
  
  {/* Editor trascrizione */}
  <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
    <h2 className="text-xl font-semibold mb-4">Trascrizione</h2>
    
    <div className="mb-4 flex items-center">
      <button className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg mr-2">
        Esporta
      </button>
      <button className="px-3 py-1 bg-gray-100 text-gray-800 rounded-lg">
        Salva
      </button>
    </div>
    
    <div className="space-y-4">
      {/* Esempio di trascrizione */}
      <div className="p-3 border-l-4 border-blue-600">
        <div className="flex justify-between items-start mb-1">
          <span className="font-medium">Moderatore</span>
          <span className="text-sm text-gray-500">00:00:15</span>
        </div>
        <p className="text-gray-800">
          Benvenuti alla riunione di oggi. Inizieremo con una panoramica del progetto.
        </p>
      </div>
      
      <div className="p-3 border-l-4 border-green-600">
        <div className="flex justify-between items-start mb-1">
          <span className="font-medium">Partecipante 1</span>
          <span className="text-sm text-gray-500">00:00:42</span>
        </div>
        <p className="text-gray-800">
          Grazie per l'introduzione. Vorrei discutere dei progressi fatti nell'ultima settimana.
        </p>
      </div>
    </div>
  </div>
</div>
```

### 5. Vista Impostazioni
- Configurazione API AssemblyAI
- Configurazione directory di monitoraggio
- Preferenze utente e tema
- Impostazioni di esportazione

```tsx
// Esempio di vista impostazioni
<div className="p-6 max-w-4xl mx-auto">
  <h1 className="text-2xl font-bold mb-6">Impostazioni</h1>
  
  <div className="bg-white rounded-lg shadow-md p-6 mb-6">
    <h2 className="text-xl font-semibold mb-4">API Integration</h2>
    
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        API Key AssemblyAI
      </label>
      <input 
        type="text" 
        className="w-full px-3 py-2 border border-gray-300 rounded-md" 
        placeholder="Inserisci la tua API key"
      />
      <p className="mt-1 text-sm text-gray-500">
        Richiesto per la trascrizione automatica
      </p>
    </div>
  </div>
  
  <div className="bg-white rounded-lg shadow-md p-6 mb-6">
    <h2 className="text-xl font-semibold mb-4">Monitoraggio File</h2>
    
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Directory di Monitoraggio
      </label>
      <div className="flex">
        <input 
          type="text" 
          className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md" 
          placeholder="/percorso/alla/directory"
          readOnly
        />
        <button className="bg-gray-200 px-4 py-2 rounded-r-md">
          Sfoglia
        </button>
      </div>
      <p className="mt-1 text-sm text-gray-500">
        I nuovi file audio in questa directory verranno automaticamente rilevati
      </p>
    </div>
  </div>
  
  <div className="bg-white rounded-lg shadow-md p-6">
    <h2 className="text-xl font-semibold mb-4">Preferenze</h2>
    
    <div className="mb-4">
      <label className="flex items-center">
        <input type="checkbox" className="h-4 w-4 text-blue-600 rounded" />
        <span className="ml-2 text-gray-700">Abilita tema scuro</span>
      </label>
    </div>
    
    <div className="mb-4">
      <label className="flex items-center">
        <input type="checkbox" className="h-4 w-4 text-blue-600 rounded" />
        <span className="ml-2 text-gray-700">Notifiche desktop</span>
      </label>
    </div>
  </div>
</div>
```

## Schema Colori
- Palette professionale ma accogliente:
  - Colore primario: Blu (#3B82F6)
  - Colore secondario: Grigio scuro (#374151)
  - Sfondo chiaro: Grigio chiaro (#F9FAFB)
  - Accenti: Turchese (#0EA5E9) per evidenziazioni
  - Bianco (#FFFFFF) per aree di contenuto

## Caratteristiche UX/UI Aggiuntive

### 1. Stato di Caricamento
- Indicatori di caricamento/progresso per operazioni lunghe
- Skeleton loaders per contenuti in fase di caricamento

### 2. Notifiche e Feedback
- Toast notifications per azioni completate
- Messaggi di errore e avvisi
- Conferme per azioni distruttive (eliminazione)

### 3. Accessibilità
- Contrasto adeguato per testo e componenti
- Focus visibile per navigazione da tastiera
- Etichette per screen reader
- Supporto per modalità scura

### 4. Reattività e Adattabilità
- Layout che si adatta a diverse dimensioni di finestra
- Breakpoint per desktop, tablet e laptop
- Navigazione adattiva (sidebar collassabile)

## Implementazione con Tailwind CSS

Le specifiche di design saranno implementate utilizzando TailwindCSS, che è già configurato nel progetto. La palette di colori e le dimensioni saranno definite nel file `tailwind.config.js` per garantire coerenza in tutta l'applicazione.

```js
// tailwind.config.js esteso
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',  // Colore primario
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },
        secondary: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',  // Colore secondario
          800: '#1F2937',
          900: '#111827',
        },
        accent: {
          500: '#0EA5E9',  // Colore accento
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        'sidebar': '16rem',
      }
    },
  },
  plugins: [],
  darkMode: 'class',
}
``` 