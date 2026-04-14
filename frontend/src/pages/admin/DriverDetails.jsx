import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Polyline, Circle } from 'react-leaflet';
import L from 'leaflet';
import {
    ArrowLeft,
    Building2,
    Calendar,
    CheckCircle,
    Clock,
    FileText,
    MapPin,
    Phone,
    Truck,
    User,
    XCircle
} from 'lucide-react';
import apiService from '../../services/api';
import DashboardCard from '../../components/dashboard/DashboardCard';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../../contexts/AuthContext';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const DriverDetails = () => {
    const { isAdmin } = useAuth();
    const { driverId } = useParams();
    const location = useLocation();
    const queryClient = useQueryClient();
    const [verificationNotes, setVerificationNotes] = useState('');
    const [driverOverride, setDriverOverride] = useState(null);

    const driverFromState = location.state?.driver || null;
    const activeSessionFromState = location.state?.activeSession || null;
    const lastLocationFromState = location.state?.lastLocation || null;

    const { data: driversData, isLoading } = useQuery({
        queryKey: ['drivers'],
        queryFn: () => apiService.drivers.getAllDrivers(),
        enabled: !driverFromState
    });

    const drivers = driversData?.data?.data?.drivers || [];
    const driverFromQuery = useMemo(
        () => drivers.find((item) => item._id === driverId),
        [drivers, driverId]
    );

    const driver = driverOverride || driverFromState || driverFromQuery;

    const { data: activeDriversData } = useQuery({
        queryKey: ['active-driver-sessions'],
        queryFn: () => apiService.collections.getActiveDrivers(),
        refetchInterval: 15000,
        staleTime: 5000
    });

    const activeDriverEntries = activeDriversData?.data?.data?.activeDrivers || [];
    const activeDriverEntry = useMemo(() => {
        if (!driver) return null;
        return activeDriverEntries.find((entry) => {
            const entryProfileId = entry?.driverProfile?._id;
            const entryUserId = entry?.session?.driver?._id;
            return entryProfileId === driver._id || entryUserId === driver.user?._id;
        }) || null;
    }, [activeDriverEntries, driver]);

    const activeSession = activeDriverEntry?.session || activeSessionFromState;
    const lastLocation = activeDriverEntry?.lastLocation || lastLocationFromState;

    const { data: sessionRouteData } = useQuery({
        queryKey: ['driver-session-route', activeSession?._id || activeSession?.sessionId],
        queryFn: () => apiService.collections.getSessionRoute(activeSession?._id || activeSession?.sessionId),
        enabled: Boolean(activeSession?._id || activeSession?.sessionId),
        refetchInterval: activeSession ? 15000 : false,
        staleTime: 5000
    });

    useEffect(() => {
        if (driver) {
            setVerificationNotes(driver.verificationNotes || '');
        }
    }, [driver?._id]);

    const formatDate = (date) => {
        if (!date) return '—';
        return new Date(date).toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const formatDateTime = (date) => {
        if (!date) return '—';
        return new Date(date).toLocaleString('ru-RU');
    };

    const getStatus = (driverData) => {
        if (driverData.isVerified) {
            return { label: 'Одобрен', icon: CheckCircle, classes: 'bg-green-100 text-green-800' };
        }
        if (driverData.verificationNotes) {
            return { label: 'Отклонен', icon: XCircle, classes: 'bg-red-100 text-red-800' };
        }
        return { label: 'Ожидает проверки', icon: Clock, classes: 'bg-yellow-100 text-yellow-800' };
    };

    const verifyMutation = useMutation({
        mutationFn: ({ approved, notes }) =>
            apiService.drivers.verifyDriver(driver._id, { approved, notes }),
        onSuccess: (response, variables) => {
            const action = variables.approved ? 'одобрена' : 'отклонена';
            toast.success(`Заявка водителя ${action} успешно!`);
            const updatedDriver = response?.data?.data?.driver;
            if (updatedDriver) {
                setDriverOverride(updatedDriver);
            }
            queryClient.invalidateQueries({ queryKey: ['drivers'] });
        },
        onError: (error) => {
            const message = error.response?.data?.message || 'Ошибка при обработке заявки';
            toast.error(message);
        }
    });

    const stopSessionMutation = useMutation({
        mutationFn: (sessionId) => apiService.collections.stop({ sessionId }),
        onSuccess: () => {
            toast.success('Сессия завершена администратором');
            queryClient.invalidateQueries({ queryKey: ['active-driver-sessions'] });
            queryClient.invalidateQueries({ queryKey: ['driver-session-route'] });
        },
        onError: (error) => {
            const message = error.response?.data?.message || 'Не удалось завершить сессию';
            toast.error(message);
        }
    });

    const handleAdminStopSession = () => {
        if (!activeSession?.sessionId || !isAdmin) return;
        const confirmed = window.confirm('Завершить активную сессию этого водителя?');
        if (!confirmed) return;
        stopSessionMutation.mutate(activeSession.sessionId);
    };

    if (isLoading && !driverFromState) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Загрузка данных...</p>
                </div>
            </div>
        );
    }

    if (!driver) {
        return (
            <div className="container mx-auto p-6">
                <DashboardCard title="Водитель не найден" icon={<User className="h-5 w-5" />}>
                    <p className="text-slate-600">Проверьте ссылку или вернитесь к списку водителей.</p>
                    <div className="mt-4">
                        <Link to="/admin/drivers">
                            <Button variant="outline" size="sm">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Назад к списку
                            </Button>
                        </Link>
                    </div>
                </DashboardCard>
            </div>
        );
    }

    const status = getStatus(driver);
    const StatusIcon = status.icon;
    const routePoints = sessionRouteData?.data?.data?.route || [];
    const routePath = routePoints
        .map((point) => {
            const coordinates = point?.location?.coordinates;
            if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
            const [lng, lat] = coordinates;
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
            return [lat, lng];
        })
        .filter(Boolean);
    const mapCenter = routePath[routePath.length - 1]
        || (Array.isArray(lastLocation?.coordinates) && lastLocation.coordinates.length >= 2
            ? [lastLocation.coordinates[1], lastLocation.coordinates[0]]
            : null);
    const visitedCount = activeSession?.selectedContainers?.filter((item) => item.visited).length || 0;
    const totalCount = activeSession?.selectedContainers?.length || 0;

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <Link to="/admin/drivers" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Назад к списку
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900 mt-2">
                        {driver.user.username}
                    </h1>
                    <p className="text-gray-600">{driver.user.email}</p>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${status.classes}`}>
                    <StatusIcon className="h-4 w-4" />
                    {status.label}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                    {activeSession && mapCenter && (
                        <DashboardCard title="Активная сессия и местоположение">
                            <div className="space-y-4">
                                {isAdmin && (
                                    <div className="flex justify-end">
                                        <Button
                                            color="red"
                                            variant="outline"
                                            onClick={handleAdminStopSession}
                                            isLoading={stopSessionMutation.isLoading}
                                        >
                                            Завершить сессию
                                        </Button>
                                    </div>
                                )}
                                <div className="grid grid-cols-1 gap-3 text-sm text-slate-700 sm:grid-cols-2">
                                    <div className="rounded-lg bg-slate-50 p-3">
                                        <div className="text-xs uppercase tracking-wide text-slate-400">Статус</div>
                                        <div className="mt-1 font-semibold text-teal-700">Сессия активна</div>
                                    </div>
                                    <div className="rounded-lg bg-slate-50 p-3">
                                        <div className="text-xs uppercase tracking-wide text-slate-400">Контейнеры</div>
                                        <div className="mt-1 font-semibold text-slate-800">{visitedCount} / {totalCount}</div>
                                    </div>
                                    <div className="rounded-lg bg-slate-50 p-3">
                                        <div className="text-xs uppercase tracking-wide text-slate-400">Начало</div>
                                        <div className="mt-1 font-semibold text-slate-800">{formatDateTime(activeSession.startTime)}</div>
                                    </div>
                                    <div className="rounded-lg bg-slate-50 p-3">
                                        <div className="text-xs uppercase tracking-wide text-slate-400">Последний GPS</div>
                                        <div className="mt-1 font-semibold text-slate-800">{formatDateTime(lastLocation?.timestamp)}</div>
                                    </div>
                                </div>
                                <div className="h-72 overflow-hidden rounded-xl border border-slate-200">
                                    <MapContainer
                                        center={mapCenter}
                                        zoom={13}
                                        style={{ height: '100%', width: '100%' }}
                                        scrollWheelZoom={false}
                                    >
                                        <TileLayer
                                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        />
                                        {routePath.length > 1 && (
                                            <Polyline positions={routePath} pathOptions={{ color: '#0d9488', weight: 4 }} />
                                        )}
                                        {mapCenter && (
                                            <>
                                                <Marker position={mapCenter} />
                                                <Circle
                                                    center={mapCenter}
                                                    radius={250}
                                                    pathOptions={{ color: '#0d9488', fillColor: '#0d9488', fillOpacity: 0.08, weight: 1 }}
                                                />
                                            </>
                                        )}
                                    </MapContainer>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <MapPin className="h-4 w-4 text-teal-600" />
                                    <span>
                                        Текущее местоположение доступно для мониторинга, пока сессия водителя активна.
                                    </span>
                                </div>
                            </div>
                        </DashboardCard>
                    )}

                    <DashboardCard title="Личная информация">
                        <div className="space-y-3 text-sm text-slate-700">
                            <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-slate-400" />
                                <span>{driver.user.username}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-slate-400" />
                                <span>Регистрация: {formatDate(driver.createdAt)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-slate-400" />
                                <span>Последний вход: {formatDate(driver.user.lastLogin)}</span>
                            </div>
                        </div>
                    </DashboardCard>

                    <DashboardCard title="Водительские права">
                        <div className="space-y-3 text-sm text-slate-700">
                            <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-slate-400" />
                                <span>Номер: {driver.licenseNumber}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-slate-400" />
                                <span>Срок действия: {formatDate(driver.licenseExpiry)}</span>
                            </div>
                        </div>
                    </DashboardCard>

                    <DashboardCard title="Транспорт">
                        <div className="space-y-3 text-sm text-slate-700">
                            <div className="flex items-center gap-2">
                                <Truck className="h-4 w-4 text-slate-400" />
                                <span>Номер: {driver.vehicleInfo.plateNumber}</span>
                            </div>
                            {driver.vehicleInfo.model && (
                                <div className="flex items-center gap-2">
                                    <Truck className="h-4 w-4 text-slate-400" />
                                    <span>Модель: {driver.vehicleInfo.model}</span>
                                </div>
                            )}
                            {driver.vehicleInfo.year && (
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-slate-400" />
                                    <span>Год: {driver.vehicleInfo.year}</span>
                                </div>
                            )}
                            {driver.vehicleInfo.capacity && (
                                <div className="flex items-center gap-2">
                                    <Truck className="h-4 w-4 text-slate-400" />
                                    <span>Грузоподъемность: {driver.vehicleInfo.capacity} кг</span>
                                </div>
                            )}
                        </div>
                    </DashboardCard>
                </div>

                <div className="space-y-6">
                    <DashboardCard title="Медицинская компания">
                        <div className="space-y-3 text-sm text-slate-700">
                            <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-slate-400" />
                                <span>{driver.medicalCompany.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-slate-400" />
                                <span>Лицензия: {driver.medicalCompany.licenseNumber}</span>
                            </div>
                            {driver.medicalCompany.contactInfo?.email && (
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-slate-400" />
                                    <span>Email: {driver.medicalCompany.contactInfo.email}</span>
                                </div>
                            )}
                        </div>
                    </DashboardCard>

                    {driver.emergencyContact?.name && (
                        <DashboardCard title="Экстренный контакт">
                            <div className="space-y-3 text-sm text-slate-700">
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-slate-400" />
                                    <span>{driver.emergencyContact.name}</span>
                                </div>
                                {driver.emergencyContact.phone && (
                                    <div className="flex items-center gap-2">
                                        <Phone className="h-4 w-4 text-slate-400" />
                                        <span>{driver.emergencyContact.phone}</span>
                                    </div>
                                )}
                                {driver.emergencyContact.relationship && (
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 text-slate-400" />
                                        <span>{driver.emergencyContact.relationship}</span>
                                    </div>
                                )}
                            </div>
                        </DashboardCard>
                    )}

                    <DashboardCard title="Статус проверки">
                        <div className="space-y-3 text-sm text-slate-700">
                            <div className="flex items-center gap-2">
                                <StatusIcon className="h-4 w-4 text-slate-400" />
                                <span>{status.label}</span>
                            </div>
                            {driver.verifiedBy?.username && (
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-slate-400" />
                                    <span>Проверил: {driver.verifiedBy.username}</span>
                                </div>
                            )}
                            {driver.verificationDate && (
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-slate-400" />
                                    <span>Дата: {formatDate(driver.verificationDate)}</span>
                                </div>
                            )}
                            {driver.verificationNotes && (
                                <div className="rounded-lg bg-slate-50 p-3 text-slate-600">
                                    {driver.verificationNotes}
                                </div>
                            )}
                        </div>
                    </DashboardCard>
                </div>
            </div>

            {!driver.isVerified && (
                <DashboardCard title="Решение по заявке">
                    <div className="space-y-4">
                        <textarea
                            value={verificationNotes}
                            onChange={(event) => setVerificationNotes(event.target.value)}
                            placeholder="Добавьте комментарии к решению..."
                            rows={4}
                            className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                        />
                        <div className="flex justify-end gap-4">
                            <Button
                                variant="outline"
                                color="red"
                                onClick={() => verifyMutation.mutate({ approved: false, notes: verificationNotes })}
                                disabled={verifyMutation.isLoading}
                                className="flex items-center gap-2"
                            >
                                <XCircle className="h-4 w-4" />
                                Отклонить
                            </Button>
                            <Button
                                onClick={() => verifyMutation.mutate({ approved: true, notes: verificationNotes })}
                                disabled={verifyMutation.isLoading}
                                isLoading={verifyMutation.isLoading}
                                className="flex items-center gap-2"
                            >
                                <CheckCircle className="h-4 w-4" />
                                Одобрить
                            </Button>
                        </div>
                    </div>
                </DashboardCard>
            )}
        </div>
    );
};

export default DriverDetails;
