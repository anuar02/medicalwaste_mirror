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
    AlertCircle,
    TrendingUp,
    Navigation as NavigationIcon
} from 'lucide-react';
import apiService from "../services/api";

const DriverDashboard = () => {
    const { user, isAdmin } = useAuth();
    const navigate = useNavigate();
    const [activeSession, setActiveSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        todayCollections: 0,
        weekCollections: 0,
        activeTime: 0
    });

    const isDriver = user?.role === 'driver';
    const isApprovedDriver = isDriver && user?.verificationStatus === 'approved';

    useEffect(() => {
        // Allow both drivers and admins to access this page
        if (!isDriver && !isAdmin) {
            navigate('/');
            return;
        }

        if (isDriver) {
            fetchActiveSession();
            fetchStats();
        }

        setLoading(false);
    }, [user, navigate, isDriver, isAdmin]);

    const fetchActiveSession = async () => {
        try {
            const response = await apiService.collections.getActive();
            setActiveSession(response.data.data.session);
        } catch (error) {
            if (error.response?.status !== 404) {
                console.error('Error fetching active session:', error);
            }
        }
    };

    const fetchStats = async () => {
        try {
            const response = await apiService.collections.getHistory(user.id, {
                from: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
                limit: 100
            });
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

    const handleContinueCollection = () => {
        navigate('/driver/collection');
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-teal-500"></div>
            </div>
        );
    }

    // Admin view - show all drivers tracking
    if (isAdmin && !isDriver) {
        return (
            <div className="min-h-screen bg-slate-50 p-4">
                <div className="mx-auto max-w-7xl">
                    <div className="mb-6">
                        <h1 className="text-3xl font-bold text-slate-800">
                            Мониторинг Водителей
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Отслеживание всех активных водителей
                        </p>
                    </div>

                    {/* TODO: Add admin driver tracking view */}
                    <div className="rounded-lg bg-white p-8 shadow-sm text-center">
                        <NavigationIcon className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-slate-800 mb-2">
                            Мониторинг водителей в разработке
                        </h3>
                        <p className="text-slate-600">
                            Здесь будет карта с отслеживанием всех активных водителей
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Driver view
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
                            <AlertCircle className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0" />
                            <p className="text-sm text-yellow-800">
                                Ваш аккаунт ожидает верификации администратором. Функция сбора будет доступна после одобрения.
                            </p>
                        </div>
                    </div>
                )}

                {user?.verificationStatus === 'rejected' && (
                    <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4">
                        <div className="flex items-center">
                            <AlertCircle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-semibold text-red-800 mb-1">
                                    Ваша заявка была отклонена
                                </p>
                                <p className="text-sm text-red-700">
                                    Пожалуйста, свяжитесь с администратором для получения дополнительной информации.
                                </p>
                            </div>
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
                                    {user?.vehicleInfo?.plateNumber || 'Не указано'}
                                </h3>
                                <p className="text-sm text-slate-500">
                                    {user?.vehicleInfo?.vehicleType || 'Не указано'} {user?.vehicleInfo?.model || ''}
                                </p>
                            </div>
                        </div>
                        {isApprovedDriver && (
                            <div className="px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-medium">
                                Верифицирован
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Action Card */}
                <div className="mb-6 rounded-lg bg-white p-8 shadow-sm">
                    {activeSession ? (
                        <div className="text-center">
                            <div className="mb-4 inline-flex items-center rounded-full bg-green-100 px-6 py-2 text-green-800">
                                <Activity className="mr-2 h-5 w-5 animate-pulse" />
                                <span className="font-semibold text-lg">Сбор Активен</span>
                            </div>

                            <div className="mb-6 space-y-2">
                                <div className="flex items-center justify-center text-slate-600">
                                    <Clock className="h-4 w-4 mr-2" />
                                    <span className="text-sm">
                                        Начато: {new Date(activeSession.startTime).toLocaleString('ru-RU')}
                                    </span>
                                </div>
                                <div className="flex items-center justify-center text-slate-600">
                                    <Package className="h-4 w-4 mr-2" />
                                    <span className="text-sm">
                                        Контейнеров выбрано: {activeSession.selectedContainers?.length || 0}
                                    </span>
                                </div>
                                <div className="flex items-center justify-center text-slate-600">
                                    <MapPin className="h-4 w-4 mr-2" />
                                    <span className="text-sm">
                                        Посещено: {activeSession.selectedContainers?.filter(c => c.visited).length || 0} из {activeSession.selectedContainers?.length || 0}
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={handleContinueCollection}
                                className="inline-flex items-center rounded-lg bg-teal-600 px-8 py-4 text-white hover:bg-teal-700 transition-colors shadow-lg"
                            >
                                <NavigationIcon className="mr-2 h-5 w-5" />
                                Продолжить Сбор
                            </button>
                        </div>
                    ) : (
                        <div className="text-center">
                            <div className="mb-4 inline-flex items-center justify-center rounded-full bg-slate-100 p-4">
                                <Truck className="h-12 w-12 text-slate-600" />
                            </div>
                            <h2 className="mb-2 text-2xl font-bold text-slate-800">
                                Готовы начать сбор?
                            </h2>
                            <p className="mb-6 text-slate-600 max-w-md mx-auto">
                                Начните новую сессию сбора медицинских отходов. Система будет отслеживать ваш маршрут и посещенные контейнеры.
                            </p>

                            <button
                                onClick={handleStartCollection}
                                disabled={!isApprovedDriver}
                                className="inline-flex items-center rounded-lg bg-teal-600 px-8 py-4 text-white hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                            >
                                <Play className="mr-2 h-5 w-5" />
                                Начать Сбор
                            </button>

                            {!isApprovedDriver && (
                                <p className="mt-4 text-sm text-amber-600">
                                    Дождитесь верификации вашего аккаунта
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Stats Grid */}
                <div className="grid gap-6 md:grid-cols-3 mb-6">
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
                                <TrendingUp className="h-6 w-6 text-green-600" />
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
                                <Clock className="h-6 w-6 text-purple-600" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid gap-6 md:grid-cols-2">
                    <div className="rounded-lg bg-white p-6 shadow-sm">
                        <h3 className="mb-4 text-lg font-semibold text-slate-800 flex items-center">
                            <NavigationIcon className="h-5 w-5 mr-2 text-teal-600" />
                            История Маршрутов
                        </h3>
                        <p className="text-sm text-slate-600 mb-4">
                            Просмотрите историю ваших маршрутов и посещенных контейнеров
                        </p>
                        <button
                            onClick={() => navigate('/tracking')}
                            className="text-teal-600 hover:text-teal-700 text-sm font-medium"
                        >
                            Посмотреть историю →
                        </button>
                    </div>

                    <div className="rounded-lg bg-white p-6 shadow-sm">
                        <h3 className="mb-4 text-lg font-semibold text-slate-800 flex items-center">
                            <MapPin className="h-5 w-5 mr-2 text-teal-600" />
                            Карта Контейнеров
                        </h3>
                        <p className="text-sm text-slate-600 mb-4">
                            Посмотрите расположение всех контейнеров на карте
                        </p>
                        <button
                            onClick={() => navigate('/map')}
                            className="text-teal-600 hover:text-teal-700 text-sm font-medium"
                        >
                            Открыть карту →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DriverDashboard;
