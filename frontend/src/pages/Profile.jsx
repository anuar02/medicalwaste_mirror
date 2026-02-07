import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { User, Mail, Key, Save, AlertCircle, CheckCircle, Eye, EyeOff, Building, MessageCircle, Bell, BellOff, Send, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';
import Loader from '../components/ui/Loader';

const Profile = () => {
    const { user } = useAuth();
    const serverPhoneRef = useRef('');

    // Profile form state
    const [profileData, setProfileData] = useState({
        username: '',
        email: '',
        department: '',
    });

    // Password form state
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        password: '',
        passwordConfirm: '',
    });

    // Telegram form state
    const [telegramForm, setTelegramForm] = useState({
        chatId: '',
    });

    // Phone verification state
    const [phoneData, setPhoneData] = useState({
        phoneNumber: '',
        code: '',
        verified: false
    });

    // Telegram connection status state
    const [telegramStatus, setTelegramStatus] = useState({
        connected: false,
        chatId: null,
        receiveNotifications: true
    });

    // UI state
    const [showPasswords, setShowPasswords] = useState(false);
    const [profileFormError, setProfileFormError] = useState('');
    const [passwordFormError, setPasswordFormError] = useState('');
    const [telegramFormError, setTelegramFormError] = useState('');
    const [phoneFormError, setPhoneFormError] = useState('');

    // Fetch user details
    const { data: userData, isLoading: userLoading, error: userError, refetch: refetchUser } = useQuery({
        queryKey: ['userProfile'],
        queryFn: () => apiService.users.getProfile(),
        onSuccess: (data) => {
            const user = data?.data?.data?.user || data?.data?.user;
            if (!user) return;
            setProfileData({
                username: user.username || '',
                email: user.email || '',
                department: user.department || '',
            });
            setPhoneData((prev) => ({
                ...prev,
                phoneNumber: user.phoneNumber || '',
                verified: user.phoneNumberVerified || false
            }));
            serverPhoneRef.current = user.phoneNumber || '';
        },
    });

    const serverUser = userData?.data?.data?.user || userData?.data?.user || null;
    const phoneVerified = serverUser?.phoneNumberVerified ?? phoneData.verified;
    const displayEmail = serverUser?.email || profileData.email || '—';
    const displayPhone = serverUser?.phoneNumber || phoneData.phoneNumber || '—';
    const displayDepartment = serverUser?.department || profileData.department || '—';

// Fetch departments for dropdown
    const { data: departmentsData } = useQuery({
        queryKey: ['departments'],
        queryFn: () => apiService.users.getDepartments(),
        staleTime: Infinity,
        enabled: false,
    });

    // Update profile mutation
    const updateProfileMutation = useMutation({
    mutationFn: (data) => apiService.users.updateProfile(data),
            onSuccess: () => {
                toast.success('Профиль успешно обновлен');
                refetchUser();
            },
            onError: (error) => {
                setProfileFormError(error.response?.data?.message || 'Ошибка при обновлении профиля');
            },
        }
    );

    // Change password mutation
    const changePasswordMutation = useMutation({
    mutationFn: (data) => apiService.auth.changePassword(data),
            onSuccess: () => {
                toast.success('Пароль успешно изменен');
                setPasswordData({
                    currentPassword: '',
                    password: '',
                    passwordConfirm: '',
                });
            },
            onError: (error) => {
                setPasswordFormError(error.response?.data?.message || 'Ошибка при изменении пароля');
            },
        }
    );

    // Connect Telegram mutation
    const connectTelegramMutation = useMutation({
    mutationFn: (data) => apiService.telegram.connect(data),
            onSuccess: (response) => {
                toast.success('Telegram успешно подключен');
                // Update Telegram status directly from response
                const telegramInfo = response.data.data.user.telegram;
                const notifyPrefs = response.data.data.user.notificationPreferences;
                setTelegramStatus({
                    connected: telegramInfo.active || false,
                    chatId: telegramInfo.chatId || null,
                    receiveNotifications: notifyPrefs?.receiveAlerts || false
                });
                setTelegramForm({ chatId: '' });
                // Remove the setTimeout call that was causing issues
            },
            onError: (error) => {
                setTelegramFormError(error.response?.data?.message || 'Ошибка при подключении Telegram');
            },
        }
    );

    // Disconnect Telegram mutation
    const disconnectTelegramMutation = useMutation({
    mutationFn: () => apiService.telegram.disconnect(),
            onSuccess: (response) => {
                toast.success('Telegram отключен');
                setTelegramStatus({
                    connected: false,
                    chatId: null,
                    receiveNotifications: false
                });
                // No need to check status after disconnecting
            },
            onError: (error) => {
                setTelegramFormError(error.response?.data?.message || 'Ошибка при отключении Telegram');
            },
        }
    );

    // Toggle Telegram notifications mutation
    const toggleNotificationsMutation = useMutation({
    mutationFn: (data) => apiService.telegram.toggleNotifications(data),
            onSuccess: (response) => {
                const status = response.data.data.user.notificationPreferences.receiveAlerts;
                toast.success(`Уведомления ${status ? 'включены' : 'отключены'}`);
                setTelegramStatus(prev => ({
                    ...prev,
                    receiveNotifications: status
                }));
                // No need to check status after toggling
            },
            onError: (error) => {
                setTelegramFormError(error.response?.data?.message || 'Ошибка при изменении настроек уведомлений');
            },
        }
    );

    // Send test notification mutation
    const sendTestNotificationMutation = useMutation({
    mutationFn: () => apiService.telegram.sendTestNotification(),
            onSuccess: () => {
                toast.success('Тестовое уведомление отправлено');
            },
            onError: (error) => {
                setTelegramFormError(error.response?.data?.message || 'Ошибка при отправке тестового уведомления');
            },
        }
    );

    const updatePhoneMutation = useMutation({
        mutationFn: (data) => apiService.users.updatePhone(data),
        onSuccess: (response) => {
            toast.success('Телефон обновлен');
            const updatedUser = response?.data?.data?.user;
            if (updatedUser) {
                serverPhoneRef.current = updatedUser.phoneNumber || '';
                setPhoneData((prev) => ({
                    ...prev,
                    phoneNumber: updatedUser.phoneNumber || '',
                    verified: updatedUser.phoneNumberVerified || false
                }));
            }
            setPhoneFormError('');
            refetchUser();
        },
        onError: (error) => {
            setPhoneFormError(error.response?.data?.message || 'Ошибка при обновлении телефона');
        }
    });

    const startPhoneVerificationMutation = useMutation({
        mutationFn: (data) => apiService.users.startPhoneVerification(data),
        onSuccess: () => {
            toast.success('Код подтверждения отправлен');
            setPhoneFormError('');
        },
        onError: (error) => {
            setPhoneFormError(error.response?.data?.message || 'Ошибка при отправке кода');
        }
    });

    const checkPhoneVerificationMutation = useMutation({
        mutationFn: (data) => apiService.users.checkPhoneVerification(data),
        onSuccess: (response) => {
            toast.success('Телефон подтвержден');
            const updatedUser = response?.data?.data?.user;
            if (updatedUser?.phoneNumber) {
                serverPhoneRef.current = updatedUser.phoneNumber;
            }
            setPhoneData((prev) => ({
                ...prev,
                phoneNumber: updatedUser?.phoneNumber || prev.phoneNumber,
                verified: updatedUser?.phoneNumberVerified || false,
                code: ''
            }));
            setPhoneFormError('');
            refetchUser();
        },
        onError: (error) => {
            setPhoneFormError(error.response?.data?.message || 'Ошибка подтверждения телефона');
        }
    });

    // Function to check Telegram connection status - now using the dedicated getStatus endpoint
    const checkTelegramStatus = async () => {
        try {
            // Use the dedicated status endpoint instead of connect
            const response = await apiService.telegram.getStatus();

            if (response?.data?.status === 'success' && response?.data?.data?.telegram) {
                const telegramData = response.data.data.telegram;

                // Important: The backend sends 'receiveNotifications' property, not 'receiveAlerts'
                setTelegramStatus({
                    connected: telegramData.active || false,
                    chatId: telegramData.chatId || null,
                    // Match the exact property name from the backend
                    receiveNotifications: telegramData.receiveNotifications || false
                });
            } else {
                console.error("Unexpected response structure:", response?.data);
                setTelegramStatus({
                    connected: false,
                    chatId: null,
                    receiveNotifications: false
                });
            }
        } catch (error) {
            console.error("Error checking Telegram status:", error);
            setTelegramStatus({
                connected: false,
                chatId: null,
                receiveNotifications: false
            });
        }
    };

    // Check Telegram status on component mount
    useEffect(() => {
        checkTelegramStatus();
    }, []);

    // Handle profile form change
    const handleProfileChange = (e) => {
        const { name, value } = e.target;
        setProfileData({
            ...profileData,
            [name]: value,
        });
    };

    // Handle password form change
    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordData({
            ...passwordData,
            [name]: value,
        });
    };

    // Handle Telegram form change
    const handleTelegramChange = (e) => {
        const { name, value } = e.target;
        setTelegramForm({
            ...telegramForm,
            [name]: value,
        });
    };

    const handlePhoneChange = (e) => {
        const { name, value } = e.target;
        const normalizedValue = value.trim();
        const normalizedServerValue = (serverPhoneRef.current || '').trim();
        setPhoneData((prev) => ({
            ...prev,
            [name]: value,
            verified: name === 'phoneNumber' && normalizedValue !== normalizedServerValue ? false : prev.verified
        }));
    };

    // Handle profile form submission
    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setProfileFormError('');
        updateProfileMutation.mutate(profileData);
    };

    // Handle password form submission
    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setPasswordFormError('');

        // Validate passwords match
        if (passwordData.password !== passwordData.passwordConfirm) {
            setPasswordFormError('Пароли не совпадают');
            return;
        }

        // Validate password length
        if (passwordData.password.length < 8) {
            setPasswordFormError('Пароль должен быть не менее 8 символов');
            return;
        }

        changePasswordMutation.mutate(passwordData);
    };

    // Handle connect Telegram form submission
    const handleConnectTelegram = async (e) => {
        e.preventDefault();
        setTelegramFormError('');

        if (!telegramForm.chatId) {
            setTelegramFormError('Введите Chat ID');
            return;
        }

        connectTelegramMutation.mutate(telegramForm);
    };

    // Handle disconnect Telegram
    const handleDisconnectTelegram = () => {
        setTelegramFormError('');
        disconnectTelegramMutation.mutate();
    };

    // Handle toggle notifications
    const handleToggleNotifications = (enabled) => {
        setTelegramFormError('');
        toggleNotificationsMutation.mutate({ receiveAlerts: enabled });
    };

    // Handle send test notification
    const handleSendTestNotification = () => {
        setTelegramFormError('');
        sendTestNotificationMutation.mutate();
    };

    const handleStartPhoneVerification = (e) => {
        e.preventDefault();
        setPhoneFormError('');
        if (!phoneData.phoneNumber) {
            setPhoneFormError('Введите номер телефона');
            return;
        }
        startPhoneVerificationMutation.mutate({ phoneNumber: phoneData.phoneNumber });
    };

    const handleCheckPhoneVerification = (e) => {
        e.preventDefault();
        setPhoneFormError('');
        if (!phoneData.code) {
            setPhoneFormError('Введите код подтверждения');
            return;
        }
        checkPhoneVerificationMutation.mutate({ phoneNumber: phoneData.phoneNumber, code: phoneData.code });
    };

    // Loading state for user data
    if (userLoading) {
        return <Loader text="Загрузка профиля..." />;
    }

    // Error state
    if (userError) {
        return (
            <div className="container mx-auto p-6">
                <div className="rounded-lg bg-red-50 p-4 text-red-600">
                    <AlertCircle className="mb-2 h-6 w-6" />
                    <h3 className="text-lg font-semibold">Ошибка загрузки профиля</h3>
                    <p>{userError.message || 'Не удалось загрузить данные профиля'}</p>
                </div>
            </div>
        );
    }

    // Get departments from API or use defaults
    const departments = departmentsData?.data?.data?.departments || [
        'Хирургическое Отделение',
        'Терапевтическое Отделение',
        'Педиатрическое Отделение',
        'Акушерское Отделение',
        'Инфекционное Отделение',
        'Лаборатория',
        'Реанимация',
    ];

    const initials = (profileData.username || user?.username || 'U')
        .slice(0, 2)
        .toUpperCase();
    const profileTheme = {
        '--profile-ink': '#0f172a',
        '--profile-muted': '#475569',
        '--profile-accent': '#0ea5a4',
        '--profile-accent-soft': '#ccfbf1',
        '--profile-warm': '#fef3c7',
        '--profile-sand': '#f8fafc',
        '--profile-card': '#ffffff',
        '--profile-shadow': '0 18px 45px rgba(15, 23, 42, 0.08)'
    };

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#e0f2fe,_transparent_55%),radial-gradient(circle_at_80%_20%,_#fef3c7,_transparent_45%)] py-6" style={profileTheme}>
            <div className="container mx-auto px-4">
                <div className="mb-8 rounded-2xl bg-[var(--profile-card)] p-6 shadow-[var(--profile-shadow)]">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--profile-accent-soft)] text-xl font-semibold text-[var(--profile-ink)]">
                                {initials}
                            </div>
                            <div>
                                <h1 className="text-2xl font-semibold text-[var(--profile-ink)]">Мой профиль</h1>
                                <p className="text-sm text-[var(--profile-muted)]">
                                    Обновляйте личные данные и подтверждайте телефон
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="rounded-full bg-[var(--profile-warm)] px-3 py-1 text-xs font-medium text-[var(--profile-ink)]">
                                Роль: {serverUser?.role || user?.role || 'user'}
                            </span>
                            <span className={`rounded-full px-3 py-1 text-xs font-medium ${phoneVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                Телефон: {phoneVerified ? 'Подтвержден' : 'Не подтвержден'}
                            </span>
                        </div>
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-xl border border-slate-100 bg-[var(--profile-sand)] p-4">
                            <p className="text-xs uppercase tracking-wide text-[var(--profile-muted)]">Email</p>
                            <p className="mt-2 text-sm font-medium text-[var(--profile-ink)]">
                                {displayEmail}
                            </p>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-[var(--profile-sand)] p-4">
                            <p className="text-xs uppercase tracking-wide text-[var(--profile-muted)]">Телефон</p>
                            <p className="mt-2 text-sm font-medium text-[var(--profile-ink)]">
                                {displayPhone}
                            </p>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-[var(--profile-sand)] p-4">
                            <p className="text-xs uppercase tracking-wide text-[var(--profile-muted)]">Отделение</p>
                            <p className="mt-2 text-sm font-medium text-[var(--profile-ink)]">
                                {displayDepartment}
                            </p>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-[var(--profile-sand)] p-4">
                            <p className="text-xs uppercase tracking-wide text-[var(--profile-muted)]">Статус</p>
                            <p className="mt-2 text-sm font-medium text-[var(--profile-ink)]">
                                {serverUser?.active ? 'Активен' : 'Отключен'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Profile Information */}
                <div className="overflow-hidden rounded-xl bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-6 py-4">
                        <h2 className="text-lg font-semibold text-slate-800">Информация профиля</h2>
                        <p className="text-sm text-slate-500">
                            Обновите ваши личные данные
                        </p>
                    </div>

                    <div className="p-6">
                        {profileFormError && (
                            <div className="mb-4 flex items-center rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                                <AlertCircle className="mr-2 h-4 w-4" />
                                <p>{profileFormError}</p>
                            </div>
                        )}

                        {updateProfileMutation.isSuccess && (
                            <div className="mb-4 flex items-center rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-600">
                                <CheckCircle className="mr-2 h-4 w-4" />
                                <p>Профиль успешно обновлен</p>
                            </div>
                        )}

                        <form onSubmit={handleProfileSubmit} className="space-y-4">
                            {/* Username */}
                            <div>
                                <label htmlFor="username" className="mb-1 block text-sm font-medium text-slate-700">
                                    Имя пользователя
                                </label>
                                <div className="relative">
                                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                                    <User className="h-4 w-4" />
                                  </span>
                                    <input
                                        id="username"
                                        name="username"
                                        type="text"
                                        value={profileData.username}
                                        onChange={handleProfileChange}
                                        className="block w-full rounded-lg border border-slate-200 pl-10 pr-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                                        disabled={updateProfileMutation.isLoading}
                                        maxLength={30}
                                        pattern="[a-zA-Z0-9_-]+"
                                        title="Имя пользователя может содержать только буквы, цифры, подчеркивания и дефисы"
                                    />
                                </div>
                                <p className="mt-1 text-xs text-slate-500">
                                    От 3 до 30 символов, только буквы, цифры, подчеркивания и дефисы
                                </p>
                            </div>

                            {/* Email */}
                            <div>
                                <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
                                    Email
                                </label>
                                <div className="relative">
                                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                                    <Mail className="h-4 w-4" />
                                  </span>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        value={profileData.email}
                                        onChange={handleProfileChange}
                                        className="block w-full rounded-lg border border-slate-200 pl-10 pr-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                                        disabled={updateProfileMutation.isLoading}
                                    />
                                </div>
                            </div>

                            {/* Department */}
                            <div>
                                <label htmlFor="department" className="mb-1 block text-sm font-medium text-slate-700">
                                    Отделение
                                </label>
                                <div className="relative">
                                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                                    <Building className="h-4 w-4" />
                                  </span>
                                    <select
                                        id="department"
                                        name="department"
                                        value={profileData.department}
                                        onChange={handleProfileChange}
                                        className="block w-full rounded-lg border border-slate-200 pl-10 pr-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                                        disabled={updateProfileMutation.isLoading}
                                    >
                                        <option value="">Выберите отделение</option>
                                        {departments.map((dept) => (
                                            <option key={dept} value={dept}>{dept}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                isLoading={updateProfileMutation.isLoading}
                            >
                                <Save className="mr-2 h-4 w-4" />
                                Сохранить изменения
                            </Button>
                        </form>
                    </div>
                </div>

                {/* Security Settings */}
                <div className="overflow-hidden rounded-xl bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-6 py-4">
                        <h2 className="text-lg font-semibold text-slate-800">Настройки безопасности</h2>
                        <p className="text-sm text-slate-500">
                            Обновите ваш пароль
                        </p>
                    </div>

                    <div className="p-6">
                        {passwordFormError && (
                            <div className="mb-4 flex items-center rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                                <AlertCircle className="mr-2 h-4 w-4" />
                                <p>{passwordFormError}</p>
                            </div>
                        )}

                        {changePasswordMutation.isSuccess && (
                            <div className="mb-4 flex items-center rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-600">
                                <CheckCircle className="mr-2 h-4 w-4" />
                                <p>Пароль успешно изменен</p>
                            </div>
                        )}

                        <form onSubmit={handlePasswordSubmit} className="space-y-4">
                            {/* Current Password */}
                            <div>
                                <label htmlFor="currentPassword" className="mb-1 block text-sm font-medium text-slate-700">
                                    Текущий пароль
                                </label>
                                <div className="relative">
                                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                                    <Key className="h-4 w-4" />
                                  </span>
                                    <input
                                        id="currentPassword"
                                        name="currentPassword"
                                        type={showPasswords ? 'text' : 'password'}
                                        value={passwordData.currentPassword}
                                        onChange={handlePasswordChange}
                                        className="block w-full rounded-lg border border-slate-200 pl-10 pr-10 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                                        required
                                        disabled={changePasswordMutation.isLoading}
                                    />
                                </div>
                            </div>

                            {/* New Password */}
                            <div>
                                <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
                                    Новый пароль
                                </label>
                                <div className="relative">
                                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                                    <Key className="h-4 w-4" />
                                  </span>
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPasswords ? 'text' : 'password'}
                                        value={passwordData.password}
                                        onChange={handlePasswordChange}
                                        className="block w-full rounded-lg border border-slate-200 pl-10 pr-10 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                                        minLength={8}
                                        required
                                        disabled={changePasswordMutation.isLoading}
                                    />
                                </div>
                                <p className="mt-1 text-xs text-slate-500">
                                    Минимум 8 символов, включая буквы и цифры
                                </p>
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label htmlFor="passwordConfirm" className="mb-1 block text-sm font-medium text-slate-700">
                                    Подтвердите новый пароль
                                </label>
                                <div className="relative">
                                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                                    <Key className="h-4 w-4" />
                                  </span>
                                    <input
                                        id="passwordConfirm"
                                        name="passwordConfirm"
                                        type={showPasswords ? 'text' : 'password'}
                                        value={passwordData.passwordConfirm}
                                        onChange={handlePasswordChange}
                                        className="block w-full rounded-lg border border-slate-200 pl-10 pr-10 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                                        required
                                        disabled={changePasswordMutation.isLoading}
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                                        onClick={() => setShowPasswords(!showPasswords)}
                                    >
                                        {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                isLoading={changePasswordMutation.isLoading}
                            >
                                <Key className="mr-2 h-4 w-4" />
                                Изменить пароль
                            </Button>
                        </form>
                    </div>
                </div>

                {/* Phone Verification */}
                <div className="overflow-hidden rounded-xl bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-6 py-4 flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-800">Телефон и подтверждение</h2>
                            <p className="text-sm text-slate-500">
                                Номер нужен для SMS/WhatsApp уведомлений
                            </p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${phoneVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {phoneVerified ? 'Подтвержден' : 'Не подтвержден'}
                        </div>
                    </div>

                    <div className="p-6">
                        {phoneFormError && (
                            <div className="mb-4 flex items-center rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                                <AlertCircle className="mr-2 h-4 w-4" />
                                <p>{phoneFormError}</p>
                            </div>
                        )}

                        <form onSubmit={handleStartPhoneVerification} className="space-y-4">
                            <div>
                                <label htmlFor="phoneNumber" className="mb-1 block text-sm font-medium text-slate-700">
                                    Номер телефона
                                </label>
                                <div className="relative">
                                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                                    <Phone className="h-4 w-4" />
                                  </span>
                                    <input
                                        id="phoneNumber"
                                        name="phoneNumber"
                                        type="tel"
                                        value={phoneData.phoneNumber}
                                        onChange={handlePhoneChange}
                                        className="block w-full rounded-lg border border-slate-200 pl-10 pr-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                                        placeholder="+77051234567"
                                        disabled={updatePhoneMutation.isLoading || startPhoneVerificationMutation.isLoading || checkPhoneVerificationMutation.isLoading}
                                    />
                                </div>
                                <p className="mt-1 text-xs text-slate-500">Формат E.164, например +77051234567</p>
                            </div>

                            <Button
                                type="submit"
                                color="teal"
                                isLoading={startPhoneVerificationMutation.isLoading}
                                disabled={!phoneData.phoneNumber}
                            >
                                Отправить код
                            </Button>
                        </form>

                        {!phoneVerified && (
                            <form onSubmit={handleCheckPhoneVerification} className="mt-6 space-y-4">
                                <div>
                                    <label htmlFor="phoneCode" className="mb-1 block text-sm font-medium text-slate-700">
                                        Код подтверждения
                                    </label>
                                    <input
                                        id="phoneCode"
                                        name="code"
                                        type="text"
                                        value={phoneData.code}
                                        onChange={handlePhoneChange}
                                        className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                                        placeholder="123456"
                                        disabled={checkPhoneVerificationMutation.isLoading}
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    isLoading={checkPhoneVerificationMutation.isLoading}
                                >
                                    Подтвердить телефон
                                </Button>
                            </form>
                        )}
                    </div>
                </div>

                {/* Telegram Settings */}
                <div className="lg:col-span-2 overflow-hidden rounded-xl bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-6 py-4 flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-800">Настройки уведомлений Telegram</h2>
                            <p className="text-sm text-slate-500">
                                Подключите Telegram для получения уведомлений о заполненных контейнерах
                            </p>
                        </div>
                        {telegramStatus.connected && (
                            <div className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-xs font-medium">
                                Подключено
                            </div>
                        )}
                    </div>

                    <div className="p-6">
                        {telegramFormError && (
                            <div className="mb-4 flex items-center rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                                <AlertCircle className="mr-2 h-4 w-4" />
                                <p>{telegramFormError}</p>
                            </div>
                        )}

                        {!telegramStatus.connected ? (
                            <div>
                                <div className="mb-6 p-4 bg-slate-50 rounded-lg">
                                    <h3 className="font-medium text-slate-700 mb-2">Как подключить Telegram:</h3>
                                    <ol className="list-decimal list-inside text-sm text-slate-600 space-y-2">
                                        <li>Откройте Telegram и найдите бота <strong>@medWasteBot</strong></li>
                                        <li>Нажмите кнопку <strong>Старт</strong> или отправьте команду <code className="bg-slate-200 px-1 rounded">/start</code></li>
                                        <li>Бот пришлет вам ваш <strong>Chat ID</strong></li>
                                        <li>Скопируйте Chat ID и вставьте его в поле ниже</li>
                                    </ol>
                                </div>

                                <form onSubmit={handleConnectTelegram} className="space-y-4">
                                    <div>
                                        <label htmlFor="chatId" className="mb-1 block text-sm font-medium text-slate-700">
                                            Telegram Chat ID
                                        </label>
                                        <div className="relative">
                                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                                            <MessageCircle className="h-4 w-4" />
                                          </span>
                                            <input
                                                id="chatId"
                                                name="chatId"
                                                type="text"
                                                value={telegramForm.chatId}
                                                onChange={handleTelegramChange}
                                                className="block w-full rounded-lg border border-slate-200 pl-10 pr-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                                                placeholder="Введите ваш Chat ID из Telegram"
                                                required
                                                disabled={connectTelegramMutation.isLoading}
                                            />
                                        </div>
                                    </div>

                                    <Button
                                        type="submit"
                                        isLoading={connectTelegramMutation.isLoading}
                                        color="teal"
                                    >
                                        <MessageCircle className="mr-2 h-4 w-4" />
                                        Подключить Telegram
                                    </Button>
                                </form>
                            </div>
                        ) : (
                            <div>
                                <div className="mb-6 space-y-4">
                                    <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
                                        <div>
                                            <h3 className="font-medium text-slate-700">Статус подключения</h3>
                                            <p className="text-sm text-slate-500">Telegram успешно подключен</p>
                                        </div>
                                        <div className="text-sm text-slate-600 bg-white px-3 py-1 rounded-md border border-slate-200">
                                            Chat ID: {telegramStatus.chatId}
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
                                        <div>
                                            <h3 className="font-medium text-slate-700">Уведомления</h3>
                                            <p className="text-sm text-slate-500">
                                                {telegramStatus.receiveNotifications
                                                    ? 'Вы получаете уведомления о заполненных контейнерах'
                                                    : 'Уведомления отключены'}
                                            </p>
                                        </div>
                                        <Button
                                            type="button"
                                            color={telegramStatus.receiveNotifications ? 'red' : 'green'}
                                            onClick={() => handleToggleNotifications(!telegramStatus.receiveNotifications)}
                                            isLoading={toggleNotificationsMutation.isLoading}
                                            variant="outline"
                                            size="sm"
                                        >
                                            {telegramStatus.receiveNotifications ? (
                                                <>
                                                    <BellOff className="mr-2 h-4 w-4" />
                                                    Отключить
                                                </>
                                            ) : (
                                                <>
                                                    <Bell className="mr-2 h-4 w-4" />
                                                    Включить
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    <Button
                                        type="button"
                                        color="teal"
                                        onClick={handleSendTestNotification}
                                        isLoading={sendTestNotificationMutation.isLoading}
                                        disabled={!telegramStatus.receiveNotifications}
                                    >
                                        <Send className="mr-2 h-4 w-4" />
                                        Отправить тестовое уведомление
                                    </Button>

                                    <Button
                                        type="button"
                                        color="red"
                                        variant="outline"
                                        onClick={handleDisconnectTelegram}
                                        isLoading={disconnectTelegramMutation.isLoading}
                                    >
                                        <MessageCircle className="mr-2 h-4 w-4" />
                                        Отключить Telegram
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
        </div>
    );
};

export default Profile;
