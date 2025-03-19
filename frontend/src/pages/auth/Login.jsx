// pages/auth/Login.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import Logo from '../../components/ui/Logo';

const Login = () => {
    const navigate = useNavigate();
    const { login } = useAuth();

    // Form state
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });

    // UI state
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
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
        setIsLoading(true);

        try {
            // Pass email and password directly (not the entire formData object)
            const result = await login(formData.email, formData.password);
            if (!result.success) {
                setError(result.error || 'Ошибка авторизации');
            }
        } catch (err) {
            setError('Произошла ошибка при попытке входа');
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
                    Вход в панель управления и мониторинга
                </p>
            </div>

            <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-sm">
                <div className="border-b border-slate-100 p-6">
                    <h2 className="text-xl font-semibold text-slate-800">Вход в систему</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Введите свои учетные данные для доступа
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

                    {/* Login form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
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
                                    autoComplete="current-password"
                                    required
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Remember me & Forgot password */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <input
                                    id="remember-me"
                                    name="remember-me"
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={() => setRememberMe(!rememberMe)}
                                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                />
                                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-600">
                                    Запомнить меня
                                </label>
                            </div>
                            <Link to="/forgot-password" className="text-sm font-medium text-teal-600 hover:text-teal-700">
                                Забыли пароль?
                            </Link>
                        </div>

                        {/* Submit button */}
                        <Button
                            type="submit"
                            color="teal"
                            fullWidth
                            isLoading={isLoading}
                        >
                            <LogIn className="mr-2 h-4 w-4" />
                            Войти
                        </Button>

                        {/* Register link */}
                        <div className="mt-4 text-center">
                            <p className="text-sm text-slate-600">
                                Еще нет аккаунта?{' '}
                                <Link to="/register" className="font-medium text-teal-600 hover:text-teal-700">
                                    Зарегистрироваться
                                </Link>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;