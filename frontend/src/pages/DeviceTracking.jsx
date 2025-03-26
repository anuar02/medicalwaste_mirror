import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import {
    MapPin,
    Navigation,
    Battery,
    Calendar,
    Clock,
    Search,
    RefreshCw,
    Flag
} from 'lucide-react';
import apiService from '../services/api';
import Loader from '../components/ui/Loader';
import DashboardCard from '../components/dashboard/DashboardCard';
import Button from '../components/ui/Button';
import Map from '../components/map/Map';
import { formatDate } from '../utils/formatters';

const DeviceTracking = () => {
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [mapCenter, setMapCenter] = useState([43.2364, 76.9457]); // Default center
    const [zoom, setZoom] = useState(12);
    const [showHistory, setShowHistory] = useState(false);
    const [showCheckpoints, setShowCheckpoints] = useState(true);
    const [historyHours, setHistoryHours] = useState(24);
    const [checkpointsExpanded, setCheckpointsExpanded] = useState(true);

    // Fetch all devices with their locations
    const {
        data: devicesData,
        isLoading: devicesLoading,
        refetch: refetchDevices
    } = useQuery(
        'trackingDevices',
        () => apiService.tracking.getAllDevices(),
        {
            refetchInterval: 30000, // 30 seconds
            staleTime: 10000, // 10 seconds
        }
    );

    // Fetch detailed device info when a device is selected
    const {
        data: deviceDetailData,
        isLoading: deviceDetailLoading,
        refetch: refetchDeviceDetail
    } = useQuery(
        ['deviceDetail', selectedDevice],
        () => apiService.tracking.getDeviceLocation(selectedDevice),
        {
            enabled: !!selectedDevice,
            refetchInterval: 15000, // 15 seconds
        }
    );

    // Fetch history data when a device is selected and history is enabled
    const {
        data: historyData,
        isLoading: historyLoading
    } = useQuery(
        ['deviceHistory', selectedDevice, historyHours],
        () => apiService.tracking.getDeviceHistory(selectedDevice, {
            limit: 100,
            from: new Date(Date.now() - historyHours * 60 * 60 * 1000).toISOString()
        }),
        {
            enabled: !!selectedDevice && showHistory,
            refetchInterval: 60000, // 1 minute
        }
    );

    // Fetch checkpoints when a device is selected and checkpoints are enabled
    const {
        data: checkpointsData,
        isLoading: checkpointsLoading
    } = useQuery(
        ['deviceCheckpoints', selectedDevice],
        () => apiService.tracking.getDeviceCheckpoints(selectedDevice, {
            limit: 50,
            from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // Last 7 days
        }),
        {
            enabled: !!selectedDevice && showCheckpoints,
            refetchInterval: 120000, // 2 minutes
        }
    );

    // When devices data changes, update map if a device is selected
    useEffect(() => {
        if (devicesData && selectedDevice) {
            const selectedDeviceData = devicesData.data.data.devicesLocations.find(
                device => device.deviceId === selectedDevice
            );

            if (selectedDeviceData && selectedDeviceData.location) {
                const [longitude, latitude] = selectedDeviceData.location.coordinates;
                setMapCenter([latitude, longitude]);
                setZoom(15);
            }
        }
    }, [devicesData, selectedDevice]);

    // Format devices data for the map
    const getMapMarkers = () => {
        if (!devicesData) return [];

        let markers = devicesData.data.data.devicesLocations.map(device => {
            const [longitude, latitude] = device.location.coordinates;

            // Create popup content with device details
            const popup = `
                <div class="p-2">
                    <div class="font-bold">${device.deviceId}</div>
                    <div class="text-sm">Last update: ${formatDate(device.timestamp)}</div>
                    <div class="text-sm">Battery: ${device.battery}%</div>
                    <div class="text-sm">Speed: ${device.speed ? device.speed.toFixed(1) + ' km/h' : 'N/A'}</div>
                    ${device.isCollecting ? '<div class="text-sm font-bold text-green-600">Active Collection</div>' : ''}
                </div>
            `;

            return {
                id: device.deviceId,
                position: [latitude, longitude],
                popup,
                isSelected: device.deviceId === selectedDevice,
                type: 'device',
                isCollecting: device.isCollecting
            };
        });

        // Add checkpoint markers if enabled and available
        if (showCheckpoints && checkpointsData && checkpointsData.data && checkpointsData.data.data.checkpoints) {
            const checkpointMarkers = checkpointsData.data.data.checkpoints.map(checkpoint => {
                const [longitude, latitude] = checkpoint.location.coordinates;

                // Create popup for checkpoint
                const popup = `
                    <div class="p-2">
                        <div class="font-bold text-green-600">Collection Checkpoint</div>
                        <div class="text-sm">Device: ${checkpoint.deviceId}</div>
                        <div class="text-sm">Time: ${formatDate(checkpoint.timestamp)}</div>
                        <div class="text-sm">Type: ${checkpoint.checkpointType || 'General'}</div>
                    </div>
                `;

                return {
                    id: `checkpoint-${checkpoint._id}`,
                    position: [latitude, longitude],
                    popup,
                    isCheckpoint: true,
                    type: 'checkpoint',
                    checkpointType: checkpoint.checkpointType
                };
            });

            markers = [...markers, ...checkpointMarkers];
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
        refetchDevices();
        if (selectedDevice) {
            refetchDeviceDetail();
        }
    };

    // Handle device selection
    const handleDeviceSelect = (deviceId) => {
        setSelectedDevice(deviceId);
    };

    // Loading state
    if (devicesLoading && !devicesData) {
        return <Loader />;
    }

    // Get devices from data
    const devices = devicesData?.data?.data?.devicesLocations || [];

    // Get selected device details
    const selectedDeviceDetail = deviceDetailData?.data?.data?.lastLocation;

    // Get checkpoints
    const checkpoints = checkpointsData?.data?.data?.checkpoints || [];

    return (
        <div className="container mx-auto p-4">
            <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 md:text-3xl">
                        Отслеживание Устройств
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Мониторинг местоположения мобильных устройств в реальном времени
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
                {/* Left sidebar - Device List */}
                <div className="lg:col-span-1 space-y-6">
                    <DashboardCard
                        title="Активные Устройства"
                        icon={<MapPin className="h-5 w-5" />}
                    >
                        <div className="divide-y divide-slate-100">
                            {devices.length === 0 ? (
                                <div className="py-4 text-center text-sm text-slate-500">
                                    Нет активных устройств
                                </div>
                            ) : (
                                devices.map(device => (
                                    <div
                                        key={device.deviceId}
                                        className={`cursor-pointer p-3 transition-colors hover:bg-slate-50 ${
                                            selectedDevice === device.deviceId ? 'bg-teal-50' : ''
                                        }`}
                                        onClick={() => handleDeviceSelect(device.deviceId)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                                <div className={`h-2 w-2 rounded-full ${
                                                    (new Date() - new Date(device.timestamp)) < 5 * 60 * 1000
                                                        ? 'bg-emerald-500' // Online if updated in last 5 minutes
                                                        : 'bg-slate-400'
                                                }`}></div>
                                                <span className="font-medium text-slate-800">{device.deviceId}</span>
                                                {device.isCollecting && (
                                                    <span className="ml-1 text-xs font-medium text-emerald-600">
                                                        (Сбор)
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Battery className="h-4 w-4 text-slate-400" />
                                                <span className="text-xs text-slate-500">{device.battery}%</span>
                                            </div>
                                        </div>
                                        <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                                            <div className="flex items-center space-x-1">
                                                <Clock className="h-3 w-3" />
                                                <span>{formatDate(device.timestamp, false, true)}</span>
                                            </div>
                                            {device.speed > 0 && (
                                                <div className="flex items-center space-x-1">
                                                    <Navigation className="h-3 w-3" />
                                                    <span>{device.speed.toFixed(1)} км/ч</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </DashboardCard>

                    {selectedDevice && (
                        <>
                            <DashboardCard
                                title="История Перемещений"
                                icon={<Calendar className="h-5 w-5" />}
                            >
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                id="show-history"
                                                checked={showHistory}
                                                onChange={() => setShowHistory(!showHistory)}
                                                className="mr-2 h-4 w-4 rounded border-slate-300 text-teal-500 focus:ring-teal-500"
                                            />
                                            <label htmlFor="show-history" className="text-sm text-slate-700">
                                                Показать маршрут
                                            </label>
                                        </div>
                                    </div>

                                    {showHistory && (
                                        <div className="space-y-3">
                                            <label className="block text-sm font-medium text-slate-700">
                                                Период истории
                                            </label>
                                            <select
                                                value={historyHours}
                                                onChange={(e) => setHistoryHours(Number(e.target.value))}
                                                className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:ring-teal-500"
                                            >
                                                <option value={3}>Последние 3 часа</option>
                                                <option value={6}>Последние 6 часов</option>
                                                <option value={12}>Последние 12 часов</option>
                                                <option value={24}>Последние 24 часа</option>
                                                <option value={48}>Последние 2 дня</option>
                                                <option value={72}>Последние 3 дня</option>
                                            </select>

                                            {historyLoading && (
                                                <div className="py-2 text-center text-sm text-slate-500">
                                                    Загрузка истории...
                                                </div>
                                            )}

                                            {!historyLoading && historyData && (
                                                <div className="text-sm text-slate-600">
                                                    <p>Точек: {historyData.data.data.trackingData.length}</p>
                                                    {historyData.data.data.trackingData.length > 0 && (
                                                        <p>
                                                            С: {formatDate(historyData.data.data.trackingData[historyData.data.data.trackingData.length - 1].timestamp)}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </DashboardCard>

                            <DashboardCard
                                title="Точки Сбора"
                                icon={<Flag className="h-5 w-5" />}
                            >
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                id="show-checkpoints"
                                                checked={showCheckpoints}
                                                onChange={() => setShowCheckpoints(!showCheckpoints)}
                                                className="mr-2 h-4 w-4 rounded border-slate-300 text-teal-500 focus:ring-teal-500"
                                            />
                                            <label htmlFor="show-checkpoints" className="text-sm text-slate-700">
                                                Показать точки сбора
                                            </label>
                                        </div>
                                        <button
                                            onClick={() => setCheckpointsExpanded(!checkpointsExpanded)}
                                            className="text-sm text-teal-600 hover:text-teal-700"
                                        >
                                            {checkpointsExpanded ? 'Свернуть' : 'Развернуть'}
                                        </button>
                                    </div>

                                    {showCheckpoints && checkpointsExpanded && (
                                        <div className="max-h-60 overflow-y-auto">
                                            {checkpointsLoading ? (
                                                <div className="py-2 text-center text-sm text-slate-500">
                                                    Загрузка точек сбора...
                                                </div>
                                            ) : checkpoints.length === 0 ? (
                                                <div className="py-2 text-center text-sm text-slate-500">
                                                    Нет точек сбора
                                                </div>
                                            ) : (
                                                <div className="divide-y divide-slate-100">
                                                    {checkpoints.map((checkpoint) => (
                                                        <div key={checkpoint._id} className="py-2">
                                                            <div className="flex items-center">
                                                                <Flag className="mr-2 h-4 w-4 text-emerald-500" />
                                                                <span className="text-sm font-medium">
                                                                    Точка сбора
                                                                </span>
                                                            </div>
                                                            <div className="mt-1 pl-6 text-xs text-slate-500">
                                                                <p>{formatDate(checkpoint.timestamp)}</p>
                                                                <p>Тип: {checkpoint.checkpointType || 'Общий'}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </DashboardCard>

                            {selectedDeviceDetail && (
                                <DashboardCard
                                    title="Информация об устройстве"
                                    icon={<Navigation className="h-5 w-5" />}
                                >
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-slate-500">Статус:</span>
                                            <span className="text-sm font-medium">
                                                {selectedDeviceDetail.isCollecting ? (
                                                    <span className="text-emerald-600">Сбор активен</span>
                                                ) : (
                                                    <span className="text-slate-600">Режим ожидания</span>
                                                )}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-slate-500">Скорость:</span>
                                            <span className="text-sm font-medium">
                                                {selectedDeviceDetail.speed > 0
                                                    ? `${selectedDeviceDetail.speed.toFixed(1)} км/ч`
                                                    : 'Стоит'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-slate-500">Батарея:</span>
                                            <span className="text-sm font-medium">
                                                {selectedDeviceDetail.battery}%
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-slate-500">Последнее обновление:</span>
                                            <span className="text-sm font-medium">
                                                {formatDate(selectedDeviceDetail.timestamp, true, true)}
                                            </span>
                                        </div>
                                        {selectedDeviceDetail.altitude > 0 && (
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-slate-500">Высота:</span>
                                                <span className="text-sm font-medium">
                                                    {selectedDeviceDetail.altitude.toFixed(1)} м
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </DashboardCard>
                            )}
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

export default DeviceTracking;