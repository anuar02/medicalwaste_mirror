// pages/admin/CompanyDetails.jsx
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Building2,
    ArrowLeft,
    Edit,
    Trash2,
    Phone,
    Mail,
    Globe,
    MapPin,
    X,
    Calendar,
    CheckCircle,
    XCircle,
    Package,
    Users,
    TrendingUp,
    AlertTriangle,
    FileText,
    Clock,
    Activity
} from 'lucide-react';
import {useAuth} from "../../contexts/AuthContext";
import toast from "react-hot-toast";
import Button from "../../components/ui/Button";
import apiService from "../../services/api";
import {formatDate} from "../../utils/formatters";

const CompanyDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isAdmin } = useAuth();
    const queryClient = useQueryClient();

    const [editingCompany, setEditingCompany] = useState(null);
    const [deletingCompany, setDeletingCompany] = useState(null);
    const [activeTab, setActiveTab] = useState('overview'); // overview, bins, drivers, collections

    // Fetch company details
    const {
        data: companyData,
        isLoading: isLoadingCompany,
        error: companyError
    } = useQuery({
        queryKey: ['company', id],
        queryFn: () => apiService.companies.getOne(id),
        select: (resp) => resp?.data?.data?.company || resp?.data?.company || resp?.data
    });

    // Fetch company statistics
    const {
        data: statsData,
        isLoading: isLoadingStats
    } = useQuery({
        queryKey: ['companyStats', id],
        queryFn: () => apiService.companies.getStats(id),
        select: (resp) => resp?.data?.data?.statistics || resp?.data?.statistics || {}
    });

    // Fetch bins for this company
    const {
        data: binsData,
        isLoading: isLoadingBins
    } = useQuery({
        queryKey: ['companyBins', id],
        queryFn: () => apiService.wasteBins.getAll({ company: id }),
        select: (resp) => {
            const candidates = [
                resp?.data?.bins,
                resp?.data?.data?.bins,
                resp?.data?.data,
                resp?.data?.items,
                resp?.items,
                resp
            ];
            const arr = candidates.find(Array.isArray);
            return Array.isArray(arr) ? arr : [];
        }
    });

    // Fetch drivers for this company
    const {
        data: driversData,
        isLoading: isLoadingDrivers
    } = useQuery({
        queryKey: ['companyDrivers', id],
        queryFn: () => apiService.drivers.getAll({ company: id }),
        select: (resp) => {
            const candidates = [
                resp?.data?.drivers,
                resp?.data?.data?.drivers,
                resp?.data?.data,
                resp?.data?.items,
                resp?.items,
                resp
            ];
            const arr = candidates.find(Array.isArray);
            return Array.isArray(arr) ? arr : [];
        }
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (companyId) => apiService.companies.delete(companyId),
        onSuccess: () => {
            toast.success('Компания удалена');
            navigate('/admin/companies');
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Ошибка удаления');
        }
    });

    const handleDelete = () => {
        if (deletingCompany) {
            deleteMutation.mutate(deletingCompany._id);
        }
    };

    // Check admin access
    React.useEffect(() => {
        if (!isAdmin) {
            navigate('/');
            toast.error('Доступ запрещен');
        }
    }, [isAdmin, navigate]);

    if (!isAdmin) return null;

    if (isLoadingCompany) {
        return (
            <div className="container mx-auto p-4">
                <div className="flex h-64 items-center justify-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-teal-500"></div>
                </div>
            </div>
        );
    }

    if (companyError || !companyData) {
        return (
            <div className="container mx-auto p-4">
                <div className="flex h-64 flex-col items-center justify-center rounded-lg bg-white shadow-sm">
                    <Building2 className="h-12 w-12 text-slate-300" />
                    <p className="mt-2 text-center text-slate-500">
                        Компания не найдена
                    </p>
                    <Button
                        className="mt-4"
                        onClick={() => navigate('/admin/companies')}
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Вернуться к списку
                    </Button>
                </div>
            </div>
        );
    }

    const company = companyData;
    const stats = statsData || {};
    const bins = binsData || [];
    const drivers = driversData || [];

    const isExpiringSoon = new Date(company.certificationExpiry) - new Date() < 90 * 24 * 60 * 60 * 1000;

    return (
        <div className="container mx-auto p-4">
            {/* Header */}
            <div className="mb-6">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/admin/companies')}
                    className="mb-4"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Назад к компаниям
                </Button>

                <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-teal-100">
                            <Building2 className="h-8 w-8 text-teal-600" />
                        </div>
                        <div>
                            <div className="flex items-center space-x-2">
                                <h1 className="text-2xl font-bold text-slate-800">
                                    {company.name}
                                </h1>
                                {company.isActive ? (
                                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                                ) : (
                                    <XCircle className="h-5 w-5 text-slate-400" />
                                )}
                            </div>
                            <p className="text-sm text-slate-500">
                                Лицензия: {company.licenseNumber}
                            </p>
                            <div className="mt-1 flex items-center space-x-4 text-xs text-slate-500">
                                <span className="flex items-center">
                                    <Calendar className="mr-1 h-3 w-3" />
                                    Создана {formatDate(company.createdAt)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex space-x-3">
                        <Button
                            variant="outline"
                            onClick={() => setEditingCompany(company)}
                        >
                            <Edit className="mr-2 h-4 w-4" />
                            Редактировать
                        </Button>
                        <Button
                            variant="outline"
                            color="red"
                            onClick={() => setDeletingCompany(company)}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Удалить
                        </Button>
                    </div>
                </div>
            </div>

            {/* Certification Warning */}
            {isExpiringSoon && (
                <div className="mb-6 flex items-center space-x-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <div className="flex-1">
                        <p className="font-medium text-amber-900">
                            Срок действия сертификата истекает
                        </p>
                        <p className="text-sm text-amber-700">
                            Сертификат действителен до {formatDate(company.certificationExpiry)}
                        </p>
                    </div>
                </div>
            )}

            {/* Statistics Cards */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    icon={Package}
                    label="Контейнеры"
                    value={stats.bins || 0}
                    color="teal"
                    isLoading={isLoadingStats}
                />
                <StatCard
                    icon={Users}
                    label="Водители"
                    value={stats.drivers || 0}
                    color="blue"
                    isLoading={isLoadingStats}
                />
                <StatCard
                    icon={Activity}
                    label="Собрано за месяц"
                    value={stats.collectionsThisMonth || 0}
                    color="emerald"
                    isLoading={isLoadingStats}
                />
                <StatCard
                    icon={TrendingUp}
                    label="Всего сборов"
                    value={stats.totalCollections || 0}
                    color="purple"
                    isLoading={isLoadingStats}
                />
            </div>

            {/* Tabs */}
            <div className="mb-6">
                <div className="border-b border-slate-200">
                    <nav className="-mb-px flex space-x-8">
                        <TabButton
                            active={activeTab === 'overview'}
                            onClick={() => setActiveTab('overview')}
                            icon={FileText}
                        >
                            Информация
                        </TabButton>
                        <TabButton
                            active={activeTab === 'bins'}
                            onClick={() => setActiveTab('bins')}
                            icon={Package}
                            badge={bins.length}
                        >
                            Контейнеры
                        </TabButton>
                        <TabButton
                            active={activeTab === 'drivers'}
                            onClick={() => setActiveTab('drivers')}
                            icon={Users}
                            badge={drivers.length}
                        >
                            Водители
                        </TabButton>
                        <TabButton
                            active={activeTab === 'collections'}
                            onClick={() => setActiveTab('collections')}
                            icon={Clock}
                        >
                            История сборов
                        </TabButton>
                    </nav>
                </div>
            </div>

            {/* Tab Content */}
            <div className="rounded-lg bg-white shadow-sm">
                {activeTab === 'overview' && (
                    <OverviewTab company={company} />
                )}
                {activeTab === 'bins' && (
                    <BinsTab
                        bins={bins}
                        isLoading={isLoadingBins}
                        companyId={id}
                    />
                )}
                {activeTab === 'drivers' && (
                    <DriversTab
                        drivers={drivers}
                        isLoading={isLoadingDrivers}
                        companyId={id}
                    />
                )}
                {activeTab === 'collections' && (
                    <CollectionsTab companyId={id} />
                )}
            </div>

            {/* Edit Modal */}
            {editingCompany && (
                <CompanyFormModal
                    isOpen={!!editingCompany}
                    onClose={() => setEditingCompany(null)}
                    company={editingCompany}
                    onSuccess={() => {
                        queryClient.invalidateQueries(['company', id]);
                        queryClient.invalidateQueries(['companyStats', id]);
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

// Stat Card Component
const StatCard = ({ icon: Icon, label, value, color, isLoading }) => {
    const colorClasses = {
        teal: 'bg-teal-100 text-teal-600',
        blue: 'bg-blue-100 text-blue-600',
        emerald: 'bg-emerald-100 text-emerald-600',
        purple: 'bg-purple-100 text-purple-600',
        amber: 'bg-amber-100 text-amber-600'
    };

    return (
        <div className="rounded-lg bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-500">{label}</p>
                    {isLoading ? (
                        <div className="mt-2 h-8 w-16 animate-pulse rounded bg-slate-200"></div>
                    ) : (
                        <p className="mt-2 text-3xl font-bold text-slate-800">{value}</p>
                    )}
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${colorClasses[color]}`}>
                    <Icon className="h-6 w-6" />
                </div>
            </div>
        </div>
    );
};

// Tab Button Component
const TabButton = ({ active, onClick, icon: Icon, children, badge }) => {
    return (
        <button
            onClick={onClick}
            className={`flex items-center space-x-2 border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                active
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
        >
            <Icon className="h-4 w-4" />
            <span>{children}</span>
            {badge !== undefined && (
                <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                    active ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-600'
                }`}>
                    {badge}
                </span>
            )}
        </button>
    );
};

// Overview Tab Component
const OverviewTab = ({ company }) => {
    const wasteTypeLabels = {
        infectious: 'Инфекционные',
        pathological: 'Патологические',
        pharmaceutical: 'Фармацевтические',
        sharps: 'Острые',
        chemical: 'Химические'
    };

    return (
        <div className="p-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Contact Information */}
                <div>
                    <h3 className="mb-4 text-lg font-semibold text-slate-800">
                        Контактная информация
                    </h3>
                    <div className="space-y-3">
                        <InfoRow
                            icon={Mail}
                            label="Email"
                            value={company.contactInfo?.email || 'Не указан'}
                        />
                        <InfoRow
                            icon={Phone}
                            label="Телефон"
                            value={company.contactInfo?.phone || 'Не указан'}
                        />
                        <InfoRow
                            icon={Globe}
                            label="Веб-сайт"
                            value={company.contactInfo?.website || 'Не указан'}
                            isLink={!!company.contactInfo?.website}
                        />
                    </div>
                </div>

                {/* Address */}
                <div>
                    <h3 className="mb-4 text-lg font-semibold text-slate-800">
                        Адрес
                    </h3>
                    <div className="space-y-3">
                        <InfoRow
                            icon={MapPin}
                            label="Улица"
                            value={company.address?.street || 'Не указана'}
                        />
                        <InfoRow
                            icon={MapPin}
                            label="Город"
                            value={company.address?.city || 'Не указан'}
                        />
                        <InfoRow
                            icon={MapPin}
                            label="Регион"
                            value={company.address?.region || 'Не указан'}
                        />
                        <InfoRow
                            icon={MapPin}
                            label="Индекс"
                            value={company.address?.postalCode || 'Не указан'}
                        />
                    </div>
                </div>

                {/* Certification */}
                <div>
                    <h3 className="mb-4 text-lg font-semibold text-slate-800">
                        Сертификация
                    </h3>
                    <div className="space-y-3">
                        <InfoRow
                            icon={FileText}
                            label="Номер лицензии"
                            value={company.licenseNumber}
                        />
                        <InfoRow
                            icon={Calendar}
                            label="Действителен до"
                            value={formatDate(company.certificationExpiry)}
                        />
                    </div>
                </div>

                {/* Waste Types */}
                <div>
                    <h3 className="mb-4 text-lg font-semibold text-slate-800">
                        Типы отходов
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {company.wasteTypes && company.wasteTypes.length > 0 ? (
                            company.wasteTypes.map((type) => (
                                <span
                                    key={type}
                                    className="rounded-md bg-teal-100 px-3 py-1 text-sm font-medium text-teal-700"
                                >
                                    {wasteTypeLabels[type] || type}
                                </span>
                            ))
                        ) : (
                            <p className="text-sm text-slate-500">Не указаны</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Status */}
            <div className="mt-6 border-t pt-6">
                <h3 className="mb-4 text-lg font-semibold text-slate-800">
                    Статус компании
                </h3>
                <div className="flex items-center space-x-2">
                    {company.isActive ? (
                        <>
                            <CheckCircle className="h-5 w-5 text-emerald-500" />
                            <span className="font-medium text-emerald-700">Активна</span>
                        </>
                    ) : (
                        <>
                            <XCircle className="h-5 w-5 text-slate-400" />
                            <span className="font-medium text-slate-500">Неактивна</span>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// Info Row Component
const InfoRow = ({ icon: Icon, label, value, isLink }) => {
    return (
        <div className="flex items-start space-x-3">
            <Icon className="mt-0.5 h-5 w-5 text-slate-400" />
            <div className="flex-1">
                <p className="text-sm font-medium text-slate-500">{label}</p>
                {isLink && value !== 'Не указан' ? (
                    <a
                        href={value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-teal-600 hover:underline"
                    >
                        {value}
                    </a>
                ) : (
                    <p className="text-sm text-slate-800">{value}</p>
                )}
            </div>
        </div>
    );
};

// Bins Tab Component
const BinsTab = ({ bins, isLoading, companyId }) => {
    const navigate = useNavigate();

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-teal-500"></div>
            </div>
        );
    }

    if (bins.length === 0) {
        return (
            <div className="flex h-64 flex-col items-center justify-center p-6">
                <Package className="h-12 w-12 text-slate-300" />
                <p className="mt-2 text-center text-slate-500">
                    Нет контейнеров для этой компании
                </p>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800">
                    Контейнеры ({bins.length})
                </h3>
            </div>
            <div className="space-y-3">
                {bins.map((bin) => (
                    <div
                        key={bin._id}
                        className="flex items-center justify-between rounded-lg border border-slate-200 p-4 hover:border-teal-300 transition-colors cursor-pointer"
                        onClick={() => navigate(`/bins/${bin._id}`)}
                    >
                        <div className="flex items-center space-x-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100">
                                <Package className="h-5 w-5 text-teal-600" />
                            </div>
                            <div>
                                <p className="font-medium text-slate-800">
                                    {bin.location?.department || 'Без отделения'}
                                </p>
                                <p className="text-sm text-slate-500">
                                    ID: {bin.binId || bin._id}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="text-right">
                                <p className="text-sm font-medium text-slate-700">
                                    Заполнение: {bin.currentFullness || 0}%
                                </p>
                                <p className="text-xs text-slate-500">
                                    {bin.wasteType || 'Не указан'}
                                </p>
                            </div>
                            <div className={`h-2 w-2 rounded-full ${
                                bin.currentFullness >= 80 ? 'bg-red-500' :
                                    bin.currentFullness >= 60 ? 'bg-amber-500' :
                                        'bg-emerald-500'
                            }`} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Drivers Tab Component
const DriversTab = ({ drivers, isLoading, companyId }) => {
    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-teal-500"></div>
            </div>
        );
    }

    if (drivers.length === 0) {
        return (
            <div className="flex h-64 flex-col items-center justify-center p-6">
                <Users className="h-12 w-12 text-slate-300" />
                <p className="mt-2 text-center text-slate-500">
                    Нет водителей для этой компании
                </p>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800">
                    Водители ({drivers.length})
                </h3>
            </div>
            <div className="space-y-3">
                {drivers.map((driver) => (
                    <div
                        key={driver._id}
                        className="flex items-center justify-between rounded-lg border border-slate-200 p-4"
                    >
                        <div className="flex items-center space-x-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                                <Users className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="font-medium text-slate-800">
                                    {driver.name || driver.fullName || 'Без имени'}
                                </p>
                                <p className="text-sm text-slate-500">
                                    {driver.email}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3">
                            {driver.isVerified ? (
                                <span className="flex items-center space-x-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                                    <CheckCircle className="h-3 w-3" />
                                    <span>Верифицирован</span>
                                </span>
                            ) : (
                                <span className="flex items-center space-x-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                                    <Clock className="h-3 w-3" />
                                    <span>Ожидает проверки</span>
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Collections Tab Component
const CollectionsTab = ({ companyId }) => {
    // This would fetch collection history for the company
    // For now, showing a placeholder
    return (
        <div className="flex h-64 flex-col items-center justify-center p-6">
            <Clock className="h-12 w-12 text-slate-300" />
            <p className="mt-2 text-center text-slate-500">
                История сборов скоро будет доступна
            </p>
        </div>
    );
};

// Company Form Modal (reused from CompanyManagement)
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

            return apiService.companies.update(company._id, payload);
        },
        onSuccess: () => {
            toast.success('Компания обновлена');
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
                        Редактирование компании
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

                    <div className="flex justify-end space-x-3 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Отмена
                        </Button>
                        <Button type="submit" isLoading={mutation.isLoading}>
                            Сохранить
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

export default CompanyDetails;