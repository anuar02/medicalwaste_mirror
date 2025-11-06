// pages/BinMap.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    Map as MapIcon,
    Filter,
    RefreshCw,
    AlertTriangle,
    MapPin,
    Info,
    X,
    BarChart3,
} from 'lucide-react';
import apiService from '../services/api';
import Button from '../components/ui/Button';
import DashboardCard from '../components/dashboard/DashboardCard';
import Map from '../components/map/Map';
import Loader from '../components/ui/Loader';
import BinStatusBadge from '../components/bins/BinStatusBadge';
import { formatDate, formatPercentage } from '../utils/formatters';

// ===== helpers =====
const getLatLng = (bin) => {
    if (!bin?.location?.coordinates || bin.location.coordinates.length < 2) return null;
    const [lng, lat] = bin.location.coordinates;
    if (typeof lat !== 'number' || typeof lng !== 'number') return null;
    return [lat, lng]; // Map expects [lat, lng]
};

const computeCentroid = (bins) => {
    let sumLat = 0, sumLng = 0, count = 0;
    for (const b of bins) {
        const ll = getLatLng(b);
        if (!ll) continue;
        sumLat += ll[0];
        sumLng += ll[1];
        count += 1;
    }
    return count ? [sumLat / count, sumLng / count] : null;
};

const allSameCoordinate = (bins) => {
    const coords = bins
        .map(getLatLng)
        .filter(Boolean)
        .map(([lat, lng]) => `${lat.toFixed(6)},${lng.toFixed(6)}`);
    if (coords.length === 0) return false;
    return coords.every((c) => c === coords[0]);
};

const BinMap = () => {
    const navigate = useNavigate();

    // Map & UI state
    const [mapCenter, setMapCenter] = useState([43.2364, 76.9457]); // default Almaty
    const [mapZoom, setMapZoom] = useState(12);
    const [selectedBin, setSelectedBin] = useState(null); // controls bottom sheet visibility/content
    const [showFilters, setShowFilters] = useState(false);

    // Sidebar: list/statistics + search/sort
    const [sidebarTab, setSidebarTab] = useState('list'); // 'list' | 'stats'
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('fullness_desc'); // 'fullness_desc' | 'fullness_asc' | 'updated_desc'

    // Filters for query
    const [filters, setFilters] = useState({
        department: '',
        wasteType: '',
        status: '',
        alert: false,
    });

    // Fetch bins
    const {
        data: binsData,
        isLoading,
        error,
        refetch,
        isFetching,
    } = useQuery({
        queryKey: ['mapBins', filters],
        queryFn: () => {
            const queryParams = {};
            if (filters.department) queryParams.department = filters.department;
            if (filters.wasteType) queryParams.wasteType = filters.wasteType;
            if (filters.status) queryParams.status = filters.status;
            if (filters.alert) queryParams.fullnessMin = 80;
            return apiService.wasteBins.getAll(queryParams);
        },
        refetchInterval: 60000,
        staleTime: 30000,
    });

    // Prepare data
    const bins = binsData?.data?.data?.bins || [];

    // Auto-center on bins change if none selected
    useEffect(() => {
        if (!bins.length || selectedBin) return;
        const centroid = computeCentroid(bins);
        if (!centroid) return;
        setMapCenter(centroid);
        setMapZoom(allSameCoordinate(bins) ? 15 : 12);
    }, [bins, selectedBin]);

    // Keep selected bin centered
    useEffect(() => {
        if (!selectedBin) return;
        const ll = getLatLng(selectedBin);
        if (ll) {
            setMapCenter(ll);
            setMapZoom(15);
        }
    }, [selectedBin]);

    // Handlers: filters
    const handleDepartmentChange = (e) => setFilters({ ...filters, department: e.target.value });
    const handleWasteTypeChange = (e) => setFilters({ ...filters, wasteType: e.target.value });
    const handleStatusChange = (e) => setFilters({ ...filters, status: e.target.value });
    const handleAlertToggle = () => setFilters({ ...filters, alert: !filters.alert });
    const resetFilters = () =>
        setFilters({ department: '', wasteType: '', status: '', alert: false });

    // Focus map on a bin (used by markers and list items)
    const focusBin = (bin, zoom = 16) => {
        if (!bin?.location?.coordinates) return;
        const [lng, lat] = bin.location.coordinates;
        setSelectedBin(bin);                  // opens bottom sheet
        setMapCenter([lat, lng]);             // pan to bin
        setMapZoom(zoom);                     // zoom in
    };

    // Map marker click
    const handleBinClick = (bin) => focusBin(bin, 15);

    // Convert bins to markers
    const binsToMarkers = (binsArr) => {
        if (!binsArr?.length) return [];
        return binsArr.map((bin) => {
            let color = '#0d9488';
            if (bin.fullness > 80) color = '#ef4444';
            else if (bin.fullness > 60) color = '#f59e0b';

            return {
                id: bin.binId,
                position: [bin.location.coordinates[1], bin.location.coordinates[0]],
                popup: `
          <div class="map-popup">
            <h3 class="font-bold text-slate-800">${bin.binId}</h3>
            <p class="text-slate-600">${bin.department}</p>
            <p>Заполненность: <span class="font-semibold" style="color: ${color};">${formatPercentage(
                    bin.fullness
                )}</span></p>
            <p>Последнее обновление: ${formatDate(bin.lastUpdate, false, true)}</p>
          </div>
        `,
                fullness: bin.fullness,
                onClick: () => handleBinClick(bin),
            };
        });
    };

    const markers = binsToMarkers(bins);

    // Derived "visible" bins for list tab (client-side search/sort)
    const visibleBins = useMemo(() => {
        let items = [...bins];
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            items = items.filter(
                (b) =>
                    (b.binId || '').toLowerCase().includes(q) ||
                    (b.department || '').toLowerCase().includes(q)
            );
        }
        switch (sortBy) {
            case 'fullness_asc':
                items.sort((a, b) => a.fullness - b.fullness);
                break;
            case 'updated_desc':
                items.sort((a, b) => new Date(b.lastUpdate) - new Date(a.lastUpdate));
                break;
            case 'fullness_desc':
            default:
                items.sort((a, b) => b.fullness - a.fullness);
                break;
        }
        return items;
    }, [bins, search, sortBy]);

    // Loading
    if (isLoading) return <Loader text="Загрузка данных..." />;

    // Error
    if (error) {
        return (
            <div className="container mx-auto p-6">
                <div className="rounded-lg bg-red-50 p-4 text-red-600">
                    <AlertTriangle className="mb-2 h-6 w-6" />
                    <h3 className="text-lg font-semibold">Ошибка загрузки данных</h3>
                    <p>{error.message || 'Не удалось загрузить карту контейнеров'}</p>
                    <Button className="mt-4" onClick={() => refetch()} variant="outline" color="red">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Попробовать снова
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4">
            <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Карта Контейнеров</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Интерактивная карта расположения всех контейнеров
                    </p>
                </div>
                <div className="mt-4 flex space-x-3 md:mt-0">
                    <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
                        <Filter className="mr-2 h-4 w-4" />
                        Фильтры {showFilters ? '↑' : '↓'}
                    </Button>
                    <Button variant="outline" onClick={() => refetch()} isLoading={isFetching}>
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
                        {/* Department */}
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">Отделение</label>
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

                        {/* Waste Type */}
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">Тип отходов</label>
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

                        {/* Status */}
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">Статус</label>
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

                        {/* Alert */}
                        <div className="flex items-end">
                            <button
                                className={`flex items-center rounded-lg border px-3 py-2 text-sm ${
                                    filters.alert
                                        ? 'border-amber-500 bg-amber-50 text-amber-700'
                                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                }`}
                                onClick={handleAlertToggle}
                            >
                                <AlertTriangle
                                    className={`mr-2 h-4 w-4 ${filters.alert ? 'text-amber-500' : ''}`}
                                />
                                Требуют внимания
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
                {/* Map */}
                <div className="lg:col-span-3 relative">
                    <DashboardCard title="Карта контейнеров" icon={<MapIcon className="h-5 w-5" />} padding={false}>
                        <div className="h-[calc(100vh-16rem)] min-h-[400px]">
                            <Map center={mapCenter} zoom={mapZoom} markers={markers} />
                        </div>
                    </DashboardCard>

                    {/* Bottom Sheet over the map */}
                    {selectedBin && (
                        <div
                            className="pointer-events-auto fixed bottom-6 left-1/2 z-40 w-[90%] max-w-xl -translate-x-1/2 rounded-2xl bg-white shadow-xl ring-1 ring-slate-200 transition-all duration-300"
                            role="dialog"
                            aria-modal="false"
                        >
                            <div className="p-4">
                                <div className="flex items-start justify-between">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="truncate text-lg font-semibold text-slate-800">
                                                {selectedBin.binId}
                                            </h3>
                                            <BinStatusBadge status={selectedBin.status} />
                                        </div>
                                        <p className="mt-0.5 truncate text-sm text-slate-600">
                                            {selectedBin.department}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setSelectedBin(null)}
                                        className="ml-3 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                        aria-label="Закрыть"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>

                                {/* Fullness */}
                                <div className="mt-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-slate-700">Заполненность</span>
                                        <span
                                            className={`text-sm font-semibold ${
                                                selectedBin.fullness > 80
                                                    ? 'text-red-600'
                                                    : selectedBin.fullness > 60
                                                        ? 'text-amber-600'
                                                        : 'text-teal-600'
                                            }`}
                                        >
                      {formatPercentage(selectedBin.fullness)}
                    </span>
                                    </div>
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className={`h-full transition-all duration-500 ${
                                                selectedBin.fullness > 80
                                                    ? 'bg-red-500'
                                                    : selectedBin.fullness > 60
                                                        ? 'bg-amber-500'
                                                        : 'bg-teal-500'
                                            }`}
                                            style={{ width: `${Math.min(100, Math.max(0, selectedBin.fullness))}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Meta */}
                                <div className="mt-3 grid grid-cols-2 gap-2">
                                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                                        <div className="text-[11px] text-slate-500">Последнее обновление</div>
                                        <div className="text-xs font-medium text-slate-800">
                                            {formatDate(selectedBin.lastUpdate, false, true)}
                                        </div>
                                    </div>
                                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                                        <div className="text-[11px] text-slate-500">Порог оповещения</div>
                                        <div className="text-xs font-medium text-slate-800">
                                            {selectedBin.alertThreshold}%
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-3 flex justify-end gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSelectedBin(null)}
                                    >
                                        Скрыть
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={() => navigate(`/bins/${selectedBin.binId}`)}
                                    >
                                        <Info className="mr-2 h-4 w-4" />
                                        Подробнее
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar (List | Stats) */}
                <div>
                    <DashboardCard
                        title={<div className="flex items-center gap-3"><span>Контейнеры</span></div>}
                        icon={<MapPin className="h-5 w-5" />}
                        action={
                            <div className="inline-flex rounded-lg border border-slate-200 p-1">
                                <button
                                    className={`px-3 py-1 text-sm rounded-md ${
                                        sidebarTab === 'list'
                                            ? 'bg-slate-100 text-slate-900'
                                            : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                                    onClick={() => setSidebarTab('list')}
                                >
                                    Список
                                </button>
                                <button
                                    className={`px-3 py-1 text-sm rounded-md ${
                                        sidebarTab === 'stats'
                                            ? 'bg-slate-100 text-slate-900'
                                            : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                                    onClick={() => setSidebarTab('stats')}
                                >
                                    Статистика
                                </button>
                            </div>
                        }
                    >
                        {sidebarTab === 'list' ? (
                            <>
                                {/* Controls */}
                                <div className="mb-3 grid grid-cols-1 gap-2">
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Поиск по ID или отделению..."
                                        className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:ring-teal-500"
                                    />
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value)}
                                        className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:ring-teal-500"
                                    >
                                        <option value="fullness_desc">Сначала более заполненные</option>
                                        <option value="fullness_asc">Сначала менее заполненные</option>
                                        <option value="updated_desc">Недавно обновлённые</option>
                                    </select>
                                </div>

                                {/* List (row click focuses map + opens bottom sheet) */}
                                <div className="max-h-[calc(100vh-22rem)] overflow-auto pr-1">
                                    {visibleBins.length === 0 ? (
                                        <p className="text-sm text-slate-500">Совпадений не найдено.</p>
                                    ) : (
                                        <ul className="space-y-2">
                                            {visibleBins.map((b) => {
                                                const [lng, lat] = b.location.coordinates || [];
                                                const chip =
                                                    b.fullness >= b.alertThreshold
                                                        ? 'bg-red-100 text-red-700'
                                                        : b.fullness > 60
                                                            ? 'bg-amber-100 text-amber-700'
                                                            : 'bg-emerald-100 text-emerald-700';
                                                const statusChip =
                                                    b.status === 'maintenance'
                                                        ? 'bg-amber-50 text-amber-700'
                                                        : b.status === 'offline'
                                                            ? 'bg-slate-100 text-slate-700'
                                                            : 'bg-emerald-50 text-emerald-700';

                                                const isActive = selectedBin && (selectedBin._id === b._id || selectedBin.binId === b.binId);

                                                return (
                                                    <li
                                                        key={b._id || b.binId}
                                                        role="button"
                                                        tabIndex={0}
                                                        onClick={() => focusBin(b, 16)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                e.preventDefault();
                                                                focusBin(b, 16);
                                                            }
                                                        }}
                                                        className={`flex items-center justify-between rounded-lg border p-3 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                                                            isActive
                                                                ? 'border-teal-400 bg-teal-50'
                                                                : 'border-slate-200 hover:bg-slate-50'
                                                        }`}
                                                    >
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                <span className="truncate font-semibold text-slate-800">
                                  {b.binId}
                                </span>
                                                                <span
                                                                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusChip}`}
                                                                >
                                  {b.status}
                                </span>
                                                            </div>
                                                            <div className="mt-0.5 truncate text-xs text-slate-600">
                                                                {b.department}
                                                            </div>
                                                            <div className="mt-1 flex items-center gap-2 text-xs">
                                <span className={`rounded-full px-2 py-0.5 font-medium ${chip}`}>
                                  {formatPercentage(b.fullness)}
                                </span>
                                                                <span className="text-slate-500">
                                  {Number.isFinite(lat) && Number.isFinite(lng)
                                      ? `${lat.toFixed(4)}, ${lng.toFixed(4)}`
                                      : '—'}
                                </span>
                                                            </div>
                                                        </div>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </div>
                            </>
                        ) : (
                            // —— Stats tab ——
                            <div className="space-y-4">
                                <div className="text-center">
                                    <MapPin className="mx-auto mb-2 h-8 w-8 text-slate-400" />
                                    <h3 className="text-lg font-semibold text-slate-800">
                                        Всего контейнеров: {bins.length}
                                    </h3>
                                    <p className="text-sm text-slate-500">
                                        Выберите контейнер на карте для просмотра подробной информации
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-lg bg-emerald-50 p-3 text-center">
                                        <p className="text-xs text-emerald-800">Активные</p>
                                        <p className="text-lg font-bold text-emerald-600">
                                            {bins.filter((bin) => bin.status === 'active').length}
                                        </p>
                                    </div>
                                    <div className="rounded-lg bg-amber-50 p-3 text-center">
                                        <p className="text-xs text-amber-800">Обслуживание</p>
                                        <p className="text-lg font-bold text-amber-600">
                                            {bins.filter((bin) => bin.status === 'maintenance').length}
                                        </p>
                                    </div>
                                    <div className="rounded-lg bg-slate-100 p-3 text-center">
                                        <p className="text-xs text-slate-800">Офлайн</p>
                                        <p className="text-lg font-bold text-slate-600">
                                            {bins.filter((bin) => bin.status === 'offline').length}
                                        </p>
                                    </div>
                                    <div className="rounded-lg bg-red-50 p-3 text-center">
                                        <p className="text-xs text-red-800">Требуют внимания</p>
                                        <p className="text-lg font-bold text-red-600">
                                            {bins.filter((bin) => bin.fullness >= bin.alertThreshold).length}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2 rounded-lg bg-slate-50 p-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-slate-700">Средняя заполненность</span>
                                        <span className="text-sm font-semibold text-slate-800">
                      {formatPercentage(
                          bins.reduce((sum, bin) => sum + bin.fullness, 0) / (bins.length || 1)
                      )}
                    </span>
                                    </div>
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                                        <div
                                            className="h-full bg-teal-500"
                                            style={{
                                                width: `${Math.min(
                                                    100,
                                                    Math.max(0, bins.reduce((s, b) => s + b.fullness, 0) / (bins.length || 1))
                                                )}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </DashboardCard>
                </div>
            </div>
        </div>
    );
};

export default BinMap;
