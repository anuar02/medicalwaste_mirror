// pages/auth/ResetPassword.jsx
import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Eye, EyeOff, Key, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import Logo from '../../components/ui/Logo';

const ResetPassword = () => {
    const navigate = useNavigate();
    const { token } = useParams();
    const { resetPassword } = useAuth();

    // Form state
    const [formData, setFormData] = useState({
        password: '',
        passwordConfirm: '',
    });

    // UI state
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Handle form input change
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value,
        });
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validate passwords match
        if (formData.password !== formData.passwordConfirm) {
            setError('Пароли не совпадают');
            return;
        }

        setIsLoading(true);

        try {
            const result = await resetPassword(token, formData.password, formData.passwordConfirm);
            if (result.success) {
                // Password was reset successfully, redirect to dashboard
                navigate('/');
            } else {
                setError(result.error || 'Ошибка при сбросе пароля');
            }
        } catch (err) {
            setError('Произошла ошибка при сбросе пароля');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-teal-50 px-4 py-12">
            <div className="mb-8 text-center">
                <Logo size={48} className="mx-auto" />
                <h1 className="mt-4 text-2xl font-bold text-slate-800">
                    Система Мониторинга Медицинских Отходов
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                    Создание нового пароля
                </p>
            </div>

            <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-sm">
                <div className="border-b border-slate-100 p-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-slate-800">Сброс пароля</h2>
                        <Link to="/login" className="flex items-center text-sm font-medium text-teal-600 hover:text-teal-700">
                            <ArrowLeft className="mr-1 h-4 w-4" />
                            Вернуться ко входу
                        </Link>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                        Введите новый пароль для вашей учетной записи
                    </p>
                </div>

                <div className="p-6">
                    {/* Error message */}
                    {error && (
                        <div className="mb-4 flex items-center rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                            <AlertCircle className="mr-2 h-4 w-4" />
                            <p>{error}</p>
                        </div>
                    )}

                    {/* Token invalid message */}
                    {!token && (
                        <div className="mb-4 flex items-center rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-600">
                            <AlertCircle className="mr-2 h-4 w-4" />
                            <p>Недействительная или отсутствующая ссылка для сброса пароля. Пожалуйста, запросите новую.</p>
                        </div>
                    )}

                    {/* Reset password form */}
                    {token && (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* New Password */}
                            <div>
                                <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
                                    Новый пароль
                                </label>
                                <div className="relative">
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="new-password"
                                        required
                                        value={formData.password}
                                        onChange={handleChange}
                                        className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                                        minLength={8}
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
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
                                    <input
                                        id="passwordConfirm"
                                        name="passwordConfirm"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="new-password"
                                        required
                                        value={formData.passwordConfirm}
                                        onChange={handleChange}
                                        className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                                    />
                                </div>
                            </div>

                            {/* Submit button */}
                            <Button
                                type="submit"
                                color="teal"
                                fullWidth
                                isLoading={isLoading}
                            >
                                <Key className="mr-2 h-4 w-4" />
                                Сбросить пароль
                            </Button>
                        </form>
                    )}

                    {/* Request new link */}
                    <div className="mt-4 text-center">
                        <p className="text-sm text-slate-600">
                            Ссылка недействительна?{' '}
                            <Link to="/forgot-password" className="font-medium text-teal-600 hover:text-teal-700">
                                Запросить новую
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;