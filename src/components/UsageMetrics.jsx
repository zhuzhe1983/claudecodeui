import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../utils/i18n';
import UsageModal from './UsageModal';

const UsageMetrics = ({ settings }) => {
  const { t } = useTranslation();
  const [usageData, setUsageData] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hoveredMetric, setHoveredMetric] = useState(null);

  // Fetch usage data from API
  useEffect(() => {
    const fetchUsageData = async () => {
      try {
        const response = await fetch('/api/usage/summary');
        if (response.ok) {
          const data = await response.json();
          setUsageData(data);
        }
      } catch (error) {
        console.error('Failed to fetch usage data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsageData();
    const interval = setInterval(fetchUsageData, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  // Calculate displayed metrics based on settings
  const displayMetrics = useMemo(() => {
    if (!usageData || !settings?.usageMetrics) return [];
    
    const metrics = [];
    const { displayOptions = {} } = settings.usageMetrics;
    
    if (displayOptions.todaySpend !== false) {
      metrics.push({
        id: 'today',
        label: t('usage.today'),
        value: `$${usageData.today?.cost?.toFixed(2) || '0.00'}`,
        tooltip: t('usage.todayTooltip', { tokens: usageData.today?.tokens || 0 }),
        color: 'text-green-600 dark:text-green-400',
        icon: '📅'
      });
    }
    
    if (displayOptions.weekSpend !== false) {
      metrics.push({
        id: 'week',
        label: t('usage.week'),
        value: `$${usageData.week?.cost?.toFixed(2) || '0.00'}`,
        tooltip: t('usage.weekTooltip', { tokens: usageData.week?.tokens || 0 }),
        color: 'text-blue-600 dark:text-blue-400',
        icon: '📊'
      });
    }
    
    if (displayOptions.monthSpend !== false) {
      metrics.push({
        id: 'month',
        label: t('usage.month'),
        value: `$${usageData.month?.cost?.toFixed(2) || '0.00'}`,
        tooltip: t('usage.monthTooltip', { tokens: usageData.month?.tokens || 0 }),
        color: 'text-purple-600 dark:text-purple-400',
        icon: '📈'
      });
    }
    
    if (displayOptions.rateLimitRemaining !== false && usageData.rateLimit) {
      const percentage = usageData.rateLimit.remaining;
      metrics.push({
        id: 'rateLimit',
        label: t('usage.rateLimit'),
        value: `${percentage}%`,
        tooltip: t('usage.rateLimitTooltip', { 
          used: usageData.rateLimit.used,
          total: usageData.rateLimit.total 
        }),
        color: percentage > 50 ? 'text-green-600 dark:text-green-400' : 
                percentage > 20 ? 'text-yellow-600 dark:text-yellow-400' : 
                'text-red-600 dark:text-red-400',
        icon: '⚡'
      });
    }
    
    if (displayOptions.tokensPerMinute !== false && usageData.currentRate) {
      metrics.push({
        id: 'tpm',
        label: t('usage.tpm'),
        value: `${usageData.currentRate.tokensPerMinute}`,
        tooltip: t('usage.tpmTooltip'),
        color: 'text-indigo-600 dark:text-indigo-400',
        icon: '⏱️'
      });
    }
    
    return metrics;
  }, [usageData, settings, t]);

  if (loading) {
    return (
      <div className="flex items-center justify-end gap-2 px-2">
        <div className="animate-pulse flex gap-2">
          <div className="h-4 w-12 bg-gray-300 dark:bg-gray-600 rounded"></div>
          <div className="h-4 w-12 bg-gray-300 dark:bg-gray-600 rounded"></div>
        </div>
      </div>
    );
  }

  if (!usageData || displayMetrics.length === 0) {
    return null;
  }

  return (
    <>
      <div 
        className="flex items-center justify-end gap-1 px-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
        onClick={() => setIsModalOpen(true)}
        title={t('usage.clickForDetails')}
      >
        {displayMetrics.map((metric, index) => (
          <div
            key={metric.id}
            className="relative flex items-center gap-0.5 px-1.5 py-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            onMouseEnter={() => setHoveredMetric(metric.id)}
            onMouseLeave={() => setHoveredMetric(null)}
          >
            {settings?.usageMetrics?.showIcons !== false && (
              <span className="text-xs">{metric.icon}</span>
            )}
            <span className={`text-xs font-medium ${metric.color}`}>
              {metric.value}
            </span>
            
            {/* Tooltip */}
            {hoveredMetric === metric.id && (
              <div className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 z-50">
                <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                  <div className="font-semibold">{metric.label}</div>
                  {metric.tooltip && (
                    <div className="text-gray-300 mt-0.5">{metric.tooltip}</div>
                  )}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            )}
            
            {/* Separator */}
            {index < displayMetrics.length - 1 && (
              <div className="ml-1 h-3 w-px bg-gray-300 dark:bg-gray-600" />
            )}
          </div>
        ))}
        
        {/* Expand indicator */}
        <svg 
          className="w-3 h-3 ml-0.5 text-gray-500 dark:text-gray-400"
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>

      {/* Usage Modal */}
      {isModalOpen && (
        <UsageModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          settings={settings}
        />
      )}
    </>
  );
};

export default UsageMetrics;