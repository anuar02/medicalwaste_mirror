import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    MapPin,
    Navigation,
    Calendar,
    Clock,
    Package,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    TrendingUp,
    Truck,
    CheckCircle,
    Timer,
    Route as RouteIcon,
    Filter,
    Download
} from 'lucide-react';
import apiService from '../services/api';
import Loader from '../components/ui/Loader';
import DashboardCard from '../components/dashboard/DashboardCard';
import Button from '../components/ui/Button';
import Map from '../components/map/Map';
import { formatDate } from '../utils/formatters';

const RouteHistory = () => {
    const [selectedRoute, setSelectedRoute] = useState(null);
    const [mapCenter, setMapCenter] = useState([51.1694, 71.4491]); // Astana coordinates
    const [zoom, setZoom] = useState(12);
    const [expandedRoutes, setExpandedRoutes] = useState(new Set());
    const [dateFilter, setDateFilter] = useState('all'); // all, today, week, month
    const [statusFilter, setStatusFilter] = useState('all'); // all, active, completed

    // Fetch all collection sessions/routes
    const {
        data: routesData,
        isLoading: routesLoading,
        refetch: refetchRoutes
    } = useQuery({
        queryKey: ['collectionRoutes', dateFilter, statusFilter],
        queryFn: async () => {
            const params = {};

            // Add date filtering
            if (dateFilter === 'today') {
                params.from = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
            } else if (dateFilter === 'week') {
                params.from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
            } else if (dateFilter === 'month') {
                params.from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
            }

            try {
                if (statusFilter === 'active') {
                    // Только активные сессии
                    const activeResponse = await apiService.collections.getActiveDrivers();
                    const activeSessions = activeResponse.data.data.activeDrivers?.map(ad => ad.session) || [];

                    return {
                        data: {
                            data: {
                                sessions: activeSessions
                            }
                        }
                    };
                } else if (statusFilter === 'completed') {
                    // Только завершенные сессии
                    return apiService.collections.getHistory('', params);
                } else {
                    // ВСЕ сессии (и активные, и завершенные)
                    const [activeResponse, historyResponse] = await Promise.all([
                        apiService.collections.getActiveDrivers().catch(err => {
                            console.warn('Error fetching active drivers:', err);
                            return { data: { data: { activeDrivers: [] } } };
                        }),
                        apiService.collections.getHistory('', params).catch(err => {
                            console.warn('Error fetching history:', err);
                            return { data: { data: { sessions: [] } } };
                        })
                    ]);

                    const activeSessions = activeResponse.data.data.activeDrivers?.map(ad => ad.session) || [];
                    const historySessions = historyResponse.data.data.sessions || [];

                    // Объединяем активные и исторические сессии
                    const allSessions = [...activeSessions, ...historySessions];

                    // Сортируем по времени начала (новые первыми)
                    allSessions.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

                    return {
                        data: {
                            data: {
                                sessions: allSessions
                            }
                        }
                    };
                }
            } catch (error) {
                console.error('Error fetching routes:', error);
                return {
                    data: {
                        data: {
                            sessions: []
                        }
                    }
                };
            }
        },
        refetchInterval: 30000, // 30 seconds
    });

    // Fetch detailed route info when a route is selected
    const {
        data: routeDetailData,
        isLoading: routeDetailLoading
    } = useQuery({
        queryKey: ['routeDetail', selectedRoute],
        queryFn: () => apiService.collections.getSessionRoute(selectedRoute),
        enabled: !!selectedRoute,
        refetchInterval: selectedRoute ? 15000 : false, // 15 seconds if active
    });

    // When a route is selected, center map on it
    useEffect(() => {
        if (routeDetailData) {
            const route = routeDetailData.data.data.session;

            if (route.startLocation?.coordinates) {
                const [longitude, latitude] = route.startLocation.coordinates;
                setMapCenter([latitude, longitude]);
                setZoom(14);
            } else if (route.route?.length > 0) {
                // Find first route point with valid coordinates
                const firstValidPoint = route.route.find(point =>
                    point?.location?.coordinates?.length === 2
                );
                if (firstValidPoint) {
                    const [longitude, latitude] = firstValidPoint.location.coordinates;
                    setMapCenter([latitude, longitude]);
                    setZoom(14);
                }
            } else if (route.selectedContainers?.length > 0) {
                // Find first container with valid coordinates
                const firstValidContainer = route.selectedContainers.find(containerData =>
                    containerData?.container?.location?.coordinates?.length === 2
                );
                if (firstValidContainer) {
                    const [longitude, latitude] = firstValidContainer.container.location.coordinates;
                    setMapCenter([latitude, longitude]);
                    setZoom(14);
                }
            }
        }
    }, [routeDetailData]);

    // Format time duration
    const formatDuration = (seconds) => {
        if (!seconds || seconds < 0) return '0m';

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    };

    // Format distance
    const formatDistance = (meters) => {
        if (!meters || meters < 0) return '0 km';

        const km = (meters / 1000).toFixed(2);
        return `${km} km`;
    };

    // Toggle route expansion
    const toggleRouteExpansion = (routeId) => {
        const newExpanded = new Set(expandedRoutes);
        if (newExpanded.has(routeId)) {
            newExpanded.delete(routeId);
        } else {
            newExpanded.add(routeId);
        }
        setExpandedRoutes(newExpanded);
    };

    // Get map markers from selected route
    const getMapMarkers = () => {
        if (!routeDetailData) return [];

        const route = routeDetailData.data.data.session;
        const markers = [];

        // Add start location marker
        if (route.startLocation?.coordinates?.length === 2) {
            const [longitude, latitude] = route.startLocation.coordinates;
            markers.push({
                id: 'start',
                position: [latitude, longitude],
                popup: `
                    <div style="padding: 8px;">
                        <div style="font-weight: bold; color: #059669;">🚀 Точка Старта</div>
                        <div style="font-size: 12px; margin-top: 4px;">${formatDate(route.startTime)}</div>
                    </div>
                `,
                type: 'start',
                isSelected: false
            });
        }

        // Add end location marker
        if (route.endLocation?.coordinates?.length === 2) {
            const [longitude, latitude] = route.endLocation.coordinates;
            markers.push({
                id: 'end',
                position: [latitude, longitude],
                popup: `
                    <div style="padding: 8px;">
                        <div style="font-weight: bold; color: #ef4444;">🏁 Точка Завершения</div>
                        <div style="font-size: 12px; margin-top: 4px;">${formatDate(route.endTime)}</div>
                    </div>
                `,
                type: 'end',
                isSelected: false
            });
        }

        // Add container markers
        if (route.selectedContainers) {
            route.selectedContainers.forEach((containerData) => {
                const container = containerData?.container;
                if (container?.location?.coordinates?.length === 2) {
                    const [longitude, latitude] = container.location.coordinates;

                    markers.push({
                        id: container._id,
                        position: [latitude, longitude],
                        popup: `
                            <div style="padding: 8px;">
                                <div style="font-weight: bold;">${container.binId}</div>
                                <div style="font-size: 12px; margin-top: 2px;">${container.department}</div>
                                <div style="font-size: 12px;">${container.wasteType}</div>
                                <div style="font-size: 12px; margin-top: 4px; font-weight: ${containerData.visited ? 'bold' : 'normal'}; color: ${containerData.visited ? '#059669' : '#64748b'};">
                                    ${containerData.visited ? '✓ Посещен' : '○ Не посещен'}
                                </div>
                                ${containerData.visitedAt ? `<div style="font-size: 11px; color: #64748b;">${formatDate(containerData.visitedAt)}</div>` : ''}
                            </div>
                        `,
                        type: containerData.visited ? 'visited' : 'unvisited',
                        binId: container.binId,
                        fullness: container.fullness || 0,
                        isSelected: false,
                        isCollecting: false
                    });
                }
            });
        }

        return markers;
    };

    // Get route path for map - FIXED with proper null checks
    const getHistoryPath = () => {
        if (!routeDetailData) return null;

        const route = routeDetailData.data.data.session;

        if (!route.route || route.route.length === 0) return null;

        // Filter out invalid points and map to coordinates
        const path = route.route
            .filter(point => point?.location?.coordinates?.length === 2)
            .map(point => {
                const [longitude, latitude] = point.location.coordinates;
                return [latitude, longitude];
            });

        return path.length > 1 ? path : null;
    };

    // Handle manual refresh
    const handleRefresh = () => {
        refetchRoutes();
    };

    // Loading state
    if (routesLoading && !routesData) {
        return <Loader />;
    }

    // Get routes from data
    const routes = routesData?.data?.data?.sessions || [];

    // Get selected route details
    const selectedRouteDetail = routeDetailData?.data?.data?.session;

    // Calculate statistics
    const totalRoutes = routes.length;
    const completedRoutes = routes.filter(r => r.status === 'completed').length;
    const activeRoutes = routes.filter(r => r.status === 'active').length;
    const totalDistance = routes.reduce((sum, r) => sum + (r.totalDistance || 0), 0);
    const totalContainersCollected = routes.reduce((sum, r) => sum + (r.containersCollected || 0), 0);

    return (
        <div className="container mx-auto p-4">
            {/* Header */}
            <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 md:text-3xl">
                        История Маршрутов
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Просмотр и анализ завершенных маршрутов сбора
                    </p>
                </div>
                <div className="mt-4 flex items-center space-x-3 md:mt-0">
                    <Button onClick={handleRefresh} variant="outline">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Обновить
                    </Button>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg bg-white p-4 shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500">Всего Маршрутов</p>
                            <p className="text-2xl font-bold text-slate-800">{totalRoutes}</p>
                        </div>
                        <RouteIcon className="h-10 w-10 text-teal-500" />
                    </div>
                </div>

                <div className="rounded-lg bg-white p-4 shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500">Завершено</p>
                            <p className="text-2xl font-bold text-green-600">{completedRoutes}</p>
                        </div>
                        <CheckCircle className="h-10 w-10 text-green-500" />
                    </div>
                </div>

                <div className="rounded-lg bg-white p-4 shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500">Общее Расстояние</p>
                            <p className="text-2xl font-bold text-blue-600">{formatDistance(totalDistance)}</p>
                        </div>
                        <TrendingUp className="h-10 w-10 text-blue-500" />
                    </div>
                </div>

                <div className="rounded-lg bg-white p-4 shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500">Собрано Контейнеров</p>
                            <p className="text-2xl font-bold text-purple-600">{totalContainersCollected}</p>
                        </div>
                        <Package className="h-10 w-10 text-purple-500" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
                {/* Left sidebar - Routes List */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Filters */}
                    <DashboardCard
                        title="Фильтры"
                        icon={<Filter className="h-5 w-5" />}
                    >
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Период
                                </label>
                                <select
                                    value={dateFilter}
                                    onChange={(e) => setDateFilter(e.target.value)}
                                    className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:ring-teal-500"
                                >
                                    <option value="all">Все время</option>
                                    <option value="today">Сегодня</option>
                                    <option value="week">Последняя неделя</option>
                                    <option value="month">Последний месяц</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Статус
                                </label>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:ring-teal-500"
                                >
                                    <option value="all">Все статусы</option>
                                    <option value="active">Активные</option>
                                    <option value="completed">Завершенные</option>
                                </select>
                            </div>
                        </div>
                    </DashboardCard>

                    {/* Routes List */}
                    <DashboardCard
                        title={`Маршруты (${routes.length})`}
                        icon={<RouteIcon className="h-5 w-5" />}
                    >
                        <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                            {routes.length === 0 ? (
                                <div className="py-8 text-center text-sm text-slate-500">
                                    <RouteIcon className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                                    <p>Маршруты не найдены</p>
                                </div>
                            ) : (
                                routes.map(route => {
                                    const isExpanded = expandedRoutes.has(route._id);
                                    const visitedCount = route.selectedContainers?.filter(c => c.visited).length || 0;
                                    const totalCount = route.selectedContainers?.length || 0;
                                    const progress = totalCount > 0 ? Math.round((visitedCount / totalCount) * 100) : 0;

                                    return (
                                        <div
                                            key={route._id}
                                            className={`p-3 transition-colors ${
                                                selectedRoute === route._id ? 'bg-teal-50' : 'hover:bg-slate-50'
                                            }`}
                                        >
                                            <div
                                                className="cursor-pointer"
                                                onClick={() => setSelectedRoute(route._id)}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center space-x-2">
                                                        <Truck className="h-4 w-4 text-teal-600" />
                                                        <span className="font-medium text-slate-800 text-sm">
                                                            {route.sessionId?.split('-').pop()?.substring(0, 8) || 'N/A'}
                                                        </span>
                                                    </div>
                                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                                        route.status === 'completed'
                                                            ? 'bg-green-100 text-green-700'
                                                            : route.status === 'active'
                                                                ? 'bg-blue-100 text-blue-700'
                                                                : 'bg-slate-100 text-slate-700'
                                                    }`}>
                                                        {route.status === 'completed' ? 'Завершен' :
                                                            route.status === 'active' ? 'Активен' : 'Неизвестен'}
                                                    </span>
                                                </div>

                                                <div className="space-y-1 text-xs text-slate-500">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center space-x-1">
                                                            <Clock className="h-3 w-3" />
                                                            <span>{formatDate(route.startTime, false, true)}</span>
                                                        </div>
                                                        <span className="font-medium">{formatDuration(route.totalDuration)}</span>
                                                    </div>

                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center space-x-1">
                                                            <Package className="h-3 w-3" />
                                                            <span>Контейнеры</span>
                                                        </div>
                                                        <span className="font-medium">{visitedCount}/{totalCount}</span>
                                                    </div>

                                                    {route.totalDistance > 0 && (
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center space-x-1">
                                                                <Navigation className="h-3 w-3" />
                                                                <span>Расстояние</span>
                                                            </div>
                                                            <span className="font-medium">{formatDistance(route.totalDistance)}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Progress Bar */}
                                                <div className="mt-2">
                                                    <div className="w-full bg-slate-200 rounded-full h-1.5">
                                                        <div
                                                            className="bg-teal-600 h-1.5 rounded-full transition-all"
                                                            style={{ width: `${progress}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Expandable Container List */}
                                            {totalCount > 0 && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleRouteExpansion(route._id);
                                                    }}
                                                    className="mt-2 flex items-center text-xs text-teal-600 hover:text-teal-700 w-full"
                                                >
                                                    {isExpanded ? (
                                                        <>
                                                            <ChevronUp className="h-3 w-3 mr-1" />
                                                            Скрыть контейнеры
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ChevronDown className="h-3 w-3 mr-1" />
                                                            Показать контейнеры ({totalCount})
                                                        </>
                                                    )}
                                                </button>
                                            )}

                                            {isExpanded && (
                                                <div className="mt-2 space-y-1 pl-2 border-l-2 border-slate-200">
                                                    {route.selectedContainers?.map((containerData) => (
                                                        <div
                                                            key={containerData.container._id}
                                                            className="text-xs py-1"
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-slate-700">
                                                                    {containerData.container.binId}
                                                                </span>
                                                                {containerData.visited ? (
                                                                    <CheckCircle className="h-3 w-3 text-green-600" />
                                                                ) : (
                                                                    <div className="h-3 w-3 rounded-full border border-slate-300"></div>
                                                                )}
                                                            </div>
                                                            <div className="text-slate-500">
                                                                {containerData.container.department}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </DashboardCard>
                </div>

                {/* Main content - Map and Details */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Map */}
                    <DashboardCard
                        title="Карта Маршрута"
                        icon={<MapPin className="h-5 w-5" />}
                        padding={false}
                    >
                        {selectedRoute ? (
                            <div className="h-[500px]">
                                <Map
                                    center={mapCenter}
                                    zoom={zoom}
                                    markers={getMapMarkers()}
                                    historyPath={getHistoryPath()}
                                />
                            </div>
                        ) : (
                            <div className="h-[500px] flex items-center justify-center bg-slate-50">
                                <div className="text-center text-slate-400">
                                    <MapPin className="h-16 w-16 mx-auto mb-3 opacity-50" />
                                    <p className="font-medium">Выберите маршрут для просмотра</p>
                                    <p className="text-sm mt-1">Кликните на маршрут в списке слева</p>
                                </div>
                            </div>
                        )}
                    </DashboardCard>

                    {/* Route Details */}
                    {selectedRouteDetail && (
                        <DashboardCard
                            title="Детали Маршрута"
                            icon={<Navigation className="h-5 w-5" />}
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* General Information */}
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-slate-800 flex items-center">
                                        <RouteIcon className="h-4 w-4 mr-2 text-teal-600" />
                                        Общая Информация
                                    </h3>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-500">ID Сессии:</span>
                                            <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">
                                                {selectedRouteDetail.sessionId?.split('-').pop()?.substring(0, 12)}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-500">Статус:</span>
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                selectedRouteDetail.status === 'completed'
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-blue-100 text-blue-700'
                                            }`}>
                                                {selectedRouteDetail.status === 'completed' ? 'Завершен' : 'Активен'}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-500">Время начала:</span>
                                            <span className="font-medium text-slate-800">
                                                {formatDate(selectedRouteDetail.startTime, true)}
                                            </span>
                                        </div>

                                        {selectedRouteDetail.endTime && (
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-slate-500">Время завершения:</span>
                                                <span className="font-medium text-slate-800">
                                                    {formatDate(selectedRouteDetail.endTime, true)}
                                                </span>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-500">Длительность:</span>
                                            <span className="font-medium text-slate-800">
                                                {formatDuration(selectedRouteDetail.totalDuration)}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-500">Расстояние:</span>
                                            <span className="font-medium text-slate-800">
                                                {formatDistance(selectedRouteDetail.totalDistance)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Collection Statistics */}
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-slate-800 flex items-center">
                                        <Package className="h-4 w-4 mr-2 text-teal-600" />
                                        Статистика Сбора
                                    </h3>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-500">Всего контейнеров:</span>
                                            <span className="font-medium text-slate-800">
                                                {selectedRouteDetail.selectedContainers?.length || 0}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-500">Посещено:</span>
                                            <span className="font-medium text-green-600">
                                                {selectedRouteDetail.selectedContainers?.filter(c => c.visited).length || 0}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-500">Собрано:</span>
                                            <span className="font-medium text-slate-800">
                                                {selectedRouteDetail.containersCollected || 0}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-500">Вес отходов:</span>
                                            <span className="font-medium text-slate-800">
                                                {selectedRouteDetail.totalWeightCollected || 0} кг
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-500">Точек маршрута:</span>
                                            <span className="font-medium text-slate-800">
                                                {selectedRouteDetail.route?.length || 0}
                                            </span>
                                        </div>

                                        {selectedRouteDetail.photos && selectedRouteDetail.photos.length > 0 && (
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-slate-500">Фотографий:</span>
                                                <span className="font-medium text-slate-800">
                                                    {selectedRouteDetail.photos.length}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Container Details Table */}
                            {selectedRouteDetail.selectedContainers && selectedRouteDetail.selectedContainers.length > 0 && (
                                <div className="mt-6">
                                    <h3 className="font-semibold text-slate-800 mb-3 flex items-center">
                                        <Package className="h-4 w-4 mr-2 text-teal-600" />
                                        Детали Контейнеров
                                    </h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-50 border-b border-slate-200">
                                            <tr>
                                                <th className="px-4 py-3 text-left font-medium text-slate-700">ID</th>
                                                <th className="px-4 py-3 text-left font-medium text-slate-700">Отделение</th>
                                                <th className="px-4 py-3 text-left font-medium text-slate-700">Тип отходов</th>
                                                <th className="px-4 py-3 text-center font-medium text-slate-700">Статус</th>
                                                <th className="px-4 py-3 text-left font-medium text-slate-700">Время посещения</th>
                                            </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                            {selectedRouteDetail.selectedContainers.map((containerData) => (
                                                <tr key={containerData.container._id} className="hover:bg-slate-50">
                                                    <td className="px-4 py-3 font-medium text-slate-800">
                                                        {containerData.container.binId}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600">
                                                        {containerData.container.department}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600">
                                                        {containerData.container.wasteType}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        {containerData.visited ? (
                                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                                    <CheckCircle className="h-3 w-3 mr-1" />
                                                                    Посещен
                                                                </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                                                    Не посещен
                                                                </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600">
                                                        {containerData.visitedAt
                                                            ? formatDate(containerData.visitedAt, true, true)
                                                            : '-'
                                                        }
                                                    </td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </DashboardCard>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RouteHistory;