import axios from 'axios';

// Interface for utterance
interface Utterance {
  speaker: string;
  text: string;
  start: number;
  end: number;
}

// Tipi per i provider AI
export type AIProvider = 'gemini' | 'claude' | 'chatgpt';

// Interfaccia per la risposta del titolo
export interface TitleGenerationResponse {
  title: string;
  confidence: number;
}

// Interfaccia per la risposta degli speaker
export interface SpeakerIdentificationResponse {
  speakers: Array<{
    originalName: string; // "Speaker 1", "Speaker 2", etc.
    suggestedName: string; // Nome suggerito dall'AI
    confidence: number;
    reasoning: string; // Spiegazione del perché
  }>;
}

// Interfaccia base per i provider AI
export interface AIProviderInterface {
  generateTitle(transcriptText: string): Promise<TitleGenerationResponse>;
  identifySpeakers(transcriptText: string, utterances: Utterance[]): Promise<SpeakerIdentificationResponse>;
}

// Provider Gemini
export class GeminiProvider implements AIProviderInterface {
  private apiKey: string;
  private baseURL = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateTitle(transcriptText: string): Promise<TitleGenerationResponse> {
    try {
      const prompt = `
Analizza questa trascrizione di una riunione e genera un titolo conciso e professionale.

Regole:
- Massimo 80 caratteri
- Cattura l'argomento principale
- Usa un linguaggio formale
- In italiano

Trascrizione:
${transcriptText.substring(0, 3000)} ${transcriptText.length > 3000 ? '...' : ''}

Rispondi solo con un JSON nel formato:
{
  "title": "Titolo della riunione",
  "confidence": 0.85
}
`;

      const response = await axios.post(
        `${this.baseURL}/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`,
        {
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        },
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      const generatedText = response.data.candidates[0].content.parts[0].text;
      
      // Estrai il JSON dalla risposta
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return {
          title: result.title,
          confidence: result.confidence || 0.8
        };
      }

      throw new Error('Invalid response format from Gemini');
    } catch (error) {
      console.error('Error generating title with Gemini:', error);
      throw new Error(`Gemini title generation failed: ${error.message}`);
    }
  }

  async identifySpeakers(transcriptText: string, utterances: Utterance[]): Promise<SpeakerIdentificationResponse> {
    try {
      // Crea un campione delle utterances per l'analisi
      const sampleUtterances = utterances.slice(0, 20).map(u => 
        `${u.speaker}: ${u.text}`
      ).join('\n');

      const prompt = `
Analizza questa trascrizione di una riunione e suggerisci nomi realistici per gli speaker basandoti sul contenuto.

Regole:
- Usa nomi italiani comuni
- Basati su ruoli, argomenti discussi, e stile di comunicazione
- Fornisci una spiegazione del ragionamento
- Confidence da 0.1 a 1.0

Speaker attualmente identificati:
${Array.from(new Set(utterances.map(u => u.speaker))).join(', ')}

Campione di trascrizione:
${sampleUtterances}

Rispondi solo con un JSON nel formato:
{
  "speakers": [
    {
      "originalName": "Speaker 1",
      "suggestedName": "Marco Rossi",
      "confidence": 0.75,
      "reasoning": "Sembra essere il coordinatore, usa linguaggio formale"
    }
  ]
}
`;

      const response = await axios.post(
        `${this.baseURL}/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`,
        {
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        },
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      const generatedText = response.data.candidates[0].content.parts[0].text;
      
      // Estrai il JSON dalla risposta
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return result;
      }

      throw new Error('Invalid response format from Gemini');
    } catch (error) {
      console.error('Error identifying speakers with Gemini:', error);
      throw new Error(`Gemini speaker identification failed: ${error.message}`);
    }
  }
}

// Provider Claude (per implementazione futura)
export class ClaudeProvider implements AIProviderInterface {
  private apiKey: string;
  private baseURL = 'https://api.anthropic.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateTitle(_transcriptText: string): Promise<TitleGenerationResponse> {
    // TODO: Implementare quando necessario
    throw new Error('Claude provider not implemented yet');
  }

  async identifySpeakers(_transcriptText: string, _utterances: Utterance[]): Promise<SpeakerIdentificationResponse> {
    // TODO: Implementare quando necessario
    throw new Error('Claude provider not implemented yet');
  }
}

// Provider ChatGPT (per implementazione futura)
export class ChatGPTProvider implements AIProviderInterface {
  private apiKey: string;
  private baseURL = 'https://api.openai.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateTitle(_transcriptText: string): Promise<TitleGenerationResponse> {
    // TODO: Implementare quando necessario
    throw new Error('ChatGPT provider not implemented yet');
  }

  async identifySpeakers(_transcriptText: string, _utterances: Utterance[]): Promise<SpeakerIdentificationResponse> {
    // TODO: Implementare quando necessario
    throw new Error('ChatGPT provider not implemented yet');
  }
}

// Servizio principale AI
export class AIService {
  private currentProvider: AIProviderInterface | null = null;
  private currentProviderType: AIProvider | null = null;

  constructor() {
    console.log('AIService initialized');
  }

  /**
   * Configura il provider AI
   */
  setProvider(provider: AIProvider, apiKey: string): void {
    switch (provider) {
      case 'gemini':
        this.currentProvider = new GeminiProvider(apiKey);
        break;
      case 'claude':
        this.currentProvider = new ClaudeProvider(apiKey);
        break;
      case 'chatgpt':
        this.currentProvider = new ChatGPTProvider(apiKey);
        break;
      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
    
    this.currentProviderType = provider;
    console.log(`AI provider set to: ${provider}`);
  }

  /**
   * Verifica se un provider è configurato
   */
  hasProvider(): boolean {
    return this.currentProvider !== null;
  }

  /**
   * Ottieni il provider corrente
   */
  getCurrentProvider(): AIProvider | null {
    return this.currentProviderType;
  }

  /**
   * Genera un titolo per la riunione
   */
  async generateMeetingTitle(transcriptText: string): Promise<TitleGenerationResponse> {
    if (!this.currentProvider) {
      throw new Error('No AI provider configured');
    }

    if (!transcriptText || transcriptText.trim().length < 50) {
      throw new Error('Transcript too short for title generation');
    }

    return await this.currentProvider.generateTitle(transcriptText);
  }

  /**
   * Identifica i nomi degli speaker
   */
  async identifySpeakers(transcriptText: string, utterances: Utterance[]): Promise<SpeakerIdentificationResponse> {
    if (!this.currentProvider) {
      throw new Error('No AI provider configured');
    }

    if (!utterances || utterances.length < 2) {
      throw new Error('Not enough utterances for speaker identification');
    }

    return await this.currentProvider.identifySpeakers(transcriptText, utterances);
  }
}

// Istanza singleton del servizio AI
export const aiService = new AIService(); 