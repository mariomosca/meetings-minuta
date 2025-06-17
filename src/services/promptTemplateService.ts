import promptsConfig from '../config/aiPrompts.json';

// Tipi per la configurazione dei template
interface TemplateVariable {
  [key: string]: string | number;
}

interface PromptTemplate {
  name: string;
  description: string;
  prompt: string;
  variables: TemplateVariable;
}

interface TemplateCategory {
  [templateName: string]: PromptTemplate;
}

interface PromptsConfig {
  version: string;
  description: string;
  templates: {
    titleGeneration: TemplateCategory;
    speakerIdentification: TemplateCategory;
    minutesGeneration: TemplateCategory;
    knowledgeGeneration: TemplateCategory;
  };
  settings: {
    defaultTemplate: {
      titleGeneration: string;
      speakerIdentification: string;
      minutesGeneration: string;
      knowledgeGeneration: string;
    };
    maxTranscriptLength: number;
    maxSampleUtterances: number;
  };
}

// Parametri per la generazione del prompt del titolo
export interface TitlePromptParams {
  transcriptText: string;
  templateName?: string;
  customVariables?: TemplateVariable;
}

// Parametri per la generazione del prompt degli speaker
export interface SpeakerPromptParams {
  currentSpeakers: string[];
  sampleUtterances: string;
  templateName?: string;
  customVariables?: TemplateVariable;
}

// Parametri per la generazione del prompt delle minute
export interface MinutesPromptParams {
  transcriptText: string;
  participants: string[];
  meetingDate: string;
  templateName?: string;
  customVariables?: TemplateVariable;
}

// Parametri per la generazione del prompt della knowledge base
export interface KnowledgePromptParams {
  transcriptText: string;
  templateName?: string;
  customVariables?: TemplateVariable;
}

export class PromptTemplateService {
  private config: PromptsConfig;

  constructor() {
    this.config = promptsConfig as PromptsConfig;
  }

  /**
   * Sostituisce le variabili nel template con i valori forniti
   */
  private replaceVariables(template: string, variables: TemplateVariable): string {
    let result = template;
    
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      result = result.replace(new RegExp(placeholder, 'g'), String(value));
    }
    
    return result;
  }

  /**
   * Ottiene un template per categoria e nome
   */
  private getTemplate(category: 'titleGeneration' | 'speakerIdentification' | 'minutesGeneration' | 'knowledgeGeneration', templateName?: string): PromptTemplate {
    const categoryTemplates = this.config.templates[category];
    const name = templateName || this.config.settings.defaultTemplate[category];
    
    if (!categoryTemplates[name]) {
      throw new Error(`Template '${name}' not found in category '${category}'`);
    }
    
    return categoryTemplates[name];
  }

  /**
   * Ottiene tutti i template disponibili per una categoria
   */
  public getAvailableTemplates(category: 'titleGeneration' | 'speakerIdentification' | 'minutesGeneration' | 'knowledgeGeneration'): Array<{name: string, displayName: string, description: string}> {
    const categoryTemplates = this.config.templates[category];
    
    return Object.entries(categoryTemplates).map(([key, template]) => ({
      name: key,
      displayName: template.name,
      description: template.description
    }));
  }

  /**
   * Genera il prompt per la generazione del titolo
   */
  public generateTitlePrompt(params: TitlePromptParams): string {
    const template = this.getTemplate('titleGeneration', params.templateName);
    
    // Combina le variabili del template con quelle personalizzate
    const variables: TemplateVariable = {
      ...template.variables,
      ...params.customVariables,
      transcriptText: this.truncateText(params.transcriptText, this.config.settings.maxTranscriptLength)
    };
    
    return this.replaceVariables(template.prompt, variables);
  }

  /**
   * Genera il prompt per l'identificazione degli speaker
   */
  public generateSpeakerPrompt(params: SpeakerPromptParams): string {
    const template = this.getTemplate('speakerIdentification', params.templateName);
    
    // Combina le variabili del template con quelle personalizzate
    const variables: TemplateVariable = {
      ...template.variables,
      ...params.customVariables,
      currentSpeakers: params.currentSpeakers.join(', '),
      sampleUtterances: params.sampleUtterances
    };
    
    return this.replaceVariables(template.prompt, variables);
  }

  /**
   * Genera il prompt per le minute del meeting
   */
  public generateMinutesPrompt(params: MinutesPromptParams): string {
    const template = this.getTemplate('minutesGeneration', params.templateName);
    
    // Combina le variabili del template con quelle personalizzate
    const variables: TemplateVariable = {
      ...template.variables,
      ...params.customVariables,
      transcriptText: this.truncateText(params.transcriptText, this.config.settings.maxTranscriptLength),
      participants: params.participants.join(', '),
      meetingDate: params.meetingDate
    };
    
    return this.replaceVariables(template.prompt, variables);
  }

  /**
   * Genera il prompt per la knowledge base
   */
  public generateKnowledgePrompt(params: KnowledgePromptParams): string {
    const template = this.getTemplate('knowledgeGeneration', params.templateName);
    
    // Combina le variabili del template con quelle personalizzate
    const variables: TemplateVariable = {
      ...template.variables,
      ...params.customVariables,
      transcriptText: this.truncateText(params.transcriptText, this.config.settings.maxTranscriptLength)
    };
    
    return this.replaceVariables(template.prompt, variables);
  }

  /**
   * Tronca il testo se supera la lunghezza massima
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    
    return text.substring(0, maxLength) + '...';
  }

  /**
   * Ottiene le impostazioni globali
   */
  public getSettings() {
    return this.config.settings;
  }

  /**
   * Ottiene la versione della configurazione
   */
  public getVersion(): string {
    return this.config.version;
  }

  /**
   * Valida un template personalizzato
   */
  public validateTemplate(template: PromptTemplate): boolean {
    // Verifica che il template contenga le variabili richieste
    const requiredVariables = ['transcriptText']; // Variabili minime richieste
    
    for (const variable of requiredVariables) {
      if (!template.prompt.includes(`{{${variable}}}`)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Crea un template personalizzato temporaneo
   */
  public createCustomPrompt(
    category: 'titleGeneration' | 'speakerIdentification' | 'minutesGeneration' | 'knowledgeGeneration',
    customPrompt: string,
    customVariables: TemplateVariable = {}
  ): string {
    const baseTemplate = this.getTemplate(category);
    const variables = {
      ...baseTemplate.variables,
      ...customVariables
    };
    
    return this.replaceVariables(customPrompt, variables);
  }

  /**
   * Esporta la configurazione corrente (per backup o condivisione)
   */
  public exportConfig(): PromptsConfig {
    return { ...this.config };
  }

  /**
   * Debug: mostra tutte le variabili disponibili per un template
   */
  public getTemplateVariables(category: 'titleGeneration' | 'speakerIdentification' | 'minutesGeneration' | 'knowledgeGeneration', templateName?: string): TemplateVariable {
    const template = this.getTemplate(category, templateName);
    return { ...template.variables };
  }
}

// Singleton instance
export const promptTemplateService = new PromptTemplateService(); 