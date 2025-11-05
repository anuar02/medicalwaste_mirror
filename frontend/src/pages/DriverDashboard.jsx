// frontend/src/pages/DriverDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    Truck,
    Play,
    Square,
    Package,
    Clock,
    MapPin,
    Activity,
    AlertCircle
} from 'lucide-react';
import apiService from "../services/api";

const DriverDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [activeSession, setActiveSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        todayCollections: 0,
        weekCollections: 0,
        activeTime: 0
    });

    useEffect(() => {
        if (user?.role !== 'driver' || user?.verificationStatus !== 'approved') {
            navigate('/');
            return;
        }

        fetchActiveSession();
        fetchStats();
    }, [user, navigate]);

    const fetchActiveSession = async () => {
        try {
            const response = await apiService.collections.getActive();
            setActiveSession(response.data.data.session);
        } catch (error) {
            if (error.response?.status !== 404) {
                console.error('Error fetching active session:', error);
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await apiService.collections.getHistory(user.id, {
                from: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
                limit: 100
            });
            // Calculate stats from response
            // This is simplified - you can enhance this
            setStats({
                todayCollections: response.data.results || 0,
                weekCollections: response.data.total || 0,
                activeTime: 0
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const handleStartCollection = () => {
        navigate('/driver/collection');
    };

    const handleStopCollection = () => {
        navigate('/driver/collection');
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-teal-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4">
            <div className="mx-auto max-w-7xl">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-slate-800">
                        Панель Водителя
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Добро пожаловать, {user?.username}
                    </p>
                </div>

                {/* Verification Status Warning */}
                {user?.verificationStatus === 'pending' && (
                    <div className="mb-6 rounded-lg bg-yellow-50 border border-yellow-200 p-4">
                        <div className="flex items-center">
                            <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
                            <p className="text-sm text-yellow-800">
                                Ваш аккаунт ожидает верификации администратором
                            </p>
                        </div>
                    </div>
                )}

                {user?.verificationStatus === 'rejected' && (
                    <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4">
                        <div className="flex items-center">
                            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                            <p className="text-sm text-red-800">
                                Ваша заявка была отклонена. Пожалуйста, свяжитесь с администратором.
                            </p>
                        </div>
                    </div>
                )}

                {/* Vehicle Info Card */}
                <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="rounded-full bg-teal-100 p-3">
                                <Truck className="h-6 w-6 text-teal-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-slate-800">
                                    {user?.vehicleInfo?.plateNumber || 'N/A'}
                                </h3>
                                <p className="text-sm text-slate-500">
                                    {user?.vehicleInfo?.vehicleType} {user?.vehicleInfo?.model}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Action Card */}
                <div className="mb-6 rounded-lg bg-white p-8 shadow-sm">
                    {activeSession ? (
                        <div className="text-center">
                            <div className="mb-4 inline-flex items-center rounded-full bg-green-100 px-4 py-2 text-green-800">
                                <Activity className="mr-2 h-5 w-5 animate-pulse" />
                                <span className="font-semibold">Сбор Активен</span>
                            </div>

                            <p className="mb-2 text-sm text-slate-600">
                                Начато: {new Date(activeSession.startTime).toLocaleString('ru-RU')}
                            </p>
                            <p className="mb-6 text-sm text-slate-600">
                                Контейнеров выбрано: {activeSession.selectedContainers?.length || 0}
                            </p>

                            <button
                                onClick={handleStopCollection}
                                className="inline-flex items-center rounded-lg bg-red-600 px-8 py-4 text-white hover:bg-red-700 transition-colors"
                            >
                                <Square className="mr-2 h-5 w-5" />
                                Остановить Сбор
                            </button>
                        </div>
                    ) : (
                        <div className="text-center">
                            <h2 className="mb-4 text-2xl font-bold text-slate-800">
                                Готовы начать сбор?
                            </h2>
                            <p className="mb-6 text-slate-600">
                                Нажмите кнопку ниже, чтобы начать новую сессию сбора отходов
                            </p>

                            <button
                                onClick={handleStartCollection}
                                disabled={user?.verificationStatus !== 'approved'}
                                className="inline-flex items-center rounded-lg bg-teal-600 px-8 py-4 text-white hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Play className="mr-2 h-5 w-5" />
                                Начать Сбор
                            </button>
                        </div>
                    )}
                </div>

                {/* Stats Grid */}
                <div className="grid gap-6 md:grid-cols-3">
                    <div className="rounded-lg bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Сегодня</p>
                                <p className="text-2xl font-bold text-slate-800">
                                    {stats.todayCollections}
                                </p>
                                <p className="text-xs text-slate-500">сборов</p>
                            </div>
                            <div className="rounded-full bg-blue-100 p-3">
                                <Package className="h-6 w-6 text-blue-600" />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-lg bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Эта неделя</p>
                                <p className="text-2xl font-bold text-slate-800">
                                    {stats.weekCollections}
                                </p>
                                <p className="text-xs text-slate-500">сборов</p>
                            </div>
                            <div className="rounded-full bg-green-100 p-3">
                                <Clock className="h-6 w-6 text-green-600" />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-lg bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Активное время</p>
                                <p className="text-2xl font-bold text-slate-800">
                                    {stats.activeTime}
                                </p>
                                <p className="text-xs text-slate-500">часов</p>
                            </div>
                            <div className="rounded-full bg-purple-100 p-3">
                                <MapPin className="h-6 w-6 text-purple-600" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Collections */}
                <div className="mt-6 rounded-lg bg-white p-6 shadow-sm">
                    <h3 className="mb-4 text-lg font-semibold text-slate-800">
                        История Сборов
                    </h3>
                    <button
                        onClick={() => navigate('/drivers')}
                        className="text-teal-600 hover:text-teal-700 text-sm font-medium"
                    >
                        Посмотреть всю историю →
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DriverDashboard;
