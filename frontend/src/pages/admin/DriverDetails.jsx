import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft,
    Building2,
    Calendar,
    CheckCircle,
    Clock,
    FileText,
    Phone,
    Truck,
    User,
    XCircle
} from 'lucide-react';
import apiService from '../../services/api';
import DashboardCard from '../../components/dashboard/DashboardCard';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';

const DriverDetails = () => {
    const { driverId } = useParams();
    const location = useLocation();
    const queryClient = useQueryClient();
    const [verificationNotes, setVerificationNotes] = useState('');
    const [driverOverride, setDriverOverride] = useState(null);

    const driverFromState = location.state?.driver || null;

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
