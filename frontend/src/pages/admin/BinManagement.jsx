// pages/admin/BinManagement.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Search, RefreshCw, Plus } from 'lucide-react';
import apiService from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';

const BinManagement = () => {
    const [bins, setBins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [formData, setFormData] = useState({
        binId: '',
        department: '',
        wasteType: 'Острые Медицинские Отходы',
        alertThreshold: 80,
        capacity: 50,
        latitude: 0,
        longitude: 0,
        floor: 1,
        room: ''
    });

    const navigate = useNavigate();
    const { isAdmin, isSupervisor } = useAuth();

    // Fetch all bins
    const fetchBins = async () => {
        setLoading(true);
        try {
            const response = await apiService.wasteBins.getAll();
            setBins(response.data.data.bins || []);
        } catch (error) {
            toast.error('Failed to load bins');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Check if user has permission
        if (!isAdmin && !isSupervisor) {
            navigate('/');
            return;
        }

        fetchBins();
    }, [isAdmin, isSupervisor, navigate]);

    // Filter bins based on search
    const filteredBins = bins.filter(bin => {
        const binId = bin.binId || '';
        const department = bin.department || '';
        const wasteType = bin.wasteType || '';
        const searchLower = search.toLowerCase();

        return binId.toLowerCase().includes(searchLower) ||
            department.toLowerCase().includes(searchLower) ||
            wasteType.toLowerCase().includes(searchLower);
    });

    // Handle form change
    const handleChange = (e) => {
        const { name, value, type } = e.target;

        // Handle numeric inputs
        if (type === 'number') {
            setFormData({
                ...formData,
                [name]: parseFloat(value) || 0
            });
        } else {
            setFormData({
                ...formData,
                [name]: value
            });
        }
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            await apiService.wasteBins.create(formData);
            toast.success('Bin created successfully');
            setShowAddForm(false);
            resetForm();
            fetchBins();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create bin');
            console.error(error);
        }
    };

    // Reset form
    const resetForm = () => {
        setFormData({
            binId: '',
            department: '',
            wasteType: 'Острые Медицинские Отходы',
            alertThreshold: 80,
            capacity: 50,
            latitude: 0,
            longitude: 0,
            floor: 1,
            room: ''
        });
    };

    return (
        <div className="container mx-auto p-4">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Управление контейнерами</h1>
                    <p className="text-sm text-slate-500">Добавление и управление контейнерами для отходов</p>
                </div>
                <div className="flex space-x-3">
                    <Button onClick={fetchBins} variant="outline">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Обновить
                    </Button>
                    <Button onClick={() => setShowAddForm(!showAddForm)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Добавить контейнер
                    </Button>
                </div>
            </div>

            {/* Add Bin Form */}
            {showAddForm && (
                <div className="mb-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="mb-4 text-lg font-semibold text-slate-800">Добавить новый контейнер</h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {/* Bin ID */}
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">
                                    ID Контейнера (формат DEPT-123)
                                </label>
                                <input
                                    type="text"
                                    name="binId"
                                    value={formData.binId}
                                    onChange={handleChange}
                                    placeholder="MED-001"
                                    pattern="[A-Z]+-\d{3,}"
                                    title="ID должен быть в формате DEPT-123"
                                    className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                                    required
                                />
                            </div>

                            {/* Department */}
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">
                                    Отделение
                                </label>
                                <input
                                    type="text"
                                    name="department"
                                    value={formData.department}
                                    onChange={handleChange}
                                    className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                                    required
                                />
                            </div>

                            {/* Waste Type */}
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">
                                    Тип отходов
                                </label>
                                <select
                                    name="wasteType"
                                    value={formData.wasteType}
                                    onChange={handleChange}
                                    className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                                    required
                                >
                                    <option value="Острые Медицинские Отходы">Острые Медицинские Отходы</option>
                                    <option value="Инфекционные Отходы">Инфекционные Отходы</option>
                                    <option value="Патологические Отходы">Патологические Отходы</option>
                                    <option value="Фармацевтические Отходы">Фармацевтические Отходы</option>
                                    <option value="Химические Отходы">Химические Отходы</option>
                                    <option value="Радиоактивные Отходы">Радиоактивные Отходы</option>
                                    <option value="Общие Медицинские Отходы">Общие Медицинские Отходы</option>
                                </select>
                            </div>

                            {/* Capacity */}
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">
                                    Емкость (литры)
                                </label>
                                <input
                                    type="number"
                                    name="capacity"
                                    min="1"
                                    max="1000"
                                    value={formData.capacity}
                                    onChange={handleChange}
                                    className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                                    required
                                />
                            </div>

                            {/* Alert Threshold */}
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">
                                    Порог оповещения (%)
                                </label>
                                <input
                                    type="number"
                                    name="alertThreshold"
                                    min="50"
                                    max="95"
                                    step="5"
                                    value={formData.alertThreshold}
                                    onChange={handleChange}
                                    className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                                    required
                                />
                            </div>

                            {/* Room */}
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">
                                    Комната
                                </label>
                                <input
                                    type="text"
                                    name="room"
                                    value={formData.room}
                                    onChange={handleChange}
                                    className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                                />
                            </div>

                            {/* Floor */}
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">
                                    Этаж
                                </label>
                                <input
                                    type="number"
                                    name="floor"
                                    min="0"
                                    value={formData.floor}
                                    onChange={handleChange}
                                    className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                                />
                            </div>

                            {/* Location */}
                            <div className="md:col-span-2">
                                <label className="mb-1 block text-sm font-medium text-slate-700">
                                    Координаты (необязательно)
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="number"
                                        name="latitude"
                                        placeholder="Широта"
                                        step="any"
                                        value={formData.latitude}
                                        onChange={handleChange}
                                        className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                                    />
                                    <input
                                        type="number"
                                        name="longitude"
                                        placeholder="Долгота"
                                        step="any"
                                        value={formData.longitude}
                                        onChange={handleChange}
                                        className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setShowAddForm(false);
                                    resetForm();
                                }}
                            >
                                Отмена
                            </Button>
                            <Button type="submit">
                                Создать контейнер
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            {/* Search and filters */}
            <div className="mb-6 flex items-center space-x-2 rounded-lg bg-white p-2 shadow-sm">
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
            </div>

            {/* Bins table */}
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                {loading ? (
                    <div className="flex h-64 items-center justify-center">
                        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-teal-500"></div>
                    </div>
                ) : filteredBins.length === 0 ? (
                    <div className="flex h-64 flex-col items-center justify-center">
                        <Trash2 className="h-12 w-12 text-slate-300" />
                        <p className="mt-2 text-center text-slate-500">
                            {search ? 'Нет контейнеров, соответствующих вашему поиску' : 'Нет контейнеров в системе'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                                    ID
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
                                    Последнее обновление
                                </th>
                                <th className="px-6 py-3"></th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                            {filteredBins.map((bin, index) => (
                                <tr key={bin._id || bin.binId || `bin-${index}`} className="hover:bg-slate-50">
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
                                                ></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          bin.status === 'active' ? 'bg-green-100 text-green-800' :
                              bin.status === 'maintenance' ? 'bg-amber-100 text-amber-800' :
                                  bin.status === 'offline' ? 'bg-slate-100 text-slate-800' :
                                      'bg-red-100 text-red-800'
                      }`}>
                        {bin.status === 'active' ? 'Активен' :
                            bin.status === 'maintenance' ? 'Обслуживание' :
                                bin.status === 'offline' ? 'Офлайн' : 'Выведен'}
                      </span>
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                                        {bin.lastUpdate ? new Date(bin.lastUpdate).toLocaleString() : 'N/A'}
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
        </div>
    );
};

export default BinManagement;