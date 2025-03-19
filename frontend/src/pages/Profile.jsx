import { QueryClient, QueryClientProvider } from 'react-query';
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'react-query';
import { User, Mail, Key, Save, AlertCircle, CheckCircle, Eye, EyeOff, Building } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';
import Loader from '../components/ui/Loader';

const Profile = () => {
    const { user } = useAuth();

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

    // UI state
    const [showPasswords, setShowPasswords] = useState(false);
    const [profileFormError, setProfileFormError] = useState('');
    const [passwordFormError, setPasswordFormError] = useState('');

    // Fetch user details
    const { data: userData, isLoading: userLoading, error: userError } = useQuery(
        'userProfile',
        () => apiService.users.getProfile(),
        {
            onSuccess: (data) => {
                const user = data.data.data.user;
                setProfileData({
                    username: user.username || '',
                    email: user.email || '',
                    department: user.department || '',
                });
            },
        }
    );

    // Fetch departments for dropdown
    const { data: departmentsData } = useQuery(
        'departments',
        () => apiService.users.getDepartments(),
        {
            staleTime: Infinity,
            enabled: false,
        }
    );

    // Update profile mutation
    const updateProfileMutation = useMutation(
        (data) => apiService.users.updateProfile(data),
        {
            onSuccess: () => {
                toast.success('Профиль успешно обновлен');
                QueryClient.invalidateQueries('userProfile');
            },
            onError: (error) => {
                setProfileFormError(error.response?.data?.message || 'Ошибка при обновлении профиля');
            },
        }
    );

    // Change password mutation
    const changePasswordMutation = useMutation(
        (data) => apiService.auth.changePassword(data),
        {
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

    // Loading state
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

    return (
        <div className="container mx-auto p-4">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Мой профиль</h1>
                <p className="text-sm text-slate-500">
                    Управление личными данными и настройками безопасности
                </p>
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
            </div>
        </div>
    );
};

export default Profile;