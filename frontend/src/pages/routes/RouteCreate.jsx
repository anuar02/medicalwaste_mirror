import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Plus, Route as RouteIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import Loader from '../../components/ui/Loader';
import Button from '../../components/ui/Button';
import Map from '../../components/map/Map';

const DEFAULT_CENTER = [43.2364, 76.9457];

const RouteCreate = () => {
    const navigate = useNavigate();
    const { isSupervisor, isAdmin, userCompany } = useAuth();
    const [name, setName] = useState('');
    const [companyId, setCompanyId] = useState('');
    const [assignedDriver, setAssignedDriver] = useState('');
    const [assignedVehicle, setAssignedVehicle] = useState('');
    const [scheduleType, setScheduleType] = useState('daily');
    const [scheduleDays, setScheduleDays] = useState([]);
    const [scheduleTime, setScheduleTime] = useState('08:00');
    const [customDate, setCustomDate] = useState('');
    const [selectedBins, setSelectedBins] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [optimizeAfterCreate, setOptimizeAfterCreate] = useState(true);

    const binsQuery = useQuery({
        queryKey: ['routeCreateBins'],
        queryFn: () => apiService.wasteBins.getAll({ limit: 100 }),
        enabled: isSupervisor
    });

    const usersQuery = useQuery({
        queryKey: ['routeCreateDrivers'],
        queryFn: () => apiService.users.getAllUsers(),
        enabled: isSupervisor
    });

    const companiesQuery = useQuery({
        queryKey: ['routeCreateCompanies'],
        queryFn: () => apiService.companies.getAll(),
        enabled: isAdmin
    });

    const bins = binsQuery.data?.data?.data?.bins || [];
    const drivers = (usersQuery.data?.data?.data?.users || []).filter((user) => user.role === 'driver');
    const companies = companiesQuery.data?.data?.data?.companies || [];

    const selectableDrivers = useMemo(() => {
        if (isAdmin && companyId) {
            return drivers.filter((driver) => String(driver.company?._id || driver.company || '') === String(companyId));
        }
        if (userCompany) {
            return drivers.filter((driver) => String(driver.company?._id || driver.company || '') === String(userCompany));
        }
        return drivers;
    }, [drivers, companyId, isAdmin, userCompany]);

    const selectableBins = useMemo(() => {
        const withCoords = bins.filter((bin) => Array.isArray(bin.location?.coordinates) && bin.location.coordinates.length === 2);
        if (isAdmin && companyId) {
            return withCoords.filter((bin) => String(bin.company?._id || bin.company || '') === String(companyId));
        }
        if (userCompany) {
            return withCoords.filter((bin) => String(bin.company?._id || bin.company || '') === String(userCompany));
        }
        return withCoords;
    }, [bins, companyId, isAdmin, userCompany]);

    const selectedMarkers = useMemo(() => {
        return selectedBins.map((bin) => ({
            id: bin._id,
            position: [bin.location.coordinates[1], bin.location.coordinates[0]],
            popup: `${bin.binId || 'Контейнер'}`
        }));
    }, [selectedBins]);

    const mapCenter = selectedMarkers[0]?.position || DEFAULT_CENTER;

    const toggleBinSelection = (bin) => {
        setSelectedBins((prev) => {
            const exists = prev.find((item) => item._id === bin._id);
            if (exists) {
                return prev.filter((item) => item._id !== bin._id);
            }
            return [...prev, bin];
        });
    };

    const handleDayToggle = (dayKey) => {
        setScheduleDays((prev) => {
            if (prev.includes(dayKey)) {
                return prev.filter((day) => day !== dayKey);
            }
            return [...prev, dayKey];
        });
    };

    const buildStopsPayload = () => {
        return selectedBins.map((bin, index) => ({
            containers: [bin._id],
            order: index + 1,
            estimatedDuration: 10,
            notes: '',
            location: {
                type: 'Point',
                coordinates: bin.location.coordinates
            }
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!name.trim()) {
            toast.error('Укажите название маршрута');
            return;
        }

        if (isAdmin && !companyId) {
            toast.error('Выберите компанию');
            return;
        }

        if (!isAdmin && !userCompany) {
            toast.error('У аккаунта не задана компания');
            return;
        }

        if (selectedBins.length === 0) {
            toast.error('Выберите хотя бы один контейнер');
            return;
        }

        setIsSaving(true);
        try {
            const schedule = {
                type: scheduleType,
                time: scheduleTime,
                timezone: 'Asia/Almaty'
            };

            if (scheduleType === 'weekly') {
                schedule.days = scheduleDays;
            }

            if (scheduleType === 'custom' && customDate) {
                schedule.customDates = [new Date(customDate)];
            }

            const payload = {
                name: name.trim(),
                ...(isAdmin ? { company: companyId } : {}),
                assignedDriver: assignedDriver || undefined,
                assignedVehicle: assignedVehicle.trim() || undefined,
                schedule,
                stops: buildStopsPayload(),
                status: 'active'
            };

            const response = await apiService.routes.create(payload);
            const routeId = response?.data?.data?.route?._id;

            if (optimizeAfterCreate && routeId) {
                await apiService.routes.optimize(routeId);
            }

            toast.success('Маршрут создан');
            navigate(`/routes/${routeId}`);
        } catch (error) {
            console.error('Route creation failed:', error);
            toast.error('Не удалось создать маршрут');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isSupervisor) {
        return (
            <div className="min-h-screen bg-slate-50 p-6">
                <div className="mx-auto max-w-3xl rounded-lg bg-white p-6 shadow-sm">
                    <h1 className="text-2xl font-semibold text-slate-800">Создание маршрута</h1>
                    <p className="mt-2 text-slate-600">Доступно только для администраторов и супервайзеров.</p>
                </div>
            </div>
        );
    }

    if (binsQuery.isLoading || usersQuery.isLoading || (isAdmin && companiesQuery.isLoading)) {
        return <Loader text="Загрузка данных..." />;
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4">
            <div className="mx-auto max-w-7xl space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Новый маршрут</h1>
                        <p className="mt-1 text-sm text-slate-500">Сформируйте план и назначьте водителя</p>
                    </div>
                    <Button variant="outline" onClick={() => navigate('/routes')}>
                        Назад к списку
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="space-y-6">
                        <div className="rounded-lg bg-white p-5 shadow-sm">
                            <div className="flex items-center gap-2 text-slate-700">
                                <RouteIcon className="h-5 w-5" />
                                <h2 className="text-lg font-semibold">Детали маршрута</h2>
                            </div>
                            <div className="mt-4 grid gap-4">
                                {isAdmin && (
                                    <div>
                                        <label className="text-sm font-medium text-slate-600">Компания</label>
                                        <select
                                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                            value={companyId}
                                            onChange={(event) => {
                                                setCompanyId(event.target.value);
                                                setSelectedBins([]);
                                            }}
                                        >
                                            <option value="">Выберите компанию</option>
                                            {companies.map((company) => (
                                                <option key={company._id} value={company._id}>
                                                    {company.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div>
                                    <label className="text-sm font-medium text-slate-600">Название</label>
                                    <input
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                        value={name}
                                        onChange={(event) => setName(event.target.value)}
                                        placeholder="Маршрут №1"
                                    />
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="text-sm font-medium text-slate-600">Водитель</label>
                                        <select
                                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                            value={assignedDriver}
                                            onChange={(event) => setAssignedDriver(event.target.value)}
                                        >
                                            <option value="">Не назначен</option>
                                            {selectableDrivers.map((driver) => (
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
                            </div>
                        </div>

                        <div className="rounded-lg bg-white p-5 shadow-sm">
                            <div className="flex items-center gap-2 text-slate-700">
                                <MapPin className="h-5 w-5" />
                                <h2 className="text-lg font-semibold">Контейнеры</h2>
                            </div>
                            <p className="mt-2 text-sm text-slate-500">
                                Выберите контейнеры с координатами для маршрута
                            </p>
                            <div className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1">
                                {selectableBins.map((bin) => {
                                    const isSelected = selectedBins.some((item) => item._id === bin._id);
                                    return (
                                        <button
                                            type="button"
                                            key={bin._id}
                                            className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition ${
                                                isSelected ? 'border-teal-500 bg-teal-50' : 'border-slate-200 hover:bg-slate-50'
                                            }`}
                                            onClick={() => toggleBinSelection(bin)}
                                        >
                                            <div>
                                                <p className="font-medium text-slate-800">{bin.binId}</p>
                                                <p className="text-xs text-slate-500">{bin.department || 'Без отдела'}</p>
                                            </div>
                                            <span className="text-xs text-slate-500">{bin.fullness || 0}%</span>
                                        </button>
                                    );
                                })}
                            </div>
                            {selectableBins.length === 0 && (
                                <p className="mt-4 text-sm text-slate-500">
                                    Нет контейнеров с координатами. Добавьте координаты контейнеров, чтобы строить маршруты.
                                </p>
                            )}
                        </div>

                        <div className="rounded-lg bg-white p-5 shadow-sm">
                            <h2 className="text-lg font-semibold text-slate-800">Расписание</h2>
                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="text-sm font-medium text-slate-600">Тип</label>
                                    <select
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                        value={scheduleType}
                                        onChange={(event) => setScheduleType(event.target.value)}
                                    >
                                        <option value="daily">Ежедневно</option>
                                        <option value="weekly">По дням недели</option>
                                        <option value="custom">Разовая дата</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-600">Время</label>
                                    <input
                                        type="time"
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                        value={scheduleTime}
                                        onChange={(event) => setScheduleTime(event.target.value)}
                                    />
                                </div>
                            </div>
                            {scheduleType === 'weekly' && (
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {[
                                        ['mon', 'Пн'],
                                        ['tue', 'Вт'],
                                        ['wed', 'Ср'],
                                        ['thu', 'Чт'],
                                        ['fri', 'Пт'],
                                        ['sat', 'Сб'],
                                        ['sun', 'Вс']
                                    ].map(([key, label]) => (
                                        <button
                                            type="button"
                                            key={key}
                                            className={`rounded-full border px-3 py-1 text-xs ${
                                                scheduleDays.includes(key)
                                                    ? 'border-teal-500 bg-teal-50 text-teal-700'
                                                    : 'border-slate-200 text-slate-600'
                                            }`}
                                            onClick={() => handleDayToggle(key)}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {scheduleType === 'custom' && (
                                <div className="mt-4">
                                    <label className="text-sm font-medium text-slate-600">Дата</label>
                                    <input
                                        type="date"
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                        value={customDate}
                                        onChange={(event) => setCustomDate(event.target.value)}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="rounded-lg bg-white p-5 shadow-sm">
                            <label className="flex items-center gap-3 text-sm text-slate-600">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-slate-300 text-teal-600"
                                    checked={optimizeAfterCreate}
                                    onChange={(event) => setOptimizeAfterCreate(event.target.checked)}
                                />
                                Оптимизировать порядок сразу после создания
                            </label>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="rounded-lg bg-white p-4 shadow-sm">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-slate-800">Карта</h2>
                                <span className="text-xs text-slate-500">{selectedBins.length} точек</span>
                            </div>
                            <div className="mt-4 h-72 overflow-hidden rounded-lg border border-slate-200">
                                <Map center={mapCenter} zoom={12} markers={selectedMarkers} />
                            </div>
                        </div>

                        <div className="rounded-lg bg-white p-5 shadow-sm">
                            <div className="flex items-center gap-2 text-slate-700">
                                <Plus className="h-5 w-5" />
                                <h2 className="text-lg font-semibold">Готово к созданию</h2>
                            </div>
                            <p className="mt-2 text-sm text-slate-500">
                                Проверьте маршрут и сохраните изменения
                            </p>
                            <div className="mt-4 flex flex-col gap-3">
                                <Button type="submit" isLoading={isSaving} fullWidth>
                                    Создать маршрут
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    color="slate"
                                    fullWidth
                                    onClick={() => navigate('/routes')}
                                >
                                    Отмена
                                </Button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RouteCreate;
