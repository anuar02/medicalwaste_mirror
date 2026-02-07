import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Navigation, Route as RouteIcon, Play, RefreshCw } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import toast from 'react-hot-toast';
import apiService from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import Loader from '../../components/ui/Loader';
import Button from '../../components/ui/Button';
import Map from '../../components/map/Map';

const DEFAULT_CENTER = [43.2364, 76.9457];

const DriverRouteView = () => {
    const { user, isDriver } = useAuth();
    const navigate = useNavigate();
    const [isStarting, setIsStarting] = useState(false);

    const activeSessionQuery = useQuery({
        queryKey: ['driverActiveSession'],
        queryFn: () => apiService.collections.getActive(),
        enabled: isDriver,
        refetchInterval: 30000
    });

    const todayRoutesQuery = useQuery({
        queryKey: ['driverRoutesToday'],
        queryFn: () => apiService.routes.getToday(),
        enabled: isDriver,
        refetchInterval: 60000
    });

    const activeSession = activeSessionQuery.data?.data?.data?.session;
    const todayRoutes = todayRoutesQuery.data?.data?.data?.routes || [];

    const assignedRoutes = useMemo(() => {
        return todayRoutes.filter((route) => {
            if (!route.assignedDriver) return true;
            return String(route.assignedDriver?._id || route.assignedDriver) === String(user?.id || user?._id);
        });
    }, [todayRoutes, user]);

    const selectedRoute = assignedRoutes[0];
    const orderedStops = useMemo(() => {
        if (!selectedRoute?.stops) return [];
        return [...selectedRoute.stops].sort((a, b) => (a.order || 0) - (b.order || 0));
    }, [selectedRoute]);

    const markers = useMemo(() => {
        return orderedStops
            .map((stop, index) => {
                const coords = stop?.location?.coordinates;
                if (!Array.isArray(coords) || coords.length !== 2) return null;
                return {
                    id: stop._id || `${index}`,
                    position: [coords[1], coords[0]],
                    popup: `Остановка ${index + 1}`
                };
            })
            .filter(Boolean);
    }, [orderedStops]);

    const historyPath = markers.map((marker) => marker.position);
    const mapCenter = markers[0]?.position || DEFAULT_CENTER;

    const nextStop = orderedStops[0];

    const handleOpenNavigation = () => {
        const coords = nextStop?.location?.coordinates;
        if (!coords || coords.length !== 2) {
            toast.error('Нет координат для следующей остановки');
            return;
        }
        const destination = `${coords[1]},${coords[0]}`;
        const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
        const target = Capacitor.isNativePlatform() ? '_system' : '_blank';
        window.open(url, target, 'noopener,noreferrer');
    };

    const handleStartCollection = async () => {
        if (!selectedRoute?._id) return;
        setIsStarting(true);
        try {
            const containerIds = orderedStops.flatMap((stop) => stop.containers || []);
            await apiService.collections.start({
                routeId: selectedRoute._id,
                containerIds
            });
            toast.success('Сессия сбора запущена');
            navigate('/driver/collection');
        } catch (error) {
            console.error('Start collection failed:', error);
            toast.error('Не удалось запустить сессию');
        } finally {
            setIsStarting(false);
        }
    };

    if (!isDriver) {
        return (
            <div className="min-h-screen bg-slate-50 p-6">
                <div className="mx-auto max-w-3xl rounded-lg bg-white p-6 shadow-sm">
                    <h1 className="text-2xl font-semibold text-slate-800">Маршрут на сегодня</h1>
                    <p className="mt-2 text-slate-600">Доступно только для водителей.</p>
                </div>
            </div>
        );
    }

    if (todayRoutesQuery.isLoading) {
        return <Loader text="Загрузка маршрута..." />;
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4">
            <div className="mx-auto max-w-5xl space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Маршрут на сегодня</h1>
                        <p className="mt-1 text-sm text-slate-500">
                            {selectedRoute?.name || 'Маршрут не назначен'}
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => todayRoutesQuery.refetch()}
                        isLoading={todayRoutesQuery.isFetching}
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Обновить
                    </Button>
                </div>

                {!selectedRoute && (
                    <div className="rounded-lg bg-white p-6 text-center text-slate-500 shadow-sm">
                        Сегодня нет назначенных маршрутов.
                    </div>
                )}

                {selectedRoute && (
                    <>
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="rounded-lg bg-white p-4 shadow-sm">
                                <div className="flex items-center justify-between text-sm text-slate-500">
                                    <span>Остановок</span>
                                    <RouteIcon className="h-4 w-4 text-slate-400" />
                                </div>
                                <div className="mt-3 text-2xl font-semibold text-slate-800">
                                    {selectedRoute.totalStops || orderedStops.length}
                                </div>
                            </div>
                            <div className="rounded-lg bg-white p-4 shadow-sm">
                                <div className="flex items-center justify-between text-sm text-slate-500">
                                    <span>Дистанция</span>
                                    <MapPin className="h-4 w-4 text-slate-400" />
                                </div>
                                <div className="mt-3 text-2xl font-semibold text-slate-800">
                                    {selectedRoute.estimatedDistance || 0} км
                                </div>
                            </div>
                            <div className="rounded-lg bg-white p-4 shadow-sm">
                                <div className="flex items-center justify-between text-sm text-slate-500">
                                    <span>Время</span>
                                    <Navigation className="h-4 w-4 text-slate-400" />
                                </div>
                                <div className="mt-3 text-2xl font-semibold text-slate-800">
                                    {selectedRoute.estimatedDuration || 0} мин
                                </div>
                            </div>
                        </div>

                        <div className="rounded-lg bg-white p-4 shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-800">Следующая остановка</h2>
                                    <p className="text-sm text-slate-500">
                                        {nextStop ? 'Построить навигацию до следующей точки' : 'Остановки не назначены'}
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        variant="outline"
                                        color="teal"
                                        onClick={handleOpenNavigation}
                                        disabled={!nextStop}
                                    >
                                        <Navigation className="mr-2 h-4 w-4" />
                                        Навигация
                                    </Button>
                                    {!activeSession && (
                                        <Button onClick={handleStartCollection} isLoading={isStarting}>
                                            <Play className="mr-2 h-4 w-4" />
                                            Начать сбор
                                        </Button>
                                    )}
                                    {activeSession && (
                                        <Button onClick={() => navigate('/driver/collection')}>
                                            Продолжить сбор
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="rounded-lg bg-white p-4 shadow-sm">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-slate-800">Карта маршрута</h2>
                                <span className="text-xs text-slate-500">{markers.length} точек</span>
                            </div>
                            <div className="mt-4 h-80 overflow-hidden rounded-lg border border-slate-200">
                                <Map center={mapCenter} zoom={12} markers={markers} historyPath={historyPath} />
                            </div>
                        </div>

                        <div className="rounded-lg bg-white p-4 shadow-sm">
                            <h2 className="text-lg font-semibold text-slate-800">Список остановок</h2>
                            <div className="mt-4 space-y-3">
                                {orderedStops.map((stop, index) => (
                                    <div key={stop._id || index} className="rounded-lg border border-slate-200 p-3">
                                        <p className="text-sm font-medium text-slate-800">
                                            Остановка {index + 1}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            Контейнеров: {stop.containers?.length || 0}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            Время: {stop.estimatedDuration || 10} мин
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default DriverRouteView;
