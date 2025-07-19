// components/TelegramSettings.jsx - Tailwind CSS version
import React, { useState } from 'react';
import axios from 'axios';

const TelegramSettings = ({ user, onUpdate }) => {
    const [chatId, setChatId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const isConnected = user?.telegram?.active && user?.telegram?.chatId;
    const receiveNotifications = user?.notificationPreferences?.receiveAlerts;

    const handleConnect = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await axios.post('/api/v1/telegram/connect', { chatId });
            setSuccess('Telegram успешно подключен!');
            onUpdate(response.data.data.user);
            setChatId(''); // Clear input
        } catch (err) {
            setError(err.response?.data?.message || 'Ошибка подключения Telegram');
        } finally {
            setLoading(false);
        }
    };

    const handleDisconnect = async () => {
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await axios.post('/api/v1/telegram/disconnect');
            setSuccess('Telegram успешно отключен');
            onUpdate(response.data.data.user);
        } catch (err) {
            setError(err.response?.data?.message || 'Ошибка отключения Telegram');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleNotifications = async () => {
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await axios.post('/api/v1/telegram/toggle-notifications', {
                receiveAlerts: !receiveNotifications
            });
            setSuccess(`Уведомления ${!receiveNotifications ? 'включены' : 'отключены'}`);
            onUpdate(response.data.data.user);
        } catch (err) {
            setError(err.response?.data?.message || 'Ошибка изменения настроек уведомлений');
        } finally {
            setLoading(false);
        }
    };

    const handleTestNotification = async () => {
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            await axios.post('/api/v1/telegram/test-notification');
            setSuccess('Тестовое уведомление отправлено! Проверьте свой Telegram.');
        } catch (err) {
            setError(err.response?.data?.message || 'Ошибка отправки тестового уведомления');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-100">
                        <svg className="h-6 w-6 text-teal-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-800">Telegram Уведомления</h3>
                        <p className="text-sm text-slate-600">Настройка уведомлений о заполнении контейнеров</p>
                    </div>
                </div>
                {isConnected && (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
                        <div className="mr-1.5 h-2 w-2 rounded-full bg-emerald-400"></div>
                        Подключено
                    </span>
                )}
            </div>

            {/* Alerts */}
            {error && (
                <div className="rounded-lg bg-red-50 p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-medium text-red-800">{error}</p>
                        </div>
                    </div>
                </div>
            )}

            {success && (
                <div className="rounded-lg bg-emerald-50 p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-medium text-emerald-800">{success}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Content */}
            {!isConnected ? (
                <div className="space-y-6">
                    <div className="rounded-lg bg-slate-50 p-4">
                        <p className="text-sm text-slate-700 mb-4">
                            Подключите свой Telegram аккаунт для получения уведомлений о заполнении контейнеров.
                        </p>

                        <div className="space-y-4">
                            <h4 className="text-sm font-medium text-slate-800">Как подключить:</h4>
                            <div className="space-y-3">
                                <div className="flex items-start space-x-3">
                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 text-xs font-medium text-teal-600">
                                        1
                                    </div>
                                    <p className="text-sm text-slate-600">
                                        Откройте Telegram и найдите <span className="font-medium">@your_bot_name</span>
                                    </p>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 text-xs font-medium text-teal-600">
                                        2
                                    </div>
                                    <p className="text-sm text-slate-600">
                                        Запустите бота, нажав "Start" или отправив <code className="rounded bg-slate-200 px-1 py-0.5 text-xs">/start</code>
                                    </p>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 text-xs font-medium text-teal-600">
                                        3
                                    </div>
                                    <p className="text-sm text-slate-600">
                                        Бот отправит вам ваш Chat ID
                                    </p>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 text-xs font-medium text-teal-600">
                                        4
                                    </div>
                                    <p className="text-sm text-slate-600">
                                        Скопируйте Chat ID и вставьте его ниже
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleConnect} className="space-y-4">
                        <div>
                            <label htmlFor="chatId" className="block text-sm font-medium text-slate-700 mb-2">
                                Telegram Chat ID
                            </label>
                            <input
                                type="text"
                                id="chatId"
                                value={chatId}
                                onChange={(e) => setChatId(e.target.value)}
                                placeholder="Введите ваш Telegram Chat ID"
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {loading ? (
                                <div className="flex items-center justify-center space-x-2">
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                    <span>Подключение...</span>
                                </div>
                            ) : (
                                'Подключить Telegram'
                            )}
                        </button>
                    </form>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="rounded-lg bg-slate-50 p-4">
                        <div className="flex items-center space-x-2">
                            <svg className="h-5 w-5 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <p className="text-sm text-slate-700">
                                Ваш Telegram аккаунт подключен и{' '}
                                {receiveNotifications ? (
                                    <span className="font-medium text-emerald-600">получает уведомления</span>
                                ) : (
                                    <span className="font-medium text-red-600">не получает уведомления</span>
                                )}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h4 className="text-sm font-medium text-slate-800">Доступные действия:</h4>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <button
                                onClick={handleTestNotification}
                                disabled={loading || !receiveNotifications}
                                className="flex items-center justify-center rounded-lg border border-teal-300 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-700 hover:bg-teal-100 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                </svg>
                                Тестовое уведомление
                            </button>

                            <button
                                onClick={handleToggleNotifications}
                                disabled={loading}
                                className={`flex items-center justify-center rounded-lg border px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-opacity-50 disabled:cursor-not-allowed disabled:opacity-50 ${
                                    receiveNotifications
                                        ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 focus:ring-amber-500'
                                        : 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 focus:ring-emerald-500'
                                }`}
                            >
                                {receiveNotifications ? (
                                    <>
                                        <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                                        </svg>
                                        Отключить уведомления
                                    </>
                                ) : (
                                    <>
                                        <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.868 19.504L6.281 16.1a1 1 0 011.414 0l2.122 2.121a1 1 0 010 1.415l-3.536 3.536a1 1 0 01-1.415 0z" />
                                        </svg>
                                        Включить уведомления
                                    </>
                                )}
                            </button>
                        </div>

                        <button
                            onClick={handleDisconnect}
                            disabled={loading}
                            className="w-full rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <div className="flex items-center justify-center">
                                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                Отключить Telegram
                            </div>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TelegramSettings;