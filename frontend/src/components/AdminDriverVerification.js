import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, Clock, Search, User, Building2, Truck, FileText, Calendar, XCircle } from 'lucide-react';
import apiService from '../services/api';
import Button from '../components/ui/Button';
import DashboardCard from '../components/dashboard/DashboardCard';

const AdminDriverVerification = () => {
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    const { data: driversData, isLoading } = useQuery({
        queryKey: ['drivers'],
        queryFn: () => apiService.drivers.getAllDrivers(),
        refetchInterval: 30000
    });

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const drivers = driversData?.data?.data?.drivers || [];

    const getStatus = (driver) => {
        if (driver.isVerified) {
            return { id: 'approved', label: 'Одобрен', icon: CheckCircle, classes: 'bg-green-100 text-green-800' };
        }
        if (driver.verificationNotes) {
            return { id: 'rejected', label: 'Отклонен', icon: XCircle, classes: 'bg-red-100 text-red-800' };
        }
        return { id: 'pending', label: 'Ожидает проверки', icon: Clock, classes: 'bg-yellow-100 text-yellow-800' };
    };

    const statusCounts = useMemo(() => {
        return drivers.reduce(
            (acc, driver) => {
                const status = getStatus(driver).id;
                acc[status] += 1;
                return acc;
            },
            { approved: 0, pending: 0, rejected: 0 }
        );
    }, [drivers]);

    const filteredDrivers = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();
        return drivers.filter((driver) => {
            const statusId = getStatus(driver).id;
            if (statusFilter !== 'all' && statusId !== statusFilter) {
                return false;
            }
            if (!normalizedSearch) return true;
            const searchTarget = [
                driver.user?.username,
                driver.user?.email,
                driver.licenseNumber,
                driver.vehicleInfo?.plateNumber,
                driver.vehicleInfo?.model,
                driver.medicalCompany?.name
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return searchTarget.includes(normalizedSearch);
        });
    }, [drivers, searchTerm, statusFilter]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Загрузка заявок...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Водители
                </h1>
                <p className="text-gray-600">
                    Полный список водителей с фильтрацией и быстрым доступом к деталям
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <DashboardCard title="Ожидают проверки" icon={<Clock className="h-5 w-5" />}>
                    <p className="text-3xl font-semibold text-yellow-600">{statusCounts.pending}</p>
                </DashboardCard>
                <DashboardCard title="Одобрены" icon={<CheckCircle className="h-5 w-5" />}>
                    <p className="text-3xl font-semibold text-green-600">{statusCounts.approved}</p>
                </DashboardCard>
                <DashboardCard title="Отклонены" icon={<XCircle className="h-5 w-5" />}>
                    <p className="text-3xl font-semibold text-red-600">{statusCounts.rejected}</p>
                </DashboardCard>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-6">
                <div className="flex flex-wrap gap-2">
                    {[
                        { id: 'all', label: `Все (${drivers.length})` },
                        { id: 'pending', label: `Ожидают (${statusCounts.pending})` },
                        { id: 'approved', label: `Одобрены (${statusCounts.approved})` },
                        { id: 'rejected', label: `Отклонены (${statusCounts.rejected})` }
                    ].map((tab) => (
                        <Button
                            key={tab.id}
                            variant={statusFilter === tab.id ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setStatusFilter(tab.id)}
                        >
                            {tab.label}
                        </Button>
                    ))}
                </div>
                <div className="relative w-full lg:max-w-sm">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Поиск по имени, номеру, компании..."
                        className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                    />
                </div>
            </div>

            {filteredDrivers.length === 0 ? (
                <DashboardCard title="Драйверы не найдены" icon={<User className="h-5 w-5" />}>
                    <div className="text-center py-10 text-slate-600">
                        Нет водителей, подходящих под выбранные фильтры.
                    </div>
                </DashboardCard>
            ) : (
                <div className="space-y-4">
                    {filteredDrivers.map((driver) => {
                        const status = getStatus(driver);
                        const StatusIcon = status.icon;
                        return (
                            <DashboardCard
                                key={driver._id}
                                title={`Водитель: ${driver.user.username}`}
                                className="hover:shadow-md transition-shadow"
                            >
                                <div className="space-y-4">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <div className="flex items-center gap-2">
                                            <User className="h-5 w-5 text-gray-500" />
                                            <span className="font-semibold">{driver.user.username}</span>
                                        </div>
                                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${status.classes}`}>
                                            <StatusIcon className="h-3 w-3" />
                                            {status.label}
                                        </div>
                                        <span className="text-sm text-gray-500">
                                            Создан: {formatDate(driver.createdAt)}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                                        <div className="flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-gray-400" />
                                            <span>Права: {driver.licenseNumber}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-gray-400" />
                                            <span>До: {formatDate(driver.licenseExpiry)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Truck className="h-4 w-4 text-gray-400" />
                                            <span>Номер: {driver.vehicleInfo.plateNumber}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Building2 className="h-4 w-4 text-gray-400" />
                                            <span>{driver.medicalCompany.name}</span>
                                        </div>
                                    </div>

                                    <div className="flex justify-end">
                                        <Link to={`/admin/drivers/${driver._id}`} state={{ driver }}>
                                            <Button variant="outline" size="sm">
                                                Подробнее
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </DashboardCard>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default AdminDriverVerification;
