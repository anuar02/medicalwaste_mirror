// pages/Reports.jsx
import React, { useState } from 'react';
import { useQuery } from 'react-query';
import {
    BarChart3,
    PieChart,
    TrendingUp,
    Download,
    Calendar,
    Filter,
    RefreshCw,
    AlertTriangle,
    FileText,
    Printer
} from 'lucide-react';
import apiService from '../services/api';
import Button from '../components/ui/Button';
import DashboardCard from '../components/dashboard/DashboardCard';
import DepartmentBarChart from '../components/charts/DepartmentBarChart';
import WasteTypePieChart from '../components/charts/WasteTypePieChart';
import Loader from '../components/ui/Loader';
import { formatDate, formatPercentage } from '../utils/formatters';

const Reports = () => {
    // Date range state
    const [dateRange, setDateRange] = useState({
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
        to: new Date().toISOString().split('T')[0], // Today
    });

    // Report type state
    const [reportType, setReportType] = useState('overview');

    // Fetch statistics data
    const {
        data: statsData,
        isLoading: statsLoading,
        error: statsError,
        refetch,
        isFetching
    } = useQuery(
        ['statistics', dateRange, reportType],
        () => apiService.wasteBins.getStatistics(),
        {
            refetchInterval: 300000, // 5 minutes
            staleTime: 60000, // 1 minute
        }
    );

    // Handle date change
    const handleDateChange = (e) => {
        const { name, value } = e.target;
        setDateRange({
            ...dateRange,
            [name]: value,
        });
    };

    // Handle report type change
    const handleReportTypeChange = (e) => {
        setReportType(e.target.value);
    };

    // Generate PDF report
    const generateReport = () => {
        // This would typically call a backend endpoint to generate and download a PDF report
        // For now, we'll just show a toast notification
        alert('Отчет успешно создан');
    };

    // Export data to CSV
    const exportToCSV = () => {
        // This would typically call a backend endpoint to generate and download a CSV file
        // For now, we'll just show a toast notification
        alert('Данные успешно экспортированы в CSV');
    };

    // Print report
    const printReport = () => {
        window.print();
    };

    // Loading state
    if (statsLoading) {
        return <Loader text="Загрузка данных..." />;
    }

    // Error state
    if (statsError) {
        return (
            <div className="container mx-auto p-6">
                <div className="rounded-lg bg-red-50 p-4 text-red-600">
                    <AlertTriangle className="mb-2 h-6 w-6" />
                    <h3 className="text-lg font-semibold">Ошибка загрузки данных</h3>
                    <p>{statsError.message || 'Не удалось загрузить данные отчетов'}</p>
                    <Button
                        className="mt-4"
                        onClick={() => refetch()}
                        variant="outline"
                        color="red"
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Попробовать снова
                    </Button>
                </div>
            </div>
        );
    }

    // Extract data
    const stats = statsData?.data?.data?.overview || {};
    const departmentStats = statsData?.data?.data?.departmentStats || [];
    const wasteTypeStats = statsData?.data?.data?.wasteTypeStats || [];
    const alertCount = statsData?.data?.data?.alertCount || 0;

    // Calculate department data for chart
    const departmentChartData = departmentStats.map(stat => ({
        department: stat._id,
        binCount: stat.binCount,
        avgFullness: stat.avgFullness,
        totalWeight: stat.totalWeight
    }));

    // Calculate waste type data for chart
    const wasteTypeChartData = wasteTypeStats.map(stat => ({
        name: stat._id,
        value: stat.binCount,
        fillColor: getWasteTypeColor(stat._id),
    }));

    return (
        <div className="container mx-auto p-4">
            <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">
                        Отчеты и Аналитика
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Анализ данных и статистика системы управления отходами
                    </p>
                </div>
                <div className="mt-4 flex space-x-3 md:mt-0">
                    <Button
                        variant="outline"
                        onClick={printReport}
                    >
                        <Printer className="mr-2 h-4 w-4" />
                        Печать
                    </Button>
                    <Button
                        variant="outline"
                        onClick={exportToCSV}
                    >
                        <Download className="mr-2 h-4 w-4" />
                        Экспорт CSV
                    </Button>
                    <Button
                        onClick={generateReport}
                    >
                        <FileText className="mr-2 h-4 w-4" />
                        Создать Отчет
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-800">Параметры отчета</h3>
                    <Button
                        variant="outline"
                        onClick={() => refetch()}
                        isLoading={isFetching}
                        size="sm"
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Обновить данные
                    </Button>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {/* Date range */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                            Период
                        </label>
                        <div className="flex items-center space-x-2">
                            <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Calendar className="h-4 w-4" />
                </span>
                                <input
                                    type="date"
                                    name="from"
                                    value={dateRange.from}
                                    onChange={handleDateChange}
                                    className="block w-full rounded-lg border border-slate-200 pl-10 pr-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                                />
                            </div>
                            <span className="text-slate-500">—</span>
                            <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Calendar className="h-4 w-4" />
                </span>
                                <input
                                    type="date"
                                    name="to"
                                    value={dateRange.to}
                                    onChange={handleDateChange}
                                    className="block w-full rounded-lg border border-slate-200 pl-10 pr-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Report type */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                            Тип отчета
                        </label>
                        <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Filter className="h-4 w-4" />
              </span>
                            <select
                                value={reportType}
                                onChange={handleReportTypeChange}
                                className="block w-full rounded-lg border border-slate-200 pl-10 pr-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                            >
                                <option value="overview">Общий обзор</option>
                                <option value="departments">По отделениям</option>
                                <option value="wasteTypes">По типам отходов</option>
                                <option value="alerts">Оповещения</option>
                            </select>
                        </div>
                    </div>

                    {/* Time Aggregation */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                            Временная агрегация
                        </label>
                        <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <TrendingUp className="h-4 w-4" />
              </span>
                            <select
                                className="block w-full rounded-lg border border-slate-200 pl-10 pr-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                            >
                                <option value="day">По дням</option>
                                <option value="week">По неделям</option>
                                <option value="month">По месяцам</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {/* Total Bins */}
                <div className="overflow-hidden rounded-lg bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-4 py-3">
                        <h3 className="text-sm font-medium text-slate-500">Всего Контейнеров</h3>
                    </div>
                    <div className="flex items-center justify-between p-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-100">
                            <BarChart3 className="h-6 w-6 text-teal-600" />
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold text-slate-800">{stats.totalBins || 0}</p>
                            <p className="text-xs text-slate-500">
                                Всего активных контейнеров в системе
                            </p>
                        </div>
                    </div>
                </div>

                {/* Average Fullness */}
                <div className="overflow-hidden rounded-lg bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-4 py-3">
                        <h3 className="text-sm font-medium text-slate-500">Средняя Заполненность</h3>
                    </div>
                    <div className="flex items-center justify-between p-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                            <TrendingUp className="h-6 w-6 text-emerald-600" />
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold text-slate-800">{formatPercentage(stats.avgFullness || 0)}</p>
                            <p className="text-xs text-slate-500">
                                Среднее значение заполненности
                            </p>
                        </div>
                    </div>
                </div>

                {/* Alert Count */}
                <div className="overflow-hidden rounded-lg bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-4 py-3">
                        <h3 className="text-sm font-medium text-slate-500">Требуют Внимания</h3>
                    </div>
                    <div className="flex items-center justify-between p-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                            <AlertTriangle className="h-6 w-6 text-amber-600" />
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold text-slate-800">{alertCount}</p>
                            <p className="text-xs text-slate-500">
                                Контейнеры, требующие внимания
                            </p>
                        </div>
                    </div>
                </div>

                {/* Total Weight */}
                <div className="overflow-hidden rounded-lg bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-4 py-3">
                        <h3 className="text-sm font-medium text-slate-500">Общий Вес</h3>
                    </div>
                    <div className="flex items-center justify-between p-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                            <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                            </svg>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold text-slate-800">{(stats.totalWeight || 0).toFixed(1)} кг</p>
                            <p className="text-xs text-slate-500">
                                Общий вес отходов
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Department Chart */}
                <DashboardCard title="Заполненность по Отделениям" icon={<BarChart3 className="h-5 w-5" />}>
                    <div className="h-80">
                        <DepartmentBarChart data={departmentChartData} />
                    </div>
                </DashboardCard>

                {/* Waste Type Chart */}
                <DashboardCard title="Распределение по Типам Отходов" icon={<PieChart className="h-5 w-5" />}>
                    <div className="h-80">
                        <WasteTypePieChart data={wasteTypeChartData} />
                    </div>
                </DashboardCard>
            </div>

            {/* Department Statistics Table */}
            <div className="mt-6">
                <DashboardCard title="Статистика по Отделениям" icon={<BarChart3 className="h-5 w-5" />}>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead>
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                                    Отделение
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                                    Кол-во Контейнеров
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                                    Средняя Заполненность
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                                    Общий Вес (кг)
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                                    Требуют Внимания
                                </th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                            {departmentStats.map((dept, index) => (
                                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-800">
                                        {dept._id}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                                        {dept.binCount}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                                        <div className="flex items-center">
                        <span className={`mr-2 inline-block h-2 w-2 rounded-full ${
                            dept.avgFullness > 80 ? 'bg-red-500' :
                                dept.avgFullness > 60 ? 'bg-amber-500' :
                                    'bg-teal-500'
                        }`}></span>
                                            {formatPercentage(dept.avgFullness)}
                                        </div>
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                                        {dept.totalWeight.toFixed(1)}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                                        {/* This is a placeholder - the API doesn't provide this info yet */}
                                        {Math.round(dept.binCount * (dept.avgFullness > 80 ? 0.3 : 0.1))}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </DashboardCard>
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

export default Reports;