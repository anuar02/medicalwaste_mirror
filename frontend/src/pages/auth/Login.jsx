// pages/auth/Login.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
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

    // Validation state
    const [validation, setValidation] = useState({
        email: { isValid: false, message: '', touched: false },
        password: { isValid: false, message: '', touched: false },
    });

    // UI state
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [formSubmitted, setFormSubmitted] = useState(false);

    // Validate form data based on rules
    useEffect(() => {
        // Email validation
        const emailValidation = {
            isValid: false,
            message: '',
            touched: validation.email.touched,
        };

        if (formData.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.email)) {
                emailValidation.message = 'Пожалуйста, введите корректный email';
            } else {
                emailValidation.isValid = true;
            }
        } else if (validation.email.touched) {
            emailValidation.message = 'Email обязателен';
        }

        // Password validation
        const passwordValidation = {
            isValid: false,
            message: '',
            touched: validation.password.touched,
        };

        if (formData.password) {
            if (formData.password.length < 1) {
                passwordValidation.message = 'Пароль обязателен';
            } else {
                passwordValidation.isValid = true;
            }
        } else if (validation.password.touched) {
            passwordValidation.message = 'Пароль обязателен';
        }

        setValidation({
            email: emailValidation,
            password: passwordValidation,
        });
    }, [formData, validation.email.touched, validation.password.touched]);

    // Check if form is valid
    const isFormValid = () => {
        return Object.values(validation).every(field => field.isValid);
    };

    // Handle form input change
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value,
        });
    };

    // Handle input blur to mark field as touched
    const handleBlur = (e) => {
        const { name } = e.target;
        setValidation({
            ...validation,
            [name]: {
                ...validation[name],
                touched: true,
            },
        });
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setFormSubmitted(true);

        // Update all fields as touched
        const touchedValidation = Object.keys(validation).reduce((acc, key) => {
            acc[key] = {
                ...validation[key],
                touched: true,
            };
            return acc;
        }, {});

        setValidation(touchedValidation);

        // Check if form is valid
        if (!isFormValid()) {
            return;
        }

        setIsLoading(true);

        try {
            // Pass email and password directly
            const result = await login(formData.email, formData.password);
            if (!result.success) {
                setError(result.error || 'Ошибка авторизации');
            } else {
                // Success redirect
                navigate('/dashboard');
            }
        } catch (err) {
            setError('Произошла ошибка при попытке входа');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    // Get input status class
    const getInputStatusClass = (fieldName) => {
        if (!validation[fieldName].touched) return 'border-slate-200';
        return validation[fieldName].isValid
            ? 'border-green-500 focus:border-green-500 focus:ring-green-500'
            : 'border-red-500 focus:border-red-500 focus:ring-red-500';
    };

    return (
        <div className="flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-teal-50 px-4">
            <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl">
                <div className="border-b border-slate-100 p-6">
                    <h2 className="text-xl font-semibold text-slate-800">Вход в систему</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Введите свои учетные данные для доступа
                    </p>
                </div>

                <div className="p-6">
                    {/* Error message */}
                    {error && (
                        <div className="mb-4 flex items-center rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 animate-fade-in">
                            <AlertCircle className="mr-2 h-4 w-4 flex-shrink-0" />
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
                            <div className="relative">
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    className={`block w-full rounded-lg border px-3 py-2 text-slate-700 focus:ring-teal-500 pr-10 transition-all duration-200 ${getInputStatusClass('email')}`}
                                    placeholder="your.email@example.com"
                                />
                                {validation.email.touched && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        {validation.email.isValid ? (
                                            <CheckCircle className="h-5 w-5 text-green-500" />
                                        ) : (
                                            <XCircle className="h-5 w-5 text-red-500" />
                                        )}
                                    </div>
                                )}
                            </div>
                            {validation.email.touched && !validation.email.isValid && (
                                <p className="mt-1 text-xs text-red-500">{validation.email.message}</p>
                            )}
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
                                    onBlur={handleBlur}
                                    className={`block w-full rounded-lg border px-3 py-2 text-slate-700 focus:ring-teal-500 pr-10 transition-all duration-200 ${getInputStatusClass('password')}`}
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex">
                                    {validation.password.touched && (
                                        validation.password.isValid ? (
                                            <CheckCircle className="h-5 w-5 text-green-500 mr-1" />
                                        ) : (
                                            <XCircle className="h-5 w-5 text-red-500 mr-1" />
                                        )
                                    )}
                                    <button
                                        type="button"
                                        className="text-slate-400 hover:text-slate-600 transition-colors"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                            {validation.password.touched && !validation.password.isValid && (
                                <p className="mt-1 text-xs text-red-500">{validation.password.message}</p>
                            )}
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
                            <Link to="/forgot-password" className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors">
                                Забыли пароль?
                            </Link>
                        </div>

                        {/* Submit button */}
                        <Button
                            type="submit"
                            color="teal"
                            fullWidth
                            isLoading={isLoading}
                            disabled={formSubmitted && !isFormValid()}
                            className="mt-6"
                        >
                            <LogIn className="mr-2 h-4 w-4" />
                            Войти
                        </Button>

                        {/* Divider with text */}
                        <div className="relative mt-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-200"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="bg-white px-2 text-slate-500">или продолжить с</span>
                            </div>
                        </div>

                        {/* Social logins */}
                        <div className="mt-6 grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                className="flex w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                            >
                                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                </svg>
                                Google
                            </button>
                            <button
                                type="button"
                                className="flex w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                            >
                                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M13.397 20.997v-8.196h2.765l.411-3.209h-3.176V7.548c0-.926.258-1.56 1.587-1.56h1.684V3.127A22.336 22.336 0 0014.201 3c-2.444 0-4.122 1.492-4.122 4.231v2.355H7.332v3.209h2.753v8.202h3.312z"/>
                                </svg>
                                Facebook
                            </button>
                        </div>

                        {/* Register link */}
                        <div className="mt-6 text-center">
                            <p className="text-sm text-slate-600">
                                Еще нет аккаунта?{' '}
                                <Link to="/register" className="font-medium text-teal-600 hover:text-teal-700 transition-colors">
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