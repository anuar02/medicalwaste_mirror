// pages/admin/CompanyManagement.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Building2,
    Search,
    RefreshCw,
    Plus,
    X,
    Edit,
    Trash2,
    CheckCircle,
    XCircle,
    Users,
    Package,
    AlertTriangle
} from 'lucide-react';
import {useAuth} from "../contexts/AuthContext";
import toast from "react-hot-toast";
import Button from "./ui/Button";
import apiService from "../services/api";
import { formatDate } from '../utils/formatters'


const MedicalCompanyManagement = () => {
    const [search, setSearch] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingCompany, setEditingCompany] = useState(null);
    const [deletingCompany, setDeletingCompany] = useState(null);

    const navigate = useNavigate();
    const { isAdmin } = useAuth();
    const queryClient = useQueryClient();

    // Fetch companies
    const {
        data: companies = [],
        isLoading,
        refetch,
    } = useQuery({
        queryKey: ['companies'],
        queryFn: () => apiService.companies.getAll(),
        select: (resp) => {
            const candidates = [
                resp?.data?.companies,        // ✅ твой реальный ответ
                resp?.data?.data?.companies,  // запасной вариант
                resp?.data?.data,             // на случай другого бэка
                resp?.data?.items,
                resp?.items,
                resp,                         // если уже массив
            ];
            const arr = candidates.find(Array.isArray);
            return Array.isArray(arr) ? arr : [];
        },
    });

    // Check admin access
    React.useEffect(() => {
        if (!isAdmin) {
            navigate('/');
            toast.error('Доступ запрещен');
        }
    }, [isAdmin, navigate]);

    // Filter companies
    const filteredCompanies = companies.filter((company) => {
        const s = search.toLowerCase();
        return (
            company.name?.toLowerCase().includes(s) ||
            company.licenseNumber?.toLowerCase().includes(s) ||
            company.contactInfo?.email?.toLowerCase().includes(s)
        );
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (id) => apiService.companies.delete(id),
        onSuccess: () => {
            toast.success('Компания удалена');
            queryClient.invalidateQueries(['companies']);
            setDeletingCompany(null);
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Ошибка удаления');
        },
    });

    const handleDelete = () => {
        if (deletingCompany) {
            deleteMutation.mutate(deletingCompany._id);
        }
    };

    if (!isAdmin) return null;

    return (
        <div className="container mx-auto p-4">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Управление Компаниями</h1>
                    <p className="text-sm text-slate-500">
                        Создание и управление медицинскими компаниями
                    </p>
                </div>
                <div className="flex space-x-3">
                    <Button onClick={() => refetch()} variant="outline">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Обновить
                    </Button>
                    <Button onClick={() => setShowAddModal(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Добавить компанию
                    </Button>
                </div>
            </div>

            {/* Search */}
            <div className="mb-6 flex items-center space-x-2 rounded-lg bg-white p-2 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Поиск компаний..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-md border border-slate-200 py-2 pl-10 pr-4 text-sm focus:border-teal-500 focus:ring-teal-500"
                    />
                </div>
            </div>

            {/* Companies Grid */}
            {isLoading ? (
                <div className="flex h-64 items-center justify-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-teal-500"></div>
                </div>
            ) : filteredCompanies.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center rounded-lg bg-white shadow-sm">
                    <Building2 className="h-12 w-12 text-slate-300" />
                    <p className="mt-2 text-center text-slate-500">
                        {search ? 'Нет компаний, соответствующих поиску' : 'Нет компаний в системе'}
                    </p>
                    {!search && (
                        <Button
                            className="mt-4"
                            onClick={() => setShowAddModal(true)}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Добавить первую компанию
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredCompanies.map((company) => (
                        <CompanyCard
                            key={company._id}
                            company={company}
                            onEdit={() => setEditingCompany(company)}
                            onDelete={() => setDeletingCompany(company)}
                            onViewDetails={() => navigate(`/admin/companies/${company._id}`)}
                        />
                    ))}
                </div>
            )}

            {/* Add/Edit Modal */}
            {(showAddModal || editingCompany) && (
                <CompanyFormModal
                    isOpen={showAddModal || !!editingCompany}
                    onClose={() => {
                        setShowAddModal(false);
                        setEditingCompany(null);
                    }}
                    company={editingCompany}
                    onSuccess={() => {
                        queryClient.invalidateQueries(['companies']);
                        setShowAddModal(false);
                        setEditingCompany(null);
                    }}
                />
            )}

            {/* Delete Confirmation Modal */}
            {deletingCompany && (
                <DeleteConfirmModal
                    isOpen={!!deletingCompany}
                    onClose={() => setDeletingCompany(null)}
                    onConfirm={handleDelete}
                    companyName={deletingCompany.name}
                    isDeleting={deleteMutation.isLoading}
                />
            )}
        </div>
    );
};

// Company Card Component
const CompanyCard = ({ company, onEdit, onDelete, onViewDetails }) => {
    const { data: statsData } = useQuery({
        queryKey: ['companyStats', company._id],
        queryFn: () => apiService.companies.getStats(company._id),
    });

    const stats = statsData?.data?.data || {};
    const isExpiringSoon = new Date(company.certificationExpiry) - new Date() < 90 * 24 * 60 * 60 * 1000;

    return (
        <div className="overflow-hidden rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
            <div className="border-b border-slate-100 px-6 py-4">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center space-x-2">
                            <h3 className="text-lg font-semibold text-slate-800">
                                {company.name}
                            </h3>
                            {company.isActive ? (
                                <CheckCircle className="h-4 w-4 text-emerald-500" />
                            ) : (
                                <XCircle className="h-4 w-4 text-slate-400" />
                            )}
                        </div>
                        <p className="text-sm text-slate-500">{company.licenseNumber}</p>
                    </div>
                </div>
            </div>

            <div className="px-6 py-4">
                <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-slate-500">Email:</span>
                        <span className="font-medium text-slate-700">
                            {company.contactInfo?.email}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-slate-500">Телефон:</span>
                        <span className="font-medium text-slate-700">
                            {company.contactInfo?.phone || 'Не указан'}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-slate-500">Город:</span>
                        <span className="font-medium text-slate-700">
                            {company.address?.city || 'Не указан'}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="flex items-center text-slate-500">
                            <Package className="mr-1 h-4 w-4" />
                            Контейнеры:
                        </span>
                        <span className="font-medium text-slate-700">
                            {stats.bins?.total || 0}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="flex items-center text-slate-500">
                            <Users className="mr-1 h-4 w-4" />
                            Водители:
                        </span>
                        <span className="font-medium text-slate-700">
                            {stats.drivers?.total || 0}
                        </span>
                    </div>

                    {/* Certification Expiry Warning */}
                    {isExpiringSoon && (
                        <div className="flex items-center space-x-2 rounded-md bg-amber-50 px-3 py-2">
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                            <span className="text-xs text-amber-700">
                                Сертификат истекает {formatDate(company.certificationExpiry)}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <div className="border-t border-slate-100 px-6 py-3 flex space-x-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onViewDetails}
                    className="flex-1"
                >
                    Подробнее
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onEdit}
                >
                    <Edit className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    color="red"
                    size="sm"
                    onClick={onDelete}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
};

// Company Form Modal Component
const CompanyFormModal = ({ isOpen, onClose, company, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: '',
        licenseNumber: '',
        'address.street': '',
        'address.city': '',
        'address.region': '',
        'address.postalCode': '',
        'contactInfo.phone': '',
        'contactInfo.email': '',
        'contactInfo.website': '',
        certificationExpiry: '',
        wasteTypes: [],
        isActive: true,
    });

    React.useEffect(() => {
        if (company) {
            setFormData({
                name: company.name || '',
                licenseNumber: company.licenseNumber || '',
                'address.street': company.address?.street || '',
                'address.city': company.address?.city || '',
                'address.region': company.address?.region || '',
                'address.postalCode': company.address?.postalCode || '',
                'contactInfo.phone': company.contactInfo?.phone || '',
                'contactInfo.email': company.contactInfo?.email || '',
                'contactInfo.website': company.contactInfo?.website || '',
                certificationExpiry: company.certificationExpiry?.split('T')[0] || '',
                wasteTypes: company.wasteTypes || [],
                isActive: company.isActive !== undefined ? company.isActive : true,
            });
        }
    }, [company]);

    const mutation = useMutation({
        mutationFn: (data) => {
            // Convert flat form data to nested structure
            const payload = {
                name: data.name,
                licenseNumber: data.licenseNumber,
                address: {
                    street: data['address.street'],
                    city: data['address.city'],
                    region: data['address.region'],
                    postalCode: data['address.postalCode'],
                },
                contactInfo: {
                    phone: data['contactInfo.phone'],
                    email: data['contactInfo.email'],
                    website: data['contactInfo.website'],
                },
                certificationExpiry: data.certificationExpiry,
                wasteTypes: data.wasteTypes,
                isActive: data.isActive,
            };

            return company
                ? apiService.companies.update(company._id, payload)
                : apiService.companies.create(payload);
        },
        onSuccess: () => {
            toast.success(company ? 'Компания обновлена' : 'Компания создана');
            onSuccess();
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Ошибка сохранения');
        },
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value,
        });
    };

    const handleWasteTypeToggle = (wasteType) => {
        setFormData({
            ...formData,
            wasteTypes: formData.wasteTypes.includes(wasteType)
                ? formData.wasteTypes.filter(t => t !== wasteType)
                : [...formData.wasteTypes, wasteType],
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        mutation.mutate(formData);
    };

    if (!isOpen) return null;

    const wasteTypeOptions = [
        { value: 'infectious', label: 'Инфекционные' },
        { value: 'pathological', label: 'Патологические' },
        { value: 'pharmaceutical', label: 'Фармацевтические' },
        { value: 'sharps', label: 'Острые' },
        { value: 'chemical', label: 'Химические' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
            <div className="w-full max-w-3xl rounded-lg bg-white p-6 shadow-xl my-8">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-slate-800">
                        {company ? 'Редактирование компании' : 'Новая компания'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 text-slate-400 hover:bg-slate-100"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Name */}
                        <div className="md:col-span-2">
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                Название компании *
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="block w-full rounded-lg border border-slate-200 px-3 py-2"
                                required
                            />
                        </div>

                        {/* License Number */}
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                Номер лицензии *
                            </label>
                            <input
                                type="text"
                                name="licenseNumber"
                                value={formData.licenseNumber}
                                onChange={handleChange}
                                className="block w-full rounded-lg border border-slate-200 px-3 py-2"
                                required
                            />
                        </div>

                        {/* Certification Expiry */}
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                Срок действия сертификата *
                            </label>
                            <input
                                type="date"
                                name="certificationExpiry"
                                value={formData.certificationExpiry}
                                onChange={handleChange}
                                className="block w-full rounded-lg border border-slate-200 px-3 py-2"
                                required
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                Email *
                            </label>
                            <input
                                type="email"
                                name="contactInfo.email"
                                value={formData['contactInfo.email']}
                                onChange={handleChange}
                                className="block w-full rounded-lg border border-slate-200 px-3 py-2"
                                required
                            />
                        </div>

                        {/* Phone */}
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                Телефон
                            </label>
                            <input
                                type="tel"
                                name="contactInfo.phone"
                                value={formData['contactInfo.phone']}
                                onChange={handleChange}
                                className="block w-full rounded-lg border border-slate-200 px-3 py-2"
                            />
                        </div>

                        {/* Website */}
                        <div className="md:col-span-2">
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                Веб-сайт
                            </label>
                            <input
                                type="url"
                                name="contactInfo.website"
                                value={formData['contactInfo.website']}
                                onChange={handleChange}
                                className="block w-full rounded-lg border border-slate-200 px-3 py-2"
                                placeholder="https://example.com"
                            />
                        </div>

                        {/* Address Fields */}
                        <div className="md:col-span-2">
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                Адрес (улица)
                            </label>
                            <input
                                type="text"
                                name="address.street"
                                value={formData['address.street']}
                                onChange={handleChange}
                                className="block w-full rounded-lg border border-slate-200 px-3 py-2"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                Город
                            </label>
                            <input
                                type="text"
                                name="address.city"
                                value={formData['address.city']}
                                onChange={handleChange}
                                className="block w-full rounded-lg border border-slate-200 px-3 py-2"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                Регион
                            </label>
                            <input
                                type="text"
                                name="address.region"
                                value={formData['address.region']}
                                onChange={handleChange}
                                className="block w-full rounded-lg border border-slate-200 px-3 py-2"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                Почтовый индекс
                            </label>
                            <input
                                type="text"
                                name="address.postalCode"
                                value={formData['address.postalCode']}
                                onChange={handleChange}
                                className="block w-full rounded-lg border border-slate-200 px-3 py-2"
                            />
                        </div>
                    </div>

                    {/* Waste Types */}
                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                            Типы отходов
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {wasteTypeOptions.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => handleWasteTypeToggle(option.value)}
                                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                                        formData.wasteTypes.includes(option.value)
                                            ? 'bg-teal-100 text-teal-700 border border-teal-200'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Active Status */}
                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            name="isActive"
                            id="isActive"
                            checked={formData.isActive}
                            onChange={handleChange}
                            className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                        />
                        <label htmlFor="isActive" className="text-sm font-medium text-slate-700">
                            Компания активна
                        </label>
                    </div>

                    {/* Form Actions */}
                    <div className="flex justify-end space-x-3 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Отмена
                        </Button>
                        <Button type="submit" isLoading={mutation.isLoading}>
                            {company ? 'Сохранить' : 'Создать'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Delete Confirmation Modal
const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, companyName, isDeleting }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-center space-x-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                        <Trash2 className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-800">Удалить компанию</h3>
                        <p className="text-sm text-slate-500">Это действие нельзя отменить</p>
                    </div>
                </div>

                <p className="mb-6 text-sm text-slate-600">
                    Вы уверены, что хотите удалить компанию <strong>{companyName}</strong>?
                    Все связанные контейнеры и пользователи потеряют привязку к компании.
                </p>

                <div className="flex justify-end space-x-3">
                    <Button variant="outline" onClick={onClose} disabled={isDeleting}>
                        Отмена
                    </Button>
                    <Button color="red" onClick={onConfirm} isLoading={isDeleting}>
                        Удалить компанию
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default MedicalCompanyManagement;