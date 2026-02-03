// pages/auth/Login.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

const Login = () => {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const { login, googleLogin } = useAuth();

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
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [error, setError] = useState('');
    const [formSubmitted, setFormSubmitted] = useState(false);

    // Environment validation
    const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;

    useEffect(() => {
        if (!googleClientId) {
            console.error('Google Client ID is not configured');
            setError(t('login.googleNotConfigured'));
        }
    }, [googleClientId, t]);

    // Validate form data
    useEffect(() => {
        const newValidation = { ...validation };

        // Email validation
        if (formData.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.email)) {
                newValidation.email = {
                    ...newValidation.email,
                    isValid: false,
                    message: t('login.emailInvalid')
                };
            } else {
                newValidation.email = {
                    ...newValidation.email,
                    isValid: true,
                    message: ''
                };
            }
        } else if (newValidation.email.touched) {
            newValidation.email = {
                ...newValidation.email,
                isValid: false,
                message: t('login.emailRequired')
            };
        }

        // Password validation
        if (formData.password) {
            if (formData.password.length < 6) {
                newValidation.password = {
                    ...newValidation.password,
                    isValid: false,
                    message: t('login.passwordMin')
                };
            } else {
                newValidation.password = {
                    ...newValidation.password,
                    isValid: true,
                    message: ''
                };
            }
        } else if (newValidation.password.touched) {
            newValidation.password = {
                ...newValidation.password,
                isValid: false,
                message: t('login.passwordRequired')
            };
        }

        setValidation(newValidation);
    }, [formData.email, formData.password, validation.email.touched, validation.password.touched]);

    // Utility functions
    const handleError = (message) => {
        toast.error(message);
    };

    const handleSuccess = (message) => {
        navigate('/');
    };

    const isFormValid = () => {
        return validation.email.isValid && validation.password.isValid;
    };

    const getInputStatusClass = (fieldName) => {
        if (!validation[fieldName].touched) return 'border-slate-200';
        return validation[fieldName].isValid
            ? 'border-green-500 focus:border-green-500 focus:ring-green-500'
            : 'border-red-500 focus:border-red-500 focus:ring-red-500';
    };

    // Event handlers
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleBlur = (e) => {
        const { name } = e.target;
        setValidation(prev => ({
            ...prev,
            [name]: {
                ...prev[name],
                touched: true,
            },
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setFormSubmitted(true);

        // Mark all fields as touched
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
            const result = await login(formData.email, formData.password);

            if (result.success) {
                handleSuccess('Успешный вход в систему!');
            } else {
                handleError(result.error || 'Ошибка авторизации');
            }
        } catch (err) {
            console.error('Login error:', err);
            handleError('Произошла ошибка при попытке входа');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        setIsGoogleLoading(true);
        setError('');

        try {
            const result = await googleLogin(credentialResponse.credential);

            if (result && result.success) {
                handleSuccess('Успешный вход через Google!');
            } else {
                handleError(result?.error || 'Ошибка при входе через Google');
            }
        } catch (err) {
            console.error('Google login error:', err);
            handleError('Произошла ошибка при входе через Google');
        } finally {
            setIsGoogleLoading(false);
        }
    };

    const handleGoogleError = (error) => {
        console.error('Google login error:', error);
        handleError('Произошла ошибка при авторизации через Google');
    };

    return (
        <div className="flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-teal-50 px-4 py-8">
            <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl">
                {/* Header - Compact padding */}
                <div className="border-b border-slate-100 px-6 py-3">
                    <h2 className="text-xl font-semibold text-slate-800">{t('login.title')}</h2>
                    <p className="text-sm text-slate-500">
                        {t('login.subtitle')}
                    </p>
                </div>

                {/* Form container - Compact padding */}
                <div className="px-6 py-4">
                    {/* Error message */}
                    {error && (
                        <div className="mb-2 flex items-center rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 animate-fade-in">
                            <AlertCircle className="mr-2 h-4 w-4 flex-shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    {/* Login form - Compact spacing */}
                    <form onSubmit={handleSubmit} className="space-y-3">
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
                                {t('login.password')}
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
                                    placeholder={t('login.passwordPlaceholder')}
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                                    {validation.password.touched && (
                                        <div className="mr-2">
                                            {validation.password.isValid ? (
                                                <CheckCircle className="h-5 w-5 text-green-500" />
                                            ) : (
                                                <XCircle className="h-5 w-5 text-red-500" />
                                            )}
                                        </div>
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

                        {/* Remember me & Forgot password - Compact */}
                        <div className="flex items-center justify-between py-1">
                            <div className="flex items-center">
                                <input
                                    id="remember-me"
                                    name="remember-me"
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                />
                                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-600">
                                    {t('login.rememberMe')}
                                </label>
                            </div>
                            <Link
                                to="/forgot-password"
                                className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
                            >
                                {t('login.forgotPassword')}
                            </Link>
                        </div>

                        {/* Submit button - Compact margin */}
                        <Button
                            type="submit"
                            color="teal"
                            fullWidth
                            isLoading={isLoading}
                            disabled={formSubmitted && !isFormValid()}
                            className="!mt-3"
                        >
                            <LogIn className="mr-2 h-4 w-4" />
                            {t('login.submit')}
                        </Button>

                        {/* Google Sign-In */}
                        {googleClientId && (
                            <>
                                {/* Divider - Compact margin */}
                                <div className="relative mt-3">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-slate-200"></div>
                                    </div>
                                    <div className="relative flex justify-center text-sm">
                                        <span className="bg-white px-2 text-slate-500">{t('login.orContinueWith')}</span>
                                    </div>
                                </div>

                                {/* Google Login Button - Compact margin */}
                                <div className="mt-3">
                                    <GoogleOAuthProvider clientId={googleClientId}>
                                        <div className="flex justify-center">
                                            <GoogleLogin
                                                onSuccess={handleGoogleSuccess}
                                                onError={handleGoogleError}
                                                text="signin_with"
                                                shape="rectangular"
                                                width="100%"
                                                locale={i18n.language?.startsWith('ru') ? 'ru' : 'en'}
                                                theme="outline"
                                                logo_alignment="center"
                                                disabled={isGoogleLoading}
                                            />
                                        </div>
                                    </GoogleOAuthProvider>
                                </div>
                            </>
                        )}

                        {/* Register link - Compact margin */}
                        <div className="mt-3 text-center">
                            <p className="text-sm text-slate-600">
                                {t('login.noAccount')}{' '}
                                <Link
                                    to="/register"
                                    className="font-medium text-teal-600 hover:text-teal-700 transition-colors"
                                >
                                    {t('login.register')}
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
