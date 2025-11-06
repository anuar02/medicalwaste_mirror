// pages/DeviceHealth.jsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    Activity,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Wifi,
    WifiOff,
    Server,
    Thermometer,
    Gauge,
    Clock,
    RefreshCw,
    TrendingUp,
    TrendingDown,
    Minus,
    ChevronRight,
    Filter,
    Download
} from 'lucide-react';
import apiService from '../services/api';
import Button from '../components/ui/Button';
import DashboardCard from '../components/dashboard/DashboardCard';
import Loader from '../components/ui/Loader';
import { formatDate } from '../utils/formatters';

const DeviceHealth = () => {
    const navigate = useNavigate();
    const [showFilters, setShowFilters] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');

    // Fetch all devices health data
    const {
        data: healthData,
        isLoading: healthLoading,
        error: healthError,
        refetch,
        isFetching
    } = useQuery({
        queryKey: ['devicesHealth'],
        queryFn: () => apiService.wasteBins.getDevicesHealth(),
        refetchInterval: 60000, // 1 minute
        staleTime: 30000, // 30 seconds
    });

// Fetch health statistics
    const {
        data: statsData,
        isLoading: statsLoading
    } = useQuery({
        queryKey: ['healthStatistics'],
        queryFn: () => apiService.wasteBins.getHealthStatistics(),
        refetchInterval: 300000, // 5 minutes
        staleTime: 60000, // 1 minute
    });

// Fetch unhealthy devices
    const {
        data: unhealthyData,
        isLoading: unhealthyLoading
    } = useQuery({
        queryKey: ['unhealthyDevices'],
        queryFn: () => apiService.wasteBins.getUnhealthyDevices(),
        refetchInterval: 60000, // 1 minute
        staleTime: 30000, // 30 seconds
    });

    // Loading state
    if (healthLoading || statsLoading || unhealthyLoading) {
        return <Loader text="Загрузка данных о здоровье устройств..." />;
    }

    // Error state
    if (healthError || !healthData?.data) {
        return (
            <div className="p-4 text-center text-red-500">
                <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
                <p className="mt-2 text-lg font-medium">Ошибка при загрузке данных</p>
                <Button onClick={() => window.location.reload()} className="mt-4">
                    Перезагрузить страницу
                </Button>
            </div>
        );
    }

    const { stats, devices } = healthData.data.data;
    const healthStats = statsData?.data?.data?.stats || {};
    const unhealthyDevices = unhealthyData?.data?.data?.devices || [];

    // Filter devices
    const filteredDevices = devices.filter(device => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'healthy') return device.latestHealthCheck?.overallStatus === 'healthy';
        if (statusFilter === 'warning') return device.latestHealthCheck?.overallStatus === 'warning';
        if (statusFilter === 'unhealthy') return device.latestHealthCheck?.overallStatus === 'unhealthy';
        if (statusFilter === 'no-data') return !device.hasHealthData;
        return true;
    });

    // Get status badge
    const getStatusBadge = (status) => {
        switch (status) {
            case 'healthy':
                return (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Здоров
                    </span>
                );
            case 'warning':
                return (
                    <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                        <AlertTriangle className="mr-1 h-3 w-3" />
                        Предупреждение
                    </span>
                );
            case 'unhealthy':
                return (
                    <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                        <XCircle className="mr-1 h-3 w-3" />
                        Неисправен
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                        <Minus className="mr-1 h-3 w-3" />
                        Нет данных
                    </span>
                );
        }
    };

    return (
        <div className="container mx-auto p-4">
            {/* Header */}
            <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 md:text-3xl">
                        Мониторинг Здоровья Устройств
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Статус и диагностика всех устройств в системе
                    </p>
                </div>
                <div className="mt-4 flex items-center space-x-2 md:mt-0">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        disabled={isFetching}
                    >
                        <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                        Обновить
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <Filter className="mr-2 h-4 w-4" />
                        Фильтры
                    </Button>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-lg bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500">Всего Устройств</p>
                            <p className="mt-1 text-2xl font-bold text-slate-800">
                                {stats.totalDevices}
                            </p>
                        </div>
                        <div className="rounded-full bg-blue-100 p-3">
                            <Activity className="h-6 w-6 text-blue-600" />
                        </div>
                    </div>
                </div>

                <div className="rounded-lg bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500">Здоровых</p>
                            <p className="mt-1 text-2xl font-bold text-green-600">
                                {stats.healthyDevices}
                            </p>
                        </div>
                        <div className="rounded-full bg-green-100 p-3">
                            <CheckCircle className="h-6 w-6 text-green-600" />
                        </div>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                        {stats.totalDevices > 0 
                            ? Math.round((stats.healthyDevices / stats.totalDevices) * 100)
                            : 0}% от общего числа
                    </div>
                </div>

                <div className="rounded-lg bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500">Предупреждения</p>
                            <p className="mt-1 text-2xl font-bold text-yellow-600">
                                {stats.warningDevices}
                            </p>
                        </div>
                        <div className="rounded-full bg-yellow-100 p-3">
                            <AlertTriangle className="h-6 w-6 text-yellow-600" />
                        </div>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                        Требуют внимания
                    </div>
                </div>

                <div className="rounded-lg bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500">Неисправных</p>
                            <p className="mt-1 text-2xl font-bold text-red-600">
                                {stats.unhealthyDevices}
                            </p>
                        </div>
                        <div className="rounded-full bg-red-100 p-3">
                            <XCircle className="h-6 w-6 text-red-600" />
                        </div>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                        Требуют ремонта
                    </div>
                </div>

                <div className="rounded-lg bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500">Без Данных</p>
                            <p className="mt-1 text-2xl font-bold text-slate-600">
                                {stats.devicesWithoutData}
                            </p>
                        </div>
                        <div className="rounded-full bg-slate-100 p-3">
                            <Minus className="h-6 w-6 text-slate-600" />
                        </div>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                        Нет проверок здоровья
                    </div>
                </div>
            </div>

            {/* Filters */}
            {showFilters && (
                <div className="mb-6 rounded-lg bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setStatusFilter('all')}
                            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                                statusFilter === 'all'
                                    ? 'bg-teal-600 text-white'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                        >
                            Все ({devices.length})
                        </button>
                        <button
                            onClick={() => setStatusFilter('healthy')}
                            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                                statusFilter === 'healthy'
                                    ? 'bg-green-600 text-white'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                        >
                            Здоровые ({stats.healthyDevices})
                        </button>
                        <button
                            onClick={() => setStatusFilter('warning')}
                            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                                statusFilter === 'warning'
                                    ? 'bg-yellow-600 text-white'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                        >
                            Предупреждения ({stats.warningDevices})
                        </button>
                        <button
                            onClick={() => setStatusFilter('unhealthy')}
                            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                                statusFilter === 'unhealthy'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                        >
                            Неисправные ({stats.unhealthyDevices})
                        </button>
                        <button
                            onClick={() => setStatusFilter('no-data')}
                            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                                statusFilter === 'no-data'
                                    ? 'bg-slate-600 text-white'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                        >
                            Без данных ({stats.devicesWithoutData})
                        </button>
                    </div>
                </div>
            )}

            {/* System Health Overview */}
            {healthStats && Object.keys(healthStats).length > 0 && (
                <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <DashboardCard title="Статистика Сенсоров" icon={<Gauge />}>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-600">Отказы ультразвука</span>
                                <span className="text-lg font-semibold text-slate-800">
                                    {healthStats.ultrasonicFailures || 0}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-600">Отказы температуры</span>
                                <span className="text-lg font-semibold text-slate-800">
                                    {healthStats.temperatureFailures || 0}
                                </span>
                            </div>
                        </div>
                    </DashboardCard>

                    <DashboardCard title="Статистика Сети" icon={<Wifi />}>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-600">Отключения WiFi</span>
                                <span className="text-lg font-semibold text-slate-800">
                                    {healthStats.wifiDisconnections || 0}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-600">Сервер недоступен</span>
                                <span className="text-lg font-semibold text-slate-800">
                                    {healthStats.serverUnreachable || 0}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-600">Средний сигнал WiFi</span>
                                <span className="text-lg font-semibold text-slate-800">
                                    {Math.round(healthStats.avgWifiSignal || 0)} dBm
                                </span>
                            </div>
                        </div>
                    </DashboardCard>

                    <DashboardCard title="Системные Ресурсы" icon={<Activity />}>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-600">Средняя память</span>
                                <span className="text-lg font-semibold text-slate-800">
                                    {Math.round((healthStats.avgFreeHeap || 0) / 1024)} KB
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-600">Среднее время работы</span>
                                <span className="text-lg font-semibold text-slate-800">
                                    {Math.round((healthStats.avgUptime || 0) / 60)} мин
                                </span>
                            </div>
                        </div>
                    </DashboardCard>
                </div>
            )}

            {/* Devices List */}
            <DashboardCard 
                title="Устройства" 
                icon={<Activity />}
                subtitle={`Показано ${filteredDevices.length} из ${devices.length} устройств`}
            >
                <div className="space-y-2">
                    {filteredDevices.length > 0 ? (
                        filteredDevices.map((device) => (
                            <div
                                key={device.binId}
                                className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 p-4 transition-colors hover:bg-slate-50"
                                onClick={() => navigate(`/bins/${device.binId}`)}
                            >
                                <div className="flex-1">
                                    <div className="flex items-center space-x-3">
                                        <h3 className="font-semibold text-slate-800">
                                            {device.binId}
                                        </h3>
                                        {getStatusBadge(device.latestHealthCheck?.overallStatus)}
                                    </div>
                                    <p className="mt-1 text-sm text-slate-500">
                                        {device.department}
                                    </p>
                                    
                                    {device.hasHealthData && device.latestHealthCheck && (
                                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
                                            <div className="flex items-center">
                                                {device.latestHealthCheck.systemStatus.wifiConnected ? (
                                                    <Wifi className="mr-1 h-3 w-3 text-green-600" />
                                                ) : (
                                                    <WifiOff className="mr-1 h-3 w-3 text-red-600" />
                                                )}
                                                {device.latestHealthCheck.systemStatus.wifiSignalStrength} dBm
                                            </div>
                                            <div className="flex items-center">
                                                {device.latestHealthCheck.systemStatus.serverReachable ? (
                                                    <Server className="mr-1 h-3 w-3 text-green-600" />
                                                ) : (
                                                    <Server className="mr-1 h-3 w-3 text-red-600" />
                                                )}
                                                Сервер
                                            </div>
                                            <div className="flex items-center">
                                                <Thermometer className="mr-1 h-3 w-3" />
                                                {device.latestHealthCheck.currentReadings.temperature}°C
                                            </div>
                                            <div className="flex items-center">
                                                <Clock className="mr-1 h-3 w-3" />
                                                {formatDate(device.latestHealthCheck.timestamp, true)}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {device.latestHealthCheck?.errors && (
                                        <div className="mt-2 text-xs text-red-600">
                                            Ошибки: {device.latestHealthCheck.errors}
                                        </div>
                                    )}
                                </div>
                                
                                <ChevronRight className="h-5 w-5 text-slate-400" />
                            </div>
                        ))
                    ) : (
                        <div className="py-12 text-center text-slate-500">
                            <Activity className="mx-auto h-12 w-12 text-slate-300" />
                            <p className="mt-4">Нет устройств с выбранным фильтром</p>
                        </div>
                    )}
                </div>
            </DashboardCard>
        </div>
    );
};

export default DeviceHealth;
