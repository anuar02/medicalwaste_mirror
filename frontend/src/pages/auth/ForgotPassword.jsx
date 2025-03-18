// pages/auth/ForgotPassword.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, AlertCircle, ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import Logo from '../../components/ui/Logo';

const ForgotPassword = () => {
    // Form and UI state
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Get auth context
    const { forgotPassword } = useAuth();

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess(false);
        setIsLoading(true);

        try {
            const result = await forgotPassword(email);
            if (result.success) {
                setSuccess(true);
            } else {
                setError(result.error || 'Не удалось отправить инструкции по сбросу пароля');
            }
        } catch (err) {
            setError('Произошла ошибка при попытке сброса пароля');
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
                    Восстановление доступа к аккаунту
                </p>
            </div>

            <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-sm">
                <div className="border-b border-slate-100 p-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-slate-800">Забыли пароль?</h2>
                        <Link to="/login" className="flex items-center text-sm font-medium text-teal-600 hover:text-teal-700">
                            <ArrowLeft className="mr-1 h-4 w-4" />
                            Вернуться ко входу
                        </Link>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                        Введите ваш email для получения инструкций по сбросу пароля
                    </p>
                </div>

                <div className="p-6">
                    {/* Success message */}
                    {success && (
                        <div className="mb-4 flex items-center rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-600">
                            <CheckCircle className="mr-2 h-4 w-4" />
                            <p>Инструкции по сбросу пароля отправлены на ваш email. Пожалуйста, проверьте вашу почту.</p>
                        </div>
                    )}

                    {/* Error message */}
                    {error && (
                        <div className="mb-4 flex items-center rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                            <AlertCircle className="mr-2 h-4 w-4" />
                            <p>{error}</p>
                        </div>
                    )}

                    {/* Reset password form */}
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
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                                placeholder="your.email@example.com"
                            />
                        </div>

                        {/* Submit button */}
                        <Button
                            type="submit"
                            color="teal"
                            fullWidth
                            isLoading={isLoading}
                            disabled={success}
                        >
                            <Mail className="mr-2 h-4 w-4" />
                            Отправить инструкции
                        </Button>

                        {/* Login link */}
                        <div className="mt-4 text-center">
                            <p className="text-sm text-slate-600">
                                Вспомнили пароль?{' '}
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

export default ForgotPassword;