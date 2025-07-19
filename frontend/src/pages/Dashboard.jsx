import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { Link } from 'react-router-dom';
import {
    BarChart3,
    AlertTriangle,
    CheckCircle,
    ArrowUpRight,
    MapPin,
    Trash2,
    AreaChart,
    TrendingUp,
    TrendingDown,
    RefreshCw,
    Settings,
    Bell,
    Activity,
    Wifi,
    WifiOff,
    Brain,
    Calendar,
    Target,
    Zap,
    Clock,
    Eye,
    PieChart
} from 'lucide-react';

// Enhanced imports
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
import {useLocalStorage} from "../components/dashboard/useLocalStorage";
import {useOnlineStatus} from "../components/dashboard/useOnlineStatus";
import {useAutoRefresh} from "../components/dashboard/useAutoRefresh";

// Enhanced MetricCard with prediction support
const MetricCard = ({ title, value, icon, color = 'blue', trend, subtitle, onClick, prediction, isLoading }) => {
    const colorClasses = {
        blue: 'bg-blue-50 text-blue-600',
        teal: 'bg-teal-50 text-teal-600',
        red: 'bg-red-50 text-red-600',
        amber: 'bg-amber-50 text-amber-600',
        purple: 'bg-purple-50 text-purple-600',
        green: 'bg-green-50 text-green-600'
    };

    const getTrendColor = (trend) => {
        if (trend > 0) return 'text-green-600';
        if (trend < 0) return 'text-red-600';
        return 'text-slate-500';
    };

    return (
        <div
            className="relative overflow-hidden rounded-xl border border-slate-200 p-6 bg-white cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
            onClick={onClick}
        >
            {isLoading && (
                <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
                </div>
            )}

            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-slate-600">{title}</p>
                    <div className="mt-2 flex items-baseline">
                        <p className="text-2xl font-bold text-slate-900">{value}</p>
                        {trend !== undefined && (
                            <div className={`ml-2 flex items-center text-sm ${getTrendColor(trend)}`}>
                                {trend > 0 ? (
                                    <TrendingUp className="h-4 w-4" />
                                ) : trend < 0 ? (
                                    <TrendingDown className="h-4 w-4" />
                                ) : null}
                                <span className="ml-1">{Math.abs(trend)}%</span>
                            </div>
                        )}
                    </div>
                    {subtitle && (
                        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
                    )}
                    {prediction && (
                        <div className="mt-2 p-2 bg-purple-50 rounded-lg border border-purple-200">
                            <div className="flex items-center space-x-2">
                                <Brain className="h-3 w-3 text-purple-600" />
                                <span className="text-xs font-medium text-purple-700">Прогноз:</span>
                            </div>
                            <p className="text-xs text-purple-600 mt-1">{prediction}</p>
                        </div>
                    )}
                </div>
                <div className={`rounded-lg p-3 ${colorClasses[color]}`}>
                    {icon}
                </div>
            </div>
        </div>
    );
};

// Prediction Card Component
const PredictionCard = ({ bin, prediction, onScheduleCollection }) => {
    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'high': return 'text-red-600 bg-red-50 border-red-200';
            case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200';
            case 'low': return 'text-green-600 bg-green-50 border-green-200';
            default: return 'text-slate-600 bg-slate-50 border-slate-200';
        }
    };

    return (
        <div className="rounded-lg border border-slate-200 p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-semibold text-slate-800">{bin.binId}</h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(prediction.priority)}`}>
                            {prediction.priority === 'high' ? 'Высокий' :
                                prediction.priority === 'medium' ? 'Средний' : 'Низкий'}
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{bin.department} • {bin.wasteType}</p>

                    <div className="mt-3 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">Заполнение 100%:</span>
                            <span className="font-medium text-slate-800">
                                {formatDate(new Date(prediction.predictedFullDate))}
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">Рекомендуемый сбор:</span>
                            <span className="font-medium text-slate-800">
                                {formatDate(new Date(prediction.recommendedCollectionDate))}
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">Уверенность:</span>
                            <span className="font-medium text-slate-800">{Math.round(prediction.confidence * 100)}%</span>
                        </div>
                    </div>
                </div>
            </div>

            {onScheduleCollection && (
                <div className="mt-4 pt-3 border-t border-slate-100">
                    <button
                        onClick={() => onScheduleCollection(bin, prediction)}
                        className="flex items-center space-x-2 text-sm text-teal-600 hover:text-teal-700 font-medium"
                    >
                        <Calendar className="h-4 w-4" />
                        <span>Запланировать сбор</span>
                    </button>
                </div>
            )}
        </div>
    );
};

// Analytics Summary Component
const AnalyticsSummary = ({ analytics }) => {
    if (!analytics) return null;

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
                <div className="text-2xl font-bold text-slate-800">{analytics.totalCollections || 0}</div>
                <div className="text-xs text-slate-500">Сборов за месяц</div>
            </div>
            <div className="text-center">
                <div className="text-2xl font-bold text-slate-800">{formatPercentage(analytics.efficiencyRate || 0)}</div>
                <div className="text-xs text-slate-500">Эффективность</div>
            </div>
            <div className="text-center">
                <div className="text-2xl font-bold text-slate-800">{Math.round(analytics.avgResponseTime || 0)}ч</div>
                <div className="text-xs text-slate-500">Среднее время отклика</div>
            </div>
            <div className="text-center">
                <div className="text-2xl font-bold text-slate-800">{Math.round(analytics.costSavings || 0)}%</div>
                <div className="text-xs text-slate-500">Экономия затрат</div>
            </div>
        </div>
    );
};

const Dashboard = () => {
    const [showTelegramModal, setShowTelegramModal] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedTimeframe, setSelectedTimeframe] = useState('month')
    const [lastAlertCount, setLastAlertCount] = useLocalStorage('lastAlertCount', 0);
    const [preferences, setPreferences] = useLocalStorage('dashboard-preferences', {
        autoRefresh: true,
        notifications: true,
        compactView: false,
        refreshInterval: 300000, // 5 minutes
        showPredictions: true,
        showAnalytics: true
    });

    const queryClient = useQueryClient();
    const isOnline = useOnlineStatus();
    const { user } = useAuth();

    // Auto-refresh functionality
    const { isAutoRefreshing } = useAutoRefresh({
        enabled: preferences.autoRefresh && isOnline,
        interval: preferences.refreshInterval,
        onRefresh: () => {
            queryClient.invalidateQueries(['wasteStatistics', 'alertBins', 'allBins', 'analytics', 'predictions']);
        }
    });

    // Enhanced statistics query
    const {
        data: statsData,
        isLoading: statsLoading,
        error: statsError,
        refetch: refetchStats,
        dataUpdatedAt: statsUpdatedAt
    } = useQuery(
        ['wasteStatistics', selectedTimeframe],
        async () => {
            try {
                const response = await apiService.wasteBins.getStatistics({
                    period: selectedTimeframe,
                    includeAnalytics: true
                });
                console.log('Stats API response:', response);
                return response;
            } catch (error) {
                console.error('Stats API error:', error);
                throw error;
            }
        },
        {
            refetchInterval: preferences.autoRefresh && isOnline ? preferences.refreshInterval : false,
            staleTime: 60000,
            retry: 3,
            onSuccess: (data) => {
                const alertCount = data?.data?.data?.alertCount || data?.data?.alertCount || 0;
                if (alertCount > lastAlertCount && lastAlertCount > 0) {
                    toast.error(`Новые предупреждения: ${alertCount - lastAlertCount} контейнер(ов)`, {
                        duration: 8000,
                        icon: '🚨'
                    });
                }
                setLastAlertCount(alertCount);
            }
        }
    );

    // Analytics query
    const {
        data: analyticsData,
        isLoading: analyticsLoading,
        error: analyticsError
    } = useQuery(
        ['analytics', selectedTimeframe],
        async () => {
            try {
                const endDate = new Date();
                const startDate = new Date();

                // Set start date based on timeframe - FIXED
                switch (selectedTimeframe) {
                    case 'day':
                        startDate.setDate(endDate.getDate() - 1);
                        break;
                    case 'week':
                        startDate.setDate(endDate.getDate() - 7);
                        break;
                    case 'month':
                        startDate.setMonth(endDate.getMonth() - 1);
                        break;
                    case 'year':
                        startDate.setFullYear(endDate.getFullYear() - 1);
                        break;
                    default:
                        startDate.setMonth(endDate.getMonth() - 1);
                }

                const response = await apiService.wasteBins.getAnalytics({
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString(),
                    groupBy: selectedTimeframe === 'day' ? 'hour' : selectedTimeframe === 'week' ? 'day' : 'week'
                });
                console.log('Analytics API response:', response);
                return response;
            } catch (error) {
                console.error('Analytics API error:', error);
                throw error;
            }
        },
        {
            enabled: preferences.showAnalytics && isOnline,
            refetchInterval: preferences.autoRefresh && isOnline ? preferences.refreshInterval : false,
            staleTime: 300000, // 5 minutes
            retry: 2
        }
    );

    // Maintenance predictions query
    const {
        data: predictionsData,
        isLoading: predictionsLoading,
        error: predictionsError
    } = useQuery(
        'maintenancePredictions',
        async () => {
            try {
                // Get all bins first
                const binsResponse = await apiService.wasteBins.getAll({ status: 'active' });
                const bins = binsResponse?.data?.data?.bins || binsResponse?.data?.bins || [];

                // Get predictions for bins that are above 50% full
                const highFullnessBins = bins.filter(bin => (bin.fullness || 0) > 50);

                const predictionPromises = highFullnessBins.slice(0, 10).map(async (bin) => {
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
                    .map(result => result.value);
            } catch (error) {
                console.error('Predictions API error:', error);
                throw error;
            }
        },
        {
            enabled: preferences.showPredictions && isOnline,
            refetchInterval: preferences.autoRefresh && isOnline ? preferences.refreshInterval * 2 : false, // Less frequent
            staleTime: 600000, // 10 minutes
            retry: 1
        }
    );

    // Alert bins query
    const {
        data: alertBinsData,
        isLoading: alertBinsLoading,
        error: alertBinsError,
        dataUpdatedAt: alertBinsUpdatedAt
    } = useQuery(
        'alertBins',
        async () => {
            try {
                const response = await apiService.wasteBins.getOverfilled();
                console.log('Alert bins API response:', response);
                return response;
            } catch (error) {
                console.error('Alert bins API error:', error);
                throw error;
            }
        },
        {
            refetchInterval: preferences.autoRefresh && isOnline ? 60000 : false,
            staleTime: 30000,
            retry: 3
        }
    );

    // All bins query
    const {
        data: allBinsData,
        isLoading: allBinsLoading,
        error: allBinsError,
        dataUpdatedAt: allBinsUpdatedAt
    } = useQuery(
        'allBins',
        async () => {
            try {
                const response = await apiService.wasteBins.getAll();
                console.log('All bins API response:', response);
                return response;
            } catch (error) {
                console.error('All bins API error:', error);
                throw error;
            }
        },
        {
            refetchInterval: preferences.autoRefresh && isOnline ? preferences.refreshInterval : false,
            staleTime: 60000,
            retry: 3
        }
    );

    // Metrics query
    const {
        data: metricsData,
        isLoading: metricsLoading
    } = useQuery(
        'metrics',
        async () => {
            try {
                const response = await apiService.wasteBins.getMetrics();
                console.log('Metrics API response:', response);
                return response;
            } catch (error) {
                console.error('Metrics API error:', error);
                throw error;
            }
        },
        {
            refetchInterval: preferences.autoRefresh && isOnline ? preferences.refreshInterval : false,
            staleTime: 300000, // 5 minutes
            retry: 2
        }
    );

    // Safe data extraction
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

    // Handle collection scheduling
    const handleScheduleCollection = useCallback(async (bin, prediction) => {
        try {
            await apiService.wasteBins.scheduleCollection(bin.binId || bin._id, {
                scheduledFor: prediction.recommendedCollectionDate,
                priority: prediction.priority,
                notes: `Автоматически запланировано на основе прогноза (уверенность: ${Math.round(prediction.confidence * 100)}%)`
            });

            toast.success(`Сбор запланирован для контейнера ${bin.binId}`);
            queryClient.invalidateQueries(['collections', 'allBins']);
        } catch (error) {
            console.error('Failed to schedule collection:', error);
            toast.error('Не удалось запланировать сбор');
        }
    }, [queryClient]);

    // Enhanced refresh handler
    const handleRefresh = useCallback(async () => {
        if (refreshing) return;
        setRefreshing(true);
        try {
            await Promise.all([
                queryClient.invalidateQueries('wasteStatistics'),
                queryClient.invalidateQueries('alertBins'),
                queryClient.invalidateQueries('allBins'),
                queryClient.invalidateQueries('analytics'),
                queryClient.invalidateQueries('maintenancePredictions'),
                queryClient.invalidateQueries('metrics')
            ]);
            toast.success('Данные обновлены');
        } catch (error) {
            toast.error('Ошибка при обновлении данных');
        } finally {
            setRefreshing(false);
        }
    }, [refreshing, queryClient]);

    // Computed data with enhanced analytics
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

        // Enhanced statistics with predictions
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

    // Loading state
    if (statsLoading || alertBinsLoading || allBinsLoading) {
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

    // Error state
    if (statsError || alertBinsError || allBinsError || !computedData) {
        return (
            <div className="container mx-auto p-4">
                <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                    <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
                    <h2 className="text-xl font-semibold text-slate-800 mb-2">
                        Ошибка загрузки данных
                    </h2>
                    <p className="text-slate-600 mb-6">
                        Не удалось загрузить данные панели мониторинга
                    </p>
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="flex items-center px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                        Попробовать снова
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

    return (
        <div className="container mx-auto p-4 space-y-6">
            {/* Enhanced Header with Timeframe Selector */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 md:text-3xl">
                        Панель Мониторинга
                    </h1>
                    <div className="mt-1 flex items-center space-x-4">
                        <p className="text-sm text-slate-500">
                            Система управления медицинскими отходами с ИИ-аналитикой
                        </p>
                        <div className="flex items-center space-x-2">
                            <div className={`h-2 w-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                            <span className="text-xs text-slate-500">{isOnline ? 'Онлайн' : 'Офлайн'}</span>
                            {isAutoRefreshing && (
                                <>
                                    <div className="h-1 w-1 rounded-full bg-blue-500 animate-pulse" />
                                    <span className="text-xs text-blue-600">Авто-обновление</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-4 flex items-center space-x-3 md:mt-0">
                    {/* Timeframe Selector */}
                    <select
                        value={selectedTimeframe}
                        onChange={(e) => setSelectedTimeframe(e.target.value)}
                        className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                    >
                        <option value="day">День</option>
                        <option value="week">Неделя</option>
                        <option value="month">Месяц</option>
                        <option value="year">Год</option>
                    </select>

                    <button
                        onClick={handleRefresh}
                        disabled={refreshing || !isOnline}
                        className="flex items-center px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                        Обновить
                    </button>
                </div>
            </div>

            {/* Enhanced Stats Overview with Predictions */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                    title="Всего Контейнеров"
                    value={stats.totalBins || 0}
                    icon={<Trash2 className="h-5 w-5" />}
                    color="blue"
                    trend={0}
                    subtitle="Активных в системе"
                />
                <MetricCard
                    title="Средняя Заполненность"
                    value={formatPercentage(stats.avgFullness || 0)}
                    icon={<AreaChart className="h-5 w-5" />}
                    color="teal"
                    trend={predictiveInsights.avgFullnessTrend}
                    subtitle={`За ${
                        selectedTimeframe === 'day' ? 'день' :
                            selectedTimeframe === 'week' ? 'неделю' :
                                selectedTimeframe === 'month' ? 'месяц' : 'год'
                    }`}
                />
                <MetricCard
                    title="Требуют Внимания"
                    value={alertCount || 0}
                    icon={<AlertTriangle className="h-5 w-5" />}
                    color={alertCount > 5 ? "red" : "amber"}
                    trend={alertCount > 5 ? 8.2 : -3.1}
                    subtitle="Превышен порог"
                    prediction={`${predictiveInsights.predictedOverflows} переполнений в ближайшие 24ч`}
                />
                <MetricCard
                    title="Эффективность ИИ"
                    value={`${Math.round(predictiveInsights.efficiencyScore * 100)}%`}
                    icon={<Brain className="h-5 w-5" />}
                    color="purple"
                    trend={5.2}
                    subtitle="Точность прогнозов"
                    isLoading={analyticsLoading || metricsLoading}
                />
            </div>

            {/* Analytics Summary */}
            {analytics && Object.keys(analytics).length > 0 && (
                <DashboardCard
                    title="Аналитические Показатели"
                    icon={<PieChart />}
                    action={
                        <Link to="/analytics" className="text-teal-600 hover:text-teal-700">
                            Подробная аналитика
                        </Link>
                    }
                >
                    <AnalyticsSummary analytics={analytics} />
                </DashboardCard>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Left Column - Charts and Analytics */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Department Chart */}
                    <DashboardCard
                        title="Заполненность по Отделениям"
                        icon={<BarChart3 />}
                        action={
                            <Link to="/departments" className="text-teal-600 hover:text-teal-700">
                                Подробнее
                            </Link>
                        }
                    >
                        <div className="h-80">
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
                                    showPredictions={true}
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-500">
                                    <div className="text-center">
                                        <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                        <p>Нет данных по отделениям</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </DashboardCard>

                    {/* AI Predictions Panel */}
                    {preferences.showPredictions && (
                        <DashboardCard
                            title="ИИ Прогнозы Обслуживания"
                            icon={<Brain />}
                            action={
                                <div className="flex items-center space-x-2">
                                    <span className={`h-2 w-2 rounded-full ${predictionsLoading ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`} />
                                    <span className="text-xs text-slate-500">
                                        {predictionsLoading ? 'Анализ...' : 'Готово'}
                                    </span>
                                </div>
                            }
                        >
                            {predictionsLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="text-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
                                        <p className="text-sm text-slate-500">ИИ анализирует данные...</p>
                                    </div>
                                </div>
                            ) : topPredictions.length > 0 ? (
                                <div className="space-y-4">
                                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
                                        <div className="flex items-center space-x-2">
                                            <Zap className="h-4 w-4 text-purple-600" />
                                            <span className="text-sm font-medium text-purple-800">
                                                Найдено {topPredictions.length} прогнозов для оптимизации
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
                                            className="flex items-center justify-center w-full py-2 text-sm text-purple-600 hover:text-purple-700 font-medium"
                                        >
                                            <Eye className="h-4 w-4 mr-2" />
                                            Просмотреть все прогнозы
                                        </Link>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <Brain className="h-12 w-12 text-slate-400 mb-3" />
                                    <h3 className="text-sm font-semibold text-slate-800">
                                        Нет активных прогнозов
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1">
                                        ИИ не обнаружил контейнеров, требующих внимания в ближайшее время
                                    </p>
                                </div>
                            )}
                        </DashboardCard>
                    )}

                    {/* Waste Type Distribution */}
                    <DashboardCard
                        title="Распределение по Типам Отходов"
                        icon={<Trash2 />}
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
                                        <p>Нет данных по типам отходов</p>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-3">
                                {wasteTypeStats.length > 0 ? wasteTypeStats.map((stat, index) => (
                                    <div
                                        key={stat._id || index}
                                        className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 hover:bg-slate-100 transition-colors"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <div
                                                className="h-3 w-3 rounded-full"
                                                style={{ backgroundColor: getWasteTypeColor(stat._id || stat.wasteType) }}
                                            />
                                            <span className="text-sm font-medium text-slate-700">
                                                {getShortWasteTypeName(stat._id || stat.wasteType)}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-semibold text-slate-800">
                                                {stat.binCount} контейнеров
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {formatPercentage(stat.avgFullness)} заполнено
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
                        title="Требуют Внимания"
                        icon={<AlertTriangle />}
                        action={
                            <Link
                                to="/bins?filter=alert"
                                className="flex items-center text-xs font-medium text-teal-600 hover:text-teal-700"
                            >
                                Просмотреть все
                                <ArrowUpRight className="ml-1 h-3 w-3" />
                            </Link>
                        }
                    >
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
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <CheckCircle className="mb-3 h-10 w-10 text-emerald-500" />
                                <h3 className="text-sm font-semibold text-slate-800">
                                    Все контейнеры в норме
                                </h3>
                                <p className="mt-1 text-xs text-slate-500">
                                    Нет контейнеров, требующих внимания
                                </p>
                            </div>
                        )}
                    </DashboardCard>

                    {/* System Metrics */}
                    <DashboardCard title="Метрики Системы" icon={<Activity />}>
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
                                    className={`flex items-center justify-between rounded-lg bg-${status.color}-50 px-4 py-3 border border-${status.color}-100`}
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
                    <DashboardCard title="Быстрые Действия" icon={<ArrowUpRight />}>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { to: '/bins', icon: Trash2, label: 'Контейнеры', badge: alertCount > 0 ? alertCount : null },
                                { to: '/map', icon: MapPin, label: 'Карта' },
                                { to: '/analytics', icon: BarChart3, label: 'Аналитика', new: true },
                                { to: '/predictions', icon: Brain, label: 'ИИ Прогнозы', new: true },
                                { to: '/reports', icon: Activity, label: 'Отчеты' },
                                { to: '/settings', icon: Settings, label: 'Настройки' },
                                {
                                    onClick: () => setShowTelegramModal(true),
                                    icon: Bell,
                                    label: 'Telegram'
                                },
                                { to: '/collections', icon: Calendar, label: 'Сборы' }
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
                                                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
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

                    {/* Settings Panel */}
                    <DashboardCard title="Настройки Панели" icon={<Settings />}>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-slate-700">Автообновление</label>
                                <button
                                    onClick={() => setPreferences(prev => ({ ...prev, autoRefresh: !prev.autoRefresh }))}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        preferences.autoRefresh ? 'bg-teal-600' : 'bg-slate-200'
                                    }`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                        preferences.autoRefresh ? 'translate-x-6' : 'translate-x-1'
                                    }`} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-slate-700">ИИ Прогнозы</label>
                                <button
                                    onClick={() => setPreferences(prev => ({ ...prev, showPredictions: !prev.showPredictions }))}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        preferences.showPredictions ? 'bg-purple-600' : 'bg-slate-200'
                                    }`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                        preferences.showPredictions ? 'translate-x-6' : 'translate-x-1'
                                    }`} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-slate-700">Аналитика</label>
                                <button
                                    onClick={() => setPreferences(prev => ({ ...prev, showAnalytics: !prev.showAnalytics }))}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        preferences.showAnalytics ? 'bg-blue-600' : 'bg-slate-200'
                                    }`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                        preferences.showAnalytics ? 'translate-x-6' : 'translate-x-1'
                                    }`} />
                                </button>
                            </div>
                        </div>
                    </DashboardCard>
                </div>
            </div>

            {/* Telegram Modal */}
            {showTelegramModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex min-h-screen items-center justify-center p-4">
                        <div
                            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                            onClick={() => setShowTelegramModal(false)}
                        />
                        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transform transition-all">
                            <div className="flex items-center justify-between p-6 border-b">
                                <h2 className="text-xl font-semibold text-slate-800">
                                    Настройки Telegram
                                </h2>
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
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Debug Panel */}
            {process.env.NODE_ENV === 'development' && (
                <div className="mt-8 rounded-lg bg-slate-100 p-4">
                    <details>
                        <summary className="cursor-pointer font-medium text-slate-700">
                            🔧 Debug Information (Enhanced)
                        </summary>
                        <div className="mt-4 space-y-2 text-sm">
                            <div><strong>Timeframe:</strong> {selectedTimeframe}</div>
                            <div><strong>Predictions:</strong> {topPredictions.length} available</div>
                            <div><strong>Analytics:</strong> {analyticsData ? 'Available' : 'Not Available'}</div>
                            <div><strong>Metrics:</strong> {metricsData ? 'Available' : 'Not Available'}</div>
                            <div><strong>Efficiency Score:</strong> {Math.round(predictiveInsights.efficiencyScore * 100)}%</div>
                            <div><strong>Predicted Overflows:</strong> {predictiveInsights.predictedOverflows}</div>
                            <div><strong>Show Predictions:</strong> {preferences.showPredictions ? 'Yes' : 'No'}</div>
                            <div><strong>Show Analytics:</strong> {preferences.showAnalytics ? 'Yes' : 'No'}</div>
                        </div>
                    </details>
                </div>
            )}
        </div>
    );
};

// Enhanced helper functions
const getWasteTypeColor = (wasteType) => {
    const colors = {
        'Острые Медицинские Отходы': '#ef4444',
        'Инфекционные Отходы': '#f97316',
        'Патологические Отходы': '#f59e0b',
        'Фармацевтические Отходы': '#3b82f6',
        'Химические Отходы': '#8b5cf6',
        'Радиоактивные Отходы': '#10b981',
        'Общие Медицинские Отходы': '#6b7280',
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
    };
    return shortNames[wasteType] || wasteType;
};

export default Dashboard;