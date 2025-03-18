import React from 'react';
import PropTypes from 'prop-types';
import { X, AlertTriangle, SortAsc, SortDesc, Filter } from 'lucide-react';
import Button from '../ui/Button';

const BinFilters = ({
                        department,
                        setDepartment,
                        wasteType,
                        setWasteType,
                        status,
                        setStatus,
                        filter,
                        setFilter,
                        sort,
                        setSort,
                        onApply,
                        onReset
                    }) => {
    // Department options - would typically come from API
    const departmentOptions = [
        'Хирургическое Отделение',
        'Терапевтическое Отделение',
        'Педиатрическое Отделение',
        'Акушерское Отделение',
        'Инфекционное Отделение',
        'Лаборатория',
        'Реанимация',
    ];

    // Waste type options
    const wasteTypeOptions = [
        'Острые Медицинские Отходы',
        'Инфекционные Отходы',
        'Патологические Отходы',
        'Фармацевтические Отходы',
        'Химические Отходы',
        'Радиоактивные Отходы',
        'Общие Медицинские Отходы',
    ];

    // Status options
    const statusOptions = [
        { value: 'active', label: 'Активен' },
        { value: 'maintenance', label: 'Обслуживание' },
        { value: 'offline', label: 'Офлайн' },
        { value: 'decommissioned', label: 'Выведен' },
    ];

    // Special filter options
    const filterOptions = [
        { value: '', label: 'Все' },
        { value: 'alert', label: 'Требуют внимания' },
    ];

    // Sort options
    const sortOptions = [
        { value: 'fullness:desc', label: 'Заполненность (по убыванию)', icon: <SortDesc className="h-4 w-4" /> },
        { value: 'fullness:asc', label: 'Заполненность (по возрастанию)', icon: <SortAsc className="h-4 w-4" /> },
        { value: 'lastUpdate:desc', label: 'Последнее обновление (сначала новые)', icon: <SortDesc className="h-4 w-4" /> },
        { value: 'lastUpdate:asc', label: 'Последнее обновление (сначала старые)', icon: <SortAsc className="h-4 w-4" /> },
        { value: 'binId:asc', label: 'ID контейнера (А-Я)', icon: <SortAsc className="h-4 w-4" /> },
        { value: 'binId:desc', label: 'ID контейнера (Я-А)', icon: <SortDesc className="h-4 w-4" /> },
    ];

    return (
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800">Фильтры</h3>
                <button
                    onClick={onReset}
                    className="flex items-center text-sm text-slate-500 hover:text-slate-700"
                >
                    <X className="mr-1 h-4 w-4" />
                    Сбросить все
                </button>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                {/* Department filter */}
                <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                        Отделение
                    </label>
                    <select
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:ring-teal-500"
                    >
                        <option value="">Все отделения</option>
                        {departmentOptions.map((dept) => (
                            <option key={dept} value={dept}>
                                {dept}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Waste type filter */}
                <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                        Тип отходов
                    </label>
                    <select
                        value={wasteType}
                        onChange={(e) => setWasteType(e.target.value)}
                        className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:ring-teal-500"
                    >
                        <option value="">Все типы</option>
                        {wasteTypeOptions.map((type) => (
                            <option key={type} value={type}>
                                {type}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Status filter */}
                <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                        Статус
                    </label>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:ring-teal-500"
                    >
                        <option value="">Все статусы</option>
                        {statusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Special filters */}
                <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                        Специальные фильтры
                    </label>
                    <div className="flex space-x-2">
                        {filterOptions.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => setFilter(option.value)}
                                className={`flex items-center rounded-lg border px-3 py-2 text-sm ${
                                    filter === option.value
                                        ? 'border-teal-500 bg-teal-50 text-teal-700'
                                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                }`}
                            >
                                {option.value === 'alert' && <AlertTriangle className="mr-1 h-4 w-4" />}
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Sort options */}
            <div className="mt-6">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                    Сортировка
                </label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {sortOptions.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => setSort(option.value)}
                            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                                sort === option.value
                                    ? 'border-teal-500 bg-teal-50 text-teal-700'
                                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                        >
                            <span>{option.label}</span>
                            {option.icon}
                        </button>
                    ))}
                </div>
            </div>

            {/* Action buttons */}
            {onApply && (
                <div className="mt-6 flex justify-end space-x-3">
                    <Button
                        variant="outline"
                        onClick={onReset}
                    >
                        Сбросить
                    </Button>
                    <Button
                        onClick={onApply}
                    >
                        <Filter className="mr-2 h-4 w-4" />
                        Применить фильтры
                    </Button>
                </div>
            )}
        </div>
    );
};

BinFilters.propTypes = {
    department: PropTypes.string.isRequired,
    setDepartment: PropTypes.func.isRequired,
    wasteType: PropTypes.string.isRequired,
    setWasteType: PropTypes.func.isRequired,
    status: PropTypes.string.isRequired,
    setStatus: PropTypes.func.isRequired,
    filter: PropTypes.string.isRequired,
    setFilter: PropTypes.func.isRequired,
    sort: PropTypes.string.isRequired,
    setSort: PropTypes.func.isRequired,
    onApply: PropTypes.func,
    onReset: PropTypes.func.isRequired
};

export default BinFilters;