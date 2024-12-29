import React, { useState, useEffect } from 'react';
import { Plus, Trash2, RefreshCcw, WifiOff, Wifi } from 'lucide-react';

const Alert = ({ children, variant = 'default' }) => {
    const baseStyles = "p-4 rounded-lg mb-4";
    const variants = {
        default: "bg-slate-100 text-slate-800",
        destructive: "bg-red-100 text-red-800",
    };

    return (
        <div className={`${baseStyles} ${variants[variant]}`}>
            {children}
        </div>
    );
};

const AlertDescription = ({ children }) => {
    return <div className="text-sm">{children}</div>;
};


const ContainersList = () => {
    const [containers, setContainers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [formData, setFormData] = useState({
        binId: '',
        department: '',
        wasteType: '',
        latitude: '',
        longitude: ''
    });

    const fetchContainers = async () => {
        setLoading(true);
        try {
            const response = await fetch('https://16.16.117.114:5000/api/waste-bins');
            const data = await response.json();
            setContainers(data);
            setLastUpdate(new Date());
            setError(null);
        } catch (err) {
            setError('Failed to fetch containers');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchContainers();
        // Set up polling every 5 seconds
        const interval = setInterval(fetchContainers, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('https://16.16.117.114:5000/api/waste-bins', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                throw new Error('Failed to create container');
            }

            await fetchContainers();
            setShowForm(false);
            setFormData({
                binId: '',
                department: '',
                wasteType: '',
                latitude: '',
                longitude: ''
            });
        } catch (err) {
            setError('Failed to create container');
            console.error(err);
        }
    };

    const handleDelete = async (binId) => {
        if (window.confirm('Are you sure you want to delete this container?')) {
            try {
                const response = await fetch(`https://16.16.117.114:5000/api/waste-bins/${binId}`, {
                    method: 'DELETE',
                });

                if (!response.ok) {
                    throw new Error('Failed to delete container');
                }

                await fetchContainers();
            } catch (err) {
                setError('Failed to delete container');
                console.error(err);
            }
        }
    };

    // Check if container has been updated in the last minute
    const isContainerOnline = (lastUpdate) => {
        const lastUpdateTime = new Date(lastUpdate);
        const timeDiff = new Date() - lastUpdateTime;
        return timeDiff < 60000; // 1 minute
    };

    return (
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Контейнеры</h1>
                        {lastUpdate && (
                            <p className="text-sm text-slate-500">
                                Последнее обновление: {new Date(lastUpdate).toLocaleTimeString()}
                            </p>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => fetchContainers()}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                        >
                            <RefreshCcw className="w-4 h-4" />
                            Обновить
                        </button>
                        <button
                            onClick={() => setShowForm(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Добавить Контейнер
                        </button>
                    </div>
                </div>

                {error && (
                    <Alert variant="destructive" className="mb-6">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {showForm && (
                    <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200 mb-6">
                        <h2 className="text-xl font-semibold text-slate-800 mb-4">Новый Контейнер</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">ID Контейнера</label>
                                    <input
                                        type="text"
                                        value={formData.binId}
                                        onChange={(e) => setFormData({...formData, binId: e.target.value})}
                                        className="w-full p-2 border border-slate-300 rounded-lg"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Отделение</label>
                                    <input
                                        type="text"
                                        value={formData.department}
                                        onChange={(e) => setFormData({...formData, department: e.target.value})}
                                        className="w-full p-2 border border-slate-300 rounded-lg"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Тип Отходов</label>
                                    <input
                                        type="text"
                                        value={formData.wasteType}
                                        onChange={(e) => setFormData({...formData, wasteType: e.target.value})}
                                        className="w-full p-2 border border-slate-300 rounded-lg"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Координаты</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            placeholder="Широта"
                                            value={formData.latitude}
                                            onChange={(e) => setFormData({...formData, latitude: e.target.value})}
                                            className="w-full p-2 border border-slate-300 rounded-lg"
                                            step="any"
                                        />
                                        <input
                                            type="number"
                                            placeholder="Долгота"
                                            value={formData.longitude}
                                            onChange={(e) => setFormData({...formData, longitude: e.target.value})}
                                            className="w-full p-2 border border-slate-300 rounded-lg"
                                            step="any"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                                >
                                    Отмена
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                                >
                                    Создать
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading && containers.length === 0 ? (
                        <div className="col-span-full text-center py-12 text-slate-500">
                            Loading...
                        </div>
                    ) : containers.length === 0 ? (
                        <div className="col-span-full text-center py-12 text-slate-500">
                            No containers found
                        </div>
                    ) : (
                        containers.map((container) => {
                            const isOnline = isContainerOnline(container.lastUpdate);
                            return (
                                <div
                                    key={container.binId}
                                    className="bg-white rounded-xl shadow-sm p-6 border border-slate-200 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-lg font-semibold text-slate-800">{container.binId}</h3>
                                                {isOnline ? (
                                                    <Wifi className="w-4 h-4 text-teal-500" />
                                                ) : (
                                                    <WifiOff className="w-4 h-4 text-slate-400" />
                                                )}
                                            </div>
                                            <p className="text-sm text-slate-500">{container.department}</p>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(container.binId)}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Тип:</span>
                                            <span className="font-medium">{container.wasteType}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Заполненность:</span>
                                            <span className={`font-medium ${
                                                container.fullness > 80 ? 'text-red-500' :
                                                    container.fullness > 60 ? 'text-amber-500' :
                                                        'text-teal-500'
                                            }`}>
                                                {Math.round(container.fullness)}%
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Расстояние:</span>
                                            <span className="font-medium">{container.distance} см</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Вес:</span>
                                            <span className="font-medium">{container.weight} кг</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Последний Сбор:</span>
                                            <span className="font-medium">{container.lastCollection}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Координаты:</span>
                                            <span className="font-medium">
                                                {container.latitude.toFixed(4)}, {container.longitude.toFixed(4)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Progress bar */}
                                    <div className="mt-4">
                                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-500 ${
                                                    container.fullness > 80 ? 'bg-red-500' :
                                                        container.fullness > 60 ? 'bg-amber-500' :
                                                            'bg-teal-500'
                                                }`}
                                                style={{ width: `${Math.min(100, Math.max(0, container.fullness))}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default ContainersList;