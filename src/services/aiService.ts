import axios from 'axios';
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

// Provider Gemini
export class GeminiProvider implements AIProviderInterface {
  private apiKey: string;
  private baseURL = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateTitle(transcriptText: string, templateName?: string): Promise<TitleGenerationResponse> {
    try {
      // Usa il servizio di templating per generare il prompt
      const prompt = promptTemplateService.generateTitlePrompt({
        transcriptText,
        templateName
      });

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

  async identifySpeakers(transcriptText: string, utterances: Utterance[], templateName?: string): Promise<SpeakerIdentificationResponse> {
    try {
      // Usa il servizio di templating per generare il prompt
      const settings = promptTemplateService.getSettings();
      const sampleUtterances = utterances
        .slice(0, settings.maxSampleUtterances)
        .map(u => `${u.speaker}: ${u.text}`)
        .join('\n');

      const currentSpeakers = Array.from(new Set(utterances.map(u => u.speaker)));

      const prompt = promptTemplateService.generateSpeakerPrompt({
        currentSpeakers,
        sampleUtterances,
        templateName
      });

      // 🚀 LOG: Informazioni di input
      console.log('🎯 SPEAKER IDENTIFICATION - INPUT DATA:');
      console.log('📝 Template utilizzato:', templateName || 'default');
      console.log('👥 Speaker attuali da AssemblyAI:', currentSpeakers);
      console.log('📄 Numero utterances totali:', utterances.length);
      console.log('📄 Numero utterances campione:', sampleUtterances.split('\n').length);
      console.log('🤖 Prompt generato:\n', prompt);
      console.log('═'.repeat(80));

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
      
      // 🚀 LOG: Risposta raw dall'AI
      console.log('🤖 GEMINI RAW RESPONSE:');
      console.log(generatedText);
      console.log('═'.repeat(80));

      // Estrai il JSON dalla risposta
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        
        // 🚀 LOG: Oggetto parsato dall'AI
        console.log('✅ SPEAKER IDENTIFICATION - PARSED RESULT:');
        console.log('📊 Oggetto JSON parsato:', JSON.stringify(result, null, 2));
        
        if (result.speakers && Array.isArray(result.speakers)) {
          console.log('👥 Speaker identificati:', result.speakers.length);
          result.speakers.forEach((speaker: any, index: number) => {
            console.log(`   ${index + 1}. ${speaker.originalName} → ${speaker.suggestedName} (confidence: ${Math.round(speaker.confidence * 100)}%)`);
            console.log(`      Reasoning: ${speaker.reasoning}`);
            if (speaker.evidence) {
              console.log(`      Evidenze: ${speaker.evidence.mentions} menzioni, tipo: ${speaker.evidence.type}`);
            }
          });
        }

        if (result.analysis_summary) {
          console.log('📈 Summary analisi:', result.analysis_summary);
        }

        console.log('═'.repeat(80));
        return result;
      }

      throw new Error('Invalid response format from Gemini');
    } catch (error) {
      console.error('❌ Error identifying speakers with Gemini:', error);
      throw new Error(`Gemini speaker identification failed: ${error.message}`);
    }
  }

  async generateMinutes(transcriptText: string, participants: string[], meetingDate: string, templateName?: string): Promise<MeetingMinutes> {
    try {
      // Usa il servizio di templating per generare il prompt
      const prompt = promptTemplateService.generateMinutesPrompt({
        transcriptText,
        participants,
        meetingDate,
        templateName
      });

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
      console.error('Error generating minutes with Gemini:', error);
      throw new Error(`Gemini minutes generation failed: ${error.message}`);
    }
  }

  async generateKnowledge(transcriptText: string, templateName?: string): Promise<KnowledgeBase> {
    try {
      // Usa il servizio di templating per generare il prompt
      const prompt = promptTemplateService.generateKnowledgePrompt({
        transcriptText,
        templateName
      });

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
      console.error('Error generating knowledge with Gemini:', error);
      throw new Error(`Gemini knowledge generation failed: ${error.message}`);
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