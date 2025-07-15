// pages/auth/Login.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, LogIn, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, getGoogleAuthUrl, handleGoogleCallback, googleLogin } = useAuth();

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

    // Check for Google OAuth code in URL
    useEffect(() => {
        const processGoogleCallback = async () => {
            const urlParams = new URLSearchParams(location.search);
            const code = urlParams.get('code');

            if (code) {
                console.log('Google OAuth code detected:', code);
                setIsGoogleLoading(true);
                setError('');

                try {
                    // Clear the URL parameters to prevent reprocessing on page reload
                    window.history.replaceState({}, document.title, window.location.pathname);

                    // Call the callback handler from your AuthContext
                    console.log('Calling handleGoogleCallback with code');
                    const result = await handleGoogleCallback(code);
                    console.log('Google callback result:', result);

                    if (result && result.success) {
                        toast.success('Успешный вход через Google!');
                        navigate('/');
                    } else {
                        const errorMsg = result?.error || 'Ошибка при входе через Google';
                        setError(errorMsg);
                        toast.error(errorMsg);
                    }
                } catch (err) {
                    console.error('Error processing Google OAuth callback:', err);
                    setError('Произошла ошибка при обработке Google авторизации');
                    toast.error('Ошибка при входе через Google');
                } finally {
                    setIsGoogleLoading(false);
                }
            }
        };

        processGoogleCallback();
    }, [location.search, navigate, handleGoogleCallback]);

    // Initialize Google Sign-In SDK
    useEffect(() => {
        // Load Google Sign-In SDK if it's not already loaded
        const loadGoogleScript = () => {
            // Skip if already loaded
            if (document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
                initializeGoogleOneTap();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.onload = initializeGoogleOneTap;
            document.body.appendChild(script);
        };

        const initializeGoogleOneTap = () => {
            if (window.google && window.google.accounts) {
                window.google.accounts.id.initialize({
                    client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
                    callback: handleGoogleOneTapResponse,
                    auto_select: false
                });
            }
        };

        loadGoogleScript();
    }, []);

    // Handle Google One-Tap response
    const handleGoogleOneTapResponse = async (response) => {
        if (response.credential) {
            setIsGoogleLoading(true);
            try {
                // First check if the function exists in your auth context
                if (typeof googleLogin !== 'function') {
                    console.error('googleLogin is not defined in the auth context');
                    throw new Error('Не удалось выполнить вход через Google');
                }

                const result = await googleLogin(response.credential);
                if (result.success) {
                    navigate('/');
                } else {
                    setError(result.error || 'Ошибка при входе через Google');
                }
            } catch (err) {
                setError(err.message || 'Произошла ошибка при попытке входа через Google');
                console.error(err);
            } finally {
                setIsGoogleLoading(false);
            }
        }
    };

    // Handle Google OAuth callback
    const handleGoogleOAuthCallback = async (code) => {
        setIsGoogleLoading(true);
        setError('');

        try {
            // Remove code from URL to avoid reprocessing on reload
            window.history.replaceState({}, document.title, window.location.pathname);

            // First check if the function exists in your auth context
            if (typeof handleGoogleCallback !== 'function') {
                console.error('handleGoogleCallback is not defined in the auth context');
                throw new Error('Не удалось обработать ответ от Google');
            }

            const result = await handleGoogleCallback(code);
            if (result.success) {
                navigate('/');
            } else {
                setError(result.error || 'Ошибка при входе через Google');
            }
        } catch (err) {
            console.error('Google callback error:', err);
            setError(err.message || 'Произошла ошибка при обработке ответа от Google');
        } finally {
            setIsGoogleLoading(false);
        }
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        setIsGoogleLoading(true);
        setError('');

        try {
            // Call your AuthContext method with the ID token
            const result = await googleLogin(credentialResponse.credential);

            if (result && result.success) {
                toast.success('Успешный вход через Google!');
                navigate('/');
            } else {
                setError(result?.error || 'Ошибка при входе через Google');
            }
        } catch (err) {
            console.error('Google login error:', err);
            setError('Произошла ошибка при входе через Google');
        } finally {
            setIsGoogleLoading(false);
        }
    };

    const handleGoogleError = () => {
        setError('Произошла ошибка при авторизации через Google');
        toast.error('Ошибка при входе через Google');
    };

    // Handle Google Sign-In button click
    const handleGoogleSignIn = async () => {
        try {
            // Redirect directly to Google OAuth
            const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.REACT_APP_GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent('http://13.48.178.39:8080/login')}&response_type=code&scope=email%20profile%20openid&access_type=offline&prompt=consent`;

            window.location.href = googleAuthUrl;
        } catch (err) {
            console.error('Google auth error:', err);
            setError('Ошибка при подключении к Google');
        }
    };

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
                // Success redirect handled in login method
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

                        {/* Google Sign-In button */}
                        <div className="mt-6">
                            <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
                                <div className="flex justify-center">
                                    <GoogleLogin
                                        onSuccess={handleGoogleSuccess}
                                        onError={handleGoogleError}
                                        text="signin_with"
                                        shape="rectangular"
                                        width="100%"
                                        locale="ru"
                                        theme="outline"
                                        logo_alignment="center"
                                    />
                                </div>
                            </GoogleOAuthProvider>
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