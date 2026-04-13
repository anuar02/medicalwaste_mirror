// frontend/src/pages/DriverDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import { useAuth } from '../contexts/AuthContext';
import {
    Truck,
    Play,
    Square,
    Package,
    Clock,
    MapPin,
    Activity,
    AlertCircle,
    TrendingUp,
    Navigation as NavigationIcon,
    RefreshCw
} from 'lucide-react';
import apiService from "../services/api";
import 'leaflet/dist/leaflet.css';

// Fix default Leaflet marker icons (CRA breaks them)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const activeDriverIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

const idleDriverIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

// Default map center — Almaty, Kazakhstan
const DEFAULT_CENTER = [43.238949, 76.889709];

// ─── Shared active-drivers hook ──────────────────────────────────────────────

function useActiveDriverSessions(refetchInterval = 30000) {
    const { data, isLoading, refetch, isFetching } = useQuery({
        queryKey: ['active-driver-sessions'],
        queryFn: () => apiService.collections.getActiveDrivers(),
        refetchInterval,
        staleTime: refetchInterval * 0.6,
    });
    // Backend returns: { data: { activeDrivers: [{ session, lastLocation }] } }
    const driverSessions = data?.data?.data?.activeDrivers ?? [];
    return { driverSessions, isLoading, refetch, isFetching };
}

function formatSessionDuration(startTime) {
    const minutes = Math.floor((Date.now() - new Date(startTime).getTime()) / 60000);
    if (minutes < 60) return `${minutes} мин`;
    return `${Math.floor(minutes / 60)}ч ${minutes % 60}мин`;
}

// ─── Admin Driver Tracking Map ────────────────────────────────────────────────

function AdminDriverTrackingView() {
    const navigate = useNavigate();
    const { driverSessions, isLoading, refetch, isFetching } = useActiveDriverSessions(15000);

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="border-b border-slate-200 bg-white px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Мониторинг Водителей</h1>
                        <p className="text-sm text-slate-500 mt-0.5">
                            Активных сессий: <span className="font-semibold text-teal-600">{driverSessions.length}</span>
                        </p>
                    </div>
                    <button
                        onClick={() => refetch()}
                        disabled={isFetching}
                        className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                        Обновить
                    </button>
                </div>
            </div>

            <div className="flex h-[calc(100vh-73px)]">
                {/* Sidebar — active sessions list */}
                <div className="w-80 shrink-0 overflow-y-auto border-r border-slate-200 bg-white">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
                        </div>
                    ) : driverSessions.length === 0 ? (
                        <div className="p-6 text-center text-slate-500">
                            <Truck className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                            <p className="text-sm">Нет активных сессий</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {driverSessions.map(({ session, lastLocation }) => {
                                const driver = session.driver || {};
                                const visited = (session.selectedContainers || []).filter(c => c.visited).length;
                                const total = (session.selectedContainers || []).length;
                                return (
                                    <div
                                        key={session._id || session.sessionId}
                                        className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer"
                                        onClick={() => driver._id && navigate(`/admin/drivers/${driver._id}`)}
                                    >
                                        <div className="h-2.5 w-2.5 rounded-full shrink-0 bg-teal-500" />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium text-slate-800">
                                                {driver.firstName || driver.username || driver.email || '—'}
                                                {driver.lastName ? ` ${driver.lastName}` : ''}
                                            </p>
                                            <p className="truncate text-xs text-slate-500">
                                                {driver.vehicleInfo?.plateNumber ?? '—'}
                                                {' · '}{visited}/{total} контейнеров
                                            </p>
                                        </div>
                                        {lastLocation && (
                                            <MapPin className="h-3.5 w-3.5 shrink-0 text-teal-500" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Map */}
                <div className="flex-1 relative">
                    <MapContainer
                        center={DEFAULT_CENTER}
                        zoom={11}
                        style={{ height: '100%', width: '100%' }}
                        zoomControl={true}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        {driverSessions.map(({ session, lastLocation }) => {
                            const driver = session.driver || {};
                            const lat = lastLocation?.coordinates?.[1];
                            const lng = lastLocation?.coordinates?.[0];
                            if (!lat || !lng) return null;
                            const visited = (session.selectedContainers || []).filter(c => c.visited).length;
                            const total = (session.selectedContainers || []).length;
                            return (
                                <React.Fragment key={session._id || session.sessionId}>
                                    <Marker
                                        position={[lat, lng]}
                                        icon={activeDriverIcon}
                                    >
                                        <Popup>
                                            <div className="text-sm">
                                                <p className="font-semibold">
                                                    {driver.firstName || driver.username || driver.email || '—'}
                                                    {driver.lastName ? ` ${driver.lastName}` : ''}
                                                </p>
                                                <p className="text-slate-500">{driver.vehicleInfo?.plateNumber ?? '—'}</p>
                                                <p className="text-teal-600">В работе</p>
                                                <p className="text-xs text-slate-500 mt-1">
                                                    Посещено: {visited} / {total}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    Время: {formatSessionDuration(session.startTime)}
                                                </p>
                                                {driver._id && (
                                                    <button
                                                        className="mt-2 text-teal-600 hover:text-teal-700 text-xs underline"
                                                        onClick={() => navigate(`/admin/drivers/${driver._id}`)}
                                                    >
                                                        Подробнее →
                                                    </button>
                                                )}
                                            </div>
                                        </Popup>
                                    </Marker>
                                    <Circle
                                        center={[lat, lng]}
                                        radius={300}
                                        pathOptions={{ color: '#0d9488', fillColor: '#0d9488', fillOpacity: 0.08, weight: 1 }}
                                    />
                                </React.Fragment>
                            );
                        })}
                    </MapContainer>

                    {/* Legend */}
                    <div className="absolute bottom-4 right-4 rounded-lg bg-white shadow-lg border border-slate-200 p-3 text-xs space-y-1.5 z-[1000]">
                        <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full bg-teal-500" />
                            <span className="text-slate-600">Активный водитель</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3 text-teal-500" />
                            <span className="text-slate-600">GPS активен</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Supervisor Session Monitor ───────────────────────────────────────────────

function SupervisorSessionMonitorView() {
    const navigate = useNavigate();
    const { driverSessions, isLoading, refetch, isFetching } = useActiveDriverSessions(30000);

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="border-b border-slate-200 bg-white px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Активные Сессии</h1>
                        <p className="text-sm text-slate-500 mt-0.5">
                            Водителей в работе: <span className="font-semibold text-teal-600">{driverSessions.length}</span>
                        </p>
                    </div>
                    <button
                        onClick={() => refetch()}
                        disabled={isFetching}
                        className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                        Обновить
                    </button>
                </div>
            </div>

            <div className="p-6">
                {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
                    </div>
                ) : driverSessions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                        <Truck className="h-14 w-14 mb-3 text-slate-300" />
                        <p className="text-lg font-medium text-slate-600">Нет активных сессий</p>
                        <p className="text-sm mt-1">Водители ещё не начали сбор</p>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {driverSessions.map(({ session, lastLocation }) => {
                            const driver = session.driver || {};
                            const containers = session.selectedContainers || [];
                            const visited = containers.filter(c => c.visited).length;
                            const total = containers.length;
                            const progress = total > 0 ? Math.round((visited / total) * 100) : 0;
                            const driverName = driver.firstName
                                ? `${driver.firstName}${driver.lastName ? ` ${driver.lastName}` : ''}`
                                : (driver.username || driver.email || '—');

                            return (
                                <div
                                    key={session._id || session.sessionId}
                                    className="rounded-xl bg-white border border-slate-200 shadow-sm p-5 flex flex-col gap-3"
                                >
                                    {/* Driver header */}
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-50">
                                                <Truck className="h-4 w-4 text-teal-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-800 leading-tight">
                                                    {driverName}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {driver.vehicleInfo?.plateNumber ?? '—'}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-700">
                                            В работе
                                        </span>
                                    </div>

                                    {/* Progress bar */}
                                    <div>
                                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                                            <span>Контейнеры</span>
                                            <span className="font-medium text-slate-700">{visited} / {total}</span>
                                        </div>
                                        <div className="h-2 w-full rounded-full bg-slate-100">
                                            <div
                                                className="h-2 rounded-full bg-teal-500 transition-all duration-500"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                        <p className="mt-1 text-xs text-slate-400 text-right">{progress}%</p>
                                    </div>

                                    {/* Meta row */}
                                    <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2">
                                        <span className="flex items-center gap-1.5">
                                            <Clock className="h-3.5 w-3.5" />
                                            {formatSessionDuration(session.startTime)}
                                        </span>
                                        {lastLocation ? (
                                            <span className="flex items-center gap-1 text-teal-600 font-medium">
                                                <MapPin className="h-3.5 w-3.5" />
                                                GPS активен
                                            </span>
                                        ) : (
                                            <span className="text-slate-300">GPS недоступен</span>
                                        )}
                                    </div>

                                    {/* Link */}
                                    {driver._id && (
                                        <button
                                            onClick={() => navigate(`/admin/drivers/${driver._id}`)}
                                            className="mt-auto text-xs font-medium text-teal-600 hover:text-teal-700 text-left underline"
                                        >
                                            Подробнее о водителе →
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Driver Dashboard ─────────────────────────────────────────────────────────

const DriverDashboard = () => {
    const { user, isAdmin, isSupervisor } = useAuth();
    const navigate = useNavigate();
    const [activeSession, setActiveSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        todayCollections: 0,
        weekCollections: 0,
        activeTime: 0
    });

    const isDriver = user?.role === 'driver';
    const isApprovedDriver = isDriver && user?.verificationStatus === 'approved';

    useEffect(() => {
        // Allow drivers, admins, and supervisors to access this page
        if (!isDriver && !isAdmin && !isSupervisor) {
            navigate('/');
            return;
        }

        if (isDriver) {
            fetchActiveSession();
            fetchStats();
        }

        setLoading(false);
    }, [user, navigate, isDriver, isAdmin, isSupervisor]);

    const fetchActiveSession = async () => {
        try {
            const response = await apiService.collections.getActive();
            setActiveSession(response.data.data.session);
        } catch (error) {
            if (error.response?.status !== 404) {
                console.error('Error fetching active session:', error);
            }
        }
    };

    const fetchStats = async () => {
        try {
            const response = await apiService.collections.getHistory(user.id, {
                from: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
                limit: 100
            });
            setStats({
                todayCollections: response.data.results || 0,
                weekCollections: response.data.total || 0,
                activeTime: 0
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const handleStartCollection = () => {
        navigate('/driver/collection');
    };

    const handleContinueCollection = () => {
        navigate('/driver/collection');
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-teal-500"></div>
            </div>
        );
    }

    // Admin view — live driver tracking map with GPS
    if (isAdmin && !isDriver) {
        return <AdminDriverTrackingView />;
    }

    // Supervisor view — active session progress cards
    if (isSupervisor && !isDriver) {
        return <SupervisorSessionMonitorView />;
    }

    // Driver view
    return (
        <div className="min-h-screen bg-slate-50 p-4">
            <div className="mx-auto max-w-7xl">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-slate-800">
                        Панель Водителя
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Добро пожаловать, {user?.username}
                    </p>
                </div>

                {/* Verification Status Warning */}
                {user?.verificationStatus === 'pending' && (
                    <div className="mb-6 rounded-lg bg-yellow-50 border border-yellow-200 p-4">
                        <div className="flex items-center">
                            <AlertCircle className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0" />
                            <p className="text-sm text-yellow-800">
                                Ваш аккаунт ожидает верификации администратором. Функция сбора будет доступна после одобрения.
                            </p>
                        </div>
                    </div>
                )}

                {user?.verificationStatus === 'rejected' && (
                    <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4">
                        <div className="flex items-center">
                            <AlertCircle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-semibold text-red-800 mb-1">
                                    Ваша заявка была отклонена
                                </p>
                                <p className="text-sm text-red-700">
                                    Пожалуйста, свяжитесь с администратором для получения дополнительной информации.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Vehicle Info Card */}
                <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="rounded-full bg-teal-100 p-3">
                                <Truck className="h-6 w-6 text-teal-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-slate-800">
                                    {user?.vehicleInfo?.plateNumber || 'Не указано'}
                                </h3>
                                <p className="text-sm text-slate-500">
                                    {user?.vehicleInfo?.vehicleType || 'Не указано'} {user?.vehicleInfo?.model || ''}
                                </p>
                            </div>
                        </div>
                        {isApprovedDriver && (
                            <div className="px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-medium">
                                Верифицирован
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Action Card */}
                <div className="mb-6 rounded-lg bg-white p-8 shadow-sm">
                    {activeSession ? (
                        <div className="text-center">
                            <div className="mb-4 inline-flex items-center rounded-full bg-green-100 px-6 py-2 text-green-800">
                                <Activity className="mr-2 h-5 w-5 animate-pulse" />
                                <span className="font-semibold text-lg">Сбор Активен</span>
                            </div>

                            <div className="mb-6 space-y-2">
                                <div className="flex items-center justify-center text-slate-600">
                                    <Clock className="h-4 w-4 mr-2" />
                                    <span className="text-sm">
                                        Начато: {new Date(activeSession.startTime).toLocaleString('ru-RU')}
                                    </span>
                                </div>
                                <div className="flex items-center justify-center text-slate-600">
                                    <Package className="h-4 w-4 mr-2" />
                                    <span className="text-sm">
                                        Контейнеров выбрано: {activeSession.selectedContainers?.length || 0}
                                    </span>
                                </div>
                                <div className="flex items-center justify-center text-slate-600">
                                    <MapPin className="h-4 w-4 mr-2" />
                                    <span className="text-sm">
                                        Посещено: {activeSession.selectedContainers?.filter(c => c.visited).length || 0} из {activeSession.selectedContainers?.length || 0}
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={handleContinueCollection}
                                className="inline-flex items-center rounded-lg bg-teal-600 px-8 py-4 text-white hover:bg-teal-700 transition-colors shadow-lg"
                            >
                                <NavigationIcon className="mr-2 h-5 w-5" />
                                Продолжить Сбор
                            </button>
                        </div>
                    ) : (
                        <div className="text-center">
                            <div className="mb-4 inline-flex items-center justify-center rounded-full bg-slate-100 p-4">
                                <Truck className="h-12 w-12 text-slate-600" />
                            </div>
                            <h2 className="mb-2 text-2xl font-bold text-slate-800">
                                Готовы начать сбор?
                            </h2>
                            <p className="mb-6 text-slate-600 max-w-md mx-auto">
                                Начните новую сессию сбора медицинских отходов. Система будет отслеживать ваш маршрут и посещенные контейнеры.
                            </p>

                            <button
                                onClick={handleStartCollection}
                                disabled={!isApprovedDriver}
                                className="inline-flex items-center rounded-lg bg-teal-600 px-8 py-4 text-white hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                            >
                                <Play className="mr-2 h-5 w-5" />
                                Начать Сбор
                            </button>

                            {!isApprovedDriver && (
                                <p className="mt-4 text-sm text-amber-600">
                                    Дождитесь верификации вашего аккаунта
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Stats Grid */}
                <div className="grid gap-6 md:grid-cols-3 mb-6">
                    <div className="rounded-lg bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Сегодня</p>
                                <p className="text-2xl font-bold text-slate-800">
                                    {stats.todayCollections}
                                </p>
                                <p className="text-xs text-slate-500">сборов</p>
                            </div>
                            <div className="rounded-full bg-blue-100 p-3">
                                <Package className="h-6 w-6 text-blue-600" />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-lg bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Эта неделя</p>
                                <p className="text-2xl font-bold text-slate-800">
                                    {stats.weekCollections}
                                </p>
                                <p className="text-xs text-slate-500">сборов</p>
                            </div>
                            <div className="rounded-full bg-green-100 p-3">
                                <TrendingUp className="h-6 w-6 text-green-600" />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-lg bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Активное время</p>
                                <p className="text-2xl font-bold text-slate-800">
                                    {stats.activeTime}
                                </p>
                                <p className="text-xs text-slate-500">часов</p>
                            </div>
                            <div className="rounded-full bg-purple-100 p-3">
                                <Clock className="h-6 w-6 text-purple-600" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid gap-6 md:grid-cols-2">
                    <div className="rounded-lg bg-white p-6 shadow-sm">
                        <h3 className="mb-4 text-lg font-semibold text-slate-800 flex items-center">
                            <NavigationIcon className="h-5 w-5 mr-2 text-teal-600" />
                            История Маршрутов
                        </h3>
                        <p className="text-sm text-slate-600 mb-4">
                            Просмотрите историю ваших маршрутов и посещенных контейнеров
                        </p>
                        <button
                            onClick={() => navigate('/tracking')}
                            className="text-teal-600 hover:text-teal-700 text-sm font-medium"
                        >
                            Посмотреть историю →
                        </button>
                    </div>

                    <div className="rounded-lg bg-white p-6 shadow-sm">
                        <h3 className="mb-4 text-lg font-semibold text-slate-800 flex items-center">
                            <MapPin className="h-5 w-5 mr-2 text-teal-600" />
                            Карта Контейнеров
                        </h3>
                        <p className="text-sm text-slate-600 mb-4">
                            Посмотрите расположение всех контейнеров на карте
                        </p>
                        <button
                            onClick={() => navigate('/map')}
                            className="text-teal-600 hover:text-teal-700 text-sm font-medium"
                        >
                            Открыть карту →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DriverDashboard;
