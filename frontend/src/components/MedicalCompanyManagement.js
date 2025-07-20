import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Plus,
    Building2,
    Edit3,
    Trash2,
    CheckCircle,
    XCircle,
    Calendar,
    Phone,
    Mail,
    MapPin
} from 'lucide-react';
import apiService from '../services/api';
import Button from '../components/ui/Button';
import DashboardCard from '../components/dashboard/DashboardCard';
import toast from 'react-hot-toast';

const MedicalCompanyManagement = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCompany, setEditingCompany] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        licenseNumber: '',
        contactInfo: {
            email: '',
            phone: '',
            website: ''
        },
        address: {
            street: '',
            city: '',
            region: '',
            postalCode: ''
        },
        certificationExpiry: '',
        wasteTypes: []
    });

    const queryClient = useQueryClient();

    // Fetch companies using @tanstack/react-query v3 syntax
    const { data: companiesData, isLoading } = useQuery(
        'allMedicalCompanies',
        () => apiService.medicalCompanies.getMedicalCompanies(),
        {
            refetchInterval: 60000 // Refresh every minute
        }
    );

    // Create company mutation using @tanstack/react-query v3 syntax
    const createMutation = useMutation({
    mutationFn: (data) => apiService.medicalCompanies.createMedicalCompany(data),
            onSuccess: () => {
                toast.success('Медицинская компания успешно создана!');
                queryClient.invalidateQueries('allMedicalCompanies');
                resetForm();
            },
            onError: (error) => {
                const message = error.response?.data?.message || 'Ошибка при создании компании';
                toast.error(message);
            }
        }
    );

    // Update company mutation using @tanstack/react-query v3 syntax
    const updateMutation = useMutation({
    mutationFn: ({ id, data }) => apiService.medicalCompanies.updateMedicalCompany(id, data),
            onSuccess: () => {
                toast.success('Компания успешно обновлена!');
                queryClient.invalidateQueries('allMedicalCompanies');
                resetForm();
            },
            onError: (error) => {
                const message = error.response?.data?.message || 'Ошибка при обновлении компании';
                toast.error(message);
            }
        }
    );

    // Delete company mutation using @tanstack/react-query v3 syntax
    const deleteMutation = useMutation({
    mutationFn: (id) => apiService.medicalCompanies.deleteMedicalCompany(id),
            onSuccess: () => {
                toast.success('Компания удалена!');
                queryClient.invalidateQueries('allMedicalCompanies');
            },
            onError: (error) => {
                const message = error.response?.data?.message || 'Ошибка при удалении компании';
                toast.error(message);
            }
        }
    );

    const wasteTypeOptions = [
        { value: 'infectious', label: 'Инфекционные отходы' },
        { value: 'pathological', label: 'Патологические отходы' },
        { value: 'pharmaceutical', label: 'Фармацевтические отходы' },
        { value: 'sharps', label: 'Острые предметы' },
        { value: 'chemical', label: 'Химические отходы' }
    ];

    const resetForm = () => {
        setFormData({
            name: '',
            licenseNumber: '',
            contactInfo: {
                email: '',
                phone: '',
                website: ''
            },
            address: {
                street: '',
                city: '',
                region: '',
                postalCode: ''
            },
            certificationExpiry: '',
            wasteTypes: []
        });
        setEditingCompany(null);
        setIsModalOpen(false);
    };

    const handleEdit = (company) => {
        setEditingCompany(company);
        setFormData({
            name: company.name,
            licenseNumber: company.licenseNumber,
            contactInfo: company.contactInfo || { email: '', phone: '', website: '' },
            address: company.address || { street: '', city: '', region: '', postalCode: '' },
            certificationExpiry: company.certificationExpiry ?
                new Date(company.certificationExpiry).toISOString().split('T')[0] : '',
            wasteTypes: company.wasteTypes || []
        });
        setIsModalOpen(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (editingCompany) {
            updateMutation.mutate({ id: editingCompany._id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleDelete = (id) => {
        if (window.confirm('Вы уверены, что хотите удалить эту компанию?')) {
            deleteMutation.mutate(id);
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
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

    const handleWasteTypeToggle = (wasteType) => {
        setFormData(prev => ({
            ...prev,
            wasteTypes: prev.wasteTypes.includes(wasteType)
                ? prev.wasteTypes.filter(type => type !== wasteType)
                : [...prev.wasteTypes, wasteType]
        }));
    };

    const formatDate = (date) => {
        if (!date) return 'Не указана';
        try {
            const parsedDate = new Date(date);
            if (isNaN(parsedDate.getTime())) return 'Неверная дата';
            return parsedDate.toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (error) {
            return 'Неверная дата';
        }
    };

    const isExpiringSoon = (date) => {
        const expiry = new Date(date);
        const now = new Date();
        const monthsUntilExpiry = (expiry - now) / (1000 * 60 * 60 * 24 * 30);
        return monthsUntilExpiry <= 3; // Less than 3 months
    };

    const companies = companiesData?.data?.data?.companies || [];

    return (
        <div className="container mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Управление Медицинскими Компаниями
                    </h1>
                    <p className="text-gray-600">
                        Добавление и управление компаниями для регистрации водителей
                    </p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Добавить Компанию
                </Button>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center min-h-[400px]">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-2 text-gray-600">Загрузка компаний...</p>
                    </div>
                </div>
            ) : companies.length === 0 ? (
                <DashboardCard title="Нет медицинских компаний" icon={<Building2 className="h-5 w-5" />}>
                    <div className="text-center py-12">
                        <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Нет медицинских компаний
                        </h3>
                        <p className="text-gray-600 mb-4">
                            Создайте первую медицинскую компанию для регистрации водителей
                        </p>
                        <Button onClick={() => setIsModalOpen(true)}>
                            Добавить Компанию
                        </Button>
                    </div>
                </DashboardCard>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {companies.map((company) => (
                        <DashboardCard key={company._id} title={company.name} icon={<Building2 className="h-5 w-5" />} className="hover:shadow-lg transition-shadow">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                                        company.isActive
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-gray-100 text-gray-800'
                                    }`}>
                                        {company.isActive ? (
                                            <>
                                                <CheckCircle className="h-3 w-3" />
                                                Активна
                                            </>
                                        ) : (
                                            <>
                                                <XCircle className="h-3 w-3" />
                                                Неактивна
                                            </>
                                        )}
                                    </div>
                                    {isExpiringSoon(company.certificationExpiry) && (
                                        <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm">
                                            Истекает
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">Лицензия:</span>
                                        <span>{company.licenseNumber}</span>
                                    </div>

                                    {company.contactInfo?.email && (
                                        <div className="flex items-center gap-2">
                                            <Mail className="h-4 w-4 text-gray-400" />
                                            <span className="truncate">{company.contactInfo.email}</span>
                                        </div>
                                    )}

                                    {company.contactInfo?.phone && (
                                        <div className="flex items-center gap-2">
                                            <Phone className="h-4 w-4 text-gray-400" />
                                            <span>{company.contactInfo.phone}</span>
                                        </div>
                                    )}

                                    {company.address?.city && (
                                        <div className="flex items-center gap-2">
                                            <MapPin className="h-4 w-4 text-gray-400" />
                                            <span>{company.address.city}</span>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-gray-400" />
                                        <span>До: {formatDate(company.certificationExpiry)}</span>
                                    </div>
                                </div>

                                {company.wasteTypes && company.wasteTypes.length > 0 && (
                                    <div>
                                        <p className="text-sm font-medium mb-2">Типы отходов:</p>
                                        <div className="flex flex-wrap gap-1">
                                            {company.wasteTypes.map((type) => (
                                                <span key={type} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                                    {wasteTypeOptions.find(opt => opt.value === type)?.label || type}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-end gap-2 pt-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleEdit(company)}
                                    >
                                        <Edit3 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        color="red"
                                        size="sm"
                                        onClick={() => handleDelete(company._id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </DashboardCard>
                    ))}
                </div>
            )}

            {/* Add/Edit Company Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <h2 className="text-2xl font-bold mb-6">
                                {editingCompany ? 'Редактировать Компанию' : 'Добавить Компанию'}
                            </h2>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Basic Information */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">
                                            Название Компании *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => handleInputChange('name', e.target.value)}
                                            required
                                            className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">
                                            Номер Лицензии *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.licenseNumber}
                                            onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                                            required
                                            className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                                        />
                                    </div>
                                </div>

                                {/* Contact Information */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold">Контактная Информация</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                                Email *
                                            </label>
                                            <input
                                                type="email"
                                                value={formData.contactInfo.email}
                                                onChange={(e) => handleNestedInputChange('contactInfo', 'email', e.target.value)}
                                                required
                                                className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                                Телефон
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.contactInfo.phone}
                                                onChange={(e) => handleNestedInputChange('contactInfo', 'phone', e.target.value)}
                                                className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">
                                            Веб-сайт
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.contactInfo.website}
                                            onChange={(e) => handleNestedInputChange('contactInfo', 'website', e.target.value)}
                                            placeholder="https://example.com"
                                            className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                                        />
                                    </div>
                                </div>

                                {/* Address */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold">Адрес</h3>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">
                                            Улица
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.address.street}
                                            onChange={(e) => handleNestedInputChange('address', 'street', e.target.value)}
                                            className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                                Город
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.address.city}
                                                onChange={(e) => handleNestedInputChange('address', 'city', e.target.value)}
                                                className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                                Регион
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.address.region}
                                                onChange={(e) => handleNestedInputChange('address', 'region', e.target.value)}
                                                className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                                Почтовый Код
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.address.postalCode}
                                                onChange={(e) => handleNestedInputChange('address', 'postalCode', e.target.value)}
                                                className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Certification Expiry */}
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">
                                        Срок Действия Сертификата *
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.certificationExpiry}
                                        onChange={(e) => handleInputChange('certificationExpiry', e.target.value)}
                                        required
                                        className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                                    />
                                </div>

                                {/* Waste Types */}
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-slate-700">
                                        Типы Отходов
                                    </label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {wasteTypeOptions.map((option) => (
                                            <div key={option.value} className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    id={option.value}
                                                    checked={formData.wasteTypes.includes(option.value)}
                                                    onChange={() => handleWasteTypeToggle(option.value)}
                                                    className="rounded border-gray-300"
                                                />
                                                <label htmlFor={option.value} className="text-sm">
                                                    {option.label}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Form Actions */}
                                <div className="flex justify-end gap-4 pt-6 border-t">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={resetForm}
                                    >
                                        Отмена
                                    </Button>
                                    <Button
                                        type="submit"
                                        isLoading={createMutation.isLoading || updateMutation.isLoading}
                                    >
                                        {editingCompany ? 'Обновить' : 'Создать'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MedicalCompanyManagement;