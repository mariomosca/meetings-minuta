import React from 'react';
import Modal from 'react-modal';

interface MinutesDetailModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  minutes: any;
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

const MinutesDetailModal: React.FC<MinutesDetailModalProps> = ({ isOpen, onRequestClose, minutes }) => {
  if (!minutes) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

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

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completato': return 'bg-green-100 text-green-800';
      case 'in corso': return 'bg-blue-100 text-blue-800';
      case 'assegnato': return 'bg-yellow-100 text-yellow-800';
      case 'in attesa': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const copyToMarkdown = async () => {
    const markdown = generateMarkdown();
    try {
      await navigator.clipboard.writeText(markdown);
      console.log('Minuta copiata negli appunti in formato Markdown');
    } catch (err) {
      console.error('Errore nel copiare negli appunti:', err);
    }
  };

  const generateMarkdown = () => {
    let markdown = `# ${minutes.title}\n\n`;
    
    // Informazioni generali
    markdown += `**Data riunione:** ${formatDate(minutes.date)}\n`;
    markdown += `**Creata:** ${formatDateTime(minutes.createdAt)}\n\n`;
    
    // Riassunto della riunione
    if (minutes.meetingSummary) {
      markdown += `## 📋 Riassunto della Riunione\n\n`;
      markdown += `${minutes.meetingSummary}\n\n`;
    }
    
    // Partecipanti
    if (minutes.participants && minutes.participants.length > 0) {
      markdown += `## Partecipanti\n\n`;
      minutes.participants.forEach((participant: any) => {
        markdown += `- **${participant.name}**`;
        if (participant.role) markdown += ` - ${participant.role}`;
        markdown += `\n`;
      });
      markdown += `\n`;
    }
    
    // Agenda
    if (minutes.agenda && minutes.agenda.length > 0) {
      markdown += `## Agenda\n\n`;
      minutes.agenda.forEach((item: string, index: number) => {
        markdown += `${index + 1}. ${item}\n`;
      });
      markdown += `\n`;
    }
    
    // Discussioni principali
    if (minutes.keyDiscussions && minutes.keyDiscussions.length > 0) {
      markdown += `## Discussioni Principali\n\n`;
      minutes.keyDiscussions.forEach((discussion: any) => {
        markdown += `### ${discussion.topic}\n\n`;
        if (discussion.summary) {
          markdown += `${discussion.summary}\n\n`;
        }
        if (discussion.decisions && discussion.decisions.length > 0) {
          markdown += `**Decisioni:**\n`;
          discussion.decisions.forEach((decision: string) => {
            markdown += `- ✓ ${decision}\n`;
          });
          markdown += `\n`;
        }
      });
    }
    
    // Action items
    if (minutes.actionItems && minutes.actionItems.length > 0) {
      markdown += `## Azioni da Intraprendere\n\n`;
      minutes.actionItems.forEach((action: any, index: number) => {
        markdown += `${index + 1}. **${action.action}**\n`;
        if (action.owner) markdown += `   - Responsabile: ${action.owner}\n`;
        if (action.priority) markdown += `   - Priorità: ${action.priority}\n`;
        if (action.status) markdown += `   - Stato: ${action.status}\n`;
        if (action.dueDate) markdown += `   - Scadenza: ${formatDate(action.dueDate)}\n`;
        markdown += `\n`;
      });
    }
    
    // Prossima riunione
    if (minutes.nextMeeting) {
      markdown += `## Prossima Riunione\n\n`;
      if (minutes.nextMeeting.date) {
        markdown += `**Data:** ${formatDate(minutes.nextMeeting.date)}\n`;
      }
      if (minutes.nextMeeting.agenda && minutes.nextMeeting.agenda.length > 0) {
        markdown += `**Agenda pianificata:**\n`;
        minutes.nextMeeting.agenda.forEach((item: string, index: number) => {
          markdown += `${index + 1}. ${item}\n`;
        });
      }
      markdown += `\n`;
    }
    
    // Metadata
    markdown += `---\n`;
    markdown += `*Generato con ${minutes.templateUsed || 'N/A'} tramite ${minutes.aiProvider || 'N/A'}*\n`;
    markdown += `*ID: ${minutes.id}*\n`;
    
    return markdown;
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      style={customModalStyles}
      contentLabel="Dettaglio Minuta"
    >
      <div className="bg-white">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-green-600 text-2xl mr-3">📋</span>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{minutes.title}</h2>
                <p className="text-sm text-gray-600">
                  Data riunione: {formatDate(minutes.date)} • 
                  Creata: {formatDateTime(minutes.createdAt)}
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
          {/* Meeting Summary - Riassunto Riunione */}
          {minutes.meetingSummary && (
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
              <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Riassunto della Riunione
              </h3>
              <p className="text-blue-800 leading-relaxed">{minutes.meetingSummary}</p>
            </div>
          )}

          {/* Participants */}
          {minutes.participants && minutes.participants.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Partecipanti</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {minutes.participants.map((participant: any, index: number) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-primary-600 font-medium text-sm">
                          {participant.name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{participant.name}</p>
                        {participant.role && (
                          <p className="text-sm text-gray-600">{participant.role}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Agenda */}
          {minutes.agenda && minutes.agenda.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Agenda</h3>
              <div className="bg-blue-50 rounded-lg p-4">
                <ul className="space-y-2">
                  {minutes.agenda.map((item: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <span className="text-blue-600 mr-2 mt-0.5">•</span>
                      <span className="text-gray-800">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Key Discussions */}
          {minutes.keyDiscussions && minutes.keyDiscussions.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Discussioni Principali</h3>
              <div className="space-y-4">
                {minutes.keyDiscussions.map((discussion: any, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">{discussion.topic}</h4>
                    <p className="text-gray-700 mb-3">{discussion.summary}</p>
                    
                    {discussion.decisions && discussion.decisions.length > 0 && (
                      <div>
                        <h5 className="font-medium text-gray-800 mb-2">Decisioni:</h5>
                        <ul className="space-y-1">
                          {discussion.decisions.map((decision: string, idx: number) => (
                            <li key={idx} className="flex items-start">
                              <span className="text-green-600 mr-2 mt-1">✓</span>
                              <span className="text-gray-700 text-sm">{decision}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Items */}
          {minutes.actionItems && minutes.actionItems.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Azioni da Intraprendere</h3>
              <div className="space-y-3">
                {minutes.actionItems.map((action: any, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900 flex-1">{action.action}</h4>
                      <div className="flex space-x-2 ml-4">
                        {action.priority && (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(action.priority)}`}>
                            {action.priority}
                          </span>
                        )}
                        {action.status && (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(action.status)}`}>
                            {action.status}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                      {action.owner && (
                        <div>
                          <span className="text-sm font-medium text-gray-600">Responsabile:</span>
                          <span className="ml-2 text-sm text-gray-900">{action.owner}</span>
                        </div>
                      )}
                      {action.dueDate && (
                        <div>
                          <span className="text-sm font-medium text-gray-600">Scadenza:</span>
                          <span className="ml-2 text-sm text-gray-900">{formatDate(action.dueDate)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Next Meeting */}
          {minutes.nextMeeting && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Prossima Riunione</h3>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="font-medium text-purple-900">
                    Data: {formatDate(minutes.nextMeeting.date)}
                  </span>
                </div>
                
                {minutes.nextMeeting.agenda && minutes.nextMeeting.agenda.length > 0 && (
                  <div>
                    <h4 className="font-medium text-purple-800 mb-2">Agenda prevista:</h4>
                    <ul className="space-y-1">
                      {minutes.nextMeeting.agenda.map((item: string, index: number) => (
                        <li key={index} className="flex items-start">
                          <span className="text-purple-600 mr-2 mt-0.5">•</span>
                          <span className="text-purple-800 text-sm">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Informazioni</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">Template:</span>
                <span className="ml-1">{minutes.templateUsed || 'N/A'}</span>
              </div>
              <div>
                <span className="font-medium">AI Provider:</span>
                <span className="ml-1">{minutes.aiProvider || 'N/A'}</span>
              </div>
              <div>
                <span className="font-medium">ID:</span>
                <span className="ml-1 font-mono text-xs">{minutes.id}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4">
          <div className="flex justify-between">
            <button 
              onClick={copyToMarkdown}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copia Markdown
            </button>
            <button 
              onClick={onRequestClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
            >
              Chiudi
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default MinutesDetailModal; 