import React, { useState, useEffect } from 'react';
import { Button, Input, MinutesDetailModal, KnowledgeDetailModal } from './ui';
import toast from 'react-hot-toast';

interface ElectronAPI {
  minutes?: {
    getAll: () => Promise<any[]>;
    getByMeetingId: (meetingId: string) => Promise<any[]>;
    delete: (id: string) => Promise<any>;
  };
  knowledge?: {
    getAll: () => Promise<any[]>;
    search: (query: string) => Promise<any[]>;
    getByCategory: (category: string) => Promise<any[]>;
    getByTag: (tag: string) => Promise<any[]>;
    delete: (id: string) => Promise<any>;
  };
  meetings?: {
    getById: (id: string) => Promise<any>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

interface SavedContentViewProps {
  onBack: () => void;
}

const SavedContentView: React.FC<SavedContentViewProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'minutes' | 'knowledge'>('minutes');
  const [minutes, setMinutes] = useState<any[]>([]);
  const [knowledgeEntries, setKnowledgeEntries] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [selectedMinute, setSelectedMinute] = useState<any>(null);
  const [selectedKnowledge, setSelectedKnowledge] = useState<any>(null);
  const [showMinutesDetail, setShowMinutesDetail] = useState(false);
  const [showKnowledgeDetail, setShowKnowledgeDetail] = useState(false);

  const electronAPI = window.electronAPI;

  useEffect(() => {
    loadAllContent();
  }, []);

  useEffect(() => {
    loadContent();
  }, [activeTab]);

  // Keyboard shortcut for going back (Esc key)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Don't trigger if user is in a modal
        if (!showMinutesDetail && !showKnowledgeDetail) {
          onBack();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onBack, showMinutesDetail, showKnowledgeDetail]);

  async function loadAllContent() {
    try {
      const [allMinutes, allKnowledge] = await Promise.all([
        electronAPI.minutes?.getAll() || [],
        electronAPI.knowledge?.getAll() || []
      ]);
      setMinutes(allMinutes);
      setKnowledgeEntries(allKnowledge);
    } catch (error) {
      console.error('Error loading all content:', error);
    }
  }

  async function loadContent() {
    setIsLoading(true);
    try {
      if (activeTab === 'minutes') {
        const allMinutes = await electronAPI.minutes?.getAll() || [];
        setMinutes(allMinutes);
      } else {
        const allKnowledge = await electronAPI.knowledge?.getAll() || [];
        setKnowledgeEntries(allKnowledge);
      }
    } catch (error) {
      console.error('Error loading content:', error);
      toast.error('Errore nel caricamento dei contenuti');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSearch(query: string) {
    setSearchQuery(query);
    
    if (!query.trim()) {
      loadContent();
      return;
    }

    setIsLoading(true);
    try {
      if (activeTab === 'knowledge') {
        const results = await electronAPI.knowledge?.search(query) || [];
        setKnowledgeEntries(results);
      } else {
        // Per le minute, filtriamo localmente
        const allMinutes = await electronAPI.minutes?.getAll() || [];
        const filtered = allMinutes.filter(minute => 
          minute.title.toLowerCase().includes(query.toLowerCase()) ||
          minute.executiveSummary?.toLowerCase().includes(query.toLowerCase()) ||
          minute.participants?.some((p: any) => p.name.toLowerCase().includes(query.toLowerCase()))
        );
        setMinutes(filtered);
      }
    } catch (error) {
      console.error('Error searching:', error);
      toast.error('Errore nella ricerca');
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteItem(id: string, type: 'minutes' | 'knowledge') {
    if (!confirm('Sei sicuro di voler eliminare questo elemento?')) return;

    try {
      if (type === 'minutes') {
        await electronAPI.minutes?.delete(id);
        setMinutes(prev => prev.filter(item => item.id !== id));
        toast.success('Minuta eliminata con successo');
      } else {
        await electronAPI.knowledge?.delete(id);
        setKnowledgeEntries(prev => prev.filter(item => item.id !== id));
        toast.success('Appunto eliminato con successo');
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Errore nell\'eliminazione');
    }
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString('it-IT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function toggleExpanded(id: string) {
    setExpandedItem(expandedItem === id ? null : id);
  }

  function openMinutesDetail(minute: any) {
    setSelectedMinute(minute);
    setShowMinutesDetail(true);
  }

  function openKnowledgeDetail(knowledge: any) {
    setSelectedKnowledge(knowledge);
    setShowKnowledgeDetail(true);
  }

  function closeMinutesDetail() {
    setShowMinutesDetail(false);
    setSelectedMinute(null);
  }

  function closeKnowledgeDetail() {
    setShowKnowledgeDetail(false);
    setSelectedKnowledge(null);
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pt-2 pb-4 border-b border-gray-200">
        <div className="flex items-center flex-1">
          <button 
            onClick={onBack}
            className="mr-4 flex items-center px-3 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-200 hover:shadow-sm border border-gray-300 group"
            title="Torna al monitoraggio (Esc)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 group-hover:transform group-hover:-translate-x-1 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="text-sm font-medium">Indietro</span>
          </button>
          
          <div className="flex-1">
            {/* Breadcrumb */}
            <nav className="flex items-center text-sm text-gray-500 mb-2">
              <button 
                onClick={onBack}
                className="hover:text-gray-700 transition-colors"
              >
                Monitoraggio
              </button>
              <svg className="mx-2 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 111.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span className="font-medium text-gray-700">Minutes & Knowledge Base</span>
            </nav>
            
            <h2 className="text-xl font-semibold text-gray-800">
              📚 Minutes & Knowledge Base
            </h2>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('minutes')}
          className={`px-4 py-2 rounded-md transition-colors font-medium text-sm ${
            activeTab === 'minutes'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          📋 Minute ({minutes.length})
        </button>
        <button
          onClick={() => setActiveTab('knowledge')}
          className={`px-4 py-2 rounded-md transition-colors font-medium text-sm ${
            activeTab === 'knowledge'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          🧠 Appunti ({knowledgeEntries.length})
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={activeTab === 'minutes' ? 'Cerca nelle minute...' : 'Cerca negli appunti...'}
          leftIcon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          }
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {activeTab === 'minutes' ? (
              minutes.length === 0 ? (
                <div className="text-center py-12">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-500">Nessuna minuta salvata</p>
                  <p className="text-gray-400 text-sm mt-1">Le minute che generi verranno mostrate qui</p>
                </div>
              ) : (
                minutes.map((minute) => (
                  <div key={minute.id} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900 mb-2">{minute.title}</h3>
                          <p className="text-sm text-gray-600 mb-2">
                            📅 {formatDate(minute.date)} • {minute.participants?.length || 0} partecipanti
                          </p>
                          {minute.executiveSummary && (
                            <p className="text-sm text-gray-700 mb-3 line-clamp-2">{minute.executiveSummary}</p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            {minute.actionItems?.length > 0 && (
                              <span>✅ {minute.actionItems.length} azioni</span>
                            )}
                            {minute.keyDecisions?.length > 0 && (
                              <span>🎯 {minute.keyDecisions.length} decisioni</span>
                            )}
                            {minute.nextMeeting?.date && (
                              <span>📅 Prossima: {minute.nextMeeting.date}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => openMinutesDetail(minute)}
                            className="text-gray-400 hover:text-green-600 transition-colors"
                            title="Visualizza dettaglio"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => toggleExpanded(minute.id)}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            title="Espandi/Comprimi"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform ${expandedItem === minute.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteItem(minute.id, 'minutes')}
                            className="text-gray-400 hover:text-red-600 transition-colors"
                            title="Elimina"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expanded content */}
                    {expandedItem === minute.id && (
                      <div className="border-t border-gray-100 p-4 bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {minute.participants?.length > 0 && (
                            <div>
                              <h4 className="font-medium text-gray-900 mb-2">Partecipanti</h4>
                              <div className="space-y-1">
                                {minute.participants.map((participant: any, index: number) => (
                                  <div key={index} className="text-sm text-gray-700">
                                    • {participant.name} {participant.role && `(${participant.role})`}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {minute.actionItems?.length > 0 && (
                            <div>
                              <h4 className="font-medium text-gray-900 mb-2">Azioni da Intraprendere</h4>
                              <div className="space-y-2">
                                {minute.actionItems.slice(0, 3).map((action: any, index: number) => (
                                  <div key={index} className="text-sm">
                                    <div className="font-medium text-gray-900">{action.action}</div>
                                    <div className="text-gray-600">Responsabile: {action.owner}</div>
                                  </div>
                                ))}
                                {minute.actionItems.length > 3 && (
                                  <div className="text-xs text-gray-500">
                                    +{minute.actionItems.length - 3} altre azioni...
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )
            ) : (
              knowledgeEntries.length === 0 ? (
                <div className="text-center py-12">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <p className="text-gray-500">Nessun appunto salvato</p>
                  <p className="text-gray-400 text-sm mt-1">Gli appunti che generi verranno mostrati qui</p>
                </div>
              ) : (
                knowledgeEntries.map((entry) => (
                  <div key={entry.id} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900 mb-2">{entry.title}</h3>
                          <p className="text-sm text-gray-700 mb-3 line-clamp-2">{entry.summary}</p>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {entry.tags?.slice(0, 3).map((tag: string, index: number) => (
                              <span key={index} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                {tag}
                              </span>
                            ))}
                            {entry.tags?.length > 3 && (
                              <span className="text-xs text-gray-500">+{entry.tags.length - 3} altri tag</span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>📂 {entry.category}</span>
                            {entry.insights?.length > 0 && (
                              <span>💡 {entry.insights.length} insights</span>
                            )}
                            {entry.actionableItems?.length > 0 && (
                              <span>✅ {entry.actionableItems.length} azioni</span>
                            )}
                            <span>📅 {formatDate(entry.createdAt)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => openKnowledgeDetail(entry)}
                            className="text-gray-400 hover:text-yellow-600 transition-colors"
                            title="Visualizza dettaglio"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => toggleExpanded(entry.id)}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            title="Espandi/Comprimi"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform ${expandedItem === entry.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteItem(entry.id, 'knowledge')}
                            className="text-gray-400 hover:text-red-600 transition-colors"
                            title="Elimina"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expanded content */}
                    {expandedItem === entry.id && (
                      <div className="border-t border-gray-100 p-4 bg-gray-50">
                        <div className="space-y-4">
                          {entry.keyTopics?.length > 0 && (
                            <div>
                              <h4 className="font-medium text-gray-900 mb-2">Argomenti Principali</h4>
                              <div className="space-y-2">
                                {entry.keyTopics.slice(0, 2).map((topic: any, index: number) => (
                                  <div key={index} className="bg-white p-3 rounded border">
                                    <h5 className="font-medium text-gray-800 text-sm">{topic.topic}</h5>
                                    <p className="text-sm text-gray-600 mt-1">{topic.summary}</p>
                                  </div>
                                ))}
                                {entry.keyTopics.length > 2 && (
                                  <div className="text-xs text-gray-500">
                                    +{entry.keyTopics.length - 2} altri argomenti...
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {entry.insights?.length > 0 && (
                            <div>
                              <h4 className="font-medium text-gray-900 mb-2">Insights</h4>
                              <div className="space-y-2">
                                {entry.insights.slice(0, 2).map((insight: any, index: number) => (
                                  <div key={index} className="bg-yellow-50 p-3 rounded border">
                                    <p className="text-sm font-medium text-gray-900">{insight.insight}</p>
                                    <p className="text-xs text-gray-600 mt-1">{insight.context}</p>
                                  </div>
                                ))}
                                {entry.insights.length > 2 && (
                                  <div className="text-xs text-gray-500">
                                    +{entry.insights.length - 2} altri insights...
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )
            )}
          </div>
        )}
      </div>

      {/* Detail Modals */}
      <MinutesDetailModal
        isOpen={showMinutesDetail}
        onRequestClose={closeMinutesDetail}
        minutes={selectedMinute}
      />

      <KnowledgeDetailModal
        isOpen={showKnowledgeDetail}
        onRequestClose={closeKnowledgeDetail}
        knowledge={selectedKnowledge}
      />
    </div>
  );
};

export default SavedContentView;