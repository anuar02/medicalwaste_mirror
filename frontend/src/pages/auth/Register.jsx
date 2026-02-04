// pages/auth/Register.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, UserPlus, AlertCircle, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';

const Register = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { register } = useAuth();

    // Form state
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        passwordConfirm: '',
    });

    // Validation state
    const [validation, setValidation] = useState({
        username: { isValid: false, message: '', touched: false },
        email: { isValid: false, message: '', touched: false },
        password: { isValid: false, message: '', touched: false },
        passwordConfirm: { isValid: false, message: '', touched: false },
    });

    // Password strength state
    const [passwordStrength, setPasswordStrength] = useState({
        score: 0,
        hasMinLength: false,
        hasLowerCase: false,
        hasUpperCase: false,
        hasNumber: false,
        hasSpecial: false,
    });

    // UI state
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [formSubmitted, setFormSubmitted] = useState(false);

    // Validate form data based on rules
    useEffect(() => {
        // Username validation
        const usernameValidation = {
            isValid: false,
            message: '',
            touched: validation.username.touched,
        };

        if (formData.username) {
            if (formData.username.length < 3 || formData.username.length > 30) {
                usernameValidation.message = t('register.usernameLength');
            } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.username)) {
                usernameValidation.message = t('register.usernameChars');
            } else {
                usernameValidation.isValid = true;
            }
        } else if (validation.username.touched) {
            usernameValidation.message = t('register.usernameRequired');
        }

        // Email validation
        const emailValidation = {
            isValid: false,
            message: '',
            touched: validation.email.touched,
        };

        if (formData.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.email)) {
                emailValidation.message = t('register.emailInvalid');
            } else {
                emailValidation.isValid = true;
            }
        } else if (validation.email.touched) {
            emailValidation.message = t('register.emailRequired');
        }

        // Check password strength
        const passwordChecks = {
            hasMinLength: formData.password.length >= 8,
            hasLowerCase: /[a-z]/.test(formData.password),
            hasUpperCase: /[A-Z]/.test(formData.password),
            hasNumber: /[0-9]/.test(formData.password),
            hasSpecial: /[@$!%*?&]/.test(formData.password),
        };

        const passwordScore = Object.values(passwordChecks).filter(Boolean).length;

        setPasswordStrength({
            ...passwordChecks,
            score: passwordScore,
        });

        // Password validation
        const passwordValidation = {
            isValid: false,
            message: '',
            touched: validation.password.touched,
        };

        if (formData.password) {
            if (formData.password.length < 8) {
                passwordValidation.message = t('register.passwordMin');
            } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(formData.password)) {
                passwordValidation.message = t('register.passwordPolicy');
            } else {
                passwordValidation.isValid = true;
            }
        } else if (validation.password.touched) {
            passwordValidation.message = t('register.passwordRequired');
        }

        // Password confirmation validation
        const passwordConfirmValidation = {
            isValid: false,
            message: '',
            touched: validation.passwordConfirm.touched,
        };

        if (formData.passwordConfirm) {
            if (formData.password !== formData.passwordConfirm) {
                passwordConfirmValidation.message = t('register.passwordMismatch');
            } else {
                passwordConfirmValidation.isValid = true;
            }
        } else if (validation.passwordConfirm.touched) {
            passwordConfirmValidation.message = t('register.passwordConfirmRequired');
        }

        setValidation({
            username: usernameValidation,
            email: emailValidation,
            password: passwordValidation,
            passwordConfirm: passwordConfirmValidation,
        });
    }, [formData, validation.username.touched, validation.email.touched, validation.password.touched, validation.passwordConfirm.touched]);

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
            const result = await register({
                username: formData.username,
                email: formData.email,
                password: formData.password,
                passwordConfirm: formData.passwordConfirm
            });

            if (!result.success) {
                setError(result.error || t('register.error'));
            } else {
                // Success animation or redirect
                navigate('/');
            }
        } catch (err) {
            setError(t('register.tryError'));
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    // Get input status class
    const getInputStatusClass = (fieldName) => {
        if (!validation[fieldName].touched) return '';
        return validation[fieldName].isValid
            ? 'border-green-500 focus:border-green-500 focus:ring-green-500'
            : 'border-red-500 focus:border-red-500 focus:ring-red-500';
    };

    return (
        <div className="flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-teal-50 px-4">
            <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl">
                <div className="border-b border-slate-100 p-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-slate-800">{t('register.title')}</h2>
                        <Link to="/login" className="flex items-center text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors">
                            <ArrowLeft className="mr-1 h-4 w-4" />
                            {t('register.backToLogin')}
                        </Link>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                        {t('register.subtitle')}
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

                    {/* Registration form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Username */}
                        <div>
                            <label htmlFor="username" className="mb-1 block text-sm font-medium text-slate-700">
                                {t('register.username')}
                            </label>
                            <div className="relative">
                                <input
                                    id="username"
                                    name="username"
                                    type="text"
                                    autoComplete="username"
                                    required
                                    value={formData.username}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    className={`block w-full rounded-lg border px-3 py-2 text-slate-700 focus:ring-teal-500 pr-10 transition-all duration-200 ${getInputStatusClass('username')}`}
                                    placeholder="username"
                                />
                                {validation.username.touched && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        {validation.username.isValid ? (
                                            <CheckCircle className="h-5 w-5 text-green-500" />
                                        ) : (
                                            <XCircle className="h-5 w-5 text-red-500" />
                                        )}
                                    </div>
                                )}
                            </div>
                            {validation.username.touched && !validation.username.isValid && (
                                <p className="mt-1 text-xs text-red-500">{validation.username.message}</p>
                            )}
                        </div>

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
                                {t('register.password')}
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
                                    onBlur={handleBlur}
                                    className={`block w-full rounded-lg border px-3 py-2 text-slate-700 focus:ring-teal-500 pr-10 transition-all duration-200 ${getInputStatusClass('password')}`}
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
                            {validation.password.touched && !validation.password.isValid && (
                                <p className="mt-1 text-xs text-red-500">{validation.password.message}</p>
                            )}

                            {/* Password strength meter */}
                            {formData.password && (
                                <div className="mt-2">
                                    <div className="flex justify-between mb-1">
                                        <span className="text-xs font-medium text-slate-600">Надежность пароля</span>
                                        <span className="text-xs font-medium text-slate-600">
                                            {passwordStrength.score === 0 && "Очень слабый"}
                                            {passwordStrength.score === 1 && "Слабый"}
                                            {passwordStrength.score === 2 && "Средний"}
                                            {passwordStrength.score === 3 && "Хороший"}
                                            {passwordStrength.score === 4 && "Сильный"}
                                            {passwordStrength.score === 5 && "Отличный"}
                                        </span>
                                    </div>
                                    <div className="flex w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className={`h-1.5 transition-all duration-300 ${
                                                passwordStrength.score <= 1 ? 'bg-red-500' :
                                                    passwordStrength.score <= 2 ? 'bg-orange-500' :
                                                        passwordStrength.score <= 3 ? 'bg-yellow-500' :
                                                            'bg-green-500'
                                            }`}
                                            style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                                        ></div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        <div className="flex items-center text-xs">
                                            <div className={`h-3 w-3 rounded-full mr-1 ${passwordStrength.hasMinLength ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                            <span className={passwordStrength.hasMinLength ? 'text-green-700' : 'text-gray-500'}>Минимум 8 символов</span>
                                        </div>
                                        <div className="flex items-center text-xs">
                                            <div className={`h-3 w-3 rounded-full mr-1 ${passwordStrength.hasLowerCase ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                            <span className={passwordStrength.hasLowerCase ? 'text-green-700' : 'text-gray-500'}>Строчные буквы</span>
                                        </div>
                                        <div className="flex items-center text-xs">
                                            <div className={`h-3 w-3 rounded-full mr-1 ${passwordStrength.hasUpperCase ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                            <span className={passwordStrength.hasUpperCase ? 'text-green-700' : 'text-gray-500'}>Заглавные буквы</span>
                                        </div>
                                        <div className="flex items-center text-xs">
                                            <div className={`h-3 w-3 rounded-full mr-1 ${passwordStrength.hasNumber ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                            <span className={passwordStrength.hasNumber ? 'text-green-700' : 'text-gray-500'}>Цифры</span>
                                        </div>
                                        <div className="flex items-center text-xs">
                                            <div className={`h-3 w-3 rounded-full mr-1 ${passwordStrength.hasSpecial ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                            <span className={passwordStrength.hasSpecial ? 'text-green-700' : 'text-gray-500'}>Спец. символы</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label htmlFor="passwordConfirm" className="mb-1 block text-sm font-medium text-slate-700">
                                {t('register.passwordConfirm')}
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
                                    onBlur={handleBlur}
                                    className={`block w-full rounded-lg border px-3 py-2 text-slate-700 focus:ring-teal-500 pr-10 transition-all duration-200 ${getInputStatusClass('passwordConfirm')}`}
                                />
                                {validation.passwordConfirm.touched && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        {validation.passwordConfirm.isValid ? (
                                            <CheckCircle className="h-5 w-5 text-green-500" />
                                        ) : (
                                            <XCircle className="h-5 w-5 text-red-500" />
                                        )}
                                    </div>
                                )}
                            </div>
                            {validation.passwordConfirm.touched && !validation.passwordConfirm.isValid && (
                                <p className="mt-1 text-xs text-red-500">{validation.passwordConfirm.message}</p>
                            )}
                        </div>

                        {/* Terms and conditions */}
                        <div className="flex items-start">
                            <div className="flex items-center h-5">
                                <input
                                    id="terms"
                                    name="terms"
                                    type="checkbox"
                                    required
                                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                />
                            </div>
                            <div className="ml-2 text-sm">
                                <label htmlFor="terms" className="text-slate-600">
                                    Я согласен с <a href="/terms" className="font-medium text-teal-600 hover:text-teal-700">Условиями использования</a> и <a href="/privacy" className="font-medium text-teal-600 hover:text-teal-700">Политикой конфиденциальности</a>
                                </label>
                            </div>
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
                            <UserPlus className="mr-2 h-4 w-4" />
                            {t('register.submit')}
                        </Button>

                        {/* Login link */}
                        <div className="mt-4 text-center">
                            <p className="text-sm text-slate-600">
                                {t('register.haveAccount')}{' '}
                                <Link to="/login" className="font-medium text-teal-600 hover:text-teal-700 transition-colors">
                                    {t('register.login')}
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
