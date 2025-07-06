import axios from 'axios';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerativeModel } from '@google/generative-ai';
import { promptTemplateService, TitlePromptParams, SpeakerPromptParams, MinutesPromptParams, KnowledgePromptParams } from './promptTemplateService';

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
    // Opzionale: per analisi avanzata basata su conversazione
    evidence?: {
      mentions: number;
      positions: number[];
      type: 'direct_address' | 'self_introduction' | 'response_pattern' | 'contextual';
      response_pattern?: 'immediate' | 'delayed' | 'unclear';
    };
  }>;
  // Opzionale: summary dell'analisi per template avanzato
  analysis_summary?: {
    total_names_found: number;
    participants_identified: number;
    excluded_mentions: string[];
  };
}

// Interfaccia per le minute del meeting
export interface MeetingMinutes {
  title: string;
  date: string;
  // Campo principale aggiunto: riassunto dell'incontro
  meetingSummary?: string;
  participants: Array<{
    name: string;
    role?: string;
    attendance?: string;
    contribution?: string; // Per template dettagliato
  }>;
  agenda?: string[];
  keyDiscussions?: Array<{
    topic: string;
    summary: string;
    timeSpent?: string; // Per template dettagliato
    keyPoints?: string[];
    decisions?: string[];
    concerns?: string[];
    alternatives?: string[]; // Per template dettagliato
  }>;
  actionItems: Array<{
    id?: string;
    action: string;
    owner: string;
    dueDate?: string;
    priority: 'High' | 'Medium' | 'Low';
    status?: string;
    dependencies?: string[];
    effort?: string; // Per template dettagliato
    acceptanceCriteria?: string; // Per template dettagliato
  }>;
  nextMeeting?: {
    date?: string;
    agenda?: string[];
  };
  metadata?: {
    duration?: string;
    startTime?: string; // Per template dettagliato
    location?: string;
    type?: string;
    attendeesCount?: string; // Per template dettagliato
  };
  // Campi per template executive
  meetingPurpose?: string;
  keyOutcomes?: string[];
  businessImpact?: string;
  // Campi comuni
  executiveSummary?: string;
  keyDecisions?: string[] | Array<{
    decision: string;
    rationale: string;
    impact: string;
    alternatives: string;
  }>;
  criticalActions?: Array<{
    action: string;
    owner: string;
    dueDate: string;
    impact: string;
    priority?: string;
  }>;
  risks?: string[] | Array<{
    risk: string;
    impact: string;
    likelihood: string;
    mitigation: string;
  }>;
  nextSteps?: string[];
  // Campi per template dettagliato
  openIssues?: Array<{
    issue: string;
    owner: string;
    targetDate: string;
  }>;
  followUp?: {
    nextMeeting?: string;
    nextReview?: string; // Per template executive
    escalation?: string; // Per template executive
    preparationNeeded?: string[];
    communicationPlan?: string; // Per template dettagliato
  };
}

// Interfaccia per la knowledge base
export interface KnowledgeBase {
  title: string;
  summary: string;
  tags: string[];
  category: string;
  keyTopics: Array<{
    topic: string;
    summary: string;
    keyPoints: string[];
    examples?: string[];
    references?: string[];
  }>;
  insights: Array<{
    insight: string;
    context: string;
    applicability: string;
  }>;
  actionableItems: Array<{
    item: string;
    category: 'learn' | 'implement' | 'research';
    priority: 'high' | 'medium' | 'low';
  }>;
  connections: string[];
  questions: string[];
  // Per template di ricerca
  abstract?: string;
  keywords?: string[];
  methodology?: string;
  findings?: Array<{
    finding: string;
    evidence: string;
    significance: string;
  }>;
  concepts?: Array<{
    concept: string;
    definition: string;
    examples: string[];
    relatedConcepts: string[];
  }>;
  hypotheses?: string[];
  futureResearch?: string[];
  bibliography?: string[];
  // Per template personale
  reflection?: string;
  learnings?: Array<{
    learning: string;
    application: string;
    timeline: string;
  }>;
  ideas?: Array<{
    idea: string;
    potential: string;
    nextSteps: string[];
  }>;
  resources?: Array<{
    resource: string;
    type: 'book' | 'article' | 'tool' | 'person';
    priority: 'high' | 'medium' | 'low';
  }>;
  habits?: Array<{
    habit: string;
    reason: string;
    implementation: string;
  }>;
  reminders?: string[];
}

// Interfaccia base per i provider AI
export interface AIProviderInterface {
  generateTitle(transcriptText: string, templateName?: string): Promise<TitleGenerationResponse>;
  identifySpeakers(transcriptText: string, utterances: Utterance[], templateName?: string): Promise<SpeakerIdentificationResponse>;
  generateMinutes(transcriptText: string, participants: string[], meetingDate: string, templateName?: string): Promise<MeetingMinutes>;
  generateKnowledge(transcriptText: string, templateName?: string): Promise<KnowledgeBase>;
}

// Provider Gemini aggiornato con SDK ufficiale
export class GeminiProvider implements AIProviderInterface {
  private googleAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private apiKey: string;
  
  // Configurazione modelli disponibili
  private static readonly MODELS = {
    FLASH_EXPERIMENTAL: 'gemini-2.0-flash-exp',      // Ultimo modello sperimentale
    PRO_LATEST: 'gemini-1.5-pro-002',                // Versione stabile più recente  
    FLASH_LATEST: 'gemini-1.5-flash-002',            // Veloce e aggiornato
    FLASH_STANDARD: 'gemini-1.5-flash'               // Fallback standard
  };

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.googleAI = new GoogleGenerativeAI(apiKey);
    
    // Usa il modello più performante disponibile
    this.model = this.googleAI.getGenerativeModel({ 
      model: GeminiProvider.MODELS.FLASH_EXPERIMENTAL,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
      ],
    });

    console.log('🤖 GEMINI: Inizializzato con SDK ufficiale');
    console.log('📦 Modello:', GeminiProvider.MODELS.FLASH_EXPERIMENTAL);
  }

  async generateTitle(transcriptText: string, templateName?: string): Promise<TitleGenerationResponse> {
    try {
      console.log('🤖 GEMINI: Generazione titolo con SDK ufficiale...');
      
      const prompt = promptTemplateService.generateTitlePrompt({
        transcriptText,
        templateName
      });
      console.log('📝 GEMINI: Prompt titolo:', prompt.substring(0, 200) + '...');
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      console.log('🤖 GEMINI: Risposta raw titolo:', text);
      
      // Estrai il JSON dalla risposta
      const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('✅ GEMINI: Titolo generato:', parsed.title);
        return {
          title: parsed.title,
          confidence: parsed.confidence || 0.8
        };
      }
      
      // Fallback se non trova JSON
      return {
        title: text.trim(),
        confidence: 0.7
      };
    } catch (error: any) {
      console.error('❌ GEMINI: Errore generazione titolo:', error);
      
      // Gestione errori specifici API key
      if (error?.message?.includes('API key not valid') || error?.message?.includes('API_KEY_INVALID') || error?.status === 400) {
        throw new Error('AI_CONFIG_INVALID:gemini:La chiave API di Gemini non è valida. Verifica che la chiave sia corretta nelle Impostazioni.');
      }
      
      // Fallback automatico a modello standard se sperimentale fallisce
      if (error?.message?.includes('404') || error?.message?.includes('model')) {
        console.log('🔄 GEMINI: Tentativo fallback a modello standard...');
        return this.fallbackToStandardModel('generateTitle', transcriptText, templateName);
      }
      
      throw new Error(`Errore durante la generazione del titolo: ${error?.message}`);
    }
  }

  async identifySpeakers(transcriptText: string, utterances: Utterance[], templateName?: string): Promise<SpeakerIdentificationResponse> {
    try {
      console.log('🤖 GEMINI: Identificazione speaker con SDK ufficiale...');
      console.log('📊 GEMINI: Utterances da analizzare:', utterances.length);
      
      const settings = promptTemplateService.getSettings();
      const sampleUtterances = utterances
        .slice(0, settings.maxSampleUtterances)
        .map(u => `${u.speaker}: ${u.text}`)
        .join('\n');

      const currentSpeakers = Array.from(new Set(utterances.map(u => u.speaker)));
      console.log('🗣️ GEMINI: Speaker attuali:', currentSpeakers);

      const prompt = promptTemplateService.generateSpeakerPrompt({
        currentSpeakers,
        sampleUtterances,
        templateName
      });
      
      console.log('📝 GEMINI: Prompt speaker:', prompt.substring(0, 300) + '...');

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      console.log('🤖 GEMINI: Risposta raw:', text);
      
      const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleanText) as SpeakerIdentificationResponse;
      
      console.log('✅ GEMINI: Speaker identificati:', parsed.speakers?.length || 0);
      console.log('📋 GEMINI: Dettagli speaker:', parsed.speakers);
      
      return parsed;
    } catch (error: any) {
      console.error('❌ GEMINI: Errore identificazione speaker:', error);
      
      // Gestione errori specifici API key
      if (error?.message?.includes('API key not valid') || error?.message?.includes('API_KEY_INVALID') || error?.status === 400) {
        throw new Error('AI_CONFIG_INVALID:gemini:La chiave API di Gemini non è valida. Verifica che la chiave sia corretta nelle Impostazioni.');
      }
      
      // Fallback automatico
      if (error?.message?.includes('404') || error?.message?.includes('model')) {
        return this.fallbackToStandardModel('identifySpeakers', transcriptText, utterances, templateName);
      }
      
      throw new Error(`Errore durante l'identificazione degli speaker: ${error?.message}`);
    }
  }

  async generateMinutes(transcriptText: string, participants: string[], meetingDate: string, templateName?: string): Promise<MeetingMinutes> {
    try {
      console.log('🤖 GEMINI: Generazione minute con SDK ufficiale...');
      console.log('📄 GEMINI: Lunghezza trascrizione:', transcriptText.length);
      
      const prompt = promptTemplateService.generateMinutesPrompt({
        transcriptText,
        participants,
        meetingDate,
        templateName
      });
      console.log('📝 GEMINI: Prompt minute:', prompt.substring(0, 400) + '...');

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      console.log('🤖 GEMINI: Risposta raw minute:', text.substring(0, 500) + '...');
      
      const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleanText) as MeetingMinutes;
      
      console.log('✅ GEMINI: Minute generate con successo');
      console.log('📋 GEMINI: Titolo:', parsed.title);
      console.log('📅 GEMINI: Data:', parsed.date);
      console.log('👥 GEMINI: Partecipanti:', parsed.participants?.length || 0);
      console.log('✅ GEMINI: Action items:', parsed.actionItems?.length || 0);
      console.log('📝 GEMINI: Ha riassunto:', !!parsed.meetingSummary);
      
      return parsed;
    } catch (error: any) {
      console.error('❌ GEMINI: Errore generazione minute:', error);
      
      // Gestione errori specifici API key
      if (error?.message?.includes('API key not valid') || error?.message?.includes('API_KEY_INVALID') || error?.status === 400) {
        throw new Error('AI_CONFIG_INVALID:gemini:La chiave API di Gemini non è valida. Verifica che la chiave sia corretta nelle Impostazioni.');
      }
      
      // Fallback automatico per errori di modello
      if (error?.message?.includes('404') || error?.message?.includes('model')) {
        return this.fallbackToStandardModel('generateMinutes', transcriptText, participants, meetingDate, templateName);
      }
      
      throw new Error(`Errore durante la generazione delle minute: ${error?.message}`);
    }
  }

  async generateKnowledge(transcriptText: string, templateName?: string): Promise<KnowledgeBase> {
    try {
      console.log('🤖 GEMINI: Generazione knowledge con SDK ufficiale...');
      
      const prompt = promptTemplateService.generateKnowledgePrompt({
        transcriptText,
        templateName
      });
      console.log('📝 GEMINI: Prompt knowledge:', prompt.substring(0, 300) + '...');

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      console.log('🤖 GEMINI: Risposta raw knowledge:', text.substring(0, 300) + '...');
      
      const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleanText) as KnowledgeBase;
      
      console.log('✅ GEMINI: Knowledge generato con successo');
      
      return parsed;
    } catch (error: any) {
      console.error('❌ GEMINI: Errore generazione knowledge:', error);
      
      // Gestione errori specifici API key
      if (error?.message?.includes('API key not valid') || error?.message?.includes('API_KEY_INVALID') || error?.status === 400) {
        throw new Error('AI_CONFIG_INVALID:gemini:La chiave API di Gemini non è valida. Verifica che la chiave sia corretta nelle Impostazioni.');
      }
      
      // Fallback automatico
      if (error?.message?.includes('404') || error?.message?.includes('model')) {
        return this.fallbackToStandardModel('generateKnowledge', transcriptText, templateName);
      }
      
      throw new Error(`Errore durante la generazione della knowledge: ${error?.message}`);
    }
  }

  // Metodo di fallback per modelli standard
  private async fallbackToStandardModel(method: string, ...args: any[]): Promise<any> {
    console.log(`🔄 GEMINI: Fallback al modello ${GeminiProvider.MODELS.FLASH_LATEST}`);
    
    // Crea temporaneamente modello con versione stabile
    const fallbackModel = this.googleAI.getGenerativeModel({ 
      model: GeminiProvider.MODELS.FLASH_LATEST,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    });
    
    // Sostituisci temporaneamente il modello
    const originalModel = this.model;
    this.model = fallbackModel;
    
    try {
      // Richiama il metodo originale con il modello di fallback
      switch (method) {
        case 'generateTitle':
          return await this.generateTitle(args[0], args[1]);
        case 'identifySpeakers':
          return await this.identifySpeakers(args[0], args[1], args[2]);
        case 'generateMinutes':
          return await this.generateMinutes(args[0], args[1], args[2], args[3]);
        case 'generateKnowledge':
          return await this.generateKnowledge(args[0], args[1]);
        default:
          throw new Error(`Metodo ${method} non supportato per fallback`);
      }
    } finally {
      // Ripristina il modello originale
      this.model = originalModel;
    }
  }

  // Metodo per cambiare modello dinamicamente
  public switchModel(modelType: 'experimental' | 'latest' | 'standard' = 'experimental') {
    let modelName: string;
    
    switch (modelType) {
      case 'experimental':
        modelName = GeminiProvider.MODELS.FLASH_EXPERIMENTAL;
        break;
      case 'latest':
        modelName = GeminiProvider.MODELS.PRO_LATEST;
        break;
      case 'standard':
        modelName = GeminiProvider.MODELS.FLASH_STANDARD;
        break;
      default:
        modelName = GeminiProvider.MODELS.FLASH_EXPERIMENTAL;
    }
    
    this.model = this.googleAI.getGenerativeModel({ 
      model: modelName,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    });
    
    console.log(`🔄 GEMINI: Modello cambiato a ${modelName}`);
  }
}

// Provider Claude (per implementazione futura)
export class ClaudeProvider implements AIProviderInterface {
  private apiKey: string;
  private baseURL = 'https://api.anthropic.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateTitle(_transcriptText: string, _templateName?: string): Promise<TitleGenerationResponse> {
    // TODO: Implementare quando necessario
    throw new Error('Claude provider not implemented yet');
  }

  async identifySpeakers(_transcriptText: string, _utterances: Utterance[], _templateName?: string): Promise<SpeakerIdentificationResponse> {
    // TODO: Implementare quando necessario
    throw new Error('Claude provider not implemented yet');
  }

  async generateMinutes(_transcriptText: string, _participants: string[], _meetingDate: string, _templateName?: string): Promise<MeetingMinutes> {
    // TODO: Implementare quando necessario
    throw new Error('Claude provider not implemented yet');
  }

  async generateKnowledge(_transcriptText: string, _templateName?: string): Promise<KnowledgeBase> {
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

  async generateTitle(_transcriptText: string, _templateName?: string): Promise<TitleGenerationResponse> {
    // TODO: Implementare quando necessario
    throw new Error('ChatGPT provider not implemented yet');
  }

  async identifySpeakers(_transcriptText: string, _utterances: Utterance[], _templateName?: string): Promise<SpeakerIdentificationResponse> {
    // TODO: Implementare quando necessario
    throw new Error('ChatGPT provider not implemented yet');
  }

  async generateMinutes(_transcriptText: string, _participants: string[], _meetingDate: string, _templateName?: string): Promise<MeetingMinutes> {
    // TODO: Implementare quando necessario
    throw new Error('ChatGPT provider not implemented yet');
  }

  async generateKnowledge(_transcriptText: string, _templateName?: string): Promise<KnowledgeBase> {
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
  async generateMeetingTitle(transcriptText: string, templateName?: string): Promise<TitleGenerationResponse> {
    if (!this.currentProvider) {
      throw new Error('No AI provider configured');
    }

    if (!transcriptText || transcriptText.trim().length < 50) {
      throw new Error('Transcript too short for title generation');
    }

    return await this.currentProvider.generateTitle(transcriptText, templateName);
  }

  /**
   * Identifica i nomi degli speaker
   */
  async identifySpeakers(transcriptText: string, utterances: Utterance[], templateName?: string): Promise<SpeakerIdentificationResponse> {
    if (!this.currentProvider) {
      throw new Error('No AI provider configured');
    }

    if (!utterances || utterances.length < 2) {
      throw new Error('Not enough utterances for speaker identification');
    }

    return await this.currentProvider.identifySpeakers(transcriptText, utterances, templateName);
  }

  /**
   * Genera le minute del meeting
   */
  async generateMeetingMinutes(transcriptText: string, participants: string[], meetingDate: string, templateName?: string): Promise<MeetingMinutes> {
    if (!this.currentProvider) {
      throw new Error('No AI provider configured');
    }

    if (!transcriptText || transcriptText.trim().length < 100) {
      throw new Error('Transcript too short for minutes generation');
    }

    return await this.currentProvider.generateMinutes(transcriptText, participants, meetingDate, templateName);
  }

  /**
   * Genera appunti per la knowledge base
   */
  async generateKnowledgeBase(transcriptText: string, templateName?: string): Promise<KnowledgeBase> {
    if (!this.currentProvider) {
      throw new Error('No AI provider configured');
    }

    if (!transcriptText || transcriptText.trim().length < 100) {
      throw new Error('Transcript too short for knowledge generation');
    }

    return await this.currentProvider.generateKnowledge(transcriptText, templateName);
  }

  /**
   * Ottiene i template disponibili per una categoria
   */
  getAvailableTemplates(category: 'titleGeneration' | 'speakerIdentification' | 'minutesGeneration' | 'knowledgeGeneration') {
    return promptTemplateService.getAvailableTemplates(category);
  }

  /**
   * Ottiene le impostazioni dei template
   */
  getTemplateSettings() {
    return promptTemplateService.getSettings();
  }
}

// Istanza singleton del servizio AI
export const aiService = new AIService(); 