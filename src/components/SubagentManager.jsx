import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../utils/i18n';
import { api } from '../utils/api';

const SubagentManager = () => {
  const { t } = useTranslation();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModel, setSelectedModel] = useState('all');
  const [expandedAgent, setExpandedAgent] = useState(null);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [agentsPerPage] = useState(20);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/agents');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setAgents(data.agents || []);
    } catch (error) {
      console.error('Failed to fetch agents:', error);
      setError(error.message || t('settings.subagents.loadError'));
    } finally {
      setLoading(false);
    }
  };

  // Get unique models for filtering
  const availableModels = useMemo(() => {
    const models = [...new Set(agents.map(agent => agent.model))];
    return models.sort();
  }, [agents]);

  // Filter and search logic
  const filteredAgents = useMemo(() => {
    return agents.filter(agent => {
      // Search filter
      const matchesSearch = !searchQuery || 
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.fileName.toLowerCase().includes(searchQuery.toLowerCase());

      // Model filter
      const matchesModel = selectedModel === 'all' || agent.model === selectedModel;

      return matchesSearch && matchesModel;
    });
  }, [agents, searchQuery, selectedModel]);

  // Pagination logic
  const totalPages = Math.ceil(filteredAgents.length / agentsPerPage);
  const startIndex = (currentPage - 1) * agentsPerPage;
  const paginatedAgents = filteredAgents.slice(startIndex, startIndex + agentsPerPage);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedModel]);

  const handleToggleAgent = (agentName) => {
    setExpandedAgent(expandedAgent === agentName ? null : agentName);
  };

  const getModelBadgeColor = (model) => {
    switch (model) {
      case 'opus': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'sonnet': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'haiku': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">
          {t('settings.subagents.loading')}
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span className="text-red-800 dark:text-red-200">{error}</span>
        </div>
        <button 
          onClick={fetchAgents}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          {t('settings.subagents.retry')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('settings.subagents.title')}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t('settings.subagents.description').replace('{{total}}', agents.length).replace('{{filtered}}', filteredAgents.length)}
          </p>
        </div>
        <button
          onClick={fetchAgents}
          className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {t('settings.subagents.refresh')}
        </button>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder={t('settings.subagents.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Model Filter */}
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-32">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('settings.subagents.filterModel')}
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">{t('settings.subagents.allModels')}</option>
              {availableModels.map(model => (
                <option key={model} value={model}>
                  {model.charAt(0).toUpperCase() + model.slice(1)} ({agents.filter(a => a.model === model).length})
                </option>
              ))}
            </select>
          </div>

          {/* Clear filters */}
          {(searchQuery || selectedModel !== 'all') && (
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedModel('all');
                }}
                className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                {t('settings.subagents.clearFilters')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        {t('settings.subagents.resultsCount').replace('{{count}}', filteredAgents.length).replace('{{total}}', agents.length)}
      </div>

      {/* Agent List */}
      <div className="space-y-3">
        {paginatedAgents.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {searchQuery ? 
              t('settings.subagents.noResults').replace('{{query}}', searchQuery) :
              t('settings.subagents.noAgents')
            }
          </div>
        ) : (
          paginatedAgents.map((agent) => (
            <div
              key={agent.fileName}
              className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 overflow-hidden"
            >
              {/* Agent Header */}
              <div
                className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                onClick={() => handleToggleAgent(agent.name)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium text-gray-900 dark:text-white truncate">
                        {agent.name}
                      </h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getModelBadgeColor(agent.model)}`}>
                        {agent.model}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {agent.fileName}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                      {agent.description}
                    </p>
                    {agent.categories && agent.categories.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {agent.categories.slice(0, 3).map((category) => (
                          <span
                            key={category}
                            className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                          >
                            {category}
                          </span>
                        ))}
                        {agent.categories.length > 3 && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            +{agent.categories.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${
                        expandedAgent === agent.name ? 'transform rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Agent Content (Expanded) */}
              {expandedAgent === agent.name && (
                <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
                  <div className="p-4 space-y-4">
                    {/* Metadata */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {t('settings.subagents.lastModified')}:
                        </span>
                        <span className="ml-2 text-gray-600 dark:text-gray-400">
                          {new Date(agent.lastModified).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {t('settings.subagents.fileSize')}:
                        </span>
                        <span className="ml-2 text-gray-600 dark:text-gray-400">
                          {(agent.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    </div>

                    {/* Full categories */}
                    {agent.categories && agent.categories.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300 text-sm">
                          {t('settings.subagents.categories')}:
                        </span>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {agent.categories.map((category) => (
                            <span
                              key={category}
                              className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded"
                            >
                              {category}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Agent Content Preview */}
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300 text-sm">
                        {t('settings.subagents.content')}:
                      </span>
                      <div className="mt-2 p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 max-h-64 overflow-y-auto">
                        <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                          {agent.content.substring(0, 1000)}
                          {agent.content.length > 1000 && '...'}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {t('settings.subagents.pageInfo')
              .replace('{{start}}', startIndex + 1)
              .replace('{{end}}', Math.min(startIndex + agentsPerPage, filteredAgents.length))
              .replace('{{total}}', filteredAgents.length)}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {t('settings.subagents.previous')}
            </button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNumber;
                if (totalPages <= 5) {
                  pageNumber = i + 1;
                } else if (currentPage <= 3) {
                  pageNumber = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNumber = totalPages - 4 + i;
                } else {
                  pageNumber = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNumber}
                    onClick={() => setCurrentPage(pageNumber)}
                    className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                      currentPage === pageNumber
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {t('settings.subagents.next')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubagentManager;