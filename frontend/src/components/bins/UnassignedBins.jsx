// pages/admin/UnassignedBins.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Package,
    Search,
    RefreshCw,
    Building2,
    AlertCircle,
    CheckCircle
} from 'lucide-react';
import apiService from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';
import { formatDate } from '../../utils/formatters';

const UnassignedBins = () => {
    const [search, setSearch] = useState('');
    const [selectedBins, setSelectedBins] = useState(new Set());
    const [selectedCompany, setSelectedCompany] = useState('');
    const [showBulkAssign, setShowBulkAssign] = useState(false);

    const navigate = useNavigate();
    const { isAdmin } = useAuth();
    const queryClient = useQueryClient();

    // Check admin access
    React.useEffect(() => {
        if (!isAdmin) {
            navigate('/');
            toast.error('Доступ запрещен');
        }
    }, [isAdmin, navigate]);

    // Fetch unassigned bins
    const {
        data: companies = [],
        isLoading: companiesLoading,
    } = useQuery({
        queryKey: ['companies'],
        queryFn: () => apiService.companies.getAll(),
        select: (resp) => {
            const candidates = [
                resp?.data?.companies,
                resp?.data?.data?.companies,
                resp?.data?.data,
                resp?.data?.items,
                resp?.data,
                resp?.items,
                resp,
            ];
            const arr = candidates.find(Array.isArray);
            return Array.isArray(arr) ? arr : [];
        },
    });

// ✅ Неназначенные контейнеры: тоже массив
    const {
        data: bins = [],
        isLoading: binsLoading,
        refetch: refetchBins,
    } = useQuery({
        queryKey: ['unassignedBins'],
        queryFn: () => apiService.wasteBins.getAll({ company: null }),
        select: (resp) => {
            // Популярные формы ответа
            const candidates = [
                resp?.data?.data?.bins,
                resp?.data?.data,
                resp?.data?.items,
                resp?.data,
                resp?.items,
                resp,
            ];
            const arr = candidates.find(Array.isArray) || [];
            // Оставляем только те, у которых нет компании
            return arr.filter((b) => !b?.company);
        },
    });

// ✅ Фильтрация
    const filteredBins = bins.filter((bin) => {
        const q = search.toLowerCase();
        return (
            bin.binId?.toLowerCase().includes(q) ||
            bin.department?.toLowerCase().includes(q) ||
            bin.wasteType?.toLowerCase().includes(q)
        );
    });

    // Assign bin to company mutation
    const assignMutation = useMutation({
        mutationFn: ({ _id, companyId }) =>
            apiService.wasteBins.update(_id, { company: companyId }),
        onSuccess: () => {
            toast.success('Контейнер назначен компании');
            queryClient.invalidateQueries(['unassignedBins']);
            queryClient.invalidateQueries(['bins']);
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Ошибка назначения');
        },
    });

    // Bulk assign mutation
    const bulkAssignMutation = useMutation({
        mutationFn: ({ binIds, companyId }) => {
            return Promise.all(
                binIds.map(binId =>
                    apiService.wasteBins.update(binId, { company: companyId })
                )
            );
        },
        onSuccess: () => {
            toast.success('Контейнеры назначены компании');
            queryClient.invalidateQueries(['unassignedBins']);
            queryClient.invalidateQueries(['bins']);
            setSelectedBins(new Set());
            setShowBulkAssign(false);
        },
        onError: (error) => {
            toast.error('Ошибка массового назначения');
        },
    });

    const handleSelectBin = (binId) => {
        const newSelected = new Set(selectedBins);
        if (newSelected.has(binId)) {
            newSelected.delete(binId);
        } else {
            newSelected.add(binId);
        }
        setSelectedBins(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedBins.size === filteredBins.length) {
            setSelectedBins(new Set());
        } else {
            setSelectedBins(new Set(filteredBins.map(b => b.binId)));
        }
    };

    const handleBulkAssign = () => {
        if (!selectedCompany) {
            toast.error('Выберите компанию');
            return;
        }
        bulkAssignMutation.mutate({
            binIds: Array.from(selectedBins),
            companyId: selectedCompany
        });
    };

    if (!isAdmin) return null;

    return (
        <div className="container mx-auto p-4">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Неназначенные Контейнеры</h1>
                <p className="text-sm text-slate-500">
                    Контейнеры без привязки к компании не видны водителям
                </p>
            </div>

            {/* Stats */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-lg bg-white p-4 shadow-sm">
                    <div className="flex items-center space-x-3">
                        <div className="rounded-full bg-slate-100 p-3">
                            <Package className="h-6 w-6 text-slate-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Всего контейнеров</p>
                            <p className="text-2xl font-bold text-slate-800">{bins.length}</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-lg bg-white p-4 shadow-sm">
                    <div className="flex items-center space-x-3">
                        <div className="rounded-full bg-amber-100 p-3">
                            <AlertCircle className="h-6 w-6 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Требуют назначения</p>
                            <p className="text-2xl font-bold text-amber-600">{filteredBins.length}</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-lg bg-white p-4 shadow-sm">
                    <div className="flex items-center space-x-3">
                        <div className="rounded-full bg-teal-100 p-3">
                            <Building2 className="h-6 w-6 text-teal-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Доступно компаний</p>
                            <p className="text-2xl font-bold text-teal-600">{companies.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="mb-6 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Поиск контейнеров..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-md border border-slate-200 py-2 pl-10 pr-4 text-sm focus:border-teal-500 focus:ring-teal-500"
                    />
                </div>

                <div className="flex gap-2">
                    <Button onClick={() => refetchBins()} variant="outline">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Обновить
                    </Button>

                    {selectedBins.size > 0 && (
                        <Button onClick={() => setShowBulkAssign(true)}>
                            <Building2 className="mr-2 h-4 w-4" />
                            Назначить ({selectedBins.size})
                        </Button>
                    )}
                </div>
            </div>

            {/* Bulk Assignment Panel */}
            {showBulkAssign && (
                <div className="mb-6 rounded-lg bg-teal-50 border border-teal-200 p-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                            <label className="mb-1 block text-sm font-medium text-teal-900">
                                Выберите компанию для {selectedBins.size} контейнеров
                            </label>
                            <select
                                value={selectedCompany}
                                onChange={(e) => setSelectedCompany(e.target.value)}
                                className="block w-full rounded-lg border border-teal-300 px-3 py-2 bg-white"
                                disabled={companiesLoading}
                            >
                                <option value="">Выберите компанию...</option>
                                {companies.map((company) => (
                                    <option key={company._id} value={company._id}>
                                        {company.name} ({company.licenseNumber})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                onClick={handleBulkAssign}
                                isLoading={bulkAssignMutation.isLoading}
                                disabled={!selectedCompany}
                            >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Назначить
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowBulkAssign(false);
                                    setSelectedCompany('');
                                }}
                            >
                                Отмена
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                {binsLoading ? (
                    <div className="flex h-64 items-center justify-center">
                        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-teal-500"></div>
                    </div>
                ) : filteredBins.length === 0 ? (
                    <div className="flex h-64 flex-col items-center justify-center">
                        <CheckCircle className="h-12 w-12 text-emerald-400" />
                        <p className="mt-2 text-center text-slate-500">
                            {search ? 'Нет контейнеров, соответствующих поиску' : 'Все контейнеры назначены компаниям! 🎉'}
                        </p>
                        {!search && (
                            <Button
                                className="mt-4"
                                onClick={() => navigate('/admin/bins')}
                                variant="outline"
                            >
                                Управление контейнерами
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left">
                                    <input
                                        type="checkbox"
                                        checked={selectedBins.size === filteredBins.length && filteredBins.length > 0}
                                        onChange={handleSelectAll}
                                        className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                    />
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                                    ID Контейнера
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                                    Отделение
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                                    Тип отходов
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                                    Заполненность
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                                    Статус
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                                    Назначить компанию
                                </th>
                                <th className="px-6 py-3"></th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                            {filteredBins.map((bin) => (
                                <tr key={bin._id || bin.binId} className="hover:bg-slate-50">
                                    <td className="px-6 py-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedBins.has(bin._id)}
                                            onChange={() => handleSelectBin(bin._id)}
                                            className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                        />
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-900">
                                        {bin.binId}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                                        {bin.department}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                                        {bin.wasteType}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                                        <div className="flex items-center">
                                                <span className={`inline-block w-16 ${
                                                    bin.fullness > 80 ? 'text-red-600' :
                                                        bin.fullness > 60 ? 'text-amber-600' : 'text-teal-600'
                                                }`}>
                                                    {bin.fullness ? `${Math.round(bin.fullness)}%` : 'N/A'}
                                                </span>
                                            <div className="ml-2 h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                                                <div
                                                    className={`h-full ${
                                                        bin.fullness > 80 ? 'bg-red-500' :
                                                            bin.fullness > 60 ? 'bg-amber-500' : 'bg-teal-500'
                                                    }`}
                                                    style={{ width: `${bin.fullness || 0}%` }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                                bin.status === 'active' ? 'bg-green-100 text-green-800' :
                                                    bin.status === 'maintenance' ? 'bg-amber-100 text-amber-800' :
                                                        'bg-slate-100 text-slate-800'
                                            }`}>
                                                {bin.status === 'active' ? 'Активен' :
                                                    bin.status === 'maintenance' ? 'Обслуживание' : 'Офлайн'}
                                            </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <select
                                                onChange={(e) => {
                                                    if (e.target.value) {
                                                        console.log(bin)
                                                        assignMutation.mutate({
                                                            _id: bin._id,
                                                            companyId: e.target.value
                                                        });
                                                    }
                                                }}
                                                className="block rounded-lg border border-slate-200 px-2 py-1 text-sm"
                                                disabled={companiesLoading}
                                            >
                                                <option value="">Выбрать...</option>
                                                {companies.map((company) => (
                                                    <option key={company._id} value={company._id}>
                                                        {company.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                                        <a
                                            href={`/bins/${bin.binId}`}
                                            className="text-teal-600 hover:text-teal-900"
                                        >
                                            Подробнее
                                        </a>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Info Box */}
            {bins.length > 0 && (
                <div className="mt-6 rounded-lg bg-blue-50 border border-blue-200 p-4">
                    <div className="flex items-start space-x-3">
                        <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                            <h4 className="text-sm font-medium text-blue-900">Важно</h4>
                            <p className="mt-1 text-sm text-blue-700">
                                Контейнеры без привязки к компании создаются автоматически при регистрации ESP32 устройств.
                                Водители и супервизоры не видят эти контейнеры пока им не назначена компания.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UnassignedBins;
