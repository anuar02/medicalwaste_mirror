import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapPin, RefreshCw, Route as RouteIcon, Users, Edit2, Save, X } from 'lucide-react';
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
    const { isSupervisor, isAdmin } = useAuth();
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [isApproving, setIsApproving] = useState(false);
    const [assignedDriver, setAssignedDriver] = useState('');
    const [assignedVehicle, setAssignedVehicle] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editForm, setEditForm] = useState({
        name: '',
        assignedDriver: '',
        assignedVehicle: '',
        status: 'active',
        scheduleType: 'daily',
        scheduleTime: '08:00',
        scheduleDays: [],
    });

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
        enabled: isSupervisor || isAdmin
    });

    const route = routeQuery.data?.data?.data?.route;
    const stats = statsQuery.data?.data?.data || {};
    const drivers = (driversQuery.data?.data?.data?.users || []).filter((user) => user.role === 'driver');

    useEffect(() => {
        if (route) {
            setEditForm({
                name: route.name || '',
                assignedDriver: route.assignedDriver?._id || route.assignedDriver || '',
                assignedVehicle: route.assignedVehicle || '',
                status: route.status || 'active',
                scheduleType: route.schedule?.type || 'daily',
                scheduleTime: route.schedule?.time || '08:00',
                scheduleDays: route.schedule?.days || [],
            });
        }
    }, [route]);

    const handleSave = async () => {
        if (!route?._id) return;
        setIsSaving(true);
        try {
            await apiService.routes.update(route._id, {
                name: editForm.name,
                assignedDriver: editForm.assignedDriver || null,
                assignedVehicle: editForm.assignedVehicle,
                status: editForm.status,
                schedule: {
                    type: editForm.scheduleType,
                    time: editForm.scheduleTime,
                    days: editForm.scheduleDays,
                },
            });
            await routeQuery.refetch();
            setIsEditing(false);
            toast.success('Маршрут обновлён');
        } catch {
            toast.error('Не удалось сохранить изменения');
        } finally {
            setIsSaving(false);
        }
    };

    const toggleDay = (day) => {
        setEditForm((prev) => ({
            ...prev,
            scheduleDays: prev.scheduleDays.includes(day)
                ? prev.scheduleDays.filter((d) => d !== day)
                : [...prev.scheduleDays, day],
        }));
    };

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
                        {(isSupervisor || isAdmin) && !isEditing && (
                            <Button
                                variant="outline"
                                onClick={() => setIsEditing(true)}
                            >
                                <Edit2 className="mr-2 h-4 w-4" />
                                Редактировать
                            </Button>
                        )}
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

                {isEditing && (
                    <div className="rounded-lg bg-white p-5 shadow-sm border-2 border-teal-200">
                        <h2 className="text-lg font-semibold text-slate-800 mb-4">Редактировать маршрут</h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="text-sm font-medium text-slate-600">Название</label>
                                <input
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-600">Статус</label>
                                <select
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    value={editForm.status}
                                    onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}
                                >
                                    <option value="active">Активен</option>
                                    <option value="paused">Приостановлен</option>
                                    <option value="archived">В архиве</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-600">Водитель</label>
                                <select
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    value={editForm.assignedDriver}
                                    onChange={(e) => setEditForm((prev) => ({ ...prev, assignedDriver: e.target.value }))}
                                >
                                    <option value="">— Не назначен —</option>
                                    {drivers.map((d) => (
                                        <option key={d._id} value={d._id}>
                                            {d.firstName || d.username || d.email}
                                            {d.lastName ? ` ${d.lastName}` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-600">Транспорт</label>
                                <input
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    value={editForm.assignedVehicle}
                                    placeholder="напр. 001 AA 01"
                                    onChange={(e) => setEditForm((prev) => ({ ...prev, assignedVehicle: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-600">Тип расписания</label>
                                <select
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    value={editForm.scheduleType}
                                    onChange={(e) => setEditForm((prev) => ({ ...prev, scheduleType: e.target.value }))}
                                >
                                    <option value="daily">Ежедневно</option>
                                    <option value="weekly">По дням недели</option>
                                    <option value="custom">Произвольно</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-600">Время отправления</label>
                                <input
                                    type="time"
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    value={editForm.scheduleTime}
                                    onChange={(e) => setEditForm((prev) => ({ ...prev, scheduleTime: e.target.value }))}
                                />
                            </div>
                            {editForm.scheduleType === 'weekly' && (
                                <div className="md:col-span-2">
                                    <label className="text-sm font-medium text-slate-600">Дни недели</label>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {[
                                            { key: 'mon', label: 'Пн' },
                                            { key: 'tue', label: 'Вт' },
                                            { key: 'wed', label: 'Ср' },
                                            { key: 'thu', label: 'Чт' },
                                            { key: 'fri', label: 'Пт' },
                                            { key: 'sat', label: 'Сб' },
                                            { key: 'sun', label: 'Вс' },
                                        ].map(({ key, label }) => {
                                            const active = editForm.scheduleDays.includes(key);
                                            return (
                                                <button
                                                    key={key}
                                                    type="button"
                                                    onClick={() => toggleDay(key)}
                                                    className={`h-9 w-9 rounded-full text-sm font-medium transition-colors ${
                                                        active
                                                            ? 'bg-teal-500 text-white'
                                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                    }`}
                                                >
                                                    {label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="mt-5 flex gap-2">
                            <Button color="teal" onClick={handleSave} isLoading={isSaving}>
                                <Save className="mr-2 h-4 w-4" />
                                Сохранить
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsEditing(false);
                                    // Reset form to current route values
                                    if (route) {
                                        setEditForm({
                                            name: route.name || '',
                                            assignedDriver: route.assignedDriver?._id || route.assignedDriver || '',
                                            assignedVehicle: route.assignedVehicle || '',
                                            status: route.status || 'active',
                                            scheduleType: route.schedule?.type || 'daily',
                                            scheduleTime: route.schedule?.time || '08:00',
                                            scheduleDays: route.schedule?.days || [],
                                        });
                                    }
                                }}
                            >
                                <X className="mr-2 h-4 w-4" />
                                Отмена
                            </Button>
                        </div>
                    </div>
                )}

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
