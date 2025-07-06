import React from 'react';
import { useTranslation } from 'react-i18next';
import Modal from 'react-modal';

interface KnowledgeDetailModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  knowledge: any;
}

const customModalStyles = {
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
    width: '90%',
    maxWidth: '800px',
    maxHeight: '90vh',
    overflow: 'auto',
    padding: '0',
    border: 'none',
    borderRadius: '12px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  }
};

const KnowledgeDetailModal: React.FC<KnowledgeDetailModalProps> = ({ isOpen, onRequestClose, knowledge }) => {
  const { t } = useTranslation();
  if (!knowledge) return null;

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('it-IT');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'alta': return 'bg-red-100 text-red-800';
      case 'media': return 'bg-yellow-100 text-yellow-800';
      case 'bassa': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getImportanceColor = (importance: string) => {
    switch (importance?.toLowerCase()) {
      case 'critico': return 'bg-red-100 text-red-800';
      case 'importante': return 'bg-orange-100 text-orange-800';
      case 'utile': return 'bg-blue-100 text-blue-800';
      case 'informativo': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const copyToMarkdown = async () => {
    const markdown = generateMarkdown();
    try {
      await navigator.clipboard.writeText(markdown);
      console.log('Appunti copiati negli appunti in formato Markdown');
    } catch (err) {
      console.error('Errore nel copiare negli appunti:', err);
    }
  };

  const generateMarkdown = () => {
    let markdown = `# ${knowledge.title}\n\n`;
    
    // Informazioni generali
    markdown += `**Categoria:** ${knowledge.category}\n`;
    markdown += `**Creato:** ${formatDateTime(knowledge.createdAt)}\n\n`;
    
    // Riassunto
    if (knowledge.summary) {
      markdown += `## Riassunto\n\n`;
      markdown += `${knowledge.summary}\n\n`;
    }
    
    // Tag
    if (knowledge.tags && knowledge.tags.length > 0) {
      markdown += `**Tag:** `;
      markdown += knowledge.tags.map((tag: string) => `#${tag}`).join(' ');
      markdown += `\n\n`;
    }
    
    // Argomenti chiave
    if (knowledge.keyTopics && knowledge.keyTopics.length > 0) {
      markdown += `## Argomenti Principali\n\n`;
      knowledge.keyTopics.forEach((topic: any) => {
        markdown += `### ${topic.title || topic.topic}\n\n`;
        if (topic.description) {
          markdown += `${topic.description}\n\n`;
        }
        if (topic.summary) {
          markdown += `${topic.summary}\n\n`;
        }
        if (topic.importance) {
          markdown += `**Importanza:** ${topic.importance}\n\n`;
        }
      });
    }
    
    // Insights
    if (knowledge.insights && knowledge.insights.length > 0) {
      markdown += `## Intuizioni e Analisi\n\n`;
      knowledge.insights.forEach((insight: any, index: number) => {
        markdown += `${index + 1}. `;
        if (insight.title) {
          markdown += `**${insight.title}**\n\n`;
        }
        const description = insight.description || insight.insight || (typeof insight === 'string' ? insight : 'Insight');
        markdown += `   ${description}\n\n`;
      });
    }
    
    // Elementi azionabili
    if (knowledge.actionableItems && knowledge.actionableItems.length > 0) {
      markdown += `## Elementi Azionabili\n\n`;
      knowledge.actionableItems.forEach((item: any, index: number) => {
        const title = item.action || item.title || (typeof item === 'string' ? item : 'Elemento azionabile');
        markdown += `${index + 1}. **${title}**\n`;
        if (item.description) markdown += `   - Descrizione: ${item.description}\n`;
        if (item.category) markdown += `   - Categoria: ${item.category}\n`;
        if (item.priority) markdown += `   - Priorità: ${item.priority}\n`;
        if (item.timeframe) markdown += `   - Tempistica: ${item.timeframe}\n`;
        markdown += `\n`;
      });
    }
    
    // Connessioni
    if (knowledge.connections && knowledge.connections.length > 0) {
      markdown += `## Connessioni\n\n`;
      knowledge.connections.forEach((connection: string) => {
        markdown += `- ${connection}\n`;
      });
      markdown += `\n`;
    }
    
    // Domande aperte
    if (knowledge.questions && knowledge.questions.length > 0) {
      markdown += `## Domande Aperte\n\n`;
      knowledge.questions.forEach((question: string, index: number) => {
        markdown += `${index + 1}. ${question}\n`;
      });
      markdown += `\n`;
    }
    
    // Concetti
    if (knowledge.concepts && knowledge.concepts.length > 0) {
      markdown += `## Concetti\n\n`;
      knowledge.concepts.forEach((concept: any) => {
        const name = concept.name || concept.title || (typeof concept === 'string' ? concept : 'Concetto');
        markdown += `- **${name}**`;
        if (concept.description) markdown += `: ${concept.description}`;
        markdown += `\n`;
      });
      markdown += `\n`;
    }
    
    // Apprendimenti
    if (knowledge.learnings && knowledge.learnings.length > 0) {
      markdown += `## Apprendimenti\n\n`;
      knowledge.learnings.forEach((learning: any) => {
        const lesson = learning.lesson || learning.title || (typeof learning === 'string' ? learning : 'Apprendimento');
        markdown += `- **${lesson}**`;
        if (learning.description) markdown += `: ${learning.description}`;
        markdown += `\n`;
      });
      markdown += `\n`;
    }
    
    // Risorse
    if (knowledge.resources && knowledge.resources.length > 0) {
      markdown += `## Risorse\n\n`;
      knowledge.resources.forEach((resource: any) => {
        const title = resource.title || resource.name || (typeof resource === 'string' ? resource : 'Risorsa');
        markdown += `- **${title}**`;
        if (resource.url) markdown += ` - [${resource.url}](${resource.url})`;
        if (resource.description) markdown += `\n  ${resource.description}`;
        markdown += `\n`;
      });
      markdown += `\n`;
    }
    
    // Metadata
    markdown += `---\n`;
    markdown += `*Generato con ${knowledge.templateUsed || 'N/A'} tramite ${knowledge.aiProvider || 'N/A'}*\n`;
    markdown += `*ID: ${knowledge.id}*\n`;
    
    return markdown;
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      style={customModalStyles}
      contentLabel="Dettaglio Appunti"
    >
      <div className="bg-white">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-yellow-600 text-2xl mr-3">🧠</span>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{knowledge.title}</h2>
                <p className="text-sm text-gray-600">
                  Categoria: {knowledge.category} • 
                  Creata: {formatDateTime(knowledge.createdAt)}
                </p>
              </div>
            </div>
            <button 
              onClick={onRequestClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Summary */}
          {knowledge.summary && (
            <div>
                              <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('knowledgeDetail.sections.summary')}</h3>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-gray-800 leading-relaxed">{knowledge.summary}</p>
              </div>
            </div>
          )}

          {/* Tags */}
          {knowledge.tags && knowledge.tags.length > 0 && (
            <div>
                              <h3 className="text-lg font-semibold text-gray-900 mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {knowledge.tags.map((tag: string, index: number) => (
                  <span key={index} className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Key Topics */}
          {knowledge.keyTopics && knowledge.keyTopics.length > 0 && (
            <div>
                              <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('knowledgeDetail.sections.keyTopics')}</h3>
              <div className="space-y-3">
                {knowledge.keyTopics.map((topic: any, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{topic.title || topic.topic}</h4>
                      {topic.importance && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getImportanceColor(topic.importance)}`}>
                          {topic.importance}
                        </span>
                      )}
                    </div>
                    {topic.description && (
                      <p className="text-gray-700 text-sm">{topic.description}</p>
                    )}
                    {topic.summary && (
                      <p className="text-gray-700 text-sm">{topic.summary}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Insights */}
          {knowledge.insights && knowledge.insights.length > 0 && (
            <div>
                              <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('knowledgeDetail.sections.insights')}</h3>
              <div className="space-y-3">
                {knowledge.insights.map((insight: any, index: number) => (
                  <div key={index} className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        {insight.title && (
                          <h4 className="font-medium text-purple-900 mb-1">{insight.title}</h4>
                        )}
                        <p className="text-purple-800 text-sm leading-relaxed">
                          {insight.description || insight.insight || (typeof insight === 'string' ? insight : 'Insight')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actionable Items */}
          {knowledge.actionableItems && knowledge.actionableItems.length > 0 && (
            <div>
                              <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('knowledgeDetail.sections.actionableItems')}</h3>
              <div className="space-y-3">
                {knowledge.actionableItems.map((item: any, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900 flex-1">
                        {item.action || item.title || (typeof item === 'string' ? item : 'Elemento azionabile')}
                      </h4>
                      {item.priority && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>
                          {item.priority}
                        </span>
                      )}
                    </div>
                    
                    {item.description && (
                      <p className="text-gray-700 text-sm mb-2">{item.description}</p>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {item.category && (
                        <div>
                                                      <span className="text-sm font-medium text-gray-600">{t('knowledgeDetail.actionableItem.category')}:</span>
                          <span className="ml-2 text-sm text-gray-900">{item.category}</span>
                        </div>
                      )}
                      {item.timeframe && (
                        <div>
                                                      <span className="text-sm font-medium text-gray-600">{t('knowledgeDetail.actionableItem.timeframe')}:</span>
                          <span className="ml-2 text-sm text-gray-900">{item.timeframe}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Connections */}
          {knowledge.connections && knowledge.connections.length > 0 && (
            <div>
                              <h3 className="text-lg font-semibold text-gray-900 mb-3">Connections</h3>
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <div className="flex flex-wrap gap-2">
                  {knowledge.connections.map((connection: string, index: number) => (
                    <span key={index} className="inline-block bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm">
                      {connection}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Questions */}
          {knowledge.questions && knowledge.questions.length > 0 && (
            <div>
                              <h3 className="text-lg font-semibold text-gray-900 mb-3">Open Questions</h3>
              <div className="space-y-3">
                {knowledge.questions.map((question: string, index: number) => (
                  <div key={index} className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                        <span className="text-white text-xs font-bold">?</span>
                      </div>
                      <p className="text-amber-800 text-sm leading-relaxed">{question}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Concepts & Learnings */}
          {(knowledge.concepts || knowledge.learnings) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {knowledge.concepts && knowledge.concepts.length > 0 && (
                <div>
                                     <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('knowledgeDetail.sections.concepts')}</h3>
                  <div className="space-y-2">
                    {knowledge.concepts.map((concept: any, index: number) => (
                      <div key={index} className="bg-teal-50 border border-teal-200 rounded p-3">
                        <p className="text-teal-800 text-sm font-medium">
                          {concept.name || concept.title || (typeof concept === 'string' ? concept : 'Concetto')}
                        </p>
                        {concept.description && (
                          <p className="text-teal-700 text-xs mt-1">{concept.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {knowledge.learnings && knowledge.learnings.length > 0 && (
                <div>
                                     <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('knowledgeDetail.sections.learnings')}</h3>
                  <div className="space-y-2">
                    {knowledge.learnings.map((learning: any, index: number) => (
                      <div key={index} className="bg-emerald-50 border border-emerald-200 rounded p-3">
                        <p className="text-emerald-800 text-sm font-medium">
                          {learning.lesson || learning.title || (typeof learning === 'string' ? learning : 'Apprendimento')}
                        </p>
                        {learning.description && (
                          <p className="text-emerald-700 text-xs mt-1">{learning.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Resources */}
          {knowledge.resources && knowledge.resources.length > 0 && (
            <div>
                              <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('knowledgeDetail.sections.resources')}</h3>
              <div className="space-y-2">
                {knowledge.resources.map((resource: any, index: number) => (
                  <div key={index} className="bg-cyan-50 border border-cyan-200 rounded-lg p-3">
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-cyan-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      <div>
                        <p className="text-cyan-800 text-sm font-medium">
                          {resource.title || resource.name || (typeof resource === 'string' ? resource : 'Risorsa')}
                        </p>
                        {resource.url && (
                          <a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-cyan-600 text-xs hover:underline">
                            {resource.url}
                          </a>
                        )}
                        {resource.description && (
                          <p className="text-cyan-700 text-xs mt-1">{resource.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="border-t border-gray-200 pt-4">
                         <h3 className="text-sm font-medium text-gray-600 mb-2">{t('knowledgeDetail.metadata.title')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
              <div>
                                 <span className="font-medium">{t('knowledgeDetail.metadata.template')}:</span>
                <span className="ml-1">{knowledge.templateUsed || 'N/A'}</span>
              </div>
              <div>
                                 <span className="font-medium">{t('knowledgeDetail.metadata.aiProvider')}:</span>
                <span className="ml-1">{knowledge.aiProvider || 'N/A'}</span>
              </div>
              <div>
                                 <span className="font-medium">ID:</span>
                <span className="ml-1 font-mono text-xs">{knowledge.id}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4">
          <div className="flex justify-between">
            <button 
              onClick={copyToMarkdown}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
                             {t('knowledgeDetail.copyMarkdown')}
            </button>
            <button 
              onClick={onRequestClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
            >
                             {t('knowledgeDetail.close')}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default KnowledgeDetailModal; 