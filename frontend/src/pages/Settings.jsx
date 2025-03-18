// pages/Settings.jsx
import React, { useState } from 'react';
import { useMutation, useQuery } from 'react-query';
import {
    Settings as SettingsIcon,
    Bell,
    Shield,
    Database,
    Users,
    Server,
    Save,
    AlertTriangle,
    CheckCircle,
    X,
    Download
} from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../services/api';
import Button from '../components/ui/Button';
import Loader from '../components/ui/Loader';
import { useAuth } from '../contexts/AuthContext';

const Settings = () => {
    const { user, isAdmin } = useAuth();

    // State for different settings forms - moved before any conditionals
    const [notificationSettings, setNotificationSettings] = useState({
        emailNotifications: true,
        alertThreshold: 80,
        alertFrequency: 'hourly',
        recipientEmails: '',
    });

    const [securitySettings, setSecuritySettings] = useState({
        sessionTimeout: 30,
        maximumLoginAttempts: 5,
        passwordPolicy: 'medium',
        enforcePasswordChange: 90,
    });

    const [systemSettings, setSystemSettings] = useState({
        dataRetentionDays: 30,
        backupFrequency: 'daily',
        maintenanceMode: false,
        debugMode: false,
    });

    // Handle notification settings change
    const handleNotificationChange = (e) => {
        const { name, value, type, checked } = e.target;
        setNotificationSettings({
            ...notificationSettings,
            [name]: type === 'checkbox' ? checked : value,
        });
    };

    // Handle security settings change
    const handleSecurityChange = (e) => {
        const { name, value, type, checked } = e.target;
        setSecuritySettings({
            ...securitySettings,
            [name]: type === 'checkbox' ? checked : value,
        });
    };

    // Handle system settings change
    const handleSystemChange = (e) => {
        const { name, value, type, checked } = e.target;
        setSystemSettings({
            ...systemSettings,
            [name]: type === 'checkbox' ? checked : value,
        });
    };

    // Save notification settings
    const saveNotificationSettings = () => {
        // This would typically call a backend API
        toast.success('Настройки уведомлений сохранены');
    };

    // Save security settings
    const saveSecuritySettings = () => {
        // This would typically call a backend API
        toast.success('Настройки безопасности сохранены');
    };

    // Save system settings
    const saveSystemSettings = () => {
        // This would typically call a backend API
        toast.success('Системные настройки сохранены');
    };

    // Backup system data
    const backupSystem = () => {
        // This would typically call a backend API to create a backup
        toast.success('Резервная копия системы создана');
    };

    // Check if user has admin privileges - moved after all hooks
    if (!isAdmin) {
        return (
            <div className="container mx-auto p-6">
                <div className="flex flex-col items-center justify-center rounded-lg bg-amber-50 p-6 text-amber-800">
                    <AlertTriangle className="mb-4 h-12 w-12" />
                    <h2 className="text-xl font-bold">Доступ запрещен</h2>
                    <p className="mt-2 text-center">
                        У вас нет прав доступа к настройкам системы. Пожалуйста, обратитесь к администратору.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800">
                    Настройки Системы
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                    Управление настройками системы мониторинга медицинских отходов
                </p>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Sidebar with categories */}
                <div className="lg:col-span-1">
                    <div className="overflow-hidden rounded-xl bg-white shadow-sm">
                        <div className="border-b border-slate-100 px-6 py-4">
                            <h2 className="text-lg font-semibold text-slate-800">Категории</h2>
                        </div>
                        <div className="space-y-1 p-2">
                            <a
                                href="#notifications"
                                className="flex items-center rounded-lg px-4 py-2 text-slate-700 hover:bg-slate-50"
                            >
                                <Bell className="mr-3 h-5 w-5 text-slate-400" />
                                <span>Уведомления</span>
                            </a>
                            <a
                                href="#security"
                                className="flex items-center rounded-lg px-4 py-2 text-slate-700 hover:bg-slate-50"
                            >
                                <Shield className="mr-3 h-5 w-5 text-slate-400" />
                                <span>Безопасность</span>
                            </a>
                            <a
                                href="#system"
                                className="flex items-center rounded-lg px-4 py-2 text-slate-700 hover:bg-slate-50"
                            >
                                <Database className="mr-3 h-5 w-5 text-slate-400" />
                                <span>Система</span>
                            </a>
                            <a
                                href="#users"
                                className="flex items-center rounded-lg px-4 py-2 text-slate-700 hover:bg-slate-50"
                            >
                                <Users className="mr-3 h-5 w-5 text-slate-400" />
                                <span>Пользователи</span>
                            </a>
                        </div>
                    </div>

                    {/* System Info */}
                    <div className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm">
                        <div className="border-b border-slate-100 px-6 py-4">
                            <h2 className="text-lg font-semibold text-slate-800">Информация о системе</h2>
                        </div>
                        <div className="p-6">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-500">Версия</span>
                                    <span className="text-sm font-medium text-slate-800">1.0.0</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-500">Последнее обновление</span>
                                    <span className="text-sm font-medium text-slate-800">15.03.2025</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-500">Среда</span>
                                    <span className="text-sm font-medium text-slate-800">Production</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-500">База данных</span>
                                    <span className="text-sm font-medium text-slate-800">MongoDB</span>
                                </div>
                                <div className="mt-4">
                                    <Button
                                        onClick={backupSystem}
                                        fullWidth
                                        variant="outline"
                                    >
                                        <Download className="mr-2 h-4 w-4" />
                                        Создать резервную копию
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main settings content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Notification Settings */}
                    <div id="notifications" className="overflow-hidden rounded-xl bg-white shadow-sm">
                        <div className="border-b border-slate-100 px-6 py-4">
                            <div className="flex items-center space-x-3">
                                <Bell className="h-5 w-5 text-slate-400" />
                                <h2 className="text-lg font-semibold text-slate-800">Настройки уведомлений</h2>
                            </div>
                        </div>
                        <div className="p-6">
                            <form className="space-y-4">
                                {/* Email Notifications */}
                                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                                    <div>
                                        <label htmlFor="emailNotifications" className="text-sm font-medium text-slate-700">
                                            Уведомления по Email
                                        </label>
                                        <p className="text-xs text-slate-500">
                                            Получать уведомления о состоянии контейнеров по email
                                        </p>
                                    </div>
                                    <div className="ml-4 flex h-6 items-center">
                                        <input
                                            id="emailNotifications"
                                            name="emailNotifications"
                                            type="checkbox"
                                            checked={notificationSettings.emailNotifications}
                                            onChange={handleNotificationChange}
                                            className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                        />
                                    </div>
                                </div>

                                {/* Alert Threshold */}
                                <div>
                                    <label htmlFor="alertThreshold" className="mb-1 block text-sm font-medium text-slate-700">
                                        Порог оповещения (%)
                                    </label>
                                    <div className="flex items-center space-x-4">
                                        <input
                                            type="range"
                                            id="alertThreshold"
                                            name="alertThreshold"
                                            min="50"
                                            max="95"
                                            step="5"
                                            value={notificationSettings.alertThreshold}
                                            onChange={handleNotificationChange}
                                            className="h-2 w-2/3 cursor-pointer appearance-none rounded-full bg-slate-200 accent-teal-500"
                                        />
                                        <span className="w-12 text-center text-sm font-medium text-slate-700">
                      {notificationSettings.alertThreshold}%
                    </span>
                                    </div>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Уведомления будут отправляться, когда заполненность контейнера превысит данный порог
                                    </p>
                                </div>

                                {/* Alert Frequency */}
                                <div>
                                    <label htmlFor="alertFrequency" className="mb-1 block text-sm font-medium text-slate-700">
                                        Частота оповещений
                                    </label>
                                    <select
                                        id="alertFrequency"
                                        name="alertFrequency"
                                        value={notificationSettings.alertFrequency}
                                        onChange={handleNotificationChange}
                                        className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                                    >
                                        <option value="realtime">В реальном времени</option>
                                        <option value="hourly">Каждый час</option>
                                        <option value="daily">Каждый день</option>
                                        <option value="weekly">Каждую неделю</option>
                                    </select>
                                </div>

                                {/* Recipient Emails */}
                                <div>
                                    <label htmlFor="recipientEmails" className="mb-1 block text-sm font-medium text-slate-700">
                                        Email получателей
                                    </label>
                                    <textarea
                                        id="recipientEmails"
                                        name="recipientEmails"
                                        rows="3"
                                        value={notificationSettings.recipientEmails}
                                        onChange={handleNotificationChange}
                                        placeholder="Введите email-адреса через запятую"
                                        className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                                    ></textarea>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Разделяйте несколько адресов запятыми
                                    </p>
                                </div>

                                {/* Save button */}
                                <div className="mt-6 flex justify-end">
                                    <Button
                                        onClick={saveNotificationSettings}
                                        type="button"
                                    >
                                        <Save className="mr-2 h-4 w-4" />
                                        Сохранить настройки
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Security Settings */}
                    <div id="security" className="overflow-hidden rounded-xl bg-white shadow-sm">
                        <div className="border-b border-slate-100 px-6 py-4">
                            <div className="flex items-center space-x-3">
                                <Shield className="h-5 w-5 text-slate-400" />
                                <h2 className="text-lg font-semibold text-slate-800">Настройки безопасности</h2>
                            </div>
                        </div>
                        <div className="p-6">
                            <form className="space-y-4">
                                {/* Session Timeout */}
                                <div>
                                    <label htmlFor="sessionTimeout" className="mb-1 block text-sm font-medium text-slate-700">
                                        Время сессии (минуты)
                                    </label>
                                    <input
                                        type="number"
                                        id="sessionTimeout"
                                        name="sessionTimeout"
                                        min="5"
                                        max="240"
                                        value={securitySettings.sessionTimeout}
                                        onChange={handleSecurityChange}
                                        className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                                    />
                                    <p className="mt-1 text-xs text-slate-500">
                                        Пользователь будет автоматически выходить из системы после указанного времени бездействия
                                    </p>
                                </div>

                                {/* Maximum Login Attempts */}
                                <div>
                                    <label htmlFor="maximumLoginAttempts" className="mb-1 block text-sm font-medium text-slate-700">
                                        Максимальное количество попыток входа
                                    </label>
                                    <input
                                        type="number"
                                        id="maximumLoginAttempts"
                                        name="maximumLoginAttempts"
                                        min="3"
                                        max="10"
                                        value={securitySettings.maximumLoginAttempts}
                                        onChange={handleSecurityChange}
                                        className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                                    />
                                    <p className="mt-1 text-xs text-slate-500">
                                        Аккаунт будет временно заблокирован после указанного количества неудачных попыток входа
                                    </p>
                                </div>

                                {/* Password Policy */}
                                <div>
                                    <label htmlFor="passwordPolicy" className="mb-1 block text-sm font-medium text-slate-700">
                                        Политика паролей
                                    </label>
                                    <select
                                        id="passwordPolicy"
                                        name="passwordPolicy"
                                        value={securitySettings.passwordPolicy}
                                        onChange={handleSecurityChange}
                                        className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                                    >
                                        <option value="low">Низкая (минимум 6 символов)</option>
                                        <option value="medium">Средняя (минимум 8 символов, буквы и цифры)</option>
                                        <option value="high">Высокая (минимум 10 символов, буквы, цифры и спецсимволы)</option>
                                    </select>
                                </div>

                                {/* Enforce Password Change */}
                                <div>
                                    <label htmlFor="enforcePasswordChange" className="mb-1 block text-sm font-medium text-slate-700">
                                        Принудительная смена пароля (дни)
                                    </label>
                                    <input
                                        type="number"
                                        id="enforcePasswordChange"
                                        name="enforcePasswordChange"
                                        min="0"
                                        max="365"
                                        value={securitySettings.enforcePasswordChange}
                                        onChange={handleSecurityChange}
                                        className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                                    />
                                    <p className="mt-1 text-xs text-slate-500">
                                        Пользователи должны менять пароль каждые X дней (0 для отключения)
                                    </p>
                                </div>

                                {/* Save button */}
                                <div className="mt-6 flex justify-end">
                                    <Button
                                        onClick={saveSecuritySettings}
                                        type="button"
                                    >
                                        <Save className="mr-2 h-4 w-4" />
                                        Сохранить настройки
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* System Settings */}
                    <div id="system" className="overflow-hidden rounded-xl bg-white shadow-sm">
                        <div className="border-b border-slate-100 px-6 py-4">
                            <div className="flex items-center space-x-3">
                                <Database className="h-5 w-5 text-slate-400" />
                                <h2 className="text-lg font-semibold text-slate-800">Системные настройки</h2>
                            </div>
                        </div>
                        <div className="p-6">
                            <form className="space-y-4">
                                {/* Data Retention */}
                                <div>
                                    <label htmlFor="dataRetentionDays" className="mb-1 block text-sm font-medium text-slate-700">
                                        Срок хранения данных (дни)
                                    </label>
                                    <input
                                        type="number"
                                        id="dataRetentionDays"
                                        name="dataRetentionDays"
                                        min="7"
                                        max="365"
                                        value={systemSettings.dataRetentionDays}
                                        onChange={handleSystemChange}
                                        className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                                    />
                                    <p className="mt-1 text-xs text-slate-500">
                                        Исторические данные будут храниться указанное количество дней
                                    </p>
                                </div>

                                {/* Backup Frequency */}
                                <div>
                                    <label htmlFor="backupFrequency" className="mb-1 block text-sm font-medium text-slate-700">
                                        Частота резервного копирования
                                    </label>
                                    <select
                                        id="backupFrequency"
                                        name="backupFrequency"
                                        value={systemSettings.backupFrequency}
                                        onChange={handleSystemChange}
                                        className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                                    >
                                        <option value="hourly">Каждый час</option>
                                        <option value="daily">Каждый день</option>
                                        <option value="weekly">Каждую неделю</option>
                                        <option value="monthly">Каждый месяц</option>
                                    </select>
                                </div>

                                {/* Maintenance Mode */}
                                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                                    <div>
                                        <label htmlFor="maintenanceMode" className="text-sm font-medium text-slate-700">
                                            Режим обслуживания
                                        </label>
                                        <p className="text-xs text-slate-500">
                                            В этом режиме система будет недоступна для обычных пользователей
                                        </p>
                                    </div>
                                    <div className="ml-4 flex h-6 items-center">
                                        <input
                                            id="maintenanceMode"
                                            name="maintenanceMode"
                                            type="checkbox"
                                            checked={systemSettings.maintenanceMode}
                                            onChange={handleSystemChange}
                                            className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                        />
                                    </div>
                                </div>

                                {/* Debug Mode */}
                                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                                    <div>
                                        <label htmlFor="debugMode" className="text-sm font-medium text-slate-700">
                                            Режим отладки
                                        </label>
                                        <p className="text-xs text-slate-500">
                                            Включает расширенное логирование и отладочную информацию
                                        </p>
                                    </div>
                                    <div className="ml-4 flex h-6 items-center">
                                        <input
                                            id="debugMode"
                                            name="debugMode"
                                            type="checkbox"
                                            checked={systemSettings.debugMode}
                                            onChange={handleSystemChange}
                                            className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                        />
                                    </div>
                                </div>

                                {/* Save button */}
                                <div className="mt-6 flex justify-end">
                                    <Button
                                        onClick={saveSystemSettings}
                                        type="button"
                                    >
                                        <Save className="mr-2 h-4 w-4" />
                                        Сохранить настройки
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Users Management section would be here... */}
                    <div id="users" className="overflow-hidden rounded-xl bg-white shadow-sm">
                        <div className="border-b border-slate-100 px-6 py-4">
                            <div className="flex items-center space-x-3">
                                <Users className="h-5 w-5 text-slate-400" />
                                <h2 className="text-lg font-semibold text-slate-800">Управление пользователями</h2>
                            </div>
                        </div>
                        <div className="p-6">
                            <p className="text-center text-slate-500">
                                Управление пользователями доступно через отдельный интерфейс администратора
                            </p>
                            <div className="mt-4 flex justify-center">
                                <Button
                                    variant="outline"
                                    onClick={() => window.location.href = '/admin/users'}
                                >
                                    <Users className="mr-2 h-4 w-4" />
                                    Управление пользователями
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;