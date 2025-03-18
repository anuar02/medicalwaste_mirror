// pages/auth/Register.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, UserPlus, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import Logo from '../../components/ui/Logo';

const Register = () => {
    const navigate = useNavigate();
    const { register } = useAuth();

    // Form state
    const [formData, setFormData] = useState({
        username: '',
        email: '',
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
            const result = await register({
                username: formData.username,
                email: formData.email,
                password: formData.password,
                passwordConfirm: formData.passwordConfirm
            });

            if (!result.success) {
                setError(result.error || 'Ошибка при регистрации');
            }
        } catch (err) {
            setError('Произошла ошибка при попытке регистрации');
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
                    Создание новой учетной записи
                </p>
            </div>

            <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-sm">
                <div className="border-b border-slate-100 p-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-slate-800">Регистрация</h2>
                        <Link to="/login" className="flex items-center text-sm font-medium text-teal-600 hover:text-teal-700">
                            <ArrowLeft className="mr-1 h-4 w-4" />
                            Вернуться ко входу
                        </Link>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                        Заполните форму для создания аккаунта
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

                    {/* Registration form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Username */}
                        <div>
                            <label htmlFor="username" className="mb-1 block text-sm font-medium text-slate-700">
                                Имя пользователя
                            </label>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                autoComplete="username"
                                required
                                value={formData.username}
                                onChange={handleChange}
                                className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                                placeholder="username"
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
                                Email
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={formData.email}
                                onChange={handleChange}
                                className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                                placeholder="your.email@example.com"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
                                Пароль
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
                                Подтвердите пароль
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
                            <UserPlus className="mr-2 h-4 w-4" />
                            Зарегистрироваться
                        </Button>

                        {/* Login link */}
                        <div className="mt-4 text-center">
                            <p className="text-sm text-slate-600">
                                Уже есть аккаунт?{' '}
                                <Link to="/login" className="font-medium text-teal-600 hover:text-teal-700">
                                    Войти
                                </Link>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Register;