import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
    CheckCircle,
    XCircle,
    Clock,
    User,
    Building2,
    Truck,
    Phone,
    FileText,
    Calendar
} from 'lucide-react';
import apiService from '../services/api';
import Button from '../components/ui/Button';
import DashboardCard from '../components/dashboard/DashboardCard';
import toast from 'react-hot-toast';

const AdminDriverVerification = () => {
    const [selectedDriver, setSelectedDriver] = useState(null);
    const [verificationNotes, setVerificationNotes] = useState('');
    const queryClient = useQueryClient();

    // Fetch pending driver verifications using react-query v3 syntax
    const { data: pendingData, isLoading } = useQuery(
        'pendingDrivers',
        () => apiService.drivers.getPendingDrivers(),
        {
            refetchInterval: 30000 // Refresh every 30 seconds
        }
    );

    // Verification mutation using react-query v3 syntax
    const verifyMutation = useMutation(
        ({ driverId, approved, notes }) =>
            apiService.drivers.verifyDriver(driverId, { approved, notes }),
        {
            onSuccess: (data, variables) => {
                const action = variables.approved ? 'одобрена' : 'отклонена';
                toast.success(`Заявка водителя ${action} успешно!`);

                // Refresh the pending drivers list
                queryClient.invalidateQueries('pendingDrivers');

                // Close the modal
                setSelectedDriver(null);
                setVerificationNotes('');
            },
            onError: (error) => {
                const message = error.response?.data?.message || 'Ошибка при обработке заявки';
                toast.error(message);
            }
        }
    );

    const handleVerification = (approved) => {
        if (!selectedDriver) return;

        verifyMutation.mutate({
            driverId: selectedDriver._id,
            approved,
            notes: verificationNotes
        });
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const pendingDrivers = pendingData?.data?.data?.drivers || [];

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
                    Верификация Водителей
                </h1>
                <p className="text-gray-600">
                    Проверка и одобрение заявок на регистрацию водителей
                </p>
            </div>

            {pendingDrivers.length === 0 ? (
                <DashboardCard title="Нет ожидающих заявок" icon={<CheckCircle className="h-5 w-5" />}>
                    <div className="text-center py-12">
                        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Нет ожидающих заявок
                        </h3>
                        <p className="text-gray-600">
                            Все заявки водителей обработаны
                        </p>
                    </div>
                </DashboardCard>
            ) : (
                <div className="space-y-4">
                    {pendingDrivers.map((driver) => (
                        <DashboardCard key={driver._id} title={`Водитель: ${driver.user.username}`} className="hover:shadow-md transition-shadow">
                            <div className="space-y-4">
                                {/* Driver Basic Info */}
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <User className="h-5 w-5 text-gray-500" />
                                        <span className="font-semibold">
                                            {driver.user.username}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                                        <Clock className="h-3 w-3" />
                                        Ожидает проверки
                                    </div>
                                    <span className="text-sm text-gray-500">
                                        Подано: {formatDate(driver.createdAt)}
                                    </span>
                                </div>

                                {/* Quick Info Grid */}
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
                                    <Button
                                        onClick={() => setSelectedDriver(driver)}
                                        variant="outline"
                                        size="sm"
                                    >
                                        Подробнее
                                    </Button>
                                </div>
                            </div>
                        </DashboardCard>
                    ))}
                </div>
            )}

            {/* Detailed Verification Modal */}
            {selectedDriver && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-6">
                                <h2 className="text-2xl font-bold">
                                    Проверка водителя: {selectedDriver.user.username}
                                </h2>
                                <button
                                    className="text-gray-400 hover:text-gray-600"
                                    onClick={() => setSelectedDriver(null)}
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Driver Information */}
                                <div className="space-y-4">
                                    <DashboardCard title="Личная Информация">
                                        <div className="space-y-3">
                                            <div>
                                                <label className="font-medium text-gray-700">Email:</label>
                                                <p>{selectedDriver.user.email}</p>
                                            </div>
                                            <div>
                                                <label className="font-medium text-gray-700">Регистрация:</label>
                                                <p>{formatDate(selectedDriver.user.createdAt)}</p>
                                            </div>
                                        </div>
                                    </DashboardCard>

                                    <DashboardCard title="Водительские Права">
                                        <div className="space-y-3">
                                            <div>
                                                <label className="font-medium text-gray-700">Номер:</label>
                                                <p>{selectedDriver.licenseNumber}</p>
                                            </div>
                                            <div>
                                                <label className="font-medium text-gray-700">Срок действия:</label>
                                                <p>{formatDate(selectedDriver.licenseExpiry)}</p>
                                            </div>
                                        </div>
                                    </DashboardCard>

                                    <DashboardCard title="Транспорт">
                                        <div className="space-y-3">
                                            <div>
                                                <label className="font-medium text-gray-700">Номер:</label>
                                                <p>{selectedDriver.vehicleInfo.plateNumber}</p>
                                            </div>
                                            {selectedDriver.vehicleInfo.model && (
                                                <div>
                                                    <label className="font-medium text-gray-700">Модель:</label>
                                                    <p>{selectedDriver.vehicleInfo.model}</p>
                                                </div>
                                            )}
                                            {selectedDriver.vehicleInfo.year && (
                                                <div>
                                                    <label className="font-medium text-gray-700">Год:</label>
                                                    <p>{selectedDriver.vehicleInfo.year}</p>
                                                </div>
                                            )}
                                            {selectedDriver.vehicleInfo.capacity && (
                                                <div>
                                                    <label className="font-medium text-gray-700">Грузоподъемность:</label>
                                                    <p>{selectedDriver.vehicleInfo.capacity} кг</p>
                                                </div>
                                            )}
                                        </div>
                                    </DashboardCard>
                                </div>

                                {/* Company and Emergency Contact */}
                                <div className="space-y-4">
                                    <DashboardCard title="Медицинская Компания">
                                        <div className="space-y-3">
                                            <div>
                                                <label className="font-medium text-gray-700">Название:</label>
                                                <p>{selectedDriver.medicalCompany.name}</p>
                                            </div>
                                            <div>
                                                <label className="font-medium text-gray-700">Лицензия:</label>
                                                <p>{selectedDriver.medicalCompany.licenseNumber}</p>
                                            </div>
                                            {selectedDriver.medicalCompany.contactInfo?.email && (
                                                <div>
                                                    <label className="font-medium text-gray-700">Email:</label>
                                                    <p>{selectedDriver.medicalCompany.contactInfo.email}</p>
                                                </div>
                                            )}
                                        </div>
                                    </DashboardCard>

                                    {selectedDriver.emergencyContact?.name && (
                                        <DashboardCard title="Экстренный Контакт">
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="font-medium text-gray-700">Имя:</label>
                                                    <p>{selectedDriver.emergencyContact.name}</p>
                                                </div>
                                                {selectedDriver.emergencyContact.phone && (
                                                    <div>
                                                        <label className="font-medium text-gray-700">Телефон:</label>
                                                        <p>{selectedDriver.emergencyContact.phone}</p>
                                                    </div>
                                                )}
                                                {selectedDriver.emergencyContact.relationship && (
                                                    <div>
                                                        <label className="font-medium text-gray-700">Отношение:</label>
                                                        <p>{selectedDriver.emergencyContact.relationship}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </DashboardCard>
                                    )}

                                    {/* Verification Notes */}
                                    <DashboardCard title="Примечания к Проверке">
                                        <textarea
                                            value={verificationNotes}
                                            onChange={(e) => setVerificationNotes(e.target.value)}
                                            placeholder="Добавьте комментарии к решению..."
                                            rows={4}
                                            className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                                        />
                                    </DashboardCard>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex justify-end gap-4 mt-6 pt-6 border-t">
                                <Button
                                    variant="outline"
                                    color="red"
                                    onClick={() => handleVerification(false)}
                                    disabled={verifyMutation.isLoading}
                                    className="flex items-center gap-2"
                                >
                                    <XCircle className="h-4 w-4" />
                                    Отклонить
                                </Button>
                                <Button
                                    onClick={() => handleVerification(true)}
                                    disabled={verifyMutation.isLoading}
                                    isLoading={verifyMutation.isLoading}
                                    className="flex items-center gap-2"
                                >
                                    <CheckCircle className="h-4 w-4" />
                                    Одобрить
                                </Button>
                            </div>

                            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-800">
                                    При одобрении водитель получит доступ к системе мониторинга и сможет начать работу.
                                    При отклонении заявка будет помечена как отклоненная с указанными примечаниями.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDriverVerification;