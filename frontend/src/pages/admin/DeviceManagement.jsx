// pages/admin/DeviceManagement.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cpu, Search, RefreshCw, Edit, Check } from 'lucide-react';
import apiService from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';

const DeviceManagement = () => {
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [configuring, setConfiguring] = useState(null);
    const [formData, setFormData] = useState({
        binId: '',
        department: '',
        wasteType: 'Острые Медицинские Отходы',
        alertThreshold: 80,
        capacity: 50
    });

    const navigate = useNavigate();
    const { isAdmin } = useAuth();

    // Fetch all pending devices
    const fetchDevices = async () => {
        setLoading(true);
        try {
            const response = await apiService.devices.getPendingDevices();
            setDevices(response.data.data.devices || []);
        } catch (error) {
            toast.error('Failed to load devices');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isAdmin) {
            navigate('/');
            return;
        }

        fetchDevices();
    }, [isAdmin, navigate]);

    // Filter devices based on search
    const filteredDevices = devices.filter(device => {
        const macAddress = device.macAddress || '';
        const tempBinId = device.tempBinId || '';
        const searchLower = search.toLowerCase();

        return macAddress.toLowerCase().includes(searchLower) ||
            tempBinId.toLowerCase().includes(searchLower);
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

    // Configure device and create waste bin
    const configureDevice = async (deviceId) => {
        try {
            await apiService.devices.configureDevice(deviceId, formData);
            toast.success('Device configured and bin created successfully');
            setConfiguring(null);
            setFormData({
                binId: '',
                department: '',
                wasteType: 'Острые Медицинские Отходы',
                alertThreshold: 80,
                capacity: 50
            });
            fetchDevices();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to configure device');
            console.error(error);
        }
    };

    return (
        <div className="container mx-auto p-4">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Управление устройствами</h1>
                    <p className="text-sm text-slate-500">Настройка новых подключенных устройств</p>
                </div>
                <Button onClick={fetchDevices} variant="outline">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Обновить
                </Button>
            </div>

            {/* Search */}
            <div className="mb-6 flex items-center space-x-2 rounded-lg bg-white p-2 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Поиск устройств..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-md border border-slate-200 py-2 pl-10 pr-4 text-sm focus:border-teal-500 focus:ring-teal-500"
                    />
                </div>
            </div>

            {/* Devices table */}
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                {loading ? (
                    <div className="flex h-64 items-center justify-center">
                        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-teal-500"></div>
                    </div>
                ) : filteredDevices.length === 0 ? (
                    <div className="flex h-64 flex-col items-center justify-center">
                        <Cpu className="h-12 w-12 text-slate-300" />
                        <p className="mt-2 text-center text-slate-500">
                            {search ? 'Нет устройств, соответствующих вашему поиску' : 'Нет ожидающих устройств'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                                    Устройство
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                                    MAC Адрес
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                                    Последнее соединение
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                                    Статус
                                </th>
                                <th className="px-6 py-3"></th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                            {filteredDevices.map((device, index) => (
                                <tr key={device._id || `device-${index}`} className="hover:bg-slate-50">
                                    <td className="whitespace-nowrap px-6 py-4">
                                        <div className="flex items-center">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                                                <Cpu className="h-5 w-5" />
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-slate-900">{device.tempBinId || 'Новое устройство'}</div>
                                                <div className="text-xs text-slate-500">{device.deviceType || 'ESP32'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                                        <code className="rounded bg-slate-100 px-2 py-1 font-mono text-xs">
                                            {device.macAddress}
                                        </code>
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                                        {device.lastSeen ? new Date(device.lastSeen).toLocaleString() : 'Неизвестно'}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                        Ожидает настройки
                      </span>
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setConfiguring(device._id)}
                                        >
                                            <Edit className="mr-1 h-4 w-4" />
                                            Настроить
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Configuration Modal */}
            {configuring && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
                        <h2 className="mb-4 text-xl font-semibold text-slate-800">Настройка устройства</h2>

                        <div className="space-y-4">
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

                            {/* Alert Threshold and Capacity */}
                            <div className="grid grid-cols-2 gap-4">
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
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end space-x-3">
                            <Button
                                variant="outline"
                                onClick={() => setConfiguring(null)}
                            >
                                Отмена
                            </Button>
                            <Button
                                onClick={() => configureDevice(configuring)}
                            >
                                <Check className="mr-2 h-4 w-4" />
                                Настроить устройство
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeviceManagement;