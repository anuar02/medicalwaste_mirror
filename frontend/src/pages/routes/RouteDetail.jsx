import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapPin, RefreshCw, Route as RouteIcon, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import Loader from '../../components/ui/Loader';
import Button from '../../components/ui/Button';
import Map from '../../components/map/Map';

const DEFAULT_CENTER = [43.2364, 76.9457];

const RouteDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isSupervisor } = useAuth();
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [isApproving, setIsApproving] = useState(false);
    const [assignedDriver, setAssignedDriver] = useState('');
    const [assignedVehicle, setAssignedVehicle] = useState('');

    const routeQuery = useQuery({
        queryKey: ['routeDetail', id],
        queryFn: () => apiService.routes.getById(id),
        enabled: !!id
    });

    const statsQuery = useQuery({
        queryKey: ['routeStats', id],
        queryFn: () => apiService.routes.getStats(id),
        enabled: !!id
    });

    const driversQuery = useQuery({
        queryKey: ['routeDetailDrivers'],
        queryFn: () => apiService.users.getAllUsers(),
        enabled: isSupervisor
    });

    const route = routeQuery.data?.data?.data?.route;
    const stats = statsQuery.data?.data?.data || {};
    const drivers = (driversQuery.data?.data?.data?.users || []).filter((user) => user.role === 'driver');

    const orderedStops = useMemo(() => {
        if (!route?.stops) return [];
        return [...route.stops].sort((a, b) => (a.order || 0) - (b.order || 0));
    }, [route]);

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

    const handleOptimize = async () => {
        if (!route?._id) return;
        setIsOptimizing(true);
        try {
            await apiService.routes.optimize(route._id);
            await routeQuery.refetch();
            toast.success('Маршрут оптимизирован');
        } catch (error) {
            console.error('Optimize failed:', error);
            toast.error('Не удалось оптимизировать маршрут');
        } finally {
            setIsOptimizing(false);
        }
    };

    const handleApprove = async () => {
        if (!route?._id) return;
        setIsApproving(true);
        try {
            await apiService.routes.approveSuggestion(route._id, {
                assignedDriver: assignedDriver || undefined,
                assignedVehicle: assignedVehicle || undefined
            });
            await routeQuery.refetch();
            toast.success('Маршрут одобрен');
        } catch (error) {
            console.error('Approve failed:', error);
            toast.error('Не удалось одобрить маршрут');
        } finally {
            setIsApproving(false);
        }
    };

    if (routeQuery.isLoading) {
        return <Loader text="Загрузка маршрута..." />;
    }

    if (!route) {
        return (
            <div className="min-h-screen bg-slate-50 p-6">
                <div className="mx-auto max-w-4xl rounded-lg bg-white p-6 shadow-sm">
                    <p className="text-slate-600">Маршрут не найден.</p>
                    <Button className="mt-4" onClick={() => navigate('/routes')}>
                        Вернуться к списку
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4">
            <div className="mx-auto max-w-7xl space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">{route.name}</h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Статус: {route.status} · Остановок: {route.totalStops || route.stops?.length || 0}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => navigate('/routes')}>
                            Назад
                        </Button>
                        {isSupervisor && (
                            <Button
                                variant="outline"
                                color="teal"
                                onClick={handleOptimize}
                                isLoading={isOptimizing}
                            >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Оптимизировать
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                    <div className="rounded-lg bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between text-sm text-slate-500">
                            <span>Дистанция (км)</span>
                            <RouteIcon className="h-4 w-4 text-slate-400" />
                        </div>
                        <div className="mt-3 text-2xl font-semibold text-slate-800">
                            {route.estimatedDistance || 0}
                        </div>
                    </div>
                    <div className="rounded-lg bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between text-sm text-slate-500">
                            <span>Среднее время</span>
                            <MapPin className="h-4 w-4 text-slate-400" />
                        </div>
                        <div className="mt-3 text-2xl font-semibold text-slate-800">
                            {stats.averageCompletionTime || 0} мин
                        </div>
                    </div>
                    <div className="rounded-lg bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between text-sm text-slate-500">
                            <span>Выполнение</span>
                            <Users className="h-4 w-4 text-slate-400" />
                        </div>
                        <div className="mt-3 text-2xl font-semibold text-slate-800">
                            {stats.completionRate || 0}%
                        </div>
                    </div>
                </div>

                {route.status === 'suggested' && isSupervisor && (
                    <div className="rounded-lg bg-amber-50 p-5 shadow-sm">
                        <h2 className="text-lg font-semibold text-amber-900">Одобрить маршрут</h2>
                        <p className="mt-1 text-sm text-amber-700">
                            Назначьте водителя и транспорт для активации маршрута
                        </p>
                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="text-sm font-medium text-slate-600">Водитель</label>
                                <select
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                    value={assignedDriver}
                                    onChange={(event) => setAssignedDriver(event.target.value)}
                                >
                                    <option value="">Не назначен</option>
                                    {drivers.map((driver) => (
                                        <option key={driver._id} value={driver._id}>
                                            {driver.username || driver.email}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-600">Транспорт</label>
                                <input
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                    value={assignedVehicle}
                                    onChange={(event) => setAssignedVehicle(event.target.value)}
                                    placeholder="123ABC 02"
                                />
                            </div>
                        </div>
                        <Button
                            className="mt-4"
                            color="amber"
                            onClick={handleApprove}
                            isLoading={isApproving}
                        >
                            Одобрить маршрут
                        </Button>
                    </div>
                )}

                <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
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
                        <h2 className="text-lg font-semibold text-slate-800">Остановки</h2>
                        <div className="mt-4 space-y-3">
                            {orderedStops.map((stop, index) => (
                                <div key={stop._id || index} className="rounded-lg border border-slate-200 p-3">
                                    <p className="text-sm font-medium text-slate-800">Остановка {index + 1}</p>
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
                </div>
            </div>
        </div>
    );
};

export default RouteDetail;
