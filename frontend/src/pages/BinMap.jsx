// pages/BinMap.jsx
import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import {
    Map as MapIcon,
    Filter,
    RefreshCw,
    AlertTriangle,
    MapPin,
    Info,
    X,
    BarChart3
} from 'lucide-react';
import apiService from '../services/api';
import Button from '../components/ui/Button';
import DashboardCard from '../components/dashboard/DashboardCard';
import Map from '../components/map/Map';
import Loader from '../components/ui/Loader';
import BinStatusBadge from '../components/bins/BinStatusBadge';
import { formatDate, formatPercentage } from '../utils/formatters';

const BinMap = () => {
    const navigate = useNavigate();
    const [mapCenter, setMapCenter] = useState([43.2364, 76.9457]); // Almaty coordinates
    const [mapZoom, setMapZoom] = useState(12);
    const [selectedBin, setSelectedBin] = useState(null);
    const [showFilters, setShowFilters] = useState(false);

    // Filter state
    const [filters, setFilters] = useState({
        department: '',
        wasteType: '',
        status: '',
        alert: false,
    });

    // Fetch all bins
    const {
        data: binsData,
        isLoading,
        error,
        refetch,
        isFetching
    } = useQuery(
        ['mapBins', filters],
        () => {
            const queryParams = {};
            if (filters.department) queryParams.department = filters.department;
            if (filters.wasteType) queryParams.wasteType = filters.wasteType;
            if (filters.status) queryParams.status = filters.status;
            if (filters.alert) queryParams.fullnessMin = 80;

            return apiService.wasteBins.getAll(queryParams);
        },
        {
            refetchInterval: 60000, // 1 minute
            staleTime: 30000, // 30 seconds
        }
    );

    // Handle department filter change
    const handleDepartmentChange = (e) => {
        setFilters({
            ...filters,
            department: e.target.value
        });
    };

    // Handle waste type filter change
    const handleWasteTypeChange = (e) => {
        setFilters({
            ...filters,
            wasteType: e.target.value
        });
    };

    // Handle status filter change
    const handleStatusChange = (e) => {
        setFilters({
            ...filters,
            status: e.target.value
        });
    };

    // Handle alert filter toggle
    const handleAlertToggle = () => {
        setFilters({
            ...filters,
            alert: !filters.alert
        });
    };

    // Reset all filters
    const resetFilters = () => {
        setFilters({
            department: '',
            wasteType: '',
            status: '',
            alert: false
        });
    };

    // Handle bin marker click
    const handleBinClick = (bin) => {
        setSelectedBin(bin);
        setMapCenter([bin.location.coordinates[1], bin.location.coordinates[0]]);
        setMapZoom(15);
    };

    // Handle bin detail button click
    const handleBinDetailClick = (binId) => {
        navigate(`/bins/${binId}`);
    };

    // Close selected bin panel
    const closeSelectedBin = () => {
        setSelectedBin(null);
    };

    // Convert bins to markers
    const binsToMarkers = (bins) => {
        if (!bins || !bins.length) return [];

        return bins.map(bin => {
            // Use a color based on fullness level
            let color = '#0d9488'; // teal for normal levels
            if (bin.fullness > 80) {
                color = '#ef4444'; // red for high levels
            } else if (bin.fullness > 60) {
                color = '#f59e0b'; // amber for medium levels
            }

            return {
                id: bin.binId,
                position: [bin.location.coordinates[1], bin.location.coordinates[0]],
                popup: `
          <div class="map-popup">
            <h3 class="font-bold text-slate-800">${bin.binId}</h3>
            <p class="text-slate-600">${bin.department}</p>
            <p>Заполненность: <span class="font-semibold" style="color: ${color};">${formatPercentage(bin.fullness)}</span></p>
            <p>Последнее обновление: ${formatDate(bin.lastUpdate, false, true)}</p>
          </div>
        `,
                fullness: bin.fullness,
                onClick: () => handleBinClick(bin)
            };
        });
    };

    // Loading state
    if (isLoading) {
        return <Loader text="Загрузка данных..." />;
    }

    // Error state
    if (error) {
        return (
            <div className="container mx-auto p-6">
                <div className="rounded-lg bg-red-50 p-4 text-red-600">
                    <AlertTriangle className="mb-2 h-6 w-6" />
                    <h3 className="text-lg font-semibold">Ошибка загрузки данных</h3>
                    <p>{error.message || 'Не удалось загрузить карту контейнеров'}</p>
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

    const bins = binsData?.data?.data?.bins || [];
    const markers = binsToMarkers(bins);

    return (
        <div className="container mx-auto p-4">
            <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">
                        Карта Контейнеров
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Интерактивная карта расположения всех контейнеров
                    </p>
                </div>
                <div className="mt-4 flex space-x-3 md:mt-0">
                    <Button
                        variant="outline"
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <Filter className="mr-2 h-4 w-4" />
                        Фильтры {showFilters ? '↑' : '↓'}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => refetch()}
                        isLoading={isFetching}
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Обновить
                    </Button>
                </div>
            </div>

            {/* Filters */}
            {showFilters && (
                <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-slate-800">Фильтры</h3>
                        <button
                            onClick={resetFilters}
                            className="flex items-center text-sm text-slate-500 hover:text-slate-700"
                        >
                            <X className="mr-1 h-4 w-4" />
                            Сбросить все
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {/* Department filter */}
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                Отделение
                            </label>
                            <select
                                value={filters.department}
                                onChange={handleDepartmentChange}
                                className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:ring-teal-500"
                            >
                                <option value="">Все отделения</option>
                                <option value="Хирургическое Отделение">Хирургическое Отделение</option>
                                <option value="Терапевтическое Отделение">Терапевтическое Отделение</option>
                                <option value="Педиатрическое Отделение">Педиатрическое Отделение</option>
                                <option value="Акушерское Отделение">Акушерское Отделение</option>
                                <option value="Инфекционное Отделение">Инфекционное Отделение</option>
                                <option value="Лаборатория">Лаборатория</option>
                                <option value="Реанимация">Реанимация</option>
                            </select>
                        </div>

                        {/* Waste Type filter */}
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                Тип отходов
                            </label>
                            <select
                                value={filters.wasteType}
                                onChange={handleWasteTypeChange}
                                className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:ring-teal-500"
                            >
                                <option value="">Все типы</option>
                                <option value="Острые Медицинские Отходы">Острые Медицинские Отходы</option>
                                <option value="Инфекционные Отходы">Инфекционные Отходы</option>
                                <option value="Патологические Отходы">Патологические Отходы</option>
                                <option value="Фармацевтические Отходы">Фармацевтические Отходы</option>
                                <option value="Химические Отходы">Химические Отходы</option>
                                <option value="Радиоактивные Отходы">Радиоактивные Отходы</option>
                                <option value="Общие Медицинские Отходы">Общие Медицинские Отходы</option>
                            </select>
                        </div>

                        {/* Status filter */}
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                Статус
                            </label>
                            <select
                                value={filters.status}
                                onChange={handleStatusChange}
                                className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:ring-teal-500"
                            >
                                <option value="">Все статусы</option>
                                <option value="active">Активен</option>
                                <option value="maintenance">Обслуживание</option>
                                <option value="offline">Офлайн</option>
                                <option value="decommissioned">Выведен</option>
                            </select>
                        </div>

                        {/* Alert filter */}
                        <div className="flex items-end">
                            <button
                                className={`flex items-center rounded-lg border px-3 py-2 text-sm ${
                                    filters.alert
                                        ? 'border-amber-500 bg-amber-50 text-amber-700'
                                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                }`}
                                onClick={handleAlertToggle}
                            >
                                <AlertTriangle className={`mr-2 h-4 w-4 ${filters.alert ? 'text-amber-500' : ''}`} />
                                Требуют внимания
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
                {/* Map */}
                <div className="lg:col-span-3">
                    <DashboardCard
                        title="Карта контейнеров"
                        icon={<MapIcon className="h-5 w-5" />}
                        padding={false}
                    >
                        <div className="h-[calc(100vh-16rem)] min-h-[400px]">
                            <Map
                                center={mapCenter}
                                zoom={mapZoom}
                                markers={markers}
                            />
                        </div>
                    </DashboardCard>
                </div>

                {/* Sidebar with bin info or stats */}
                <div>
                    {selectedBin ? (
                        <DashboardCard
                            title="Информация о контейнере"
                            icon={<Info className="h-5 w-5" />}
                            action={
                                <button
                                    onClick={closeSelectedBin}
                                    className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-500"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            }
                        >
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-slate-800">{selectedBin.binId}</h3>
                                    <BinStatusBadge status={selectedBin.status} />
                                </div>

                                <p className="text-sm text-slate-600">{selectedBin.department}</p>

                                {/* Fullness */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-slate-700">Заполненность</span>
                                        <span className={`text-sm font-semibold ${
                                            selectedBin.fullness > 80 ? 'text-red-600' :
                                                selectedBin.fullness > 60 ? 'text-amber-600' :
                                                    'text-teal-600'
                                        }`}>
                      {formatPercentage(selectedBin.fullness)}
                    </span>
                                    </div>

                                    {/* Progress bar */}
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className={`h-full transition-all duration-500 ${
                                                selectedBin.fullness > 80 ? 'bg-red-500' :
                                                    selectedBin.fullness > 60 ? 'bg-amber-500' :
                                                        'bg-teal-500'
                                            }`}
                                            style={{ width: `${Math.min(100, Math.max(0, selectedBin.fullness))}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Waste Type */}
                                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                                    <span className="text-xs text-slate-600">Тип отходов</span>
                                    <span className="text-xs font-medium text-slate-800">{selectedBin.wasteType}</span>
                                </div>

                                {/* Last Update */}
                                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                                    <span className="text-xs text-slate-600">Последнее обновление</span>
                                    <span className="text-xs font-medium text-slate-800">
                    {formatDate(selectedBin.lastUpdate, false, true)}
                  </span>
                                </div>

                                {/* Weight */}
                                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                                    <span className="text-xs text-slate-600">Вес</span>
                                    <span className="text-xs font-medium text-slate-800">
                    {selectedBin.weight.toFixed(1)} кг
                  </span>
                                </div>

                                {/* Temperature */}
                                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                                    <span className="text-xs text-slate-600">Температура</span>
                                    <span className="text-xs font-medium text-slate-800">
                    {selectedBin.temperature.toFixed(1)}°C
                  </span>
                                </div>

                                {/* Alert Threshold */}
                                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                                    <span className="text-xs text-slate-600">Порог оповещения</span>
                                    <span className="text-xs font-medium text-slate-800">
                    {selectedBin.alertThreshold}%
                  </span>
                                </div>

                                {/* View Details Button */}
                                <Button
                                    onClick={() => handleBinDetailClick(selectedBin.binId)}
                                    fullWidth
                                >
                                    <Info className="mr-2 h-4 w-4" />
                                    Просмотреть детали
                                </Button>
                            </div>
                        </DashboardCard>
                    ) : (
                        <DashboardCard title="Статистика" icon={<BarChart3 className="h-5 w-5" />}>
                            <div className="space-y-4">
                                <div className="text-center">
                                    <MapPin className="mx-auto mb-2 h-8 w-8 text-slate-400" />
                                    <h3 className="text-lg font-semibold text-slate-800">Всего контейнеров: {bins.length}</h3>
                                    <p className="text-sm text-slate-500">Выберите контейнер на карте для просмотра подробной информации</p>
                                </div>

                                {/* Summary statistics */}
                                <div className="grid grid-cols-2 gap-3">
                                    {/* Active bins */}
                                    <div className="rounded-lg bg-emerald-50 p-3 text-center">
                                        <p className="text-xs text-emerald-800">Активные</p>
                                        <p className="text-lg font-bold text-emerald-600">
                                            {bins.filter(bin => bin.status === 'active').length}
                                        </p>
                                    </div>

                                    {/* Maintenance bins */}
                                    <div className="rounded-lg bg-amber-50 p-3 text-center">
                                        <p className="text-xs text-amber-800">Обслуживание</p>
                                        <p className="text-lg font-bold text-amber-600">
                                            {bins.filter(bin => bin.status === 'maintenance').length}
                                        </p>
                                    </div>

                                    {/* Offline bins */}
                                    <div className="rounded-lg bg-slate-100 p-3 text-center">
                                        <p className="text-xs text-slate-800">Офлайн</p>
                                        <p className="text-lg font-bold text-slate-600">
                                            {bins.filter(bin => bin.status === 'offline').length}
                                        </p>
                                    </div>

                                    {/* Alert bins */}
                                    <div className="rounded-lg bg-red-50 p-3 text-center">
                                        <p className="text-xs text-red-800">Требуют внимания</p>
                                        <p className="text-lg font-bold text-red-600">
                                            {bins.filter(bin => bin.fullness >= bin.alertThreshold).length}
                                        </p>
                                    </div>
                                </div>

                                {/* Average fullness */}
                                <div className="space-y-2 rounded-lg bg-slate-50 p-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-slate-700">Средняя заполненность</span>
                                        <span className="text-sm font-semibold text-slate-800">
                      {formatPercentage(
                          bins.reduce((sum, bin) => sum + bin.fullness, 0) / bins.length
                      )}
                    </span>
                                    </div>

                                    {/* Progress bar */}
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                                        <div
                                            className="h-full bg-teal-500"
                                            style={{
                                                width: `${Math.min(100,
                                                    Math.max(0,
                                                        bins.reduce((sum, bin) => sum + bin.fullness, 0) / bins.length
                                                    )
                                                )}%`
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </DashboardCard>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BinMap;