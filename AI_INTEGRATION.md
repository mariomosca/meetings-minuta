# Integrazione AI per Meeting Transcription App

## 🚀 Overview

L'applicazione ora include un sistema AI completo per:
- **Generazione automatica di titoli** per le riunioni basati sul contenuto della trascrizione
- **Identificazione degli speaker** con suggerimenti di nomi realistici

## 🛠 Architettura

### Provider AI Supportati
- **Google Gemini** ✅ (Implementato)
- **Anthropic Claude** 🔄 (In sviluppo)
- **OpenAI ChatGPT** 🔄 (In sviluppo)

### Struttura del Codice

```
src/services/aiService.ts          # Servizio principale AI
src/main.ts                       # Handler IPC per AI
src/preload.ts                    # API esposte al renderer
src/components/SettingsView.tsx   # Configurazione AI
src/components/TranscriptionView.tsx # UI per funzionalità AI
```

## ⚙️ Configurazione

### 1. Ottenere API Key di Gemini
1. Vai su [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Crea un nuovo progetto o usa uno esistente
3. Genera una nuova API key
4. Copia la chiave e incollala nelle Impostazioni dell'app

### 2. Configurare il Provider
1. Apri **Impostazioni** nell'app
2. Vai alla sezione **AI Provider**
3. Seleziona **Google Gemini** come provider attivo
4. Incolla la tua API key e salva
5. Clicca **Salva** per il provider

## 🎯 Funzionalità

### Generazione Titoli
- Analizza il contenuto completo della trascrizione
- Genera titoli concisi e professionali (max 80 caratteri)
- Mostra il livello di confidence dell'AI
- Aggiorna automaticamente il titolo della riunione

### Identificazione Speaker
- Analizza stile di comunicazione e contenuto
- Suggerisce nomi italiani realistici
- Fornisce spiegazioni del ragionamento
- Mostra confidence score per ogni suggerimento

## 📱 Come Usare

### 1. Nella Vista Trascrizione
1. Completa una trascrizione audio
2. Vedrai apparire i pulsanti AI:
   - 🤖 **Genera titolo** (blu)
   - 👥 **Identifica speaker** (viola)

### 2. Generare un Titolo
1. Clicca **🤖 Genera titolo**
2. L'AI analizzerà la trascrizione
3. Il titolo viene aggiornato automaticamente
4. Vedrai una notifica con confidence score

### 3. Identificare Speaker
1. Clicca **👥 Identifica speaker**
2. L'AI analizzerà gli speaker
3. Si aprirà un modale con i suggerimenti
4. Ogni suggerimento include:
   - Nome originale → Nome suggerito
   - Confidence score (color-coded)
   - Spiegazione del ragionamento

## 🔧 Implementazione Tecnica

### Architettura Modulare
```typescript
interface AIProviderInterface {
  generateTitle(transcriptText: string): Promise<TitleGenerationResponse>
  identifySpeakers(transcriptText: string, utterances: Utterance[]): Promise<SpeakerIdentificationResponse>
}
```

### Provider Gemini
- Utilizza `gemini-1.5-flash` model
- Prompt engineering ottimizzato per italiano
- Gestione errori robusta
- Response parsing con JSON extraction

### Database Schema
```typescript
config: {
  geminiApiKey?: string
  claudeApiKey?: string  
  chatgptApiKey?: string
  aiProvider?: 'gemini' | 'claude' | 'chatgpt'
}
```

## 🎨 UI/UX Design

### Colori Tematici
- **Genera titolo**: Blu (`bg-blue-100`, `border-blue-400`)
- **Identifica speaker**: Viola (`bg-purple-100`, `border-purple-400`)
- **Confidence indicators**:
  - 🟢 Verde: >70% confidence
  - 🟡 Giallo: 40-70% confidence  
  - 🔴 Rosso: <40% confidence

### Responsive Design
- Pulsanti collassano su mobile
- Modale speaker ottimizzato per touch
- Indicatori visivi chiari

## 🔒 Sicurezza

- API keys memorizzate localmente (Electron Store)
- Nessun dato sensibile inviato a server terzi
- Trascrizioni processate solo localmente
- Comunicazione HTTPS con provider AI

## 🚧 Roadmap

### Claude Support
- [ ] Implementare Claude provider
- [ ] Prompt optimization per Claude
- [ ] UI integration

### ChatGPT Support  
- [ ] Implementare OpenAI provider
- [ ] Gestione token limits
- [ ] Cost optimization

### Features Avanzate
- [ ] Speaker name learning/memory
- [ ] Meeting summary generation
- [ ] Action items extraction
- [ ] Sentiment analysis

## 🐛 Troubleshooting

### Errori Comuni

**"No AI provider configured"**
- Verifica che un provider sia selezionato in Impostazioni
- Controlla che l'API key sia stata salvata

**"Gemini title generation failed"**
- Verifica la validità dell'API key
- Controlla la connessione internet
- Assicurati che la trascrizione sia sufficientemente lunga (>50 caratteri)

**"Transcript too short for title generation"**
- La trascrizione deve contenere almeno 50 caratteri
- Completa prima la trascrizione audio

### Log Debug
Controlla la console del developer per errori dettagliati:
- `Cmd+Option+I` (macOS) 
- `Ctrl+Shift+I` (Windows/Linux)

## 📄 License & Credits

- **Google Gemini API**: Terms apply
- **Anthropic Claude**: Terms apply  
- **OpenAI API**: Terms apply

## 💡 Tips & Best Practices

1. **API Key Security**: Non condividere mai le tue API keys
2. **Trascrizioni Lunghe**: Titoli migliori da trascrizioni >2 minuti
3. **Speaker Chiari**: Risultati migliori con speech distinti
4. **Confidence Scores**: Usa suggerimenti >70% confidence
5. **Backup Titles**: Mantieni sempre titoli originali come backup

---

*Integrazione completata il $(date) - Sistema pronto per il testing! 🎉* 