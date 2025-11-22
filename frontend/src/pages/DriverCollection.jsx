// frontend/src/pages/DriverCollection.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Geolocation } from '@capacitor/geolocation';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { Capacitor } from '@capacitor/core';
import {
    Play,
    Square,
    MapPin,
    CheckCircle,
    Plus,
    Navigation,
    Package,
    ArrowLeft,
    X,
    AlertCircle,
    Trash2,
    Search,
    Filter,
    TrendingUp,
    Clock,
    Map as MapIcon
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
    const [locationUpdateCount, setLocationUpdateCount] = useState(0);
    const [showDebug, setShowDebug] = useState(false);

    // Refs to avoid closure issues
    const activeSessionRef = useRef(null);
    const sessionTimerRef = useRef(null);
    const watchIdRef = useRef(null);
    const lastSentTimeRef = useRef(0);

    // Sync activeSession state with ref
    useEffect(() => {
        activeSessionRef.current = activeSession;
    }, [activeSession]);

    useEffect(() => {
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
                    console.log('🔄 Active session found, starting location tracking...');
                    await startLocationTracking();
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

    const handleLocationUpdate = async (position) => {
        const now = Date.now();
        const SEND_INTERVAL = 10000; // 10 seconds

        console.log('📍 Got position update');

        if (!activeSessionRef.current) {
            console.warn('⚠️ No active session in ref, skipping location send');
            return;
        }

        if (now - lastSentTimeRef.current < SEND_INTERVAL) {
            return;
        }

        console.log('✅ Sending location update...');
        lastSentTimeRef.current = now;

        const { latitude, longitude, accuracy, altitude, altitudeAccuracy, heading, speed } = position.coords;

        setCurrentLocation({ latitude, longitude, accuracy });

        const locationPayload = {
            latitude,
            longitude,
            accuracy: accuracy || 0,
            speed: speed || 0,
            timestamp: new Date(position.timestamp).toISOString()
        };

        if (altitude != null && !isNaN(altitude)) {
            locationPayload.altitude = altitude;
        }
        if (altitudeAccuracy != null && !isNaN(altitudeAccuracy)) {
            locationPayload.altitudeAccuracy = altitudeAccuracy;
        }
        if (heading != null && !isNaN(heading)) {
            locationPayload.heading = heading;
        }

        await sendLocation(locationPayload);
        setLocationUpdateCount(prev => prev + 1);
    };

    const startLocationTracking = async () => {
        console.log('🚀 Starting location tracking...');

        try {
            if (Capacitor.isNativePlatform()) {
                await KeepAwake.keepAwake();
            }

            const permission = await Geolocation.requestPermissions();

            if (permission.location !== 'granted') {
                toast.error('Доступ к геолокации запрещен');
                return;
            }

            setIsTracking(true);
            setLocationUpdateCount(0);
            lastSentTimeRef.current = 0;

            watchIdRef.current = await Geolocation.watchPosition(
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                },
                (position, err) => {
                    if (err) {
                        console.error('❌ Watch position error:', err);
                        return;
                    }
                    if (position) {
                        handleLocationUpdate(position);
                    }
                }
            );

            console.log('✅ Location tracking started');

        } catch (error) {
            console.error('❌ Error starting location tracking:', error);
            toast.error('Ошибка запуска отслеживания');
        }
    };

    const stopLocationTracking = async () => {
        console.log('🛑 Stopping location tracking...');

        setIsTracking(false);

        if (watchIdRef.current) {
            try {
                await Geolocation.clearWatch({ id: watchIdRef.current });
                watchIdRef.current = null;
            } catch (error) {
                console.error('Error clearing watch:', error);
            }
        }

        if (Capacitor.isNativePlatform()) {
            await KeepAwake.allowSleep();
        }
    };

    const sendLocation = async (location) => {
        const session = activeSessionRef.current;

        if (!session) {
            console.error('❌ No active session when sending location!');
            return;
        }

        try {
            const response = await apiService.collections.recordLocation(location);

            if (response.data?.data?.routePointsCount) {
                console.log('✅ Location recorded. Total points:', response.data.data.routePointsCount);
            }

            return response;
        } catch (error) {
            console.error('❌ Error sending location:', error);

            if (error.response?.status === 404) {
                toast.error('Активная сессия не найдена', { duration: 3000 });
                await stopLocationTracking();
            }

            return null;
        }
    };

    const handleStartCollection = async () => {
        if (selectedContainers.length === 0) {
            toast.error('Пожалуйста, выберите контейнеры');
            return;
        }

        const loadingToast = toast.loading('Начинаем сбор...');

        try {
            let startLocation = null;

            try {
                const permission = await Geolocation.requestPermissions();

                if (permission.location === 'granted') {
                    const position = await Geolocation.getCurrentPosition({
                        enableHighAccuracy: true,
                        timeout: 10000
                    });

                    startLocation = {
                        type: 'Point',
                        coordinates: [position.coords.longitude, position.coords.latitude]
                    };
                }
            } catch (geoError) {
                console.warn('Could not get initial location:', geoError);
            }

            const response = await apiService.collections.start({
                containerIds: selectedContainers,
                ...(startLocation && { startLocation })
            });

            const newSession = response.data.data.session;
            setActiveSession(newSession);

            toast.success('Сбор начат!', { id: loadingToast });

            setTimeout(async () => {
                await startLocationTracking();
            }, 200);

        } catch (error) {
            console.error('❌ Error starting collection:', error);
            toast.error('Ошибка начала сбора', { id: loadingToast });
        }
    };

    const handleStopCollection = async () => {
        if (!activeSession) return;

        const loadingToast = toast.loading('Завершаем сбор...');

        try {
            await stopLocationTracking();

            let endLocation = null;

            try {
                const position = await Geolocation.getCurrentPosition({
                    enableHighAccuracy: true,
                    timeout: 5000
                });

                endLocation = {
                    type: 'Point',
                    coordinates: [position.coords.longitude, position.coords.latitude]
                };
            } catch (geoError) {
                console.warn('Could not get final location:', geoError);
            }

            await apiService.collections.stop({
                sessionId: activeSession.sessionId,
                ...(endLocation && { endLocation })
            });

            toast.success('Сбор завершен!', { id: loadingToast });
            navigate('/driver/dashboard');

        } catch (error) {
            console.error('❌ Error stopping collection:', error);
            toast.error('Ошибка завершения сбора', { id: loadingToast });
        }
    };

    const toggleContainerSelection = (containerId) => {
        if (activeSession) return;
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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
            {/* Mobile-optimized container */}
            <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 pb-28">

                {/* Header - Compact on mobile */}
                <div className="mb-4 sm:mb-6">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/driver/dashboard')}
                            className="flex-shrink-0 p-2 rounded-xl bg-white shadow-sm hover:shadow-md transition-all active:scale-95"
                        >
                            <ArrowLeft className="h-5 w-5 text-slate-700" />
                        </button>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-xl sm:text-3xl font-bold text-slate-800 truncate">
                                {activeSession ? '🚛 Сбор в процессе' : '📋 Новый Сбор'}
                            </h1>
                            {activeSession && (
                                <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                                    {visitedCount} из {totalCount} • {progress}%
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Active Session Status Card */}
                {activeSession && (
                    <div className="mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-4 sm:p-6 shadow-xl text-white">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            {/* Timer */}
                            <div className="flex items-center gap-3">
                                <div className="rounded-full bg-white/20 p-3 backdrop-blur-sm">
                                    <Clock className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-xs font-medium opacity-90">Время сбора</p>
                                    <p className="text-2xl sm:text-3xl font-bold tracking-tight">
                                        {formatTime(sessionTime)}
                                    </p>
                                </div>
                            </div>

                            {/* Tracking Status */}
                            <div className="flex flex-wrap items-center gap-3">
                                {isTracking ? (
                                    <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-2 rounded-full">
                                        <div className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                                        </div>
                                        <span className="text-xs font-semibold">GPS Активен</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 bg-red-500/30 backdrop-blur-sm px-3 py-2 rounded-full">
                                        <AlertCircle className="h-4 w-4" />
                                        <span className="text-xs font-semibold">GPS Выключен</span>
                                    </div>
                                )}

                                <div className="bg-white/20 backdrop-blur-sm px-3 py-2 rounded-full">
                                    <span className="text-xs font-semibold">{locationUpdateCount} точек</span>
                                </div>
                            </div>
                        </div>

                        {/* Location Info */}
                        {currentLocation && (
                            <div className="mt-4 pt-4 border-t border-white/20">
                                <div className="flex items-start gap-2 text-xs sm:text-sm">
                                    <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-mono opacity-90 break-all">
                                            {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                                        </p>
                                        <p className="text-xs opacity-75 mt-0.5">
                                            Точность: ±{Math.round(currentLocation.accuracy)}м
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Progress Bar */}
                        <div className="mt-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold opacity-90">Прогресс сбора</span>
                                <span className="text-sm font-bold">{progress}%</span>
                            </div>
                            <div className="w-full bg-white/20 rounded-full h-2.5 overflow-hidden">
                                <div
                                    className="bg-white h-2.5 rounded-full transition-all duration-500 ease-out shadow-lg"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Containers Section */}
                <div className="mb-4 rounded-2xl bg-white shadow-lg overflow-hidden">
                    {/* Header */}
                    <div className="p-4 bg-gradient-to-r from-teal-50 to-blue-50 border-b border-slate-200">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Package className="h-5 w-5 text-teal-600" />
                                <h3 className="text-base sm:text-lg font-bold text-slate-800">
                                    Контейнеры ({selectedCount})
                                </h3>
                            </div>
                            {!activeSession && (
                                <button
                                    onClick={() => setShowContainerSelector(!showContainerSelector)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors active:scale-95"
                                >
                                    {showContainerSelector ? (
                                        <>
                                            <X className="h-4 w-4" />
                                            <span className="hidden sm:inline">Закрыть</span>
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="h-4 w-4" />
                                            <span className="hidden sm:inline">Выбрать</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>

                        {/* Action Buttons */}
                        {!activeSession && selectedCount > 0 && (
                            <div className="flex gap-2">
                                <button
                                    onClick={selectAll}
                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white text-teal-700 text-xs font-medium rounded-lg hover:bg-teal-50 transition-colors border border-teal-200"
                                >
                                    <CheckCircle className="h-3.5 w-3.5" />
                                    Выбрать все
                                </button>
                                <button
                                    onClick={clearSelection}
                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white text-red-600 text-xs font-medium rounded-lg hover:bg-red-50 transition-colors border border-red-200"
                                >
                                    <X className="h-3.5 w-3.5" />
                                    Очистить
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Container Selector */}
                    {showContainerSelector && !activeSession && (
                        <div className="border-b border-slate-200">
                            {/* Search */}
                            <div className="p-3 bg-slate-50">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Поиск..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                                    />
                                </div>
                            </div>

                            {/* Container List */}
                            <div className="max-h-72 overflow-y-auto">
                                {filteredContainers.length > 0 ? (
                                    filteredContainers.map((container) => (
                                        <label
                                            key={container._id}
                                            className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 active:bg-slate-100 border-b border-slate-100 last:border-0 transition-colors"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedContainers.includes(container._id)}
                                                onChange={() => toggleContainerSelection(container._id)}
                                                className="h-5 w-5 text-teal-600 rounded focus:ring-2 focus:ring-teal-500 cursor-pointer"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-slate-800 text-sm truncate">
                                                    {container.binId}
                                                </p>
                                                <p className="text-xs text-slate-500 truncate">
                                                    {container.department} • {container.wasteType}
                                                </p>
                                            </div>
                                            {container.fillLevel != null && (
                                                <div className={`text-xs font-bold px-2.5 py-1 rounded-full ${
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
                                    <div className="text-center py-12 px-4">
                                        <Trash2 className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                                        <p className="text-sm text-slate-500 font-medium">Контейнеры не найдены</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Selected Containers */}
                    <div className="p-4">
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
                                                className={`flex items-center gap-3 rounded-xl p-3 transition-all ${
                                                    isVisited
                                                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 shadow-sm'
                                                        : 'bg-slate-50 border border-slate-200 hover:border-slate-300'
                                                }`}
                                            >
                                                <div className="flex-shrink-0">
                                                    {isVisited ? (
                                                        <CheckCircle className="h-6 w-6 text-green-600" />
                                                    ) : (
                                                        <div className="h-6 w-6 rounded-full border-2 border-slate-300"></div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-slate-800 text-sm truncate">
                                                        {container.binId}
                                                    </p>
                                                    <p className="text-xs text-slate-500 truncate">
                                                        {container.department}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    {container.fillLevel != null && (
                                                        <div className={`text-xs font-bold px-2 py-1 rounded-full ${
                                                            container.fillLevel > 80 ? 'bg-red-100 text-red-700' :
                                                                container.fillLevel > 60 ? 'bg-amber-100 text-amber-700' :
                                                                    'bg-green-100 text-green-700'
                                                        }`}>
                                                            {container.fillLevel}%
                                                        </div>
                                                    )}
                                                    {isVisited && (
                                                        <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded-full">
                                                            ✓
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        ) : (
                            <div className="text-center py-12 px-4">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                                    <Package className="h-8 w-8 text-slate-400" />
                                </div>
                                <p className="text-sm font-medium text-slate-600 mb-1">Контейнеры не выбраны</p>
                                <p className="text-xs text-slate-500">Нажмите "Выбрать" для добавления</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Debug Info - Collapsible */}
                {activeSession && (
                    <button
                        onClick={() => setShowDebug(!showDebug)}
                        className="w-full mb-4 rounded-xl bg-blue-50 border border-blue-200 p-3 text-left hover:bg-blue-100 transition-colors"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-blue-800">🔧 Debug Info</span>
                            <span className="text-xs text-blue-600">{showDebug ? '▼' : '▶'}</span>
                        </div>
                        {showDebug && (
                            <div className="mt-2 text-xs font-mono text-blue-700 space-y-1">
                                <div>Session: {activeSession.sessionId}</div>
                                <div>Ref: {activeSessionRef.current?.sessionId || 'NULL'}</div>
                                <div>Tracking: {isTracking ? '✅' : '❌'}</div>
                                <div>Updates: {locationUpdateCount}</div>
                                <div>Watch: {watchIdRef.current || 'None'}</div>
                                <div>Platform: {Capacitor.getPlatform()}</div>
                            </div>
                        )}
                    </button>
                )}
            </div>

            {/* Fixed Bottom Action Bar - Mobile optimized */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-2xl safe-bottom">
                <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
                    {activeSession ? (
                        <button
                            onClick={handleStopCollection}
                            className="w-full flex items-center justify-center gap-2 rounded-xl sm:rounded-2xl bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 text-white font-bold text-base sm:text-lg hover:from-red-700 hover:to-red-800 transition-all shadow-lg hover:shadow-xl active:scale-98"
                        >
                            <Square className="h-5 w-5 sm:h-6 sm:w-6" />
                            Завершить Сбор
                        </button>
                    ) : (
                        <div className="flex gap-2 sm:gap-3">
                            <button
                                onClick={() => navigate('/driver/dashboard')}
                                className="flex-1 rounded-xl sm:rounded-2xl border-2 border-slate-300 px-4 sm:px-6 py-4 text-slate-700 font-semibold text-sm sm:text-base hover:bg-slate-50 transition-all active:scale-98"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleStartCollection}
                                disabled={selectedContainers.length === 0}
                                className="flex-[2] flex items-center justify-center gap-2 rounded-xl sm:rounded-2xl bg-gradient-to-r from-teal-600 to-blue-600 px-4 sm:px-6 py-4 text-white font-bold text-sm sm:text-base hover:from-teal-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg active:scale-98"
                            >
                                <Play className="h-4 w-4 sm:h-5 sm:w-5" />
                                Начать ({selectedCount})
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <style jsx>{`
                .safe-bottom {
                    padding-bottom: env(safe-area-inset-bottom);
                }
                .active\\:scale-98:active {
                    transform: scale(0.98);
                }
            `}</style>
        </div>
    );
};

export default DriverCollection;