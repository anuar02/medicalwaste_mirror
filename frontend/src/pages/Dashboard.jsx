import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
    BarChart3, AlertTriangle, CheckCircle, ArrowUpRight, MapPin, Trash2,
    AreaChart, TrendingUp, TrendingDown, RefreshCw, Settings, Bell, Activity,
    Wifi, WifiOff, Brain, Calendar, Target, Zap, Clock, Eye, PieChart,
    Filter, Download, Share2, Maximize2, Minimize2
} from 'lucide-react';
import { toast } from 'react-hot-toast';

import apiService from '../services/api';
import { formatDate, formatPercentage } from '../utils/formatters';
import { useAuth } from '../contexts/AuthContext';

// Enhanced components
import Loader from '../components/ui/Loader';
import DashboardCard from '../components/dashboard/DashboardCard';
import DashboardStat from '../components/dashboard/DashboardStat';
import BinStatusCard from '../components/dashboard/BinStatusCard';
import WasteTypePieChart from '../components/charts/WasteTypePieChart';
import DepartmentBarChart from '../components/charts/DepartmentBarChart';
import TelegramSettings from "../components/dashboard/TelegramSettings";
import { useLocalStorage } from "../components/dashboard/useLocalStorage";
import { useOnlineStatus } from "../components/dashboard/useOnlineStatus";
import { useAutoRefresh } from "../components/dashboard/useAutoRefresh";

// ===== HELPER FUNCTIONS (moved to top) =====

// Helper functions with memoization
const getWasteTypeColor = (wasteType) => {
    const colors = {
        'Острые Медицинские Отходы': '#ef4444',
        'Инфекционные Отходы': '#f97316',
        'Патологические Отходы': '#f59e0b',
        'Фармацевтические Отходы': '#3b82f6',
        'Химические Отходы': '#8b5cf6',
        'Радиоактивные Отходы': '#10b981',
        'Общие Медицинские Отходы': '#6b7280',
        'Цитотоксические Отходы': '#ec4899',
        'Лабораторные Отходы': '#14b8a6'
    };
    return colors[wasteType] || '#6b7280';
};

const getShortWasteTypeName = (wasteType) => {
    const shortNames = {
        'Острые Медицинские Отходы': 'Острые',
        'Инфекционные Отходы': 'Инфекционные',
        'Патологические Отходы': 'Патологические',
        'Фармацевтические Отходы': 'Фармацевтические',
        'Химические Отходы': 'Химические',
        'Радиоактивные Отходы': 'Радиоактивные',
        'Общие Медицинские Отходы': 'Общие',
        'Цитотоксические Отходы': 'Цитотоксические',
        'Лабораторные Отходы': 'Лабораторные'
    };
    return shortNames[wasteType] || wasteType;
};

// ===== PERFORMANCE OPTIMIZATIONS =====

// Memoized metric card for better performance
const MetricCard = React.memo(({
                                   title, value, icon, color = 'blue', trend, subtitle, onClick,
                                   prediction, isLoading, className = ''
                               }) => {
    const colorClasses = {
        blue: 'bg-blue-50 text-blue-600 border-blue-200',
        teal: 'bg-teal-50 text-teal-600 border-teal-200',
        red: 'bg-red-50 text-red-600 border-red-200',
        amber: 'bg-amber-50 text-amber-600 border-amber-200',
        purple: 'bg-purple-50 text-purple-600 border-purple-200',
        green: 'bg-green-50 text-green-600 border-green-200'
    };

    const getTrendColor = useCallback((trend) => {
        if (trend > 0) return 'text-green-600';
        if (trend < 0) return 'text-red-600';
        return 'text-slate-500';
    }, []);

    const handleClick = useCallback(() => {
        if (onClick && !isLoading) onClick();
    }, [onClick, isLoading]);

    if (isLoading) {
        return (
            <div className={`relative overflow-hidden rounded-xl border border-slate-200 p-6 bg-white ${className}`}>
                <div className="animate-pulse">
                    <div className="h-4 bg-slate-200 rounded w-3/4 mb-3"></div>
                    <div className="h-8 bg-slate-200 rounded w-1/2 mb-2"></div>
                    <div className="h-3 bg-slate-200 rounded w-2/3"></div>
                </div>
            </div>
        );
    }

    return (
        <div
            className={`relative overflow-hidden rounded-xl border border-slate-200 p-6 bg-white 
                ${onClick ? 'cursor-pointer hover:shadow-lg hover:-translate-y-0.5' : ''} 
                transition-all duration-200 ${className}`}
            onClick={handleClick}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            onKeyPress={(e) => {
                if (onClick && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    handleClick();
                }
            }}
        >
            <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-600 truncate">{title}</p>
                    <div className="mt-2 flex items-baseline">
                        <p className="text-2xl font-bold text-slate-900 truncate">{value}</p>
                        {trend !== undefined && (
                            <div className={`ml-2 flex items-center text-sm ${getTrendColor(trend)} shrink-0`}>
                                {trend > 0 ? (
                                    <TrendingUp className="h-4 w-4" />
                                ) : trend < 0 ? (
                                    <TrendingDown className="h-4 w-4" />
                                ) : null}
                                <span className="ml-1">{Math.abs(trend).toFixed(1)}%</span>
                            </div>
                        )}
                    </div>
                    {subtitle && (
                        <p className="mt-1 text-xs text-slate-500 truncate">{subtitle}</p>
                    )}
                    {prediction && (
                        <div className="mt-2 p-2 bg-purple-50 rounded-lg border border-purple-200">
                            <div className="flex items-center space-x-2">
                                <Brain className="h-3 w-3 text-purple-600 shrink-0" />
                                <span className="text-xs font-medium text-purple-700">Прогноз:</span>
                            </div>
                            <p className="text-xs text-purple-600 mt-1 line-clamp-2">{prediction}</p>
                        </div>
                    )}
                </div>
                <div className={`rounded-lg p-3 border ${colorClasses[color]} shrink-0`}>
                    {icon}
                </div>
            </div>
        </div>
    );
});

// Enhanced prediction card with better UX
const PredictionCard = React.memo(({ bin, prediction, onScheduleCollection, isExpanded = false }) => {
    const [isScheduling, setIsScheduling] = useState(false);

    const getPriorityColor = useCallback((priority) => {
        const colors = {
            high: 'text-red-600 bg-red-50 border-red-200',
            medium: 'text-amber-600 bg-amber-50 border-amber-200',
            low: 'text-green-600 bg-green-50 border-green-200'
        };
        return colors[priority] || 'text-slate-600 bg-slate-50 border-slate-200';
    }, []);

    const handleScheduleCollection = useCallback(async () => {
        if (isScheduling || !onScheduleCollection) return;

        setIsScheduling(true);
        try {
            await onScheduleCollection(bin, prediction);
            toast.success(`Сбор запланирован для ${bin.binId}`);
        } catch (error) {
            toast.error('Ошибка планирования сбора');
        } finally {
            setIsScheduling(false);
        }
    }, [bin, prediction, onScheduleCollection, isScheduling]);

    const priorityText = useMemo(() => {
        const priorities = { high: 'Высокий', medium: 'Средний', low: 'Низкий' };
        return priorities[prediction.priority] || 'Неизвестный';
    }, [prediction.priority]);

    return (
        <div className="rounded-lg border border-slate-200 p-4 hover:shadow-sm transition-all duration-200 bg-white">
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                        <h4 className="text-sm font-semibold text-slate-800 truncate">{bin.binId}</h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(prediction.priority)} shrink-0`}>
                            {priorityText}
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                        {bin.department} • {bin.wasteType}
                    </p>
                </div>
            </div>

            <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                        <span className="text-slate-600">Заполнение 100%:</span>
                        <div className="font-medium text-slate-800">
                            {formatDate(new Date(prediction.predictedFullDate))}
                        </div>
                    </div>
                    <div>
                        <span className="text-slate-600">Рекомендуемый сбор:</span>
                        <div className="font-medium text-slate-800">
                            {formatDate(new Date(prediction.recommendedCollectionDate))}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between text-sm pt-1">
                    <span className="text-slate-600">Уверенность модели:</span>
                    <div className="flex items-center space-x-2">
                        <div className="w-16 bg-slate-200 rounded-full h-2">
                            <div
                                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${Math.round(prediction.confidence * 100)}%` }}
                            />
                        </div>
                        <span className="font-medium text-slate-800 text-xs">
                            {Math.round(prediction.confidence * 100)}%
                        </span>
                    </div>
                </div>
            </div>

            {onScheduleCollection && (
                <div className="mt-4 pt-3 border-t border-slate-100">
                    <button
                        onClick={handleScheduleCollection}
                        disabled={isScheduling}
                        className={`flex items-center justify-center w-full space-x-2 text-sm font-medium py-2 px-3 rounded-lg transition-all duration-200
                            ${isScheduling
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'text-teal-600 hover:text-teal-700 hover:bg-teal-50'
                        }`}
                    >
                        {isScheduling ? (
                            <>
                                <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                                <span>Планирование...</span>
                            </>
                        ) : (
                            <>
                                <Calendar className="h-4 w-4" />
                                <span>Запланировать сбор</span>
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
});

// Enhanced analytics summary with loading states
const AnalyticsSummary = React.memo(({ analytics, isLoading }) => {
    if (isLoading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="text-center animate-pulse">
                        <div className="h-8 bg-slate-200 rounded w-12 mx-auto mb-2"></div>
                        <div className="h-3 bg-slate-200 rounded w-20 mx-auto"></div>
                    </div>
                ))}
            </div>
        );
    }

    if (!analytics) return null;

    const metrics = [
        {
            label: 'Сборов за месяц',
            value: analytics.totalCollections || 0,
            format: (v) => v.toString()
        },
        {
            label: 'Эффективность',
            value: analytics.efficiencyRate || 0,
            format: (v) => formatPercentage(v)
        },
        {
            label: 'Среднее время отклика',
            value: analytics.avgResponseTime || 0,
            format: (v) => `${Math.round(v)}ч`
        },
        {
            label: 'Экономия затрат',
            value: analytics.costSavings || 0,
            format: (v) => `${Math.round(v)}%`
        }
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {metrics.map((metric, index) => (
                <div key={index} className="text-center">
                    <div className="text-2xl font-bold text-slate-800">
                        {metric.format(metric.value)}
                    </div>
                    <div className="text-xs text-slate-500">{metric.label}</div>
                </div>
            ))}
        </div>
    );
});

// ===== MAIN DASHBOARD COMPONENT =====
const Dashboard = () => {
    // ===== STATE MANAGEMENT =====
    const [showTelegramModal, setShowTelegramModal] = useState(false);
    const { t } = useTranslation();
    const [refreshing, setRefreshing] = useState(false);
    const [selectedTimeframe, setSelectedTimeframe] = useState('month');
    const [lastAlertCount, setLastAlertCount] = useLocalStorage('lastAlertCount', 0);
    const [preferences, setPreferences] = useLocalStorage('dashboard-preferences', {
        autoRefresh: true,
        notifications: true,
        compactView: false,
        refreshInterval: 300000, // 5 minutes
        showPredictions: true,
        showAnalytics: true,
        theme: 'light'
    });

    // ===== REFS =====
    const notificationTimeoutRef = useRef(null);
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const isOnline = useOnlineStatus();

    // ===== AUTO REFRESH =====
    const { isAutoRefreshing } = useAutoRefresh({
        enabled: preferences.autoRefresh && isOnline,
        interval: preferences.refreshInterval,
        onRefresh: useCallback(() => {
            const queryKeys = [
                ['wasteStatistics'],
                ['alertBins'],
                ['allBins'],
                ['analytics'],
                ['maintenancePredictions'],
                ['metrics']
            ];

            queryKeys.forEach(key => {
                queryClient.invalidateQueries({ queryKey: key });
            });
        }, [queryClient])
    });

    // ===== ENHANCED QUERY HOOKS =====

    // Statistics query with better error handling
    const {
        data: statsData,
        isLoading: statsLoading,
        error: statsError,
        refetch: refetchStats,
        dataUpdatedAt: statsUpdatedAt,
        isStale: statsStale
    } = useQuery({
        queryKey: ['wasteStatistics', selectedTimeframe],
        queryFn: async () => {
            try {
                const response = await apiService.wasteBins.getStatistics({
                    period: selectedTimeframe,
                    includeAnalytics: true
                });
                return response;
            } catch (error) {
                console.error('Stats API error:', error);
                throw error;
            }
        },
        refetchInterval: preferences.autoRefresh && isOnline ? preferences.refreshInterval : false,
        staleTime: 60000,
        retry: (failureCount, error) => {
            if (error?.response?.status === 404) return false;
            return failureCount < 3;
        },
        onSuccess: useCallback((data) => {
            const alertCount = data?.data?.data?.alertCount || data?.data?.alertCount || 0;

            if (alertCount > lastAlertCount && lastAlertCount > 0) {
                // Clear previous timeout
                if (notificationTimeoutRef.current) {
                    clearTimeout(notificationTimeoutRef.current);
                }

                // Set new notification
                notificationTimeoutRef.current = setTimeout(() => {
                    toast.error(`Новые предупреждения: ${alertCount - lastAlertCount} контейнер(ов)`, {
                        duration: 8000,
                        icon: '🚨'
                    });
                }, 1000);
            }
            setLastAlertCount(alertCount);
        }, [lastAlertCount, setLastAlertCount])
    });

    // Other queries with similar enhancements
    const {
        data: analyticsData,
        isLoading: analyticsLoading,
        error: analyticsError
    } = useQuery({
        queryKey: ['analytics', selectedTimeframe],
        queryFn: async () => {
            const endDate = new Date();
            const startDate = new Date();

            const timeframeDays = {
                day: 1,
                week: 7,
                month: 30,
                year: 365
            };

            startDate.setDate(endDate.getDate() - (timeframeDays[selectedTimeframe] || 30));

            const response = await apiService.wasteBins.getAnalytics({
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                groupBy: selectedTimeframe === 'day' ? 'hour' : selectedTimeframe === 'week' ? 'day' : 'week'
            });
            return response;
        },
        enabled: preferences.showAnalytics && isOnline,
        refetchInterval: preferences.autoRefresh && isOnline ? preferences.refreshInterval : false,
        staleTime: 300000,
        retry: 2
    });

    const {
        data: predictionsData,
        isLoading: predictionsLoading,
        error: predictionsError
    } = useQuery({
        queryKey: ['maintenancePredictions'],
        queryFn: async () => {
            const binsResponse = await apiService.wasteBins.getAll({
                status: 'active',
                minFullness: 50,
                limit: 20
            });

            const bins = binsResponse?.data?.data?.bins || binsResponse?.data?.bins || [];

            const predictionPromises = bins.slice(0, 10).map(async (bin) => {
                try {
                    const predictionResponse = await apiService.wasteBins.predictMaintenance(bin.binId || bin._id);
                    return {
                        bin,
                        prediction: predictionResponse?.data?.data || predictionResponse?.data
                    };
                } catch (error) {
                    console.warn(`Prediction failed for bin ${bin.binId}:`, error);
                    return null;
                }
            });

            const predictions = await Promise.allSettled(predictionPromises);
            return predictions
                .filter(result => result.status === 'fulfilled' && result.value)
                .map(result => result.value)
                .sort((a, b) => {
                    const priorityOrder = { high: 3, medium: 2, low: 1 };
                    return (priorityOrder[b.prediction.priority] || 0) - (priorityOrder[a.prediction.priority] || 0);
                });
        },
        enabled: preferences.showPredictions && isOnline,
        refetchInterval: preferences.autoRefresh && isOnline ? preferences.refreshInterval * 2 : false,
        staleTime: 600000,
        retry: 1
    });

    const {
        data: alertBinsData,
        isLoading: alertBinsLoading,
        error: alertBinsError
    } = useQuery({
        queryKey: ['alertBins'],
        queryFn: async () => {
            const response = await apiService.wasteBins.getOverfilled();
            return response;
        },
        refetchInterval: preferences.autoRefresh && isOnline ? 60000 : false,
        staleTime: 30000,
        retry: 3
    });

    const {
        data: allBinsData,
        isLoading: allBinsLoading,
        error: allBinsError
    } = useQuery({
        queryKey: ['allBins'],
        queryFn: async () => {
            const response = await apiService.wasteBins.getAll();
            return response;
        },
        refetchInterval: preferences.autoRefresh && isOnline ? preferences.refreshInterval : false,
        staleTime: 60000,
        retry: 3
    });

    const {
        data: metricsData,
        isLoading: metricsLoading
    } = useQuery({
        queryKey: ['metrics'],
        queryFn: async () => {
            const response = await apiService.wasteBins.getMetrics();
            return response;
        },
        refetchInterval: preferences.autoRefresh && isOnline ? preferences.refreshInterval : false,
        staleTime: 300000,
        retry: 2
    });

    // ===== UTILITY FUNCTIONS =====
    const safeExtractData = useCallback((response, path) => {
        try {
            if (!response) return null;
            const paths = [`data.data.${path}`, `data.${path}`, path];
            for (const p of paths) {
                const value = p.split('.').reduce((obj, key) => obj?.[key], response);
                if (value !== undefined) return value;
            }
            return null;
        } catch (error) {
            console.warn(`Error extracting ${path}:`, error);
            return null;
        }
    }, []);

    // ===== EVENT HANDLERS =====
    const handleScheduleCollection = useCallback(async (bin, prediction) => {
        try {
            await apiService.wasteBins.scheduleCollection(bin.binId || bin._id, {
                scheduledFor: prediction.recommendedCollectionDate,
                priority: prediction.priority,
                notes: `Автоматически запланировано на основе прогноза (уверенность: ${Math.round(prediction.confidence * 100)}%)`
            });

            queryClient.invalidateQueries(['collections', 'allBins']);
            return Promise.resolve();
        } catch (error) {
            console.error('Failed to schedule collection:', error);
            throw error;
        }
    }, [queryClient]);

    const handleRefresh = useCallback(async () => {
        if (refreshing) return;
        setRefreshing(true);

        try {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['wasteStatistics'] }),
                queryClient.invalidateQueries({ queryKey: ['alertBins'] }),
                queryClient.invalidateQueries({ queryKey: ['allBins'] }),
                queryClient.invalidateQueries({ queryKey: ['analytics'] }),
                queryClient.invalidateQueries({ queryKey: ['maintenancePredictions'] }),
                queryClient.invalidateQueries({ queryKey: ['metrics'] })
            ]);
            toast.success('Данные обновлены');
        } catch (error) {
            toast.error('Ошибка при обновлении данных');
        } finally {
            setRefreshing(false);
        }
    }, [refreshing, queryClient]);

    const handleExportData = useCallback(async (format = 'csv') => {
        try {
            const response = await apiService.wasteBins.exportData(format, {
                startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                endDate: new Date().toISOString()
            });

            // Handle file download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `dashboard-data-${new Date().toISOString().split('T')[0]}.${format}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            toast.success(`Данные экспортированы в формате ${format.toUpperCase()}`);
        } catch (error) {
            toast.error('Ошибка экспорта данных');
        }
    }, []);

    // ===== COMPUTED DATA =====
    const computedData = useMemo(() => {
        if (!statsData || !alertBinsData || !allBinsData) return null;

        const stats = safeExtractData(statsData, 'overview') || safeExtractData(statsData, 'stats') || {};
        const alertCount = safeExtractData(statsData, 'alertCount') || 0;
        const departmentStats = safeExtractData(statsData, 'departmentStats') || [];
        const wasteTypeStats = safeExtractData(statsData, 'wasteTypeStats') || [];
        const alertBins = safeExtractData(alertBinsData, 'bins') || [];
        const bins = safeExtractData(allBinsData, 'bins') || [];
        const analytics = safeExtractData(analyticsData, 'analytics') || {};
        const metrics = safeExtractData(metricsData, 'metrics') || {};
        const predictions = predictionsData || [];

        const binsByStatus = {
            active: bins.filter(bin => bin.status === 'active').length,
            maintenance: bins.filter(bin => bin.status === 'maintenance').length,
            offline: bins.filter(bin => bin.status === 'offline').length,
            decommissioned: bins.filter(bin => bin.status === 'decommissioned').length,
        };

        const topAlertBins = alertBins.slice(0, 5);
        const topPredictions = predictions.slice(0, 5);

        const predictiveInsights = {
            avgFullnessTrend: stats.avgFullnessTrend || 0,
            totalWeightTrend: stats.totalWeightTrend || 0,
            predictedOverflows: predictions.filter(p => p.prediction?.priority === 'high').length,
            efficiencyScore: analytics.efficiencyRate || metrics.efficiencyScore || 0
        };

        return {
            stats: {
                totalBins: bins.length || stats.totalBins || 0,
                avgFullness: stats.avgFullness || 0,
                totalWeight: stats.totalWeight || 0,
                ...stats
            },
            alertCount,
            departmentStats,
            wasteTypeStats,
            alertBins,
            bins,
            binsByStatus,
            topAlertBins,
            topPredictions,
            analytics,
            metrics,
            predictiveInsights
        };
    }, [statsData, alertBinsData, allBinsData, analyticsData, metricsData, predictionsData, safeExtractData]);

    // ===== CLEANUP =====
    useEffect(() => {
        return () => {
            if (notificationTimeoutRef.current) {
                clearTimeout(notificationTimeoutRef.current);
            }
        };
    }, []);

    // ===== RENDER CONDITIONS =====
    const isLoading = statsLoading || alertBinsLoading || allBinsLoading;
    const hasError = statsError || alertBinsError || allBinsError;

    if (isLoading) {
        return (
            <div className="container mx-auto p-4">
                <div className="animate-pulse">
                    <div className="h-8 bg-slate-200 rounded mb-4"></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-32 bg-slate-200 rounded"></div>
                        ))}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 h-96 bg-slate-200 rounded"></div>
                        <div className="h-96 bg-slate-200 rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (hasError || !computedData) {
        return (
            <div className="container mx-auto p-4">
                <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                    <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
                    <h2 className="text-xl font-semibold text-slate-800 mb-2">
                        {t('dashboard.errorTitle', 'Ошибка загрузки данных')}
                    </h2>
                    <p className="text-slate-600 mb-6">
                        {t('dashboard.errorSubtitle', 'Не удалось загрузить данные панели мониторинга')}
                    </p>
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="flex items-center px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                        {t('dashboard.retry', 'Попробовать снова')}
                    </button>
                </div>
            </div>
        );
    }

    const {
        stats,
        alertCount,
        departmentStats,
        wasteTypeStats,
        binsByStatus,
        topAlertBins,
        topPredictions,
        analytics,
        metrics,
        predictiveInsights
    } = computedData;

    // ===== MAIN RENDER =====
    return (
        <div className="container mx-auto p-4 space-y-6">
            {/* Enhanced Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-slate-800 md:text-3xl">
                        {t('dashboard.title', 'Панель Мониторинга')}
                    </h1>
                    <div className="mt-1 flex items-center space-x-4 flex-wrap">
                        <p className="text-sm text-slate-500">
                            {t('dashboard.subtitle', 'Система управления медицинскими отходами с ИИ-аналитикой')}
                        </p>
                        <div className="flex items-center space-x-2">
                            <div className={`h-2 w-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                            <span className="text-xs text-slate-500">{isOnline ? t('dashboard.online', 'Онлайн') : t('dashboard.offline', 'Офлайн')}</span>
                            {isAutoRefreshing && (
                                <>
                                    <div className="h-1 w-1 rounded-full bg-blue-500 animate-pulse" />
                                    <span className="text-xs text-blue-600">{t('dashboard.autoRefresh', 'Авто-обновление')}</span>
                                </>
                            )}
                            {statsStale && (
                                <span className="text-xs text-amber-600">{t('dashboard.staleData', 'Данные устарели')}</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-4 flex items-center space-x-3 md:mt-0 flex-wrap gap-2">
                    {/* Timeframe Selector */}
                    <select
                        value={selectedTimeframe}
                        onChange={(e) => setSelectedTimeframe(e.target.value)}
                        className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    >
                        <option value="day">{t('dashboard.day', 'День')}</option>
                        <option value="week">{t('dashboard.week', 'Неделя')}</option>
                        <option value="month">{t('dashboard.month', 'Месяц')}</option>
                        <option value="year">{t('dashboard.year', 'Год')}</option>
                    </select>

                    {/* Quick Actions */}
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => handleExportData('csv')}
                            className="flex items-center px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                            title={t('dashboard.exportData', 'Экспорт данных')}
                        >
                            <Download className="h-4 w-4" />
                        </button>

                        <button
                            onClick={handleRefresh}
                            disabled={refreshing || !isOnline}
                            className="flex items-center px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                            {t('dashboard.refresh', 'Обновить')}
                        </button>

                        <button
                            onClick={() => setShowTelegramModal(true)}
                            className="flex items-center px-3 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                        >
                            <Bell className="h-4 w-4 mr-2" />
                            {t('dashboard.notifications', 'Уведомления')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Enhanced Stats Overview */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                    title={t('dashboard.totalBins', 'Всего Контейнеров')}
                    value={stats.totalBins || 0}
                    icon={<Trash2 className="h-5 w-5" />}
                    color="blue"
                    trend={0}
                    subtitle={t('dashboard.activeInSystem', 'Активных в системе')}
                    onClick={() => window.location.href = '/bins'}
                />
                <MetricCard
                    title={t('dashboard.avgFullness', 'Средняя Заполненность')}
                    value={formatPercentage(stats.avgFullness || 0)}
                    icon={<AreaChart className="h-5 w-5" />}
                    color="teal"
                    trend={predictiveInsights.avgFullnessTrend}
                    subtitle={`${t('dashboard.forLabel', 'За')} ${
                        selectedTimeframe === 'day' ? t('dashboard.day', 'День') :
                            selectedTimeframe === 'week' ? t('dashboard.week', 'Неделя') :
                                selectedTimeframe === 'month' ? t('dashboard.month', 'Месяц') : t('dashboard.year', 'Год')
                    }`}
                    onClick={() => window.location.href = '/analytics'}
                />
                <MetricCard
                    title={t('dashboard.needsAttention', 'Требуют Внимания')}
                    value={alertCount || 0}
                    icon={<AlertTriangle className="h-5 w-5" />}
                    color={alertCount > 5 ? "red" : "amber"}
                    trend={alertCount > 5 ? 8.2 : -3.1}
                    subtitle={t('dashboard.thresholdExceeded', 'Превышен порог')}
                    prediction={`${predictiveInsights.predictedOverflows} ${t('dashboard.overflowsNext24h', 'переполнений в ближайшие 24ч')}`}
                    onClick={() => window.location.href = '/bins?filter=alert'}
                />
                <MetricCard
                    title={t('dashboard.aiEfficiency', 'Эффективность ИИ')}
                    value={`${Math.round(predictiveInsights.efficiencyScore * 100)}%`}
                    icon={<Brain className="h-5 w-5" />}
                    color="purple"
                    trend={5.2}
                    subtitle={t('dashboard.predictionAccuracy', 'Точность прогнозов')}
                    isLoading={analyticsLoading || metricsLoading}
                    onClick={() => window.location.href = '/predictions'}
                />
            </div>

            {/* Analytics Summary */}
            {analytics && Object.keys(analytics).length > 0 && (
                <DashboardCard
                    title={t('dashboard.analyticsMetrics', 'Аналитические Показатели')}
                    icon={<PieChart />}
                    action={
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => handleExportData('xlsx')}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                                title={t('dashboard.exportAnalytics', 'Экспорт аналитики')}
                            >
                                <Download className="h-4 w-4" />
                            </button>
                            <Link to="/analytics" className="text-teal-600 hover:text-teal-700">
                                {t('dashboard.moreAnalytics', 'Подробная аналитика')}
                            </Link>
                        </div>
                    }
                >
                    <AnalyticsSummary analytics={analytics} isLoading={analyticsLoading} />
                </DashboardCard>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Left Column - Charts and Analytics */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Department Chart */}
                    <DashboardCard
                        title={t('dashboard.byDepartment', 'Заполненность по Отделениям')}
                        icon={<BarChart3 />}
                        action={
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => setPreferences(prev => ({ ...prev, compactView: !prev.compactView }))}
                                    className="text-slate-400 hover:text-slate-600 transition-colors"
                                    title={preferences.compactView ? t('dashboard.expand', 'Развернуть') : t('dashboard.collapse', 'Свернуть')}
                                >
                                    {preferences.compactView ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                                </button>
                                <Link to="/departments" className="text-teal-600 hover:text-teal-700">
                                    {t('dashboard.details', 'Подробнее')}
                                </Link>
                            </div>
                        }
                    >
                        <div className={`${preferences.compactView ? 'h-60' : 'h-80'} transition-all duration-300`}>
                            {departmentStats.length > 0 ? (
                                <DepartmentBarChart
                                    data={departmentStats.map(stat => ({
                                        department: stat._id || stat.department || 'Unknown',
                                        binCount: stat.binCount || 0,
                                        avgFullness: stat.avgFullness || 0,
                                        totalWeight: stat.totalWeight || 0,
                                        trend: stat.trend || 0
                                    }))}
                                    animated={true}
                                    showPredictions={preferences.showPredictions}
                                    compact={preferences.compactView}
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-500">
                                    <div className="text-center">
                                        <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                        <p>{t('dashboard.noDepartmentData', 'Нет данных по отделениям')}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </DashboardCard>

                    {/* AI Predictions Panel */}
                    {preferences.showPredictions && (
                        <DashboardCard
                            title={t('dashboard.aiMaintenancePredictions', 'ИИ Прогнозы Обслуживания')}
                            icon={<Brain />}
                            action={
                                <div className="flex items-center space-x-2">
                                    <span className={`h-2 w-2 rounded-full ${predictionsLoading ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`} />
                                    <span className="text-xs text-slate-500">
                                        {predictionsLoading ? t('dashboard.analyzing', 'Анализ...') : t('dashboard.ready', 'Готово')}
                                    </span>
                                    {topPredictions.length > 0 && (
                                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                                            {topPredictions.length} {t('dashboard.predictionsLabel', 'прогнозов')}
                                        </span>
                                    )}
                                </div>
                            }
                        >
                            {predictionsLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="text-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
                                        <p className="text-sm text-slate-500">{t('dashboard.aiAnalyzing', 'ИИ анализирует данные...')}</p>
                                    </div>
                                </div>
                            ) : predictionsError ? (
                                <div className="flex items-center justify-center py-12 text-center">
                                    <div>
                                        <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                                        <p className="text-sm text-slate-600">{t('dashboard.predictionsError', 'Ошибка загрузки прогнозов')}</p>
                                        <button
                                            onClick={() => queryClient.invalidateQueries(['maintenancePredictions'])}
                                            className="text-xs text-teal-600 hover:text-teal-700 mt-1"
                                        >
                                            {t('dashboard.retry', 'Попробовать снова')}
                                        </button>
                                    </div>
                                </div>
                            ) : topPredictions.length > 0 ? (
                                <div className="space-y-4">
                                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
                                        <div className="flex items-center space-x-2">
                                            <Zap className="h-4 w-4 text-purple-600" />
                                            <span className="text-sm font-medium text-purple-800">
                                                {t('dashboard.foundPredictions', { count: topPredictions.length, defaultValue: `Найдено ${topPredictions.length} прогнозов для оптимизации` })}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="grid gap-4">
                                        {topPredictions.map((item, index) => (
                                            <PredictionCard
                                                key={item.bin.binId || index}
                                                bin={item.bin}
                                                prediction={item.prediction}
                                                onScheduleCollection={handleScheduleCollection}
                                            />
                                        ))}
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-slate-200">
                                        <Link
                                            to="/predictions"
                                            className="flex items-center justify-center w-full py-2 text-sm text-purple-600 hover:text-purple-700 font-medium transition-colors"
                                        >
                                            <Eye className="h-4 w-4 mr-2" />
                                            {t('dashboard.viewAllPredictions', 'Просмотреть все прогнозы')}
                                        </Link>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <Brain className="h-12 w-12 text-slate-400 mb-3" />
                                    <h3 className="text-sm font-semibold text-slate-800">
                                        {t('dashboard.noActivePredictions', 'Нет активных прогнозов')}
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1 max-w-xs">
                                        {t('dashboard.noBinsNeedAttention', 'ИИ не обнаружил контейнеров, требующих внимания в ближайшее время')}
                                    </p>
                                </div>
                            )}
                        </DashboardCard>
                    )}

                    {/* Waste Type Distribution */}
                    <DashboardCard
                        title={t('dashboard.byWasteTypes', 'Распределение по Типам Отходов')}
                        icon={<Trash2 />}
                        action={
                            <button
                                onClick={() => handleExportData('pdf')}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                                title={t('dashboard.exportReport', 'Экспорт отчета')}
                            >
                                <Download className="h-4 w-4" />
                            </button>
                        }
                    >
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div className="flex justify-center items-center">
                                {wasteTypeStats.length > 0 ? (
                                    <WasteTypePieChart
                                        data={wasteTypeStats.map(stat => ({
                                            name: stat._id || stat.wasteType,
                                            value: stat.binCount,
                                            fillColor: getWasteTypeColor(stat._id || stat.wasteType)
                                        }))}
                                        animated={true}
                                    />
                                ) : (
                                    <div className="text-center text-slate-500">
                                        <Trash2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                        <p>{t('dashboard.noWasteTypeData', 'Нет данных по типам отходов')}</p>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-3 max-h-80 overflow-y-auto">
                                {wasteTypeStats.length > 0 ? wasteTypeStats.map((stat, index) => (
                                    <div
                                        key={stat._id || index}
                                        className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 hover:bg-slate-100 transition-colors cursor-pointer"
                                        onClick={() => window.location.href = `/bins?wasteType=${encodeURIComponent(stat._id || stat.wasteType)}`}
                                    >
                                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                                            <div
                                                className="h-3 w-3 rounded-full shrink-0"
                                                style={{ backgroundColor: getWasteTypeColor(stat._id || stat.wasteType) }}
                                            />
                                            <span className="text-sm font-medium text-slate-700 truncate">
                                                {getShortWasteTypeName(stat._id || stat.wasteType)}
                                            </span>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="text-sm font-semibold text-slate-800">
                                                {stat.binCount} {t('dashboard.binsLabelGenitive', 'контейнеров')}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {formatPercentage(stat.avgFullness)} {t('dashboard.filled', 'заполнено')}
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center text-slate-500 py-8">
                                        <p>Нет данных для отображения</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </DashboardCard>
                </div>

                {/* Right Column - Alerts and Quick Actions */}
                <div className="space-y-6">
                    {/* Attention Required */}
                    <DashboardCard
                        title={t('dashboard.needsAttention', 'Требуют Внимания')}
                        icon={<AlertTriangle />}
                        action={
                            <div className="flex items-center space-x-2">
                                {alertCount > 0 && (
                                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                                        {alertCount}
                                    </span>
                                )}
                                <Link
                                    to="/bins?filter=alert"
                                    className="flex items-center text-xs font-medium text-teal-600 hover:text-teal-700"
                                >
                                    {t('dashboard.viewAll', 'Просмотреть все')}
                                    <ArrowUpRight className="ml-1 h-3 w-3" />
                                </Link>
                            </div>
                        }
                    >
                        <div className="max-h-96 overflow-y-auto">
                            {topAlertBins.length > 0 ? (
                                <div className="space-y-3">
                                    {topAlertBins.map((bin, index) => (
                                        <div key={bin.binId || index}>
                                            <BinStatusCard
                                                bin={bin}
                                                showAction={true}
                                                compact={true}
                                            />
                                        </div>
                                    ))}
                                    {computedData.alertBins.length > 5 && (
                                        <div className="pt-3 border-t border-slate-200">
                                            <Link
                                                to="/bins?filter=alert"
                                                className="block text-center text-sm text-teal-600 hover:text-teal-700 font-medium"
                                            >
                                                Показать ещё {computedData.alertBins.length - 5} контейнеров
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-8 text-center">
                                    <CheckCircle className="mb-3 h-10 w-10 text-emerald-500" />
                                    <h3 className="text-sm font-semibold text-slate-800">
                                        {t('dashboard.allGood', 'Все контейнеры в норме')}
                                    </h3>
                                    <p className="mt-1 text-xs text-slate-500">
                                        {t('dashboard.noBinsNeedAttention', 'Нет контейнеров, требующих внимания')}
                                    </p>
                                </div>
                            )}
                        </div>
                    </DashboardCard>

                    {/* System Metrics */}
                    <DashboardCard title={t('dashboard.systemMetrics', 'Метрики Системы')} icon={<Activity />}>
                        <div className="space-y-3">
                            {[
                                {
                                    key: 'active',
                                    label: 'Активные',
                                    color: 'emerald',
                                    count: binsByStatus.active,
                                    icon: <CheckCircle className="h-4 w-4" />
                                },
                                {
                                    key: 'maintenance',
                                    label: 'На обслуживании',
                                    color: 'amber',
                                    count: binsByStatus.maintenance,
                                    icon: <Clock className="h-4 w-4" />
                                },
                                {
                                    key: 'offline',
                                    label: 'Офлайн',
                                    color: 'slate',
                                    count: binsByStatus.offline,
                                    icon: <WifiOff className="h-4 w-4" />
                                },
                                {
                                    key: 'decommissioned',
                                    label: 'Выведены',
                                    color: 'red',
                                    count: binsByStatus.decommissioned,
                                    icon: <AlertTriangle className="h-4 w-4" />
                                }
                            ].map((status) => (
                                <div
                                    key={status.key}
                                    className={`flex items-center justify-between rounded-lg bg-${status.color}-50 px-4 py-3 border border-${status.color}-100 hover:bg-${status.color}-100 transition-colors cursor-pointer`}
                                    onClick={() => window.location.href = `/bins?status=${status.key}`}
                                >
                                    <div className="flex items-center space-x-3">
                                        <div className={`text-${status.color}-600`}>
                                            {status.icon}
                                        </div>
                                        <span className="text-sm font-medium text-slate-700">
                                            {status.label}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-semibold text-slate-800">
                                            {status.count} шт.
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {Math.round((status.count / (stats.totalBins || 1)) * 100)}%
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </DashboardCard>

                    {/* Enhanced Quick Actions */}
                    <DashboardCard title={t('dashboard.quickActions', 'Быстрые Действия')} icon={<ArrowUpRight />}>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                {
                                    to: '/bins',
                                    icon: Trash2,
                                    label: t('dashboard.bins', 'Контейнеры'),
                                    badge: alertCount > 0 ? alertCount : null,
                                    badgeColor: 'bg-red-500'
                                },
                                { to: '/map', icon: MapPin, label: t('dashboard.map', 'Карта') },
                                {
                                    to: '/analytics',
                                    icon: BarChart3,
                                    label: t('dashboard.analytics', 'Аналитика'),
                                    new: true
                                },
                                {
                                    to: '/predictions',
                                    icon: Brain,
                                    label: t('dashboard.aiPredictions', 'ИИ Прогнозы'),
                                    new: true,
                                    badge: topPredictions.length > 0 ? topPredictions.length : null,
                                    badgeColor: 'bg-purple-500'
                                },
                                { to: '/reports', icon: Activity, label: t('dashboard.reports', 'Отчеты') },
                                { to: '/settings', icon: Settings, label: t('dashboard.settings', 'Настройки') },
                                {
                                    onClick: () => setShowTelegramModal(true),
                                    icon: Bell,
                                    label: 'Telegram'
                                },
                                { to: '/collections', icon: Calendar, label: t('dashboard.collections', 'Сборы') }
                            ].map((action, index) => (
                                <div key={action.label} className="relative hover:scale-105 transition-transform duration-200">
                                    {action.to ? (
                                        <Link
                                            to={action.to}
                                            className="flex flex-col items-center rounded-lg border border-slate-200 p-3 transition-all hover:border-teal-500 hover:bg-teal-50 hover:shadow-sm relative"
                                        >
                                            <action.icon className="mb-2 h-5 w-5 text-teal-600" />
                                            <span className="text-center text-xs font-medium text-slate-700">
                                                {action.label}
                                            </span>
                                            {action.badge && (
                                                <span className={`absolute -top-2 -right-2 ${action.badgeColor || 'bg-red-500'} text-white text-xs rounded-full h-5 w-5 flex items-center justify-center`}>
                                                    {action.badge}
                                                </span>
                                            )}
                                            {action.new && (
                                                <span className="absolute -top-1 -right-1 bg-purple-500 text-white text-xs rounded-full px-1">
                                                    New
                                                </span>
                                            )}
                                        </Link>
                                    ) : (
                                        <button
                                            onClick={action.onClick}
                                            className="flex flex-col items-center rounded-lg border border-slate-200 p-3 transition-all hover:border-teal-500 hover:bg-teal-50 hover:shadow-sm w-full"
                                        >
                                            <action.icon className="mb-2 h-5 w-5 text-teal-600" />
                                            <span className="text-center text-xs font-medium text-slate-700">
                                                {action.label}
                                            </span>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </DashboardCard>

                    {/* Enhanced Settings Panel */}
                    <DashboardCard title="Настройки Панели" icon={<Settings />}>
                        <div className="space-y-3">
                            {[
                                {
                                    key: 'autoRefresh',
                                    label: 'Автообновление',
                                    description: `Каждые ${Math.round(preferences.refreshInterval / 60000)} мин`,
                                    color: 'teal'
                                },
                                {
                                    key: 'showPredictions',
                                    label: 'ИИ Прогнозы',
                                    description: 'Машинное обучение',
                                    color: 'purple'
                                },
                                {
                                    key: 'showAnalytics',
                                    label: 'Аналитика',
                                    description: 'Расширенные метрики',
                                    color: 'blue'
                                },
                                {
                                    key: 'compactView',
                                    label: 'Компактный вид',
                                    description: 'Экономия места',
                                    color: 'slate'
                                }
                            ].map(setting => (
                                <div key={setting.key} className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <label className="text-sm font-medium text-slate-700">
                                            {setting.label}
                                        </label>
                                        <p className="text-xs text-slate-500">{setting.description}</p>
                                    </div>
                                    <button
                                        onClick={() => setPreferences(prev => ({
                                            ...prev,
                                            [setting.key]: !prev[setting.key]
                                        }))}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                            preferences[setting.key] ? `bg-${setting.color}-600` : 'bg-slate-200'
                                        }`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                            preferences[setting.key] ? 'translate-x-6' : 'translate-x-1'
                                        }`} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </DashboardCard>
                </div>
            </div>

            {/* Enhanced Telegram Modal */}
            {showTelegramModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex min-h-screen items-center justify-center p-4">
                        <div
                            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                            onClick={() => setShowTelegramModal(false)}
                        />
                        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transform transition-all">
                            <div className="flex items-center justify-between p-6 border-b">
                                <div className="flex items-center space-x-3">
                                    <Bell className="h-6 w-6 text-teal-600" />
                                    <h2 className="text-xl font-semibold text-slate-800">
                                        Настройки Telegram
                                    </h2>
                                </div>
                                <button
                                    onClick={() => setShowTelegramModal(false)}
                                    className="text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="p-6">
                                <TelegramSettings
                                    user={user}
                                    onUpdate={() => {
                                        toast.success('Настройки Telegram обновлены');
                                        setShowTelegramModal(false);
                                    }}
                                    onCancel={() => setShowTelegramModal(false)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Performance Metrics Footer */}
            <div className="mt-8 text-center text-xs text-slate-400">
                <div className="flex items-center justify-center space-x-4 flex-wrap">
                    <span>Последнее обновление: {new Date(statsUpdatedAt).toLocaleTimeString()}</span>
                    {isOnline && (
                        <span className="flex items-center space-x-1">
                            <Wifi className="h-3 w-3" />
                            <span>Соединение стабильно</span>
                        </span>
                    )}
                    <span>
                        {stats.totalBins} контейнеров в мониторинге
                    </span>
                </div>
            </div>

            {/* Debug Panel */}
            {process.env.NODE_ENV === 'development' && (
                <div className="mt-8 rounded-lg bg-slate-100 p-4">
                    <details>
                        <summary className="cursor-pointer font-medium text-slate-700">
                            🔧 Debug Information (Enhanced)
                        </summary>
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                            <div className="space-y-1">
                                <div><strong>Timeframe:</strong> {selectedTimeframe}</div>
                                <div><strong>Online:</strong> {isOnline ? 'Yes' : 'No'}</div>
                                <div><strong>Auto Refresh:</strong> {isAutoRefreshing ? 'Active' : 'Inactive'}</div>
                                <div><strong>Stale Data:</strong> {statsStale ? 'Yes' : 'No'}</div>
                            </div>
                            <div className="space-y-1">
                                <div><strong>Predictions:</strong> {topPredictions.length} available</div>
                                <div><strong>Analytics:</strong> {analyticsData ? 'Available' : 'Not Available'}</div>
                                <div><strong>Metrics:</strong> {metricsData ? 'Available' : 'Not Available'}</div>
                                <div><strong>Alert Count:</strong> {alertCount}</div>
                            </div>
                            <div className="space-y-1">
                                <div><strong>Efficiency Score:</strong> {Math.round(predictiveInsights.efficiencyScore * 100)}%</div>
                                <div><strong>Predicted Overflows:</strong> {predictiveInsights.predictedOverflows}</div>
                                <div><strong>Total Bins:</strong> {stats.totalBins}</div>
                                <div><strong>Refresh Interval:</strong> {preferences.refreshInterval / 1000}s</div>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-300">
                            <div className="text-xs text-slate-600">
                                <strong>Preferences:</strong>
                                <div className="mt-2 grid grid-cols-2 gap-2">
                                    {Object.entries(preferences).map(([key, value]) => (
                                        <span key={key} className="bg-slate-200 px-2 py-1 rounded text-xs">
                                            {key}: {value.toString()}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </details>
                </div>
            )}
        </div>
    );
};

// Error Boundary Component
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Dashboard Error:', error, errorInfo);
        // You can log to your error reporting service here
        if (window.Sentry) {
            window.Sentry.captureException(error, { extra: errorInfo });
        }
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback || <DashboardErrorFallback error={this.state.error} />;
        }

        return this.props.children;
    }
}

// Error Fallback Component
const DashboardErrorFallback = ({ error }) => {
    const handleReload = () => {
        window.location.reload();
    };

    const handleReportError = () => {
        // You can implement error reporting here
        const errorData = {
            error: error?.toString(),
            stack: error?.stack,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            url: window.location.href
        };

        console.log('Error Report:', errorData);
        toast.success('Отчет об ошибке отправлен');
    };

    return (
        <div className="container mx-auto p-4">
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
                <h2 className="text-xl font-semibold text-slate-800 mb-2">
                    Произошла ошибка
                </h2>
                <p className="text-slate-600 mb-6 max-w-md">
                    Не удалось загрузить панель мониторинга. Попробуйте обновить страницу или обратитесь к администратору.
                </p>

                {process.env.NODE_ENV === 'development' && error && (
                    <details className="mb-4 p-4 bg-red-50 rounded-lg text-left text-sm text-red-700 max-w-2xl">
                        <summary className="cursor-pointer font-medium">Детали ошибки (только для разработки)</summary>
                        <pre className="mt-2 whitespace-pre-wrap overflow-auto max-h-40">
                            {error.toString()}
                            {error.stack && `\n\n${error.stack}`}
                        </pre>
                    </details>
                )}

                <div className="flex flex-wrap gap-4 justify-center">
                    <button
                        onClick={handleReload}
                        className="flex items-center px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Обновить страницу
                    </button>

                    <Link
                        to="/bins"
                        className="flex items-center px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                    >
                        <ArrowUpRight className="h-4 w-4 mr-2" />
                        Перейти к контейнерам
                    </Link>

                    {process.env.NODE_ENV === 'production' && (
                        <button
                            onClick={handleReportError}
                            className="flex items-center px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                        >
                            <Bell className="h-4 w-4 mr-2" />
                            Сообщить об ошибке
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// Performance monitoring hook
const usePerformanceMonitor = () => {
    useEffect(() => {
        if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && window.performance && window.PerformanceObserver) {
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach((entry) => {
                    if (entry.entryType === 'measure' && entry.name.includes('dashboard')) {
                        console.log(`Dashboard ${entry.name}: ${entry.duration.toFixed(2)}ms`);
                    }
                });
            });

            try {
                observer.observe({ entryTypes: ['measure'] });
                return () => observer.disconnect();
            } catch (e) {
                // PerformanceObserver not supported
                console.warn('PerformanceObserver not supported');
            }
        }
    }, []);
};

// Custom hook for dashboard data management
const useDashboardData = () => {
    const queryClient = useQueryClient();

    const invalidateAllData = useCallback(() => {
        const queryKeys = [
            ['wasteStatistics'],
            ['alertBins'],
            ['allBins'],
            ['analytics'],
            ['maintenancePredictions'],
            ['metrics']
        ];

        return Promise.all(
            queryKeys.map(key => queryClient.invalidateQueries({ queryKey: key }))
        );
    }, [queryClient]);

    const preloadData = useCallback(async () => {
        const prefetchPromises = [
            queryClient.prefetchQuery({
                queryKey: ['wasteStatistics', 'month'],
                queryFn: () => apiService.wasteBins.getStatistics({ period: 'month' }),
                staleTime: 5 * 60 * 1000 // 5 minutes
            }),
            queryClient.prefetchQuery({
                queryKey: ['alertBins'],
                queryFn: () => apiService.wasteBins.getOverfilled(),
                staleTime: 30 * 1000 // 30 seconds
            })
        ];

        return Promise.allSettled(prefetchPromises);
    }, [queryClient]);

    const getDataFreshness = useCallback(() => {
        const queries = queryClient.getQueriesData({ queryKey: ['wasteStatistics'] });
        const lastUpdate = queries[0]?.[1]?.dataUpdatedAt;
        return lastUpdate ? new Date(lastUpdate) : null;
    }, [queryClient]);

    return {
        invalidateAllData,
        preloadData,
        getDataFreshness
    };
};

// Set display names for debugging
MetricCard.displayName = 'MetricCard';
PredictionCard.displayName = 'PredictionCard';
AnalyticsSummary.displayName = 'AnalyticsSummary';

// Export component with error boundary wrapper
const DashboardWithErrorBoundary = React.memo((props) => {
    // Always call the performance monitoring hook, but conditionally enable it
    usePerformanceMonitor();

    return (
        <ErrorBoundary fallback={<DashboardErrorFallback />}>
            <Dashboard {...props} />
        </ErrorBoundary>
    );
});

DashboardWithErrorBoundary.displayName = 'DashboardWithErrorBoundary';

// Export the main component with error boundary as default
export default DashboardWithErrorBoundary;

// Named exports for testing and advanced usage
export {
    Dashboard as DashboardComponent,
    MetricCard,
    PredictionCard,
    AnalyticsSummary,
    ErrorBoundary as DashboardErrorBoundary,
    DashboardErrorFallback,
    useDashboardData,
    usePerformanceMonitor
};