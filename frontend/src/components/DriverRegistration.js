import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Truck, Building2, FileText, User } from 'lucide-react';
import apiService from '../services/api';
import Button from '../components/ui/Button';
import DashboardCard from '../components/dashboard/DashboardCard';
import toast from 'react-hot-toast';

const DriverRegistration = () => {
    const [formData, setFormData] = useState({
        licenseNumber: '',
        licenseExpiry: '',
        medicalCompanyId: '',
        vehicleInfo: {
            plateNumber: '',
            model: '',
            year: '',
            capacity: ''
        },
        emergencyContact: {
            name: '',
            phone: '',
            relationship: ''
        },
        certifications: []
    });

    const [errors, setErrors] = useState({});
    const queryClient = useQueryClient();

    // Fetch medical companies using @tanstack/react-query v3 syntax
    const { data: companiesData, isLoading: companiesLoading } = useQuery({
        queryKey: ['medicalCompanies'],
        queryFn: () => apiService.medicalCompanies.getMedicalCompanies(),
        staleTime: 5 * 60 * 1000
    });

    // Driver registration mutation using @tanstack/react-query v3 syntax
    const registerMutation = useMutation({
    mutationFn: (data) => apiService.drivers.registerDriver(data),
            onSuccess: () => {
                toast.success('Заявка на регистрацию водителя отправлена! Ожидайте проверки администратора.');
                // Reset form
                setFormData({
                    licenseNumber: '',
                    licenseExpiry: '',
                    medicalCompanyId: '',
                    vehicleInfo: {
                        plateNumber: '',
                        model: '',
                        year: '',
                        capacity: ''
                    },
                    emergencyContact: {
                        name: '',
                        phone: '',
                        relationship: ''
                    },
                    certifications: []
                });
                setErrors({});
            },
            onError: (error) => {
                const message = error.response?.data?.message || 'Ошибка при регистрации';
                toast.error(message);

                // Handle validation errors
                if (error.response?.data?.errors) {
                    setErrors(error.response.data.errors);
                }
            }
        }
    );

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: null
            }));
        }
    };

    const handleNestedInputChange = (parent, field, value) => {
        setFormData(prev => ({
            ...prev,
            [parent]: {
                ...prev[parent],
                [field]: value
            }
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Basic validation
        const newErrors = {};
        if (!formData.licenseNumber) newErrors.licenseNumber = 'Номер прав обязателен';
        if (!formData.licenseExpiry) newErrors.licenseExpiry = 'Срок действия прав обязателен';
        if (!formData.medicalCompanyId) newErrors.medicalCompanyId = 'Выберите медицинскую компанию';
        if (!formData.vehicleInfo.plateNumber) newErrors.plateNumber = 'Номер автомобиля обязателен';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        registerMutation.mutate(formData);
    };

    const companies = companiesData?.data?.data?.companies || [];

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Регистрация Водителя
                </h1>
                <p className="text-gray-600">
                    Зарегистрируйтесь как водитель для сбора медицинских отходов
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Driver License Information */}
                <DashboardCard
                    title="Информация о Водительских Правах"
                    icon={<FileText className="h-5 w-5" />}
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                Номер Водительских Прав *
                            </label>
                            <input
                                type="text"
                                value={formData.licenseNumber}
                                onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                                placeholder="Введите номер прав"
                                className={`block w-full rounded-lg border px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500 ${
                                    errors.licenseNumber ? 'border-red-500' : 'border-slate-200'
                                }`}
                            />
                            {errors.licenseNumber && (
                                <p className="text-red-500 text-sm mt-1">{errors.licenseNumber}</p>
                            )}
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                Срок Действия Прав *
                            </label>
                            <input
                                type="date"
                                value={formData.licenseExpiry}
                                onChange={(e) => handleInputChange('licenseExpiry', e.target.value)}
                                className={`block w-full rounded-lg border px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500 ${
                                    errors.licenseExpiry ? 'border-red-500' : 'border-slate-200'
                                }`}
                            />
                            {errors.licenseExpiry && (
                                <p className="text-red-500 text-sm mt-1">{errors.licenseExpiry}</p>
                            )}
                        </div>
                    </div>
                </DashboardCard>

                {/* Medical Company */}
                <DashboardCard
                    title="Медицинская Компания"
                    icon={<Building2 className="h-5 w-5" />}
                >
                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                            Выберите Медицинскую Компанию *
                        </label>
                        <select
                            value={formData.medicalCompanyId}
                            onChange={(e) => handleInputChange('medicalCompanyId', e.target.value)}
                            className={`block w-full rounded-lg border px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500 ${
                                errors.medicalCompanyId ? 'border-red-500' : 'border-slate-200'
                            }`}
                        >
                            <option value="">Выберите компанию</option>
                            {companiesLoading ? (
                                <option disabled>Загрузка...</option>
                            ) : (
                                companies.map((company) => (
                                    <option key={company._id} value={company._id}>
                                        {company.name} (Лицензия: {company.licenseNumber})
                                    </option>
                                ))
                            )}
                        </select>
                        {errors.medicalCompanyId && (
                            <p className="text-red-500 text-sm mt-1">{errors.medicalCompanyId}</p>
                        )}
                    </div>
                </DashboardCard>

                {/* Vehicle Information */}
                <DashboardCard
                    title="Информация о Транспортном Средстве"
                    icon={<Truck className="h-5 w-5" />}
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                Номерной Знак *
                            </label>
                            <input
                                type="text"
                                value={formData.vehicleInfo.plateNumber}
                                onChange={(e) => handleNestedInputChange('vehicleInfo', 'plateNumber', e.target.value)}
                                placeholder="Например: 123ABC01"
                                className={`block w-full rounded-lg border px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500 ${
                                    errors.plateNumber ? 'border-red-500' : 'border-slate-200'
                                }`}
                            />
                            {errors.plateNumber && (
                                <p className="text-red-500 text-sm mt-1">{errors.plateNumber}</p>
                            )}
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                Модель Автомобиля
                            </label>
                            <input
                                type="text"
                                value={formData.vehicleInfo.model}
                                onChange={(e) => handleNestedInputChange('vehicleInfo', 'model', e.target.value)}
                                placeholder="Например: Toyota Hiace"
                                className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                Год Выпуска
                            </label>
                            <input
                                type="number"
                                min="1990"
                                max={new Date().getFullYear() + 1}
                                value={formData.vehicleInfo.year}
                                onChange={(e) => handleNestedInputChange('vehicleInfo', 'year', e.target.value)}
                                placeholder="2020"
                                className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                Грузоподъемность (кг)
                            </label>
                            <input
                                type="number"
                                min="100"
                                value={formData.vehicleInfo.capacity}
                                onChange={(e) => handleNestedInputChange('vehicleInfo', 'capacity', e.target.value)}
                                placeholder="1000"
                                className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                            />
                        </div>
                    </div>
                </DashboardCard>

                {/* Emergency Contact */}
                <DashboardCard
                    title="Экстренный Контакт"
                    icon={<User className="h-5 w-5" />}
                >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                Имя
                            </label>
                            <input
                                type="text"
                                value={formData.emergencyContact.name}
                                onChange={(e) => handleNestedInputChange('emergencyContact', 'name', e.target.value)}
                                placeholder="Полное имя"
                                className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                Телефон
                            </label>
                            <input
                                type="text"
                                value={formData.emergencyContact.phone}
                                onChange={(e) => handleNestedInputChange('emergencyContact', 'phone', e.target.value)}
                                placeholder="+7 XXX XXX XX XX"
                                className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                Отношение
                            </label>
                            <input
                                type="text"
                                value={formData.emergencyContact.relationship}
                                onChange={(e) => handleNestedInputChange('emergencyContact', 'relationship', e.target.value)}
                                placeholder="Родственник, друг..."
                                className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                            />
                        </div>
                    </div>
                </DashboardCard>

                {/* Submit Button */}
                <div className="flex justify-center">
                    <Button
                        type="submit"
                        size="lg"
                        isLoading={registerMutation.isLoading}
                        className="w-full md:w-auto px-8"
                    >
                        {registerMutation.isLoading ? 'Отправка...' : 'Подать Заявку'}
                    </Button>
                </div>

                {/* Information Alert */}
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                    <div className="text-sm text-blue-800">
                        После подачи заявки администратор проверит предоставленную информацию.
                        Вы получите уведомление о статусе вашей заявки по электронной почте.
                    </div>
                </div>
            </form>
        </div>
    );
};

export default DriverRegistration;
