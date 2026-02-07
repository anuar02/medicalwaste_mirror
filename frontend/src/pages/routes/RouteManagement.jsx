import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Calendar, RefreshCw, Route as RouteIcon, Users, MapPin } from 'lucide-react';
import apiService from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import Loader from '../../components/ui/Loader';
import Button from '../../components/ui/Button';

const STATUS_STYLES = {
    suggested: 'bg-amber-100 text-amber-800',
    active: 'bg-emerald-100 text-emerald-800',
    paused: 'bg-slate-100 text-slate-700',
    archived: 'bg-slate-100 text-slate-700'
};

const RouteManagement = () => {
    const { isSupervisor } = useAuth();
    const navigate = useNavigate();
    const [status, setStatus] = useState('');
    const [day, setDay] = useState('');

    const routesQuery = useQuery({
        queryKey: ['routes', status, day],
        queryFn: () => apiService.routes.getAll({
            ...(status ? { status } : {}),
            ...(day ? { day } : {})
        }),
        enabled: isSupervisor,
        refetchInterval: 60000
    });

    const suggestionsQuery = useQuery({
        queryKey: ['routeSuggestions'],
        queryFn: () => apiService.routes.getSuggestions(),
        enabled: isSupervisor,
        refetchInterval: 60000
    });

    const routes = routesQuery.data?.data?.data?.routes || [];
    const suggestions = suggestionsQuery.data?.data?.data?.routes || [];

    const totalStops = useMemo(() => {
        return routes.reduce((sum, route) => sum + (route.totalStops || route.stops?.length || 0), 0);
    }, [routes]);

    if (!isSupervisor) {
        return (
            <div className="min-h-screen bg-slate-50 p-6">
                <div className="mx-auto max-w-4xl rounded-lg bg-white p-6 shadow-sm">
                    <h1 className="text-2xl font-semibold text-slate-800">Маршруты</h1>
                    <p className="mt-2 text-slate-600">Доступ только для администраторов и супервайзеров.</p>
                </div>
            </div>
        );
    }

    if (routesQuery.isLoading) {
        return <Loader text="Загрузка маршрутов..." />;
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4">
            <div className="mx-auto max-w-7xl space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Маршруты</h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Управление маршрутами и предложения от системы
                        </p>
                    </div>
                    <Button onClick={() => navigate('/routes/create')}>
                        Создать маршрут
                    </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-lg bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between text-sm text-slate-500">
                            <span>Всего маршрутов</span>
                            <RouteIcon className="h-4 w-4 text-slate-400" />
                        </div>
                        <div className="mt-3 text-2xl font-semibold text-slate-800">{routes.length}</div>
                    </div>
                    <div className="rounded-lg bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between text-sm text-slate-500">
                            <span>Всего остановок</span>
                            <MapPin className="h-4 w-4 text-slate-400" />
                        </div>
                        <div className="mt-3 text-2xl font-semibold text-slate-800">{totalStops}</div>
                    </div>
                    <div className="rounded-lg bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between text-sm text-slate-500">
                            <span>Предложения системы</span>
                            <Users className="h-4 w-4 text-slate-400" />
                        </div>
                        <div className="mt-3 text-2xl font-semibold text-slate-800">{suggestions.length}</div>
                    </div>
                </div>

                <div className="rounded-lg bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Calendar className="h-4 w-4" />
                            <span>День</span>
                        </div>
                        <select
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            value={day}
                            onChange={(event) => setDay(event.target.value)}
                        >
                            <option value="">Все</option>
                            <option value="mon">Пн</option>
                            <option value="tue">Вт</option>
                            <option value="wed">Ср</option>
                            <option value="thu">Чт</option>
                            <option value="fri">Пт</option>
                            <option value="sat">Сб</option>
                            <option value="sun">Вс</option>
                        </select>

                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <span>Статус</span>
                        </div>
                        <select
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            value={status}
                            onChange={(event) => setStatus(event.target.value)}
                        >
                            <option value="">Все</option>
                            <option value="suggested">Предложен</option>
                            <option value="active">Активен</option>
                            <option value="paused">Пауза</option>
                            <option value="archived">Архив</option>
                        </select>

                        <Button
                            variant="outline"
                            color="slate"
                            onClick={() => routesQuery.refetch()}
                            isLoading={routesQuery.isFetching}
                        >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Обновить
                        </Button>
                    </div>
                </div>

                {suggestions.length > 0 && (
                    <div className="rounded-lg bg-amber-50 p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-amber-900">Предложения системы</h2>
                                <p className="text-sm text-amber-700">
                                    Маршруты, сформированные по уровню заполнения контейнеров
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                color="amber"
                                onClick={() => suggestionsQuery.refetch()}
                                isLoading={suggestionsQuery.isFetching}
                            >
                                Обновить
                            </Button>
                        </div>
                        <div className="mt-4 grid gap-3 lg:grid-cols-2">
                            {suggestions.map((route) => (
                                <div key={route._id} className="rounded-lg bg-white p-4 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800">{route.name}</p>
                                            <p className="text-xs text-slate-500">
                                                Остановок: {route.totalStops || route.stops?.length || 0}
                                            </p>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            color="amber"
                                            onClick={() => navigate(`/routes/${route._id}`)}
                                        >
                                            Открыть
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid gap-4">
                    {routes.length === 0 && (
                        <div className="rounded-lg bg-white p-8 text-center text-slate-500 shadow-sm">
                            Пока нет маршрутов. Создайте первый маршрут или используйте предложения системы.
                        </div>
                    )}
                    {routes.map((route) => (
                        <div key={route._id} className="rounded-lg bg-white p-5 shadow-sm">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-lg font-semibold text-slate-800">{route.name}</h3>
                                        <span
                                            className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[route.status] || 'bg-slate-100 text-slate-600'}`}
                                        >
                                            {route.status}
                                        </span>
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-500">
                                        <span>Остановок: {route.totalStops || route.stops?.length || 0}</span>
                                        <span>Контейнеров: {route.totalContainers || 0}</span>
                                        {route.assignedDriver && (
                                            <span>Водитель: {route.assignedDriver.username || route.assignedDriver.email}</span>
                                        )}
                                        <span>
                                            Расписание: {route.schedule?.type || 'daily'} {route.schedule?.time || ''}
                                        </span>
                                    </div>
                                </div>
                                <Button variant="outline" onClick={() => navigate(`/routes/${route._id}`)}>
                                    Детали
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default RouteManagement;
