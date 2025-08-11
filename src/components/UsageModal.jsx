import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from '../utils/i18n';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Bar, Area, Brush, ReferenceLine } from 'recharts';

const UsageModal = ({ isOpen, onClose, settings }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('bytime');
  const [usageData, setUsageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedRange, setSelectedRange] = useState({ start: null, end: null });
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarData, setCalendarData] = useState({});
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [hourlyData, setHourlyData] = useState([]);
  const [chartTimeRange, setChartTimeRange] = useState('7d'); // 7d, 30d, 90d, all
  const [hiddenSeries, setHiddenSeries] = useState(new Set(['cacheReadTokens', 'cacheCreationTokens'])); // Default hide cache data
  const refreshIntervalRef = useRef(null);

  // Get refresh interval from settings (default 30 seconds)
  const [refreshInterval, setRefreshInterval] = useState(() => {
    const saved = localStorage.getItem('usageMetricsSettings');
    const settings = saved ? JSON.parse(saved) : {};
    return settings.refreshInterval || 30000;
  });

  // Listen for settings changes
  useEffect(() => {
    const handleSettingsChange = () => {
      const saved = localStorage.getItem('usageMetricsSettings');
      const settings = saved ? JSON.parse(saved) : {};
      setRefreshInterval(settings.refreshInterval || 30000);
    };

    window.addEventListener('usageMetricsSettingsChanged', handleSettingsChange);
    return () => window.removeEventListener('usageMetricsSettingsChanged', handleSettingsChange);
  }, []);

  const fetchUsageData = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        tab: activeTab,
        project: selectedProject,
        month: currentMonth.toISOString()
      });
      const response = await fetch(`/api/usage/detailed?${params}`);
      if (response.ok) {
        const data = await response.json();
        setUsageData(data);
        
        // Process calendar data
        if (data.daily?.days) {
          const calData = {};
          data.daily.days.forEach(day => {
            calData[day.date] = {
              cost: day.cost || 0,
              inputTokens: day.inputTokens || 0,
              outputTokens: day.outputTokens || 0,
              cacheCreationTokens: day.cacheCreationTokens || 0,
              cacheReadTokens: day.cacheReadTokens || 0
            };
          });
          setCalendarData(calData);
        }
        setLastRefresh(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch detailed usage:', error);
    }
  }, [activeTab, selectedProject, currentMonth]);

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    fetchUsageData().finally(() => setLoading(false));

    // Setup auto-refresh interval
    if (refreshInterval > 0) {
      refreshIntervalRef.current = setInterval(fetchUsageData, refreshInterval);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [isOpen, fetchUsageData, refreshInterval]);

  const tabs = [
    { id: 'bytime', label: t('usage.tabs.byTime'), icon: '📅' },
    { id: 'session', label: t('usage.tabs.session'), icon: '💬' },
    { id: 'models', label: t('usage.tabs.models'), icon: '🤖' },
    { id: 'billing', label: t('usage.tabs.billing'), icon: '💰' },
  ];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    
    // For numbers >= 1 million, show as M
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    
    // For numbers >= 100k, show as K without decimal
    if (num >= 100000) {
      return Math.round(num / 1000) + 'K';
    }
    
    // For numbers >= 10k, show as K with one decimal
    if (num >= 10000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    
    // For smaller numbers, use regular formatting
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatPercentage = (num) => {
    return (num || 0).toFixed(2) + '%';
  };

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const changeMonth = (direction) => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const handleDateClick = (date) => {
    if (selectedRange.start && !selectedRange.end) {
      if (date < selectedRange.start) {
        setSelectedRange({ start: date, end: selectedRange.start });
      } else {
        setSelectedRange({ start: selectedRange.start, end: date });
      }
    } else {
      setSelectedDate(date);
      setSelectedRange({ start: date, end: null });
    }
  };

  const isDateInRange = (date) => {
    if (!selectedRange.start) return false;
    if (!selectedRange.end) return date === selectedRange.start;
    return date >= selectedRange.start && date <= selectedRange.end;
  };

  const getDateStats = useMemo(() => {
    if (!selectedDate && !selectedRange.start) return null;
    if (!calendarData) return null;
    
    let stats = { cost: 0, inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, days: 0 };
    
    if (selectedRange.start && selectedRange.end) {
      const start = new Date(selectedRange.start);
      const end = new Date(selectedRange.end);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        if (calendarData[dateStr]) {
          stats.cost += calendarData[dateStr].cost;
          stats.inputTokens += calendarData[dateStr].inputTokens;
          stats.outputTokens += calendarData[dateStr].outputTokens;
          stats.cacheCreationTokens += calendarData[dateStr].cacheCreationTokens || 0;
          stats.cacheReadTokens += calendarData[dateStr].cacheReadTokens || 0;
          stats.days++;
        }
      }
    } else if (selectedDate) {
      const data = calendarData[selectedDate];
      if (data) {
        stats = { ...data, days: 1 };
      }
    }
    
    return stats;
  }, [selectedDate, selectedRange, calendarData]);

  // Calculate today, week, month summaries
  const summaryStats = useMemo(() => {
    if (!calendarData) return { today: null, week: null, month: null };
    
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    let todayStats = { cost: 0, tokens: 0, inputTokens: 0, outputTokens: 0, cacheTokens: 0, cacheHitRate: 0 };
    let weekStats = { cost: 0, tokens: 0, inputTokens: 0, outputTokens: 0, cacheTokens: 0, cacheHitRate: 0 };
    let monthStats = { cost: 0, tokens: 0, inputTokens: 0, outputTokens: 0, cacheTokens: 0, cacheHitRate: 0 };
    
    Object.entries(calendarData).forEach(([date, data]) => {
      const dateObj = new Date(date);
      const totalTokens = data.inputTokens + data.outputTokens + (data.cacheCreationTokens || 0) + (data.cacheReadTokens || 0);
      const cacheHit = data.cacheReadTokens ? (data.cacheReadTokens / totalTokens * 100) : 0;
      
      if (date === today) {
        todayStats.cost = data.cost;
        todayStats.tokens = totalTokens;
        todayStats.inputTokens = data.inputTokens || 0;
        todayStats.outputTokens = data.outputTokens || 0;
        todayStats.cacheTokens = (data.cacheReadTokens || 0) + (data.cacheCreationTokens || 0);
        todayStats.cacheHitRate = cacheHit;
      }
      
      if (dateObj >= weekAgo) {
        weekStats.cost += data.cost;
        weekStats.tokens += totalTokens;
        weekStats.inputTokens += data.inputTokens || 0;
        weekStats.outputTokens += data.outputTokens || 0;
        weekStats.cacheTokens += (data.cacheReadTokens || 0) + (data.cacheCreationTokens || 0);
        weekStats.cacheHitRate = Math.max(weekStats.cacheHitRate, cacheHit);
      }
      
      if (dateObj >= monthAgo) {
        monthStats.cost += data.cost;
        monthStats.tokens += totalTokens;
        monthStats.inputTokens += data.inputTokens || 0;
        monthStats.outputTokens += data.outputTokens || 0;
        monthStats.cacheTokens += (data.cacheReadTokens || 0) + (data.cacheCreationTokens || 0);
        monthStats.cacheHitRate = Math.max(monthStats.cacheHitRate, cacheHit);
      }
    });
    
    return { today: todayStats, week: weekStats, month: monthStats };
  }, [calendarData]);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!calendarData) return [];
    
    const data = Object.entries(calendarData)
      .map(([date, values]) => ({
        date,
        shortDate: new Date(date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
        inputTokens: values.inputTokens || 0,
        outputTokens: values.outputTokens || 0,
        cacheCreationTokens: values.cacheCreationTokens || 0,
        cacheReadTokens: values.cacheReadTokens || 0,
        totalTokens: (values.inputTokens || 0) + (values.outputTokens || 0) + 
                     (values.cacheCreationTokens || 0) + (values.cacheReadTokens || 0),
        cost: values.cost || 0
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Filter based on time range
    const now = new Date();
    let filteredData = data;
    
    switch (chartTimeRange) {
      case '7d':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filteredData = data.filter(d => new Date(d.date) >= weekAgo);
        break;
      case '30d':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filteredData = data.filter(d => new Date(d.date) >= monthAgo);
        break;
      case '90d':
        const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        filteredData = data.filter(d => new Date(d.date) >= threeMonthsAgo);
        break;
    }
    
    return filteredData;
  }, [calendarData, chartTimeRange]);

  // Render Sessions Tab
  const renderSessionsView = () => {
    const sessions = usageData?.sessions || [];
    
    return (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
          {t('usage.recentSessions')}
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('usage.time')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('usage.model')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('usage.inputTokens')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('usage.outputTokens')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('usage.cacheTokens')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('usage.cost')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {sessions.map((session, idx) => (
                <tr key={session.id || idx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                    {new Date(session.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {session.model?.replace('claude-', '').replace('-20', ' ')}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-gray-100">
                    {session.inputTokens?.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-gray-100">
                    {session.outputTokens?.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">
                    {((session.cacheReadTokens || 0) + (session.cacheCreationTokens || 0))?.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-gray-100">
                    ${session.cost?.toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Render Models Tab
  const renderModelsView = () => {
    const models = usageData?.models || [];
    
    return (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
          {t('usage.modelUsage')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {models.map((model) => (
            <div key={model.name} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                {model.name.replace('claude-', '').replace('-20', ' ')}
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{t('usage.totalCost')}:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    ${model.cost?.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{t('usage.input')}:</span>
                  <span className="text-gray-700 dark:text-gray-300">
                    {model.inputTokens?.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{t('usage.output')}:</span>
                  <span className="text-gray-700 dark:text-gray-300">
                    {model.outputTokens?.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{t('usage.cacheHit')}:</span>
                  <span className="text-gray-700 dark:text-gray-300">
                    {model.cacheRatio?.toFixed(1)}%
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">{t('usage.percentage')}:</span>
                    <span className="font-medium text-blue-600 dark:text-blue-400">
                      {model.percentage?.toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${model.percentage || 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render Billing Tab
  const renderBillingView = () => {
    const billing = usageData?.billing || {};
    const credentials = usageData?.credentials || {};
    const sessionTime = usageData?.sessionTime || {};
    const detectedPlan = usageData?.detectedPlan || {};
    
    // Calculate token expiry
    const tokenExpiresAt = credentials.tokenExpiresAt ? new Date(credentials.tokenExpiresAt) : null;
    const now = new Date();
    const tokenExpired = tokenExpiresAt && tokenExpiresAt < now;
    const hoursUntilExpiry = tokenExpiresAt ? Math.max(0, Math.floor((tokenExpiresAt - now) / (1000 * 60 * 60))) : 0;
    
    return (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
          {t('usage.billingStatus')}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Subscription Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">
              {t('usage.subscription')}
            </h4>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  {t('usage.plan')}
                </div>
                <div className="flex flex-col gap-2">
                  {/* Detected Plan from Usage */}
                  {detectedPlan.planDetails && (
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        {detectedPlan.planDetails.name}
                      </span>
                      <span className="px-2 py-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs rounded-full">
                        ${detectedPlan.planDetails.monthlyPrice}/month
                      </span>
                    </div>
                  )}
                  {/* Credentials Plan (fallback) */}
                  {!detectedPlan.planDetails && credentials.subscriptionType && (
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-gray-900 dark:text-gray-100 capitalize">
                        Claude {credentials.subscriptionType}
                      </span>
                      {credentials.subscriptionType === 'max' && (
                        <span className="px-2 py-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs rounded-full">
                          $200/month
                        </span>
                      )}
                    </div>
                  )}
                  {detectedPlan.planDetails?.description && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {detectedPlan.planDetails.description}
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  {t('usage.tokenStatus')}
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${tokenExpired ? 'bg-red-500' : 'bg-green-500'}`} />
                  <span className={`text-sm ${tokenExpired ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                    {tokenExpired ? t('usage.tokenExpired') : `${t('usage.tokenActive')} (${hoursUntilExpiry}h ${t('usage.remaining')})`}
                  </span>
                </div>
                {tokenExpiresAt && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {t('usage.expiresAt')}: {tokenExpiresAt.toLocaleString()}
                  </div>
                )}
              </div>
              
              {credentials.scopes && credentials.scopes.length > 0 && (
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    {t('usage.permissions')}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {credentials.scopes.map(scope => (
                      <span key={scope} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs rounded">
                        {scope}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Usage Statistics */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">
              {t('usage.statistics')}
            </h4>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {t('usage.totalCost')}
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    ${usageData?.summary?.totalCost?.toFixed(2) || '0.00'}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {t('usage.referenceOnly')}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {t('usage.totalTokens')}
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {formatNumber((usageData?.summary?.totalInputTokens || 0) + (usageData?.summary?.totalOutputTokens || 0))}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {t('usage.allTime')}
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {t('usage.tokenBreakdown')}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{t('usage.input')}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {formatNumber(usageData?.summary?.totalInputTokens || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{t('usage.output')}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {formatNumber(usageData?.summary?.totalOutputTokens || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{t('usage.cache')}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {formatNumber((usageData?.summary?.totalCacheCreationTokens || 0) + (usageData?.summary?.totalCacheReadTokens || 0))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Session Time Section */}
        {sessionTime.formattedRemaining && (
          <div className="mt-6 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900 dark:text-gray-100">
                {t('usage.sessionTime')}
              </h4>
              <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                {sessionTime.formattedRemaining} {t('usage.remaining')}
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-2">
              <div 
                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-3 rounded-full transition-all"
                style={{ width: `${sessionTime.percentageElapsed || 0}%` }}
              />
            </div>
            
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
              <span>{t('usage.sessionUsed')}: {Math.round(sessionTime.percentageElapsed || 0)}%</span>
              <span>{t('usage.resetIn')}: {sessionTime.formattedRemaining}</span>
            </div>
            
            {sessionTime.nextReset && (
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {t('usage.nextReset')}: {new Date(sessionTime.nextReset).toLocaleTimeString()}
              </div>
            )}
          </div>
        )}

        {/* Subscription Info */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              {t('usage.subscriptionNote')}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderByTimeView = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const monthName = currentMonth.toLocaleDateString('zh-CN', { month: 'long', year: 'numeric' });
    
    const weekDays = [t('usage.sun'), t('usage.mon'), t('usage.tue'), t('usage.wed'), t('usage.thu'), t('usage.fri'), t('usage.sat')];
    const days = [];
    
    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-16"></div>);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayData = calendarData[dateStr] || { cost: 0, inputTokens: 0, outputTokens: 0 };
      const isToday = dateStr === new Date().toISOString().split('T')[0];
      const isSelected = dateStr === selectedDate;
      const inRange = isDateInRange(dateStr);
      
      days.push(
        <div
          key={day}
          onClick={() => handleDateClick(dateStr)}
          className={`
            relative h-14 p-1 border border-gray-200 dark:border-gray-700 cursor-pointer transition-all
            ${isToday ? 'ring-2 ring-blue-500' : ''}
            ${isSelected ? 'bg-blue-50 dark:bg-blue-900/30' : ''}
            ${inRange ? 'bg-blue-100/50 dark:bg-blue-800/20' : ''}
            hover:bg-gray-50 dark:hover:bg-gray-800
          `}
        >
          <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">{day}</div>
          {dayData.cost > 0 && (
            <div className="mt-1">
              <div className="text-xs font-bold text-green-600 dark:text-green-400">
                ${dayData.cost.toFixed(2)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {Math.round((dayData.inputTokens + dayData.outputTokens) / 1000)}k
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full">
        {/* Top Summary Cards - Increased height */}
        <div className="grid grid-cols-3 gap-4 px-4 py-3">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('usage.today')}</span>
              <span className="text-xs bg-blue-200 dark:bg-blue-700 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">24h</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(summaryStats.today?.cost || 0)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{t('usage.cost')}</div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {formatNumber(summaryStats.today?.inputTokens || 0)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{t('usage.input')}</div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {formatNumber(summaryStats.today?.outputTokens || 0)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{t('usage.output')}</div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {formatNumber(summaryStats.today?.cacheTokens || 0)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{t('usage.cache')}</div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-lg p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('usage.week')}</span>
              <span className="text-xs bg-green-200 dark:bg-green-700 text-green-800 dark:text-green-200 px-2 py-1 rounded">7d</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(summaryStats.week?.cost || 0)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{t('usage.cost')}</div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {formatNumber(summaryStats.week?.inputTokens || 0)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{t('usage.input')}</div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {formatNumber(summaryStats.week?.outputTokens || 0)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{t('usage.output')}</div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {formatNumber(summaryStats.week?.cacheTokens || 0)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{t('usage.cache')}</div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-lg p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('usage.month')}</span>
              <span className="text-xs bg-purple-200 dark:bg-purple-700 text-purple-800 dark:text-purple-200 px-2 py-1 rounded">30d</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(summaryStats.month?.cost || 0)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{t('usage.cost')}</div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {formatNumber(summaryStats.month?.inputTokens || 0)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{t('usage.input')}</div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {formatNumber(summaryStats.month?.outputTokens || 0)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{t('usage.output')}</div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {formatNumber(summaryStats.month?.cacheTokens || 0)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{t('usage.cache')}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Section: Calendar + Selected Details - Reduced height */}
        <div className="grid grid-cols-3 gap-4 px-4 mb-3" style={{ height: '280px' }}>
          {/* Calendar */}
          <div className="col-span-2 bg-white dark:bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => changeMonth(-1)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{monthName}</h3>
              <button
                onClick={() => changeMonth(1)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            
            {/* Week days header */}
            <div className="grid grid-cols-7 gap-0 mb-2">
              {weekDays.map(day => (
                <div key={day} className="text-center text-xs font-semibold text-gray-600 dark:text-gray-400 py-1">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-0">
              {days}
            </div>
          </div>

          {/* Selected Date/Range Details */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {selectedRange.end ? t('usage.rangeDetails') : t('usage.dateDetails')}
            </h3>
            
            {getDateStats ? (
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    {selectedRange.end ? 
                      `${selectedRange.start} ~ ${selectedRange.end}` : 
                      selectedDate || t('usage.selectDate')
                    }
                  </div>
                  {getDateStats.days > 0 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {getDateStats.days} {t('usage.days')}
                    </div>
                  )}
                </div>

                {getDateStats.cost > 0 && (
                  <>
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{t('usage.totalCost')}</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {formatCurrency(getDateStats.cost)}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{t('usage.input')}</div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {formatNumber(getDateStats.inputTokens)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{t('usage.output')}</div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {formatNumber(getDateStats.outputTokens)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{t('usage.cacheCreate')}</div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {formatNumber(getDateStats.cacheCreationTokens)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{t('usage.cacheRead')}</div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {formatNumber(getDateStats.cacheReadTokens)}
                        </div>
                      </div>
                    </div>

                    {getDateStats.days > 1 && (
                      <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
                        <div className="text-xs text-gray-500 dark:text-gray-400">{t('usage.avgPerDay')}</div>
                        <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {formatCurrency(getDateStats.cost / getDateStats.days)}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {!getDateStats.cost && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    {t('usage.noDataForDate')}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                {t('usage.selectDateToView')}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Chart Section - Flexible height */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mx-4 flex-1 flex flex-col" style={{ minHeight: '200px' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t('usage.tokenTrend')}
            </h3>
            <div className="flex gap-2">
              {['7d', '30d', '90d', 'all'].map(range => (
                <button
                  key={range}
                  onClick={() => setChartTimeRange(range)}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    chartTimeRange === range
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {range === 'all' ? t('usage.all') : range}
                </button>
              ))}
            </div>
          </div>

          {/* Single Chart with Toggleable Legend */}
          <div className="space-y-2">
            {/* Clickable legend at top */}
            <div className="flex items-center justify-between px-2">
              <h4 className="text-xs text-gray-500 dark:text-gray-400">
                {t('usage.tokenTrend')}
              </h4>
              <div className="flex gap-2 text-xs">
                <button
                  onClick={() => {
                    const newHidden = new Set(hiddenSeries);
                    if (hiddenSeries.has('inputTokens')) {
                      newHidden.delete('inputTokens');
                    } else {
                      newHidden.add('inputTokens');
                    }
                    setHiddenSeries(newHidden);
                  }}
                  className={`flex items-center gap-1 px-2 py-1 rounded transition-all ${
                    hiddenSeries.has('inputTokens') 
                      ? 'opacity-40 line-through' 
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span>{t('usage.input')}</span>
                </button>
                <button
                  onClick={() => {
                    const newHidden = new Set(hiddenSeries);
                    if (hiddenSeries.has('outputTokens')) {
                      newHidden.delete('outputTokens');
                    } else {
                      newHidden.add('outputTokens');
                    }
                    setHiddenSeries(newHidden);
                  }}
                  className={`flex items-center gap-1 px-2 py-1 rounded transition-all ${
                    hiddenSeries.has('outputTokens') 
                      ? 'opacity-40 line-through' 
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span>{t('usage.output')}</span>
                </button>
                <button
                  onClick={() => {
                    const newHidden = new Set(hiddenSeries);
                    if (hiddenSeries.has('cacheCreationTokens')) {
                      newHidden.delete('cacheCreationTokens');
                    } else {
                      newHidden.add('cacheCreationTokens');
                    }
                    setHiddenSeries(newHidden);
                  }}
                  className={`flex items-center gap-1 px-2 py-1 rounded transition-all ${
                    hiddenSeries.has('cacheCreationTokens') 
                      ? 'opacity-40 line-through' 
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="w-3 h-3 bg-purple-500 rounded"></div>
                  <span>{t('usage.cacheCreate')}</span>
                </button>
                <button
                  onClick={() => {
                    const newHidden = new Set(hiddenSeries);
                    if (hiddenSeries.has('cacheReadTokens')) {
                      newHidden.delete('cacheReadTokens');
                    } else {
                      newHidden.add('cacheReadTokens');
                    }
                    setHiddenSeries(newHidden);
                  }}
                  className={`flex items-center gap-1 px-2 py-1 rounded transition-all ${
                    hiddenSeries.has('cacheReadTokens') 
                      ? 'opacity-40 line-through' 
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="w-3 h-3 bg-purple-500 opacity-50 rounded"></div>
                  <span>{t('usage.cacheRead')}</span>
                </button>
              </div>
            </div>

            {/* Chart */}
            <div className="flex-1" style={{ minHeight: '180px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorInput" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.2}/>
                  </linearGradient>
                  <linearGradient id="colorOutput" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0.2}/>
                  </linearGradient>
                  <linearGradient id="colorCacheCreation" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#A78BFA" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#A78BFA" stopOpacity={0.2}/>
                  </linearGradient>
                  <linearGradient id="colorCache" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                <XAxis 
                  dataKey="shortDate" 
                  stroke="#9CA3AF" 
                  fontSize={10}
                  tick={{ fill: '#9CA3AF' }}
                />
                <YAxis 
                  yAxisId="left"
                  stroke="#9CA3AF" 
                  fontSize={10}
                  tick={{ fill: '#9CA3AF' }}
                  tickFormatter={(value) => {
                    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                    return value.toString();
                  }}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  stroke="#F59E0B" 
                  fontSize={10}
                  tick={{ fill: '#F59E0B' }}
                  tickFormatter={(value) => `$${value.toFixed(0)}`}
                />
                
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(31, 41, 55, 0.95)', 
                    border: '1px solid #4B5563',
                    borderRadius: '8px',
                    fontSize: '11px'
                  }}
                  formatter={(value, name) => {
                    if (name === t('usage.cost')) return [`$${value.toFixed(2)}`, name];
                    return [value.toLocaleString(), name];
                  }}
                />
                
                {/* Conditionally render areas based on hiddenSeries */}
                {!hiddenSeries.has('cacheReadTokens') && (
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="cacheReadTokens"
                    stackId="1"
                    stroke="none"
                    fill="url(#colorCache)"
                    name={t('usage.cacheRead')}
                  />
                )}
                {!hiddenSeries.has('cacheCreationTokens') && (
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="cacheCreationTokens"
                    stackId="1"
                    stroke="none"
                    fill="url(#colorCacheCreation)"
                    name={t('usage.cacheCreate')}
                  />
                )}
                {!hiddenSeries.has('outputTokens') && (
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="outputTokens"
                    stackId="1"
                    stroke="none"
                    fill="url(#colorOutput)"
                    name={t('usage.output')}
                  />
                )}
                {!hiddenSeries.has('inputTokens') && (
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="inputTokens"
                    stackId="1"
                    stroke="none"
                    fill="url(#colorInput)"
                    name={t('usage.input')}
                  />
                )}
                
                {/* Cost line */}
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="cost" 
                  stroke="#F59E0B" 
                  strokeWidth={2.5}
                  dot={{ fill: '#F59E0B', r: 3 }}
                  name={t('usage.cost')}
                />
                
                {/* Brush for zooming */}
                <Brush 
                  dataKey="shortDate" 
                  height={20} 
                  stroke="#6B7280"
                  fill="#1F2937"
                  fillOpacity={0.5}
                />
              </ComposedChart>
            </ResponsiveContainer>
            </div>

            {/* Info text */}
            <div className="px-2 text-xs text-gray-500 dark:text-gray-400">
              {t('usage.clickLegendToToggle')}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleRefresh = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    fetchUsageData().finally(() => setLoading(false));
  }, [fetchUsageData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-[95%] h-[92%] max-w-[1400px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {t('usage.title')}
            </h2>
            <div className="flex gap-2">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <span className="mr-1">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Project Filter */}
            {usageData?.projects && (
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
              >
                <option value="all">{t('usage.allProjects')}</option>
                {usageData.projects.map(project => (
                  <option key={typeof project === 'object' ? project.id : project} 
                          value={typeof project === 'object' ? project.id : project}>
                    {typeof project === 'object' ? project.name : project}
                  </option>
                ))}
              </select>
            )}

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
              title={t('usage.refresh')}
            >
              <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            {/* Last Refresh Time */}
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {t('usage.lastRefresh')}: {lastRefresh.toLocaleTimeString()}
            </span>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              {activeTab === 'bytime' && renderByTimeView()}
              {activeTab === 'session' && renderSessionsView()}
              {activeTab === 'models' && renderModelsView()}
              {activeTab === 'billing' && renderBillingView()}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UsageModal;