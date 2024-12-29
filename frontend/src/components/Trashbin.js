import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {AlertCircle, Clock, MapPin, ThermometerSun, Weight} from 'lucide-react';
import GoogleMap from "./GoogleMap";

const BinVisualization = ({ fullness }) => (
    <div className="relative w-48 h-64 mx-auto">
        {/* Improved shadow effects */}
        <div className="absolute inset-0 bg-slate-50 rounded-lg -rotate-3 shadow-xl"></div>

        <div className="relative h-full flex flex-col bg-white rounded-lg shadow-lg overflow-hidden border-2 border-slate-200">
            <div className="absolute top-8 left-1/2 transform -translate-x-1/2 text-slate-400 text-2xl">
                ☤
            </div>

            {/* Enhanced lid design */}
            <div className="h-8 bg-gradient-to-r from-slate-700 to-slate-800">
                <div className="h-2 bg-slate-900 opacity-50"></div>
            </div>

            <div className="flex-1 p-10">
                <div className="h-full relative">
                    {[0, 25, 50, 75, 100].map((level) => (
                        <div key={level}
                             className="absolute w-full border-b border-dashed border-slate-200"
                             style={{ bottom: `${level}%` }}>
                            <span className="absolute -right-6 text-xs text-slate-500">{level}%</span>
                        </div>
                    ))}
                    <div
                        className={`absolute bottom-0 w-full transition-all duration-1000 ${
                            fullness > 75 ? 'bg-gradient-to-t from-red-600 to-red-500' : 'bg-gradient-to-t from-teal-700 to-teal-500'
                        }`}
                        style={{ height: `${fullness}%` }}
                    >
                        <div className="absolute top-0 w-full h-2 bg-white opacity-20"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

const TrashBin = () => {
    const [binData, setBinData] = useState({
        fullness: 0,
        distance: 0,
        latitude: 0,
        longitude: 0,
        temperature: 0,
        lastCollection: "",
        estimatedFillTime: "",
        weight: 0,
        wasteType: "Острые Медицинские Отходы",
        binId: "МЕД-001",
        department: "Хирургическое Отделение"
    });
    const [historyData, setHistoryData] = useState([]);

    const fetchBinData = async () => {
        try {
            const response = await fetch('https://narutouzumaki.kz/api/waste-bins/MED-001');
            const data = await response.json();
            data.fullness = Math.round( data.fullness )
            setBinData(data);
        } catch (error) {
            console.error('Error fetching bin data:', error);
        }
    };

    const fetchHistoryData = async () => {
        try {
            const response = await fetch('https://narutouzumaki.kz/api/waste-bins/MED-001/history');
            const data = await response.json();
            console.log(data)
            data.fullness = Math.round( data.fullness )
            setHistoryData(data.reverse());

        } catch (error) {
            console.error('Error fetching history data:', error);
        }
    };

    useEffect(() => {
        // Initial fetch
        fetchBinData();
        fetchHistoryData();

        // Set up periodic refresh
        const interval = setInterval(() => {
            fetchBinData();
            fetchHistoryData();
        }, 60000); // Refresh every minute

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-6" style={{height: '100vh'}}>
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-slate-800 mb-3">
                        Мониторинг Медицинских Отходов
                    </h1>
                    <p className="text-slate-600 text-sm mb-3">Система управления медицинскими отходами в реальном времени</p>
                    <div className="inline-block px-4 py-2 bg-amber-50 text-amber-700 rounded-full text-sm border border-amber-200">
                        <AlertCircle className="inline-block w-4 h-4 mr-2" />
                        Демонстрационные данные
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    <div className="md:col-span-1">
                        <div className="space-y-6">
                            <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200 hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h2 className="text-xl font-semibold text-slate-800">Статус Контейнера</h2>
                                        <p className="text-slate-500 text-sm">{binData.binId} - {binData.department}</p>
                                    </div>
                                    <div className="text-3xl font-bold text-teal-600">{binData.fullness}%</div>
                                </div>
                                <BinVisualization fullness={binData.fullness} />
                            </div>

                            <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200 hover:shadow-md transition-shadow">
                                <h3 className="text-lg font-semibold text-slate-800 mb-4">Информация об Отходах</h3>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                                        <span className="text-slate-600">Тип:</span>
                                        <span className="font-medium">{binData.wasteType}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                                        <span className="text-slate-600">Вес:</span>
                                        <span className="font-medium flex items-center gap-2">
                                            <Weight className="w-4 h-4" />
                                            {binData.weight} кг
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                                        <span className="text-slate-600">Температура:</span>
                                        <span className="font-medium flex items-center gap-2">
                                            <ThermometerSun className="w-4 h-4" />
                                            {binData.temperature}°C
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-2 bg-white rounded-xl shadow-sm p-6 border border-slate-200 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-semibold text-slate-800">История Заполнения</h2>
                            <div className="text-sm text-slate-500 flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Последние 24 часа
                            </div>
                        </div>
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={historyData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="time" stroke="#64748b" />
                                    <YAxis domain={[0, 100]} stroke="#64748b" />
                                    <Tooltip contentStyle={{ background: 'white', border: '1px solid #e2e8f0' }} />
                                    <Line
                                        type="monotone"
                                        dataKey="fullness"
                                        stroke="#0d9488"
                                        strokeWidth={3}
                                        dot={{ fill: '#0d9488', strokeWidth: 2 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <GoogleMap latitude={binData.latitude} longitude={binData.longitude}/>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-gradient-to-br from-teal-600 to-teal-500 rounded-xl shadow-lg p-6 text-white">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold">Статус Системы</h2>
                                <div className="flex items-center space-x-3">
                                    <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                                    <span className="text-sm">Онлайн</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-lg p-6 text-white">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold">Время Сбора</h2>
                                <Clock className="w-5 h-5" />
                            </div>
                            <div className="space-y-4 text-sm">
                                <div className="p-3 bg-slate-600/50 rounded-lg">
                                    <div className="text-slate-300 mb-1">Последний Сбор:</div>
                                    <div className="font-medium">{binData.lastCollection}</div>
                                </div>
                                <div className="p-3 bg-slate-600/50 rounded-lg">
                                    <div className="text-slate-300 mb-1">Ожидаемое Заполнение:</div>
                                    <div className="font-medium">{binData.estimatedFillTime}</div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-slate-700 to-slate-600 rounded-xl shadow-lg p-6 text-white">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold">Местоположение</h2>
                                <MapPin className="w-5 h-5" />
                            </div>
                            <div className="space-y-3 text-sm">
                                <div className="p-3 bg-slate-500/50 rounded-lg flex justify-between">
                                    <span className="opacity-75">Широта:</span>
                                    <span className="font-mono">{binData.latitude}</span>
                                </div>
                                <div className="p-3 bg-slate-500/50 rounded-lg flex justify-between">
                                    <span className="opacity-75">Долгота:</span>
                                    <span className="font-mono">{binData.longitude}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TrashBin;