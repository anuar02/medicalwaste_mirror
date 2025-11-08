// frontend/src/pages/DriverCollection.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
    Play,
    Square,
    MapPin,
    CheckCircle,
    Plus,
    Navigation,
    Clock,
    Package,
    ArrowLeft,
    X,
    AlertCircle,
    Trash2
} from 'lucide-react';
import apiService from "../services/api";

const DriverCollection = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [activeSession, setActiveSession] = useState(null);
    const [containers, setContainers] = useState([]);
    const [selectedContainers, setSelectedContainers] = useState([]);
    const [showContainerSelector, setShowContainerSelector] = useState(false);
    const [isTracking, setIsTracking] = useState(false);
    const [currentLocation, setCurrentLocation] = useState(null);
    const [sessionTime, setSessionTime] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [locationMode, setLocationMode] = useState('high');
    const locationIntervalRef = useRef(null);
    const sessionTimerRef = useRef(null);
    const watchIdRef = useRef(null);

    useEffect(() => {
        // Check if user is approved driver
        if (user?.role !== 'driver' || user?.verificationStatus !== 'approved') {
            toast.error('Доступ запрещен. Требуется верификация водителя.');
            navigate('/driver/dashboard');
            return;
        }

        fetchActiveSession();
        fetchContainers();

        return () => {
            stopLocationTracking();
            if (sessionTimerRef.current) {
                clearInterval(sessionTimerRef.current);
            }
        };
    }, [user, navigate]);

    useEffect(() => {
        if (activeSession && activeSession.status === 'active') {
            const startTime = new Date(activeSession.startTime).getTime();

            sessionTimerRef.current = setInterval(() => {
                const now = Date.now();
                const elapsed = Math.floor((now - startTime) / 1000);
                setSessionTime(elapsed);
            }, 1000);

            return () => {
                if (sessionTimerRef.current) {
                    clearInterval(sessionTimerRef.current);
                }
            };
        }
    }, [activeSession]);

    const fetchActiveSession = async () => {
        try {
            const response = await apiService.collections.getActive();
            const session = response.data.data.session;
            setActiveSession(session);

            if (session) {
                setSelectedContainers(session.selectedContainers.map(c => c.container._id));
                if (session.status === 'active') {
                    startLocationTracking();
                }
            }
        } catch (error) {
            if (error.response?.status !== 404) {
                console.error('Error fetching active session:', error);
            }
        }
    };

    const fetchContainers = async () => {
        try {
            const response = await apiService.wasteBins.getAll();
            setContainers(response.data.data.bins || []);
        } catch (error) {
            console.error('Error fetching containers:', error);
            toast.error('Ошибка загрузки контейнеров');
        }
    };

    const startLocationTracking = () => {
        if (!navigator.geolocation) {
            toast.error('Геолокация не поддерживается');
            return;
        }

        setIsTracking(true);
        const POLL_INTERVAL = 10000; // every 10 seconds

        const pollLocation = () => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude, accuracy, altitude, altitudeAccuracy, heading, speed } = position.coords;

                    setCurrentLocation({ latitude, longitude, accuracy });

                    sendLocation({
                        latitude,
                        longitude,
                        accuracy,
                        altitude,
                        altitudeAccuracy,
                        heading,
                        speed: speed || 0,
                        timestamp: new Date(position.timestamp).toISOString()
                    });
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    switch (error.code) {
                        case 1:
                            toast.error('Доступ к геолокации запрещен');
                            break;
                        case 2:
                            toast.error('Местоположение недоступно');
                            break;
                        case 3:
                            toast.error('Превышено время ожидания геолокации');
                            break;
                        default:
                            toast.error('Ошибка получения геолокации');
                    }
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 5000
                }
            );
        };

        // Call immediately, then repeat
        pollLocation();
        locationIntervalRef.current = setInterval(pollLocation, POLL_INTERVAL);
    };

    const stopLocationTracking = () => {
        setIsTracking(false);
        if (locationIntervalRef.current) {
            clearInterval(locationIntervalRef.current);
            locationIntervalRef.current = null;
        }
    };

    const sendLocation = async (location) => {
        if (!activeSession) return;

        try {
            await apiService.collections.recordLocation(location);
        } catch (error) {
            console.error('Error sending location:', error);
        }
    };

    const handleStartCollection = async () => {
        if (selectedContainers.length === 0) {
            toast.error('Пожалуйста, выберите контейнеры');
            return;
        }

        const loadingToast = toast.loading('Начинаем сбор...');

        try {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;

                    const response = await apiService.collections.start({
                        containerIds: selectedContainers,
                        startLocation: {
                            type: 'Point',
                            coordinates: [longitude, latitude]
                        }
                    });

                    setActiveSession(response.data.data.session);
                    startLocationTracking();
                    toast.success('Сбор начат!', { id: loadingToast });
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    handleStartWithoutLocation(loadingToast);
                }
            );
        } catch (error) {
            console.error('Error starting collection:', error);
            toast.error('Ошибка начала сбора', { id: loadingToast });
        }
    };

    const handleStartWithoutLocation = async (toastId) => {
        try {
            const response = await apiService.collections.start({
                containerIds: selectedContainers
            });

            setActiveSession(response.data.data.session);
            startLocationTracking();
            toast.success('Сбор начат!', { id: toastId });
        } catch (error) {
            console.error('Error starting collection:', error);
            toast.error('Ошибка начала сбора', { id: toastId });
        }
    };

    const handleStopCollection = async () => {
        if (!activeSession) return;

        const loadingToast = toast.loading('Завершаем сбор...');

        try {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;

                    await apiService.collections.stop({
                        sessionId: activeSession.sessionId,
                        endLocation: {
                            type: 'Point',
                            coordinates: [longitude, latitude]
                        }
                    });

                    stopLocationTracking();
                    toast.success('Сбор завершен!', { id: loadingToast });
                    navigate('/driver/dashboard');
                },
                async (error) => {
                    console.error('Geolocation error:', error);
                    await apiService.collections.stop({
                        sessionId: activeSession.sessionId
                    });

                    stopLocationTracking();
                    toast.success('Сбор завершен!', { id: loadingToast });
                    navigate('/driver/dashboard');
                }
            );
        } catch (error) {
            console.error('Error stopping collection:', error);
            toast.error('Ошибка завершения сбора', { id: loadingToast });
        }
    };

    const toggleContainerSelection = (containerId) => {
        if (activeSession) return; // Can't change selection during active session

        setSelectedContainers(prev => {
            if (prev.includes(containerId)) {
                return prev.filter(id => id !== containerId);
            } else {
                return [...prev, containerId];
            }
        });
    };

    const clearSelection = () => {
        if (activeSession) return;
        setSelectedContainers([]);
    };

    const selectAll = () => {
        if (activeSession) return;
        setSelectedContainers(containers.map(c => c._id));
    };

    const formatTime = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Filter containers by search query
    const filteredContainers = containers.filter(container =>
        container.binId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        container.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        container.wasteType.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const selectedCount = selectedContainers.length;
    const visitedCount = activeSession?.selectedContainers?.filter(c => c.visited).length || 0;
    const totalCount = activeSession?.selectedContainers?.length || selectedCount;
    const progress = totalCount > 0 ? Math.round((visitedCount / totalCount) * 100) : 0;

    return (
        <div className="min-h-screen bg-slate-50 p-4 pb-24">
            <div className="mx-auto max-w-4xl">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => navigate('/driver/dashboard')}
                            className="rounded-lg p-2 hover:bg-slate-100 transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5 text-slate-600" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">
                                {activeSession ? 'Сбор в процессе' : 'Новый Сбор'}
                            </h1>
                            {activeSession && (
                                <p className="text-sm text-slate-500 mt-1">
                                    Прогресс: {visitedCount} из {totalCount} контейнеров ({progress}%)
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Status Card */}
                {activeSession && (
                    <div className="mb-6 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-4">
                                <div className="rounded-full bg-green-500 p-3">
                                    <Navigation className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm text-green-700 font-medium">Время сбора</p>
                                    <p className="text-3xl font-bold text-green-900">
                                        {formatTime(sessionTime)}
                                    </p>
                                </div>
                            </div>

                            {isTracking && (
                                <div className="flex items-center space-x-2 text-green-700">
                                    <div className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                    </div>
                                    <span className="text-sm font-medium">Отслеживание</span>
                                </div>
                            )}
                        </div>

                        {currentLocation && (
                            <div className="flex items-center space-x-2 text-sm text-green-700">
                                <MapPin className="h-4 w-4" />
                                <span>
                                    Координаты: {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                                    (±{Math.round(currentLocation.accuracy)}м)
                                </span>
                            </div>
                        )}

                        {/* Progress Bar */}
                        <div className="mt-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-green-700">Прогресс</span>
                                <span className="text-sm font-bold text-green-900">{progress}%</span>
                            </div>
                            <div className="w-full bg-green-200 rounded-full h-3">
                                <div
                                    className="bg-green-600 h-3 rounded-full transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Containers List */}
                <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-slate-800 flex items-center">
                            <Package className="h-5 w-5 mr-2 text-teal-600" />
                            Контейнеры ({selectedCount})
                        </h3>
                        <div className="flex items-center space-x-2">
                            {!activeSession && selectedCount > 0 && (
                                <button
                                    onClick={clearSelection}
                                    className="flex items-center text-sm text-red-600 hover:text-red-700 px-3 py-1 rounded-lg hover:bg-red-50 transition-colors"
                                >
                                    <X className="mr-1 h-4 w-4" />
                                    Очистить
                                </button>
                            )}
                            {!activeSession && (
                                <button
                                    onClick={selectAll}
                                    className="flex items-center text-sm text-teal-600 hover:text-teal-700 px-3 py-1 rounded-lg hover:bg-teal-50 transition-colors"
                                >
                                    <CheckCircle className="mr-1 h-4 w-4" />
                                    Выбрать все
                                </button>
                            )}
                            <button
                                onClick={() => setShowContainerSelector(!showContainerSelector)}
                                className="flex items-center text-teal-600 hover:text-teal-700 px-3 py-2 rounded-lg hover:bg-teal-50 transition-colors"
                                disabled={activeSession !== null}
                            >
                                {showContainerSelector ? <X className="mr-1 h-4 w-4" /> : <Plus className="mr-1 h-4 w-4" />}
                                {showContainerSelector ? 'Закрыть' : 'Выбрать'}
                            </button>
                        </div>
                    </div>

                    {/* Container Selector */}
                    {showContainerSelector && !activeSession && (
                        <div className="mb-4 rounded-lg border border-slate-200 overflow-hidden">
                            <div className="p-3 bg-slate-50 border-b border-slate-200">
                                <input
                                    type="text"
                                    placeholder="Поиск по ID, отделению или типу..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                />
                            </div>
                            <div className="max-h-64 overflow-y-auto">
                                {filteredContainers.length > 0 ? (
                                    filteredContainers.map((container) => (
                                        <label
                                            key={container._id}
                                            className="flex items-center space-x-3 px-4 py-3 cursor-pointer hover:bg-slate-50 border-b border-slate-100 last:border-0"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedContainers.includes(container._id)}
                                                onChange={() => toggleContainerSelection(container._id)}
                                                className="h-5 w-5 text-teal-600 rounded focus:ring-teal-500"
                                            />
                                            <div className="flex-1">
                                                <p className="font-medium text-slate-800">
                                                    {container.binId}
                                                </p>
                                                <p className="text-sm text-slate-500">
                                                    {container.department} • {container.wasteType}
                                                </p>
                                            </div>
                                            {container.fillLevel && (
                                                <div className={`text-xs px-2 py-1 rounded-full ${
                                                    container.fillLevel > 80 ? 'bg-red-100 text-red-700' :
                                                        container.fillLevel > 60 ? 'bg-amber-100 text-amber-700' :
                                                            'bg-green-100 text-green-700'
                                                }`}>
                                                    {container.fillLevel}%
                                                </div>
                                            )}
                                        </label>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-slate-500">
                                        <Trash2 className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                                        <p>Контейнеры не найдены</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Selected Containers List */}
                    {selectedCount > 0 ? (
                        <div className="space-y-2">
                            {containers
                                .filter(c => selectedContainers.includes(c._id))
                                .map((container) => {
                                    const containerData = activeSession?.selectedContainers.find(
                                        sc => sc.container._id === container._id
                                    );
                                    const isVisited = containerData?.visited;

                                    return (
                                        <div
                                            key={container._id}
                                            className={`flex items-center justify-between rounded-lg border p-4 transition-all ${
                                                isVisited
                                                    ? 'border-green-300 bg-green-50 shadow-sm'
                                                    : 'border-slate-200 hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="flex items-center space-x-3">
                                                {isVisited ? (
                                                    <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                                                ) : (
                                                    <div className="h-6 w-6 rounded-full border-2 border-slate-300 flex-shrink-0"></div>
                                                )}
                                                <div>
                                                    <p className="font-medium text-slate-800">
                                                        {container.binId}
                                                    </p>
                                                    <p className="text-sm text-slate-500">
                                                        {container.department} • {container.wasteType}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-3">
                                                {container.fillLevel && (
                                                    <div className={`text-xs font-medium px-2 py-1 rounded ${
                                                        container.fillLevel > 80 ? 'bg-red-100 text-red-700' :
                                                            container.fillLevel > 60 ? 'bg-amber-100 text-amber-700' :
                                                                'bg-green-100 text-green-700'
                                                    }`}>
                                                        {container.fillLevel}%
                                                    </div>
                                                )}
                                                {isVisited && (
                                                    <span className="text-xs text-green-700 font-semibold bg-green-100 px-3 py-1 rounded-full">
                                                        ✓ Посещено
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-slate-400">
                            <Package className="h-16 w-16 mx-auto mb-3 opacity-50" />
                            <p className="font-medium">Контейнеры не выбраны</p>
                            <p className="text-sm mt-1">Нажмите "Выбрать" чтобы добавить контейнеры</p>
                        </div>
                    )}
                </div>

                {/* Warning if no geolocation */}
                {activeSession && !isTracking && (
                    <div className="mb-6 rounded-lg bg-amber-50 border border-amber-200 p-4">
                        <div className="flex items-start">
                            <AlertCircle className="h-5 w-5 text-amber-600 mr-2 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-amber-800">
                                    Отслеживание местоположения отключено
                                </p>
                                <p className="text-sm text-amber-700 mt-1">
                                    Пожалуйста, включите геолокацию для корректного отслеживания маршрута.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Fixed Bottom Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-lg">
                <div className="mx-auto max-w-4xl flex space-x-4">
                    {activeSession ? (
                        <>
                            <button
                                onClick={handleStopCollection}
                                className="flex-1 flex items-center justify-center rounded-lg bg-red-600 px-6 py-4 text-white hover:bg-red-700 transition-colors shadow-lg font-semibold"
                            >
                                <Square className="mr-2 h-5 w-5" />
                                Завершить Сбор
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => navigate('/driver/dashboard')}
                                className="flex-1 rounded-lg border-2 border-slate-300 px-6 py-4 text-slate-700 hover:bg-slate-50 transition-colors font-medium"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleStartCollection}
                                disabled={selectedContainers.length === 0}
                                className="flex-1 flex items-center justify-center rounded-lg bg-teal-600 px-6 py-4 text-white hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg font-semibold"
                            >
                                <Play className="mr-2 h-5 w-5" />
                                Начать Сбор ({selectedCount})
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DriverCollection;
