// pages/BinList.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from 'react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Plus,
    Search,
    Filter,
    RefreshCw,
    SortAsc,
    SortDesc,
    X,
    CheckCircle,
    AlertTriangle
} from 'lucide-react';
import apiService from '../services/api';
import Loader from '../components/ui/Loader';
import Button from '../components/ui/Button';
import BinCard from '../components/bins/BinCard';
import { useAuth } from '../contexts/AuthContext';
import AddBinModal from '../components/modals/AddBinModal';
import BinFilters from '../components/bins/BinFilters';

const BinList = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { isSupervisor } = useAuth();

    // Get initial filters from URL
    const initialDepartment = searchParams.get('department') || '';
    const initialWasteType = searchParams.get('wasteType') || '';
    const initialStatus = searchParams.get('status') || '';
    const initialFilter = searchParams.get('filter') || '';
    const initialSearch = searchParams.get('search') || '';
    const initialSort = searchParams.get('sort') || 'fullness:desc';

    // State for filters, sort, and search
    const [department, setDepartment] = useState(initialDepartment);
    const [wasteType, setWasteType] = useState(initialWasteType);
    const [status, setStatus] = useState(initialStatus);
    const [filter, setFilter] = useState(initialFilter);
    const [search, setSearch] = useState(initialSearch);
    const [sort, setSort] = useState(initialSort);
    const [showFilters, setShowFilters] = useState(false);

    // State for modal
    const [showAddModal, setShowAddModal] = useState(false);

    // Build query parameters
    const queryParams = useMemo(() => {
        const params = {};

        if (department) params.department = department;
        if (wasteType) params.wasteType = wasteType;
        if (status) params.status = status;

        // Special filter for alert bins
        if (filter === 'alert') {
            params.fullnessMin = 80; // Bins with at least 80% fullness
        }

        return params;
    }, [department, wasteType, status, filter]);

    // Fetch all bins with filters
    const {
        data: binsData,
        isLoading,
        error,
        refetch,
        isFetching
    } = useQuery(
        ['bins', queryParams],
        () => apiService.wasteBins.getAll(queryParams),
        {
            refetchInterval: 60000, // 1 minute
            staleTime: 30000, // 30 seconds
        }
    );

    // Apply search and sort to fetched data
    const filteredBins = useMemo(() => {
        if (!binsData?.data?.data?.bins) return [];

        let result = [...binsData.data.data.bins];

        // Apply search filter
        if (search) {
            const searchLower = search.toLowerCase();
            result = result.filter(bin =>
                bin.binId.toLowerCase().includes(searchLower) ||
                bin.department.toLowerCase().includes(searchLower) ||
                bin.wasteType.toLowerCase().includes(searchLower)
            );
        }

        // Apply sorting
        const [sortField, sortDirection] = sort.split(':');
        result.sort((a, b) => {
            let aVal = a[sortField];
            let bVal = b[sortField];

            // Handle string comparison
            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }

            // Handle date comparison
            if (sortField === 'lastUpdate' || sortField === 'lastCollection') {
                aVal = new Date(aVal).getTime();
                bVal = new Date(bVal).getTime();
            }

            // Sort based on direction
            if (sortDirection === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });

        return result;
    }, [binsData, search, sort]);

    // Update URL when filters change
    useEffect(() => {
        const params = new URLSearchParams();
        if (department) params.set('department', department);
        if (wasteType) params.set('wasteType', wasteType);
        if (status) params.set('status', status);
        if (filter) params.set('filter', filter);
        if (search) params.set('search', search);
        if (sort) params.set('sort', sort);

        setSearchParams(params);
    }, [department, wasteType, status, filter, search, sort, setSearchParams]);

    // Handle bin click
    const handleBinClick = (binId) => {
        navigate(`/bins/${binId}`);
    };

    // Handle refresh
    const handleRefresh = () => {
        refetch();
    };

    // Handle sort change
    const handleSortChange = (e) => {
        setSort(e.target.value);
    };

    // Handle search change
    const handleSearchChange = (e) => {
        setSearch(e.target.value);
    };

    // Handle search clear
    const handleSearchClear = () => {
        setSearch('');
    };

    // Handle filter reset
    const handleFilterReset = () => {
        setDepartment('');
        setWasteType('');
        setStatus('');
        setFilter('');
    };

    // Handle filter apply
    const handleFilterApply = () => {
        setShowFilters(false);
    };

    // Loading state
    if (isLoading) {
        return <Loader text="Загрузка контейнеров..." />;
    }

    // Error state
    if (error) {
        return (
            <div className="container mx-auto p-6">
                <div className="rounded-lg bg-red-50 p-4 text-red-600">
                    <AlertTriangle className="mb-2 h-6 w-6" />
                    <h3 className="text-lg font-semibold">Ошибка загрузки данных</h3>
                    <p>{error.message || 'Не удалось загрузить список контейнеров'}</p>
                    <Button
                        className="mt-4"
                        onClick={handleRefresh}
                        variant="outline"
                        color="red"
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Попробовать снова
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4">
            {/* Header */}
            <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">
                        Контейнеры
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Управление и мониторинг контейнеров для медицинских отходов
                    </p>
                </div>
                <div className="mt-4 flex space-x-3 md:mt-0">
                    <Button
                        variant="outline"
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <Filter className="mr-2 h-4 w-4" />
                        Фильтры {showFilters ? '↑' : '↓'}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleRefresh}
                        isLoading={isFetching}
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Обновить
                    </Button>
                    {isSupervisor && (
                        <Button
                            onClick={() => setShowAddModal(true)}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Добавить
                        </Button>
                    )}
                </div>
            </div>

            {/* Search and sort */}
            <div className="mb-6 flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                {/* Search input */}
                <div className="relative w-full sm:w-64 lg:w-96">
                    <input
                        type="text"
                        placeholder="Поиск контейнеров..."
                        value={search}
                        onChange={handleSearchChange}
                        className="block w-full rounded-lg border border-slate-200 pl-10 pr-10 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                    />
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <Search className="h-4 w-4" />
                    </span>
                    {search && (
                        <button
                            onClick={handleSearchClear}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-500"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {/* Sort dropdown */}
                <div className="flex items-center space-x-2">
                    <label htmlFor="sort" className="text-sm font-medium text-slate-600">
                        Сортировка:
                    </label>
                    <div className="relative">
                        <select
                            id="sort"
                            value={sort}
                            onChange={handleSortChange}
                            className="block appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-10 py-2 text-sm text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                        >
                            <option value="fullness:desc">Заполненность (↓)</option>
                            <option value="fullness:asc">Заполненность (↑)</option>
                            <option value="lastUpdate:desc">Последнее обновление (↓)</option>
                            <option value="lastUpdate:asc">Последнее обновление (↑)</option>
                            <option value="binId:asc">ID контейнера (А-Я)</option>
                            <option value="binId:desc">ID контейнера (Я-А)</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400">
                            {sort.endsWith(':asc') ? (
                                <SortAsc className="h-4 w-4" />
                            ) : (
                                <SortDesc className="h-4 w-4" />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            {showFilters && (
                <BinFilters
                    department={department}
                    setDepartment={setDepartment}
                    wasteType={wasteType}
                    setWasteType={setWasteType}
                    status={status}
                    setStatus={setStatus}
                    filter={filter}
                    setFilter={setFilter}
                    onApply={handleFilterApply}
                    onReset={handleFilterReset}
                />
            )}

            {/* Results summary */}
            <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-slate-500">
                    Показано {filteredBins.length} {getResultCountText(filteredBins.length)} из {binsData?.data?.data?.bins?.length || 0}
                </p>

                {/* Active filters */}
                <div className="flex flex-wrap items-center space-x-2">
                    {department && (
                        <span className="flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                            {department}
                            <button
                                onClick={() => setDepartment('')}
                                className="ml-1 text-slate-500 hover:text-slate-700"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </span>
                    )}
                    {wasteType && (
                        <span className="flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                            {wasteType}
                            <button
                                onClick={() => setWasteType('')}
                                className="ml-1 text-slate-500 hover:text-slate-700"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </span>
                    )}
                    {status && (
                        <span className="flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                            {getStatusText(status)}
                            <button
                                onClick={() => setStatus('')}
                                className="ml-1 text-slate-500 hover:text-slate-700"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </span>
                    )}
                    {filter === 'alert' && (
                        <span className="flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-700">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            Требуют внимания
                            <button
                                onClick={() => setFilter('')}
                                className="ml-1 text-amber-500 hover:text-amber-700"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </span>
                    )}
                </div>
            </div>

            {/* Bins grid */}
            {filteredBins.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg bg-slate-50 py-16">
                    <div className="rounded-full bg-slate-100 p-3">
                        <Search className="h-6 w-6 text-slate-400" />
                    </div>
                    <h3 className="mt-4 text-lg font-medium text-slate-700">Контейнеры не найдены</h3>
                    <p className="mt-1 text-sm text-slate-500">
                        Попробуйте изменить параметры поиска или фильтры
                    </p>
                    <Button
                        variant="outline"
                        className="mt-4"
                        onClick={handleFilterReset}
                    >
                        <X className="mr-2 h-4 w-4" />
                        Сбросить фильтры
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredBins.map((bin) => (
                        <BinCard
                            key={bin.binId}
                            bin={bin}
                            onClick={() => handleBinClick(bin.binId)}
                        />
                    ))}
                </div>
            )}

            {/* Add Bin Modal */}
            <AddBinModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onSuccess={() => {
                    refetch();
                    setShowAddModal(false);
                }}
            />
        </div>
    );
};

// Helper functions
const getResultCountText = (count) => {
    if (count === 1) return 'контейнер';
    if (count > 1 && count < 5) return 'контейнера';
    return 'контейнеров';
};

const getStatusText = (status) => {
    const statuses = {
        active: 'Активен',
        maintenance: 'Обслуживание',
        offline: 'Офлайн',
        decommissioned: 'Выведен',
    };
    return statuses[status] || status;
};

export default BinList;