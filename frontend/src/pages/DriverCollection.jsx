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
    Package
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
    const locationIntervalRef = useRef(null);
    const sessionTimerRef = useRef(null);
    const watchIdRef = useRef(null);

    useEffect(() => {
        fetchActiveSession();
        fetchContainers();

        return () => {
            // Cleanup on unmount
            stopLocationTracking();
            if (sessionTimerRef.current) {
                clearInterval(sessionTimerRef.current);
            }
        };
    }, []);

    // Update session timer
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
                // Start tracking if session is active
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

        // Watch position continuously
        watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude, accuracy, altitude, altitudeAccuracy, heading, speed } = position.coords;

                setCurrentLocation({
                    latitude,
                    longitude,
                    accuracy
                });

                // Send location to backend
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
                toast.error('Ошибка получения геолокации');
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );

        // Also send location every 30 seconds as backup
        locationIntervalRef.current = setInterval(() => {
            if (currentLocation) {
                sendLocation(currentLocation);
            }
        }, 30000); // 30 seconds
    };

    const stopLocationTracking = () => {
        setIsTracking(false);

        if (watchIdRef.current) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }

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

        try {
            // Get current location
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
                    toast.success('Сбор начат!');
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    // Start anyway without location
                    handleStartWithoutLocation();
                }
            );
        } catch (error) {
            console.error('Error starting collection:', error);
            toast.error('Ошибка начала сбора');
        }
    };

    const handleStartWithoutLocation = async () => {
        try {
            const response = await apiService.collections.start({
                containerIds: selectedContainers
            });

            setActiveSession(response.data.data.session);
            startLocationTracking();
            toast.success('Сбор начат!');
        } catch (error) {
            console.error('Error starting collection:', error);
            toast.error('Ошибка начала сбора');
        }
    };

    const handleStopCollection = async () => {
        if (!activeSession) return;

        try {
            // Get current location
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
                    toast.success('Сбор завершен!');
                    navigate('/driver/dashboard');
                },
                async (error) => {
                    console.error('Geolocation error:', error);
                    // Stop anyway without location
                    await apiService.collections.stop({
                        sessionId: activeSession.sessionId
                    });

                    stopLocationTracking();
                    toast.success('Сбор завершен!');
                    navigate('/driver/dashboard');
                }
            );
        } catch (error) {
            console.error('Error stopping collection:', error);
            toast.error('Ошибка завершения сбора');
        }
    };

    const handleAddContainer = async (containerId) => {
        if (!activeSession) {
            // Add to selection for new session
            setSelectedContainers(prev => [...prev, containerId]);
            return;
        }

        try {
            const response = await apiService.collections.addContainer({
                containerId
            });
            setActiveSession(response.data.data.session);
            toast.success('Контейнер добавлен');
        } catch (error) {
            console.error('Error adding container:', error);
            toast.error('Ошибка добавления контейнера');
        }
    };

    const toggleContainerSelection = (containerId) => {
        setSelectedContainers(prev => {
            if (prev.includes(containerId)) {
                return prev.filter(id => id !== containerId);
            } else {
                return [...prev, containerId];
            }
        });
    };

    const formatTime = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4">
            <div className="mx-auto max-w-4xl">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-slate-800">
                        {activeSession ? 'Сбор в процессе' : 'Новый Сбор'}
                    </h1>
                </div>

                {/* Status Card */}
                {activeSession && (
                    <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <div className="rounded-full bg-green-100 p-3">
                                    <Navigation className="h-6 w-6 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">Время сбора</p>
                                    <p className="text-2xl font-bold text-slate-800">
                                        {formatTime(sessionTime)}
                                    </p>
                                </div>
                            </div>

                            {isTracking && (
                                <div className="flex items-center space-x-2 text-green-600">
                                    <div className="h-2 w-2 animate-pulse rounded-full bg-green-600"></div>
                                    <span className="text-sm">Отслеживание активно</span>
                                </div>
                            )}
                        </div>

                        {currentLocation && (
                            <div className="mt-4 flex items-center space-x-2 text-sm text-slate-600">
                                <MapPin className="h-4 w-4" />
                                <span>
                                    Точность: ±{Math.round(currentLocation.accuracy)}м
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* Containers List */}
                <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-slate-800">
                            Выбранные Контейнеры ({selectedContainers.length})
                        </h3>
                        <button
                            onClick={() => setShowContainerSelector(!showContainerSelector)}
                            className="flex items-center text-teal-600 hover:text-teal-700"
                        >
                            <Plus className="mr-1 h-4 w-4" />
                            Добавить
                        </button>
                    </div>

                    {showContainerSelector && (
                        <div className="mb-4 max-h-64 overflow-y-auto rounded border border-slate-200 p-4">
                            {containers.map((container) => (
                                <label
                                    key={container._id}
                                    className="flex items-center space-x-3 py-2 cursor-pointer hover:bg-slate-50"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedContainers.includes(container._id)}
                                        onChange={() => toggleContainerSelection(container._id)}
                                        disabled={activeSession !== null}
                                        className="h-4 w-4 text-teal-600"
                                    />
                                    <div>
                                        <p className="font-medium text-slate-800">
                                            {container.binId}
                                        </p>
                                        <p className="text-sm text-slate-500">
                                            {container.department} - {container.wasteType}
                                        </p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    )}

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
                                        className={`flex items-center justify-between rounded-lg border p-3 ${
                                            isVisited ? 'border-green-200 bg-green-50' : 'border-slate-200'
                                        }`}
                                    >
                                        <div className="flex items-center space-x-3">
                                            {isVisited && (
                                                <CheckCircle className="h-5 w-5 text-green-600" />
                                            )}
                                            <div>
                                                <p className="font-medium text-slate-800">
                                                    {container.binId}
                                                </p>
                                                <p className="text-sm text-slate-500">
                                                    {container.department}
                                                </p>
                                            </div>
                                        </div>
                                        {isVisited && (
                                            <span className="text-xs text-green-600 font-medium">
                                                Посещено
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-4">
                    {activeSession ? (
                        <button
                            onClick={handleStopCollection}
                            className="flex-1 flex items-center justify-center rounded-lg bg-red-600 px-6 py-4 text-white hover:bg-red-700 transition-colors"
                        >
                            <Square className="mr-2 h-5 w-5" />
                            Остановить Сбор
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={() => navigate('/driver/dashboard')}
                                className="flex-1 rounded-lg border border-slate-300 px-6 py-4 text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleStartCollection}
                                disabled={selectedContainers.length === 0}
                                className="flex-1 flex items-center justify-center rounded-lg bg-teal-600 px-6 py-4 text-white hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Play className="mr-2 h-5 w-5" />
                                Начать Сбор
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DriverCollection;
