// pages/DriverTracking.jsx
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
    MapPin,
    Navigation,
    Battery,
    Calendar,
    Clock,
    Truck,
    RefreshCw,
    Activity,
    CheckCircle,
    FileText,
    ToggleLeft,
    ToggleRight,
    UserCheck,
    AlertTriangle
} from 'lucide-react';
import apiService from '../services/api';
import Loader from '../components/ui/Loader';
import DashboardCard from '../components/dashboard/DashboardCard';
import Button from '../components/ui/Button';
import Map from '../components/map/Map';
import { formatDate, formatNumber } from '../utils/formatters';

const DriverTracking = () => {
    const queryClient = useQueryClient();
    const [selectedDriver, setSelectedDriver] = useState(null);
    const [mapCenter, setMapCenter] = useState([43.2364, 76.9457]); // Default center
    const [zoom, setZoom] = useState(12);
    const [showHistory, setShowHistory] = useState(false);
    const [historyHours, setHistoryHours] = useState(24);
    const [showCollectionPoints, setShowCollectionPoints] = useState(true);
    const [dateRange, setDateRange] = useState({
        from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days ago
        to: new Date().toISOString().split('T')[0] // today
    });

    // Fetch all drivers with their locations
    const {
        data: driversData,
        isLoading: driversLoading,
        refetch: refetchDrivers
    } = useQuery(
        'trackingDrivers',
        () => apiService.tracking.getAllDevices(),
        {
            refetchInterval: 30000, // 30 seconds
            staleTime: 10000, // 10 seconds
        }
    );

    // Fetch history data when a driver is selected and history is enabled
    const {
        data: historyData,
        isLoading: historyLoading
    } = useQuery(
        ['driverHistory', selectedDriver, historyHours],
        () => apiService.tracking.getDeviceHistory(selectedDriver, {
            limit: 500,
            from: new Date(Date.now() - historyHours * 60 * 60 * 1000).toISOString()
        }),
        {
            enabled: !!selectedDriver && showHistory,
            refetchInterval: 60000, // 1 minute
        }
    );

    // Fetch collection points
    const {
        data: collectionPointsData,
        isLoading: collectionPointsLoading
    } = useQuery(
        ['collectionPoints', selectedDriver, dateRange],
        () => apiService.tracking.getCollectionPoints({
            driverId: selectedDriver,
            from: dateRange.from,
            to: dateRange.to
        }),
        {
            enabled: !!selectedDriver && showCollectionPoints
        }
    );

    // Fetch driver statistics
    const {
        data: driverStatsData,
        isLoading: driverStatsLoading
    } = useQuery(
        ['driverStats', selectedDriver, dateRange],
        () => apiService.tracking.getDriverStats(selectedDriver, {
            from: dateRange.from,
            to: dateRange.to
        }),
        {
            enabled: !!selectedDriver
        }
    );

    // Command mutation for toggling collection mode
    const toggleCollectionMutation = useMutation(
        (driverId) => {
            // Get current collection mode from driver data
            const driver = driversData?.data?.data?.devicesLocations.find(d => d.deviceId === driverId);
            const isCurrentlyCollecting = driver?.isCollecting || false;

            // Send command to toggle collection mode
            return apiService.tracking.sendCommand({
                deviceId: driverId,
                command: 'setCollectingMode',
                data: { isCollecting: !isCurrentlyCollecting }
            });
        },
        {
            onSuccess: () => {
                queryClient.invalidateQueries('trackingDrivers');
            }
        }
    );

    // When drivers data changes, update map if a driver is selected
    useEffect(() => {
        if (driversData && selectedDriver) {
            const selectedDriverData = driversData.data.data.devicesLocations.find(
                device => device.deviceId === selectedDriver
            );

            if (selectedDriverData && selectedDriverData.location) {
                const [longitude, latitude] = selectedDriverData.location.coordinates;
                setMapCenter([latitude, longitude]);
                setZoom(15);
            }
        }
    }, [driversData, selectedDriver]);

    // Format drivers data for the map
    const getMapMarkers = () => {
        if (!driversData) return [];

        const markers = [];

        // Add driver markers
        const driverMarkers = driversData.data.data.devicesLocations.map(device => {
            const [longitude, latitude] = device.location.coordinates;

            // Create popup content with device details
            const popup = `
                <div class="p-2">
                    <div class="font-bold">${device.deviceId}</div>
                    <div class="text-sm">Статус: ${device.isCollecting ? '<span class="text-emerald-600">Сбор отходов</span>' : '<span class="text-slate-500">Ожидание</span>'}</div>
                    <div class="text-sm">Обновлено: ${formatDate(device.timestamp)}</div>
                    <div class="text-sm">Батарея: ${device.battery}%</div>
                    <div class="text-sm">Скорость: ${device.speed ? device.speed.toFixed(1) + ' км/ч' : 'Стоит'}</div>
                </div>
            `;

            return {
                id: device.deviceId,
                position: [latitude, longitude],
                popup,
                isSelected: device.deviceId === selectedDriver,
                isDriver: true,
                isCollecting: device.isCollecting
            };
        });

        markers.push(...driverMarkers);

        // Add collection point markers if enabled
        if (showCollectionPoints && collectionPointsData && selectedDriver) {
            const collectionMarkers = collectionPointsData.data.data.collectionPoints
                .filter(point => point.driverId === selectedDriver)
                .map(point => {
                    const [longitude, latitude] = point.location.coordinates;

                    const popup = `
                        <div class="p-2">
                            <div class="font-bold">Точка сбора</div>
                            <div class="text-sm">Время: ${formatDate(point.timestamp)}</div>
                            <div class="text-sm">Собрано контейнеров: ${point.binCount}</div>
                            ${point.binIds.length > 0 ? `<div class="text-sm">ID: ${point.binIds.join(', ')}</div>` : ''}
                        </div>
                    `;

                    return {
                        id: `collection-${point._id}`,
                        position: [latitude, longitude],
                        popup,
                        isCollectionPoint: true
                    };
                });

            markers.push(...collectionMarkers);
        }

        return markers;
    };

    // Format history data as a path for the map
    const getHistoryPath = () => {
        if (!historyData || !showHistory) return null;

        const path = historyData.data.data.trackingData.map(point => {
            const [longitude, latitude] = point.location.coordinates;
            return [latitude, longitude];
        });

        return path.length > 0 ? path : null;
    };

    // Handle manual refresh
    const handleRefresh = () => {
        refetchDrivers();
        if (selectedDriver) {
            queryClient.invalidateQueries(['driverHistory', selectedDriver]);
            queryClient.invalidateQueries(['collectionPoints', selectedDriver]);
            queryClient.invalidateQueries(['driverStats', selectedDriver]);
        }
    };

    // Toggle collection mode for a driver
    const handleToggleCollectionMode = (driverId) => {
        toggleCollectionMutation.mutate(driverId);
    };

    // Handle driver selection
    const handleDriverSelect = (driverId) => {
        setSelectedDriver(driverId);
    };

    // Loading state
    if (driversLoading && !driversData) {
        return <Loader />;
    }

    // Get drivers from data
    const drivers = driversData?.data?.data?.devicesLocations || [];
    const selectedDriverData = selectedDriver
        ? drivers.find(d => d.deviceId === selectedDriver)
        : null;

    // Get statistics
    const stats = driverStatsData?.data?.data?.statistics || {
        collections: { totalCollections: 0, totalBinsCollected: 0 },
        distance: { totalKilometers: 0 },
        activity: { activeTimeHours: 0, lastActive: null }
    };

    return (
        <div className="container mx-auto p-4">
            <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 md:text-3xl">
                        Отслеживание Водителей
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Мониторинг работы водителей по сбору медицинских отходов
                    </p>
                </div>
                <div className="mt-4 flex items-center space-x-3 md:mt-0">
                    <Button onClick={handleRefresh} variant="outline">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Обновить
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
                {/* Left sidebar - Driver List */}
                <div className="lg:col-span-1 space-y-6">
                    <DashboardCard
                        title="Активные Водители"
                        icon={<Truck className="h-5 w-5" />}
                    >
                        <div className="divide-y divide-slate-100">
                            {drivers.length === 0 ? (
                                <div className="py-4 text-center text-sm text-slate-500">
                                    Нет активных водителей
                                </div>
                            ) : (
                                drivers.map(driver => (
                                    <div
                                        key={driver.deviceId}
                                        className={`cursor-pointer p-3 transition-colors hover:bg-slate-50 ${
                                            selectedDriver === driver.deviceId ? 'bg-teal-50' : ''
                                        }`}
                                        onClick={() => handleDriverSelect(driver.deviceId)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                                <div className={`h-2 w-2 rounded-full ${
                                                    (new Date() - new Date(driver.timestamp)) < 5 * 60 * 1000
                                                        ? 'bg-emerald-500' // Online if updated in last 5 minutes
                                                        : 'bg-slate-400'
                                                }`}></div>
                                                <span className="font-medium text-slate-800">{driver.deviceId}</span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Battery className="h-4 w-4 text-slate-400" />
                                                <span className="text-xs text-slate-500">{driver.battery}%</span>
                                            </div>
                                        </div>
                                        <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                                            <div className="flex items-center space-x-1">
                                                <Clock className="h-3 w-3" />
                                                <span>{formatDate(driver.timestamp, false, true)}</span>
                                            </div>
                                            <div className={`flex items-center space-x-1 ${
                                                driver.isCollecting ? 'text-emerald-500' : 'text-slate-400'
                                            }`}>
                                                {driver.isCollecting ? (
                                                    <>
                                                        <Activity className="h-3 w-3" />
                                                        <span>Сбор</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Clock className="h-3 w-3" />
                                                        <span>Ожидание</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </DashboardCard>

                    {selectedDriver && (
                        <>
                            <DashboardCard
                                title="Статистика Водителя"
                                icon={<FileText className="h-5 w-5" />}
                            >
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                                        <span className="text-sm text-slate-600">Точек сбора:</span>
                                        <span className="font-semibold">{stats.collections.totalCollections}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                                        <span className="text-sm text-slate-600">Собрано контейнеров:</span>
                                        <span className="font-semibold">{stats.collections.totalBinsCollected}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                                        <span className="text-sm text-slate-600">Пройдено км:</span>
                                        <span className="font-semibold">{stats.distance.totalKilometers.toFixed(1)} км</span>
                                    </div>
                                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                                        <span className="text-sm text-slate-600">Активное время:</span>
                                        <span className="font-semibold">{stats.activity.activeTimeHours.toFixed(1)} ч</span>
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Период статистики
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-xs text-slate-500">От</label>
                                            <input
                                                type="date"
                                                value={dateRange.from}
                                                onChange={(e) => setDateRange({...dateRange, from: e.target.value})}
                                                className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-500">До</label>
                                            <input
                                                type="date"
                                                value={dateRange.to}
                                                onChange={(e) => setDateRange({...dateRange, to: e.target.value})}
                                                className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </DashboardCard>

                            <DashboardCard
                                title="Управление"
                                icon={<UserCheck className="h-5 w-5" />}
                            >
                                <div className="space-y-4">
                                    {/* Collection Mode Toggle */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="block text-sm font-medium text-slate-700">
                                                Режим сбора отходов
                                            </label>
                                            <span className={`text-xs font-medium ${selectedDriverData?.isCollecting ? 'text-emerald-500' : 'text-slate-500'}`}>
                                                {selectedDriverData?.isCollecting ? 'Активен' : 'Неактивен'}
                                            </span>
                                        </div>
                                        <Button
                                            onClick={() => handleToggleCollectionMode(selectedDriver)}
                                            color={selectedDriverData?.isCollecting ? 'emerald' : 'slate'}
                                            className="w-full"
                                            isLoading={toggleCollectionMutation.isLoading}
                                        >
                                            {selectedDriverData?.isCollecting ? (
                                                <>
                                                    <ToggleRight className="mr-2 h-4 w-4" />
                                                    Деактивировать режим сбора
                                                </>
                                            ) : (
                                                <>
                                                    <ToggleLeft className="mr-2 h-4 w-4" />
                                                    Активировать режим сбора
                                                </>
                                            )}
                                        </Button>
                                    </div>

                                    {/* History & Collection Points Toggles */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                id="show-history"
                                                checked={showHistory}
                                                onChange={() => setShowHistory(!showHistory)}
                                                className="h-4 w-4 rounded border-slate-300 text-teal-500 focus:ring-teal-500"
                                            />
                                            <label htmlFor="show-history" className="text-sm text-slate-700">
                                                История маршрута
                                            </label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                id="show-collections"
                                                checked={showCollectionPoints}
                                                onChange={() => setShowCollectionPoints(!showCollectionPoints)}
                                                className="h-4 w-4 rounded border-slate-300 text-teal-500 focus:ring-teal-500"
                                            />
                                            <label htmlFor="show-collections" className="text-sm text-slate-700">
                                                Точки сбора
                                            </label>
                                        </div>
                                    </div>

                                    {showHistory && (
                                        <div className="pt-2">
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                История за период
                                            </label>
                                            <select
                                                value={historyHours}
                                                onChange={(e) => setHistoryHours(Number(e.target.value))}
                                                className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:ring-teal-500"
                                            >
                                                <option value={3}>3 часа</option>
                                                <option value={6}>6 часов</option>
                                                <option value={12}>12 часов</option>
                                                <option value={24}>24 часа</option>
                                                <option value={48}>2 дня</option>
                                                <option value={72}>3 дня</option>
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </DashboardCard>
                        </>
                    )}
                </div>

                {/* Main content - Map */}
                <div className="lg:col-span-3">
                    <DashboardCard
                        title="Карта Отслеживания"
                        icon={<MapPin className="h-5 w-5" />}
                        padding={false}
                    >
                        <div className="h-[700px]">
                            <Map
                                center={mapCenter}
                                zoom={zoom}
                                markers={getMapMarkers()}
                                historyPath={getHistoryPath()}
                            />
                        </div>
                    </DashboardCard>
                </div>
            </div>
        </div>
    );
};

export default DriverTracking;