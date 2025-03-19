// pages/Dashboard.jsx
import React from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import {
    BarChart3,
    AlertTriangle,
    CheckCircle,
    ArrowUpRight,
    Weight,
    MapPin,
    Trash2,
    AreaChart
} from 'lucide-react';
import apiService from '../services/api';
import { formatDate, formatPercentage } from '../utils/formatters';
import Loader from '../components/ui/Loader';
import DashboardCard from '../components/dashboard/DashboardCard';
import DashboardStat from '../components/dashboard/DashboardStat';
import BinStatusCard from '../components/dashboard/BinStatusCard';
import WasteTypePieChart from '../components/charts/WasteTypePieChart';
import DepartmentBarChart from '../components/charts/DepartmentBarChart';

const Dashboard = () => {
    // Fetch statistics data
    const { data: statsData, isLoading: statsLoading } = useQuery(
        'wasteStatistics',
        () => apiService.wasteBins.getStatistics(),
        {
            refetchInterval: 300000, // 5 minutes
            staleTime: 60000, // 1 minute
        }
    );

    // Fetch bins that need attention (over alert threshold)
    const { data: alertBinsData, isLoading: alertBinsLoading } = useQuery(
        'alertBins',
        () => apiService.wasteBins.getOverfilled(),
        {
            refetchInterval: 60000, // 1 minute
            staleTime: 30000, // 30 seconds
        }
    );

    // Fetch all bins for status overview
    const { data: allBinsData, isLoading: allBinsLoading } = useQuery(
        'allBins',
        () => apiService.wasteBins.getAll(),
        {
            refetchInterval: 300000, // 5 minutes
            staleTime: 60000, // 1 minute
        }
    );

    // Loading state
    if (statsLoading || alertBinsLoading || allBinsLoading) {
        return <Loader />;
    }

    // Check if all data is available
    if (!statsData?.data || !alertBinsData?.data || !allBinsData?.data) {
        return (
            <div className="p-4 text-center text-red-500">
                <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
                <p className="mt-2 text-lg font-medium">Ошибка при загрузке данных</p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-4 rounded-md bg-teal-600 px-4 py-2 text-white hover:bg-teal-700"
                >
                    Перезагрузить страницу
                </button>
            </div>
        );
    }

    // Extract data
    const stats = statsData.data.data.overview;
    const alertCount = statsData.data.data.alertCount;
    const departmentStats = statsData.data.data.departmentStats;
    const wasteTypeStats = statsData.data.data.wasteTypeStats;

    const alertBins = alertBinsData.data.data.bins;
    const bins = allBinsData.data.data.bins;

    // Calculate additional metrics
    const binsByStatus = {
        active: bins.filter(bin => bin.status === 'active').length,
        maintenance: bins.filter(bin => bin.status === 'maintenance').length,
        offline: bins.filter(bin => bin.status === 'offline').length,
        decommissioned: bins.filter(bin => bin.status === 'decommissioned').length,
    };

    // Bins that need attention
    const topAlertBins = alertBins.slice(0, 3);

    return (
        <div className="container mx-auto p-4">
            <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 md:text-3xl">
                        Панель Мониторинга
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Общая статистика системы управления медицинскими отходами
                    </p>
                </div>
                <div className="mt-4 flex items-center md:mt-0">
                    <p className="text-sm text-slate-500">
                        Последнее обновление: {formatDate(new Date(), true)}
                    </p>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <DashboardStat
                    title="Всего Контейнеров"
                    value={stats.totalBins || 0}
                    icon={<Trash2 className="h-5 w-5 text-teal-600" />}
                    trend={0}
                    helpText="Общее количество контейнеров в системе"
                />
                <DashboardStat
                    title="Средняя Заполненность"
                    value={formatPercentage(stats.avgFullness || 0)}
                    icon={<AreaChart className="h-5 w-5 text-teal-600" />}
                    trend={2.4}
                    helpText="Средняя заполненность всех активных контейнеров"
                />
                <DashboardStat
                    title="Требуют Внимания"
                    value={alertCount || 0}
                    icon={<AlertTriangle className="h-5 w-5 text-amber-500" />}
                    trend={alertCount > 5 ? 8.2 : -3.1}
                    trendDirection={alertCount > 5 ? "up" : "down"}
                    helpText="Контейнеры, превысившие порог оповещения"
                />
                <DashboardStat
                    title="Общий Вес Отходов"
                    value={`${stats.totalWeight?.toFixed(1) || 0} кг`}
                    icon={<Weight className="h-5 w-5 text-teal-600" />}
                    trend={12.5}
                    helpText="Общий вес отходов во всех контейнерах"
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Waste Level Chart */}
                    <DashboardCard title="Заполненность по Отделениям" icon={<BarChart3 />}>
                        <div className="h-80">
                            <DepartmentBarChart
                                data={departmentStats.map(stat => ({
                                    department: stat._id,
                                    binCount: stat.binCount,
                                    avgFullness: stat.avgFullness,
                                    totalWeight: stat.totalWeight
                                }))}
                            />
                        </div>
                    </DashboardCard>

                    {/* Bins Status Overview */}
                    <DashboardCard title="Общая Статистика по Типам Отходов" icon={<Trash2 />}>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="flex justify-center items-center h-60">
                                <WasteTypePieChart
                                    data={wasteTypeStats.map(stat => ({
                                        name: stat._id,
                                        value: stat.binCount,
                                        fillColor: getWasteTypeColor(stat._id)
                                    }))}
                                />
                            </div>
                            <div className="flex flex-col justify-center space-y-3">
                                {wasteTypeStats.map(stat => (
                                    <div key={stat._id} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                                        <div className="flex items-center space-x-3">
                                            <div
                                                className="h-3 w-3 rounded-full"
                                                style={{ backgroundColor: getWasteTypeColor(stat._id) }}
                                            />
                                            <span className="text-sm font-medium text-slate-700">
                        {getShortWasteTypeName(stat._id)}
                      </span>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-semibold text-slate-800">
                                                {stat.binCount} контейнеров
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                ~{formatPercentage(stat.avgFullness)} заполнено
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </DashboardCard>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    {/* Bins Needing Attention */}
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
                                <div className="space-y-4">
                                    {topAlertBins.map((bin) => (
                                        <BinStatusCard
                                            key={bin.binId}
                                            bin={bin}
                                            showAction={true}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-6 text-center">
                                    <CheckCircle className="mb-2 h-8 w-8 text-emerald-500" />
                                    <h3 className="text-sm font-semibold text-slate-800">Все контейнеры в норме</h3>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Нет контейнеров, требующих внимания
                                    </p>
                                </div>
                            )}
                            </DashboardCard>

                        {/* Bin Status Overview */}
                        <DashboardCard title="Статус Контейнеров" icon={<Trash2 />}>
                            <div className="space-y-4">
                                {/* Active Bins */}
                                <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-3">
                                    <div className="flex items-center space-x-3">
                                        <div className="h-3 w-3 rounded-full bg-emerald-500" />
                                        <span className="text-sm font-medium text-slate-700">Активные</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-semibold text-slate-800">
                                            {binsByStatus.active} шт.
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {Math.round((binsByStatus.active / bins.length) * 100)}% от общего числа
                                        </div>
                                    </div>
                                </div>

                                {/* Maintenance Bins */}
                                <div className="flex items-center justify-between rounded-lg bg-amber-50 px-4 py-3">
                                    <div className="flex items-center space-x-3">
                                        <div className="h-3 w-3 rounded-full bg-amber-500" />
                                        <span className="text-sm font-medium text-slate-700">На обслуживании</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-semibold text-slate-800">
                                            {binsByStatus.maintenance} шт.
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {Math.round((binsByStatus.maintenance / bins.length) * 100)}% от общего числа
                                        </div>
                                    </div>
                                </div>

                                {/* Offline Bins */}
                                <div className="flex items-center justify-between rounded-lg bg-slate-100 px-4 py-3">
                                    <div className="flex items-center space-x-3">
                                        <div className="h-3 w-3 rounded-full bg-slate-500" />
                                        <span className="text-sm font-medium text-slate-700">Офлайн</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-semibold text-slate-800">
                                            {binsByStatus.offline} шт.
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {Math.round((binsByStatus.offline / bins.length) * 100)}% от общего числа
                                        </div>
                                    </div>
                                </div>

                                {/* Decommissioned Bins */}
                                <div className="flex items-center justify-between rounded-lg bg-red-50 px-4 py-3">
                                    <div className="flex items-center space-x-3">
                                        <div className="h-3 w-3 rounded-full bg-red-500" />
                                        <span className="text-sm font-medium text-slate-700">Выведены</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-semibold text-slate-800">
                                            {binsByStatus.decommissioned} шт.
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {Math.round((binsByStatus.decommissioned / bins.length) * 100)}% от общего числа
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </DashboardCard>

                        {/* Quick Actions */}
                        <DashboardCard title="Быстрые Действия" icon={<ArrowUpRight />}>
                            <div className="grid grid-cols-2 gap-3">
                                <Link
                                    to="/bins"
                                    className="flex flex-col items-center rounded-lg border border-slate-200 p-3 transition-colors hover:border-teal-500 hover:bg-teal-50"
                                >
                                    <Trash2 className="mb-2 h-6 w-6 text-teal-600" />
                                    <span className="text-center text-xs font-medium text-slate-700">Все Контейнеры</span>
                                </Link>
                                <Link
                                    to="/map"
                                    className="flex flex-col items-center rounded-lg border border-slate-200 p-3 transition-colors hover:border-teal-500 hover:bg-teal-50"
                                >
                                    <MapPin className="mb-2 h-6 w-6 text-teal-600" />
                                    <span className="text-center text-xs font-medium text-slate-700">Карта</span>
                                </Link>
                                <Link
                                    to="/reports"
                                    className="flex flex-col items-center rounded-lg border border-slate-200 p-3 transition-colors hover:border-teal-500 hover:bg-teal-50"
                                >
                                    <BarChart3 className="mb-2 h-6 w-6 text-teal-600" />
                                    <span className="text-center text-xs font-medium text-slate-700">Отчеты</span>
                                </Link>
                                <Link
                                    to="/settings"
                                    className="flex flex-col items-center rounded-lg border border-slate-200 p-3 transition-colors hover:border-teal-500 hover:bg-teal-50"
                                >
                                    <svg className="mb-2 h-6 w-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span className="text-center text-xs font-medium text-slate-700">Настройки</span>
                                </Link>
                            </div>
                        </DashboardCard>
                </div>
            </div>
        </div>
    );
};

// Helper function to get color for waste type
const getWasteTypeColor = (wasteType) => {
    const colors = {
        'Острые Медицинские Отходы': '#ef4444', // Red
        'Инфекционные Отходы': '#f97316', // Orange
        'Патологические Отходы': '#f59e0b', // Amber
        'Фармацевтические Отходы': '#3b82f6', // Blue
        'Химические Отходы': '#8b5cf6', // Purple
        'Радиоактивные Отходы': '#10b981', // Emerald
        'Общие Медицинские Отходы': '#6b7280', // Gray
    };

    return colors[wasteType] || '#6b7280';
};

// Helper function to shorten waste type names for display
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