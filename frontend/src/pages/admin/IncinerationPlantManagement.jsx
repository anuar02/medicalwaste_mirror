import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Factory, Plus, Search, Pencil, X, Phone, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';

const EMPTY_OPERATOR = {
    name: '',
    phone: '',
    shift: 'any',
    active: true
};

const IncinerationPlantManagement = () => {
    const { isAdmin, isSupervisor } = useAuth();
    const navigate = useNavigate();
    const [plants, setPlants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingPlant, setEditingPlant] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        licenseNumber: '',
        licenseIssuedBy: '',
        licenseValidUntil: '',
        active: true,
        operators: [{ ...EMPTY_OPERATOR }]
    });

    const fetchPlants = async () => {
        setLoading(true);
        try {
            const response = await apiService.incinerationPlants.getAll();
            setPlants(response.data.data.plants || []);
        } catch (error) {
            console.error('Load incineration plants failed:', error);
            toast.error('Не удалось загрузить список заводов');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isAdmin && !isSupervisor) {
            navigate('/');
            return;
        }
        fetchPlants();
    }, [isAdmin, isSupervisor, navigate]);

    const filteredPlants = useMemo(() => {
        if (!search) return plants;
        const query = search.toLowerCase();
        return plants.filter((plant) =>
            (plant.name || '').toLowerCase().includes(query) ||
            (plant.address || '').toLowerCase().includes(query)
        );
    }, [plants, search]);

    const openCreateModal = () => {
        setEditingPlant(null);
        setFormData({
            name: '',
            address: '',
            licenseNumber: '',
            licenseIssuedBy: '',
            licenseValidUntil: '',
            active: true,
            operators: [{ ...EMPTY_OPERATOR }]
        });
        setShowModal(true);
    };

    const openEditModal = (plant) => {
        setEditingPlant(plant);
        setFormData({
            name: plant.name || '',
            address: plant.address || '',
            licenseNumber: plant.license?.number || '',
            licenseIssuedBy: plant.license?.issuedBy || '',
            licenseValidUntil: plant.license?.validUntil
                ? new Date(plant.license.validUntil).toISOString().slice(0, 10)
                : '',
            active: plant.active !== false,
            operators: plant.operators?.length
                ? plant.operators.map((operator) => ({
                    name: operator.name || '',
                    phone: operator.phone || '',
                    shift: operator.shift || 'any',
                    active: operator.active !== false
                }))
                : [{ ...EMPTY_OPERATOR }]
        });
        setShowModal(true);
    };

    const handleOperatorChange = (index, field, value) => {
        setFormData((prev) => {
            const nextOperators = prev.operators.map((operator, idx) => {
                if (idx !== index) return operator;
                return { ...operator, [field]: value };
            });
            return { ...prev, operators: nextOperators };
        });
    };

    const addOperator = () => {
        setFormData((prev) => ({
            ...prev,
            operators: [...prev.operators, { ...EMPTY_OPERATOR }]
        }));
    };

    const removeOperator = (index) => {
        setFormData((prev) => ({
            ...prev,
            operators: prev.operators.filter((_, idx) => idx !== index)
        }));
    };

    const handleSave = async () => {
        if (!formData.name.trim()) {
            toast.error('Название обязательно');
            return;
        }

        const payload = {
            name: formData.name.trim(),
            address: formData.address.trim(),
            active: formData.active,
            license: {
                number: formData.licenseNumber?.trim() || '',
                issuedBy: formData.licenseIssuedBy?.trim() || '',
                validUntil: formData.licenseValidUntil ? new Date(formData.licenseValidUntil) : undefined
            },
            operators: formData.operators
                .filter((operator) => operator.name || operator.phone)
                .map((operator) => ({
                    name: operator.name?.trim() || '',
                    phone: operator.phone?.trim() || '',
                    shift: operator.shift || 'any',
                    active: operator.active !== false
                }))
        };

        setSaving(true);
        try {
            if (editingPlant) {
                await apiService.incinerationPlants.update(editingPlant._id, payload);
                toast.success('Завод обновлен');
            } else {
                await apiService.incinerationPlants.create(payload);
                toast.success('Завод добавлен');
            }
            setShowModal(false);
            fetchPlants();
        } catch (error) {
            console.error('Save incineration plant failed:', error);
            toast.error('Не удалось сохранить завод');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (plant) => {
        const ok = window.confirm(`Удалить завод "${plant.name}"?`);
        if (!ok) return;
        try {
            await apiService.incinerationPlants.delete(plant._id);
            toast.success('Завод удален');
            fetchPlants();
        } catch (error) {
            console.error('Delete incineration plant failed:', error);
            toast.error('Не удалось удалить завод');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4">
            <div className="mx-auto max-w-6xl space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Заводы утилизации</h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Управление объектами и контактами операторов
                        </p>
                    </div>
                    <Button onClick={openCreateModal}>
                        <Plus className="mr-2 h-4 w-4" />
                        Добавить завод
                    </Button>
                </div>

                <div className="rounded-lg bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Поиск по названию или адресу"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-4 text-sm focus:border-teal-500 focus:ring-teal-500"
                            />
                        </div>
                    </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
                    {loading ? (
                        <div className="flex h-48 items-center justify-center">
                            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-teal-500"></div>
                        </div>
                    ) : filteredPlants.length === 0 ? (
                        <div className="flex h-48 flex-col items-center justify-center text-slate-500">
                            <Factory className="h-10 w-10 text-slate-300" />
                            <p className="mt-2 text-sm">
                                {search ? 'Нет результатов поиска' : 'Список заводов пуст'}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                                            Завод
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                                            Адрес
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                                            Операторы
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                                            Статус
                                        </th>
                                        <th className="px-6 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 bg-white">
                                    {filteredPlants.map((plant) => (
                                        <tr key={plant._id} className="hover:bg-slate-50">
                                            <td className="whitespace-nowrap px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                                                        <Factory className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-semibold text-slate-800">
                                                            {plant.name}
                                                        </div>
                                                        <div className="text-xs text-slate-500">
                                                            {plant.license?.number || 'Лицензия не указана'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                                                {plant.address || '—'}
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                                                {plant.operators?.length || 0}
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-sm">
                                                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                                    plant.active !== false
                                                        ? 'bg-emerald-50 text-emerald-700'
                                                        : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                    {plant.active !== false ? 'Активен' : 'Отключен'}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button size="sm" variant="outline" onClick={() => openEditModal(plant)}>
                                                        <Pencil className="mr-1 h-4 w-4" />
                                                        Изменить
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        color="red"
                                                        onClick={() => handleDelete(plant)}
                                                    >
                                                        Удалить
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
                    <div className="w-full max-w-3xl rounded-2xl bg-white shadow-lg">
                        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-800">
                                    {editingPlant ? 'Редактировать завод' : 'Новый завод'}
                                </h2>
                                <p className="text-xs text-slate-500">
                                    Контактные данные для подтверждения утилизации
                                </p>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="max-h-[70vh] overflow-y-auto px-5 py-4 space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="text-xs font-semibold text-slate-600">Название</label>
                                    <input
                                        type="text"
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                        value={formData.name}
                                        onChange={(event) => setFormData((prev) => ({
                                            ...prev,
                                            name: event.target.value
                                        }))}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-600">Адрес</label>
                                    <input
                                        type="text"
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                        value={formData.address}
                                        onChange={(event) => setFormData((prev) => ({
                                            ...prev,
                                            address: event.target.value
                                        }))}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-600">Лицензия №</label>
                                    <input
                                        type="text"
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                        value={formData.licenseNumber}
                                        onChange={(event) => setFormData((prev) => ({
                                            ...prev,
                                            licenseNumber: event.target.value
                                        }))}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-600">Кем выдана</label>
                                    <input
                                        type="text"
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                        value={formData.licenseIssuedBy}
                                        onChange={(event) => setFormData((prev) => ({
                                            ...prev,
                                            licenseIssuedBy: event.target.value
                                        }))}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-600">Действует до</label>
                                    <input
                                        type="date"
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                        value={formData.licenseValidUntil}
                                        onChange={(event) => setFormData((prev) => ({
                                            ...prev,
                                            licenseValidUntil: event.target.value
                                        }))}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-slate-600">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded"
                                    checked={formData.active}
                                    onChange={(event) => setFormData((prev) => ({
                                        ...prev,
                                        active: event.target.checked
                                    }))}
                                />
                                <span>Завод активен</span>
                            </div>

                            <div className="rounded-lg border border-slate-200 p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                                        <Users className="h-4 w-4" />
                                        Операторы
                                    </div>
                                    <Button size="sm" variant="outline" onClick={addOperator}>
                                        <Plus className="mr-1 h-4 w-4" />
                                        Добавить
                                    </Button>
                                </div>

                                {formData.operators.map((operator, index) => (
                                    <div key={`operator-${index}`} className="rounded-lg bg-slate-50 p-3 space-y-2">
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            <input
                                                type="text"
                                                placeholder="Имя"
                                                className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                                value={operator.name}
                                                onChange={(event) => handleOperatorChange(index, 'name', event.target.value)}
                                            />
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    type="tel"
                                                    placeholder="+7..."
                                                    className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-xs"
                                                    value={operator.phone}
                                                    onChange={(event) => handleOperatorChange(index, 'phone', event.target.value)}
                                                />
                                            </div>
                                            <select
                                                className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                                value={operator.shift}
                                                onChange={(event) => handleOperatorChange(index, 'shift', event.target.value)}
                                            >
                                                <option value="any">Любая смена</option>
                                                <option value="day">Дневная</option>
                                                <option value="night">Ночная</option>
                                            </select>
                                            <label className="flex items-center gap-2 text-xs text-slate-600">
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4 rounded"
                                                    checked={operator.active !== false}
                                                    onChange={(event) => handleOperatorChange(index, 'active', event.target.checked)}
                                                />
                                                Активен
                                            </label>
                                        </div>
                                        {formData.operators.length > 1 && (
                                            <button
                                                type="button"
                                                className="text-xs text-red-600 hover:text-red-700"
                                                onClick={() => removeOperator(index)}
                                            >
                                                Удалить оператора
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
                            <Button variant="outline" onClick={() => setShowModal(false)}>
                                Отмена
                            </Button>
                            <Button onClick={handleSave} isLoading={saving}>
                                Сохранить
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IncinerationPlantManagement;
