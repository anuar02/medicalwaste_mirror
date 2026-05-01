// pages/auth/Login.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    AlertCircle, BarChart3, Eye, EyeOff,
    LockKeyhole, Mail, MapPin, MessageCircle, Phone, ShieldCheck, Zap,
} from 'lucide-react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';

// ─── helpers ─────────────────────────────────────────────────────────────────

const normalizePhoneInput = (value) => {
    const cleaned = String(value || '').replace(/[^\d+]/g, '');
    if (!cleaned) return '+7';
    if (cleaned.startsWith('+')) return cleaned;
    return `+${cleaned}`;
};

const isValidPhone = (value) => /^\+[1-9]\d{6,14}$/.test(String(value || '').trim());

// ─── IoT network SVG ─────────────────────────────────────────────────────────

const HUB = { x: 215, y: 192 };
const OUTER_NODES = [
    { x: 78,  y: 78  },
    { x: 215, y: 48  },
    { x: 348, y: 78  },
    { x: 375, y: 205 },
    { x: 295, y: 310 },
    { x: 135, y: 310 },
    { x: 55,  y: 205 },
];
const EXTRA_EDGES = [
    [0, 1], [2, 3], [4, 5],
];

function IotNetworkSVG() { return (
    <svg viewBox="0 0 430 370" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        {/* Spoke edges hub → outer */}
        {OUTER_NODES.map((n, i) => (
            <line
                key={`spoke-${i}`}
                x1={HUB.x} y1={HUB.y} x2={n.x} y2={n.y}
                stroke="rgba(20,184,166,0.2)" strokeWidth="1.5" strokeDasharray="4 5"
            />
        ))}

        {/* Extra ring edges */}
        {EXTRA_EDGES.map(([a, b], i) => (
            <line
                key={`ring-${i}`}
                x1={OUTER_NODES[a].x} y1={OUTER_NODES[a].y}
                x2={OUTER_NODES[b].x} y2={OUTER_NODES[b].y}
                stroke="rgba(20,184,166,0.12)" strokeWidth="1" strokeDasharray="3 6"
            />
        ))}

        {/* Traveling dots along spokes */}
        {OUTER_NODES.map((n, i) => (
            <circle key={`dot-out-${i}`} r="2.5" fill="#2dd4bf" opacity="0.85">
                <animateMotion
                    dur={`${2.2 + i * 0.35}s`}
                    repeatCount="indefinite"
                    begin={`${i * 0.45}s`}
                    path={`M${HUB.x},${HUB.y} L${n.x},${n.y}`}
                />
            </circle>
        ))}
        {OUTER_NODES.map((n, i) => (
            <circle key={`dot-in-${i}`} r="2" fill="#5eead4" opacity="0.6">
                <animateMotion
                    dur={`${2.8 + i * 0.3}s`}
                    repeatCount="indefinite"
                    begin={`${1.1 + i * 0.4}s`}
                    path={`M${n.x},${n.y} L${HUB.x},${HUB.y}`}
                />
            </circle>
        ))}

        {/* Outer nodes */}
        {OUTER_NODES.map((n, i) => (
            <g key={`node-${i}`}>
                <circle cx={n.x} cy={n.y} r="13" fill="rgba(20,184,166,0.06)" stroke="rgba(20,184,166,0.25)" strokeWidth="1">
                    <animate
                        attributeName="r" values="12;19;12"
                        dur={`${2.4 + i * 0.28}s`} repeatCount="indefinite"
                        begin={`${i * 0.3}s`}
                    />
                    <animate
                        attributeName="opacity" values="0.35;0;0.35"
                        dur={`${2.4 + i * 0.28}s`} repeatCount="indefinite"
                        begin={`${i * 0.3}s`}
                    />
                </circle>
                <circle cx={n.x} cy={n.y} r="7" fill="rgba(51,65,85,0.6)" stroke="rgba(20,184,166,0.6)" strokeWidth="1.5" />
                <circle cx={n.x} cy={n.y} r="3" fill="#14b8a6" />
            </g>
        ))}

        {/* Hub */}
        <circle cx={HUB.x} cy={HUB.y} r="22" fill="rgba(20,184,166,0.08)" stroke="rgba(20,184,166,0.2)" strokeWidth="1">
            <animate attributeName="r" values="20;30;20" dur="3s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.4;0;0.4" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle cx={HUB.x} cy={HUB.y} r="13" fill="rgba(20,184,166,0.15)" stroke="#14b8a6" strokeWidth="1.5" />
        <circle cx={HUB.x} cy={HUB.y} r="6" fill="#2dd4bf" />
    </svg>
); }

// ─── stat pill ────────────────────────────────────────────────────────────────

const FEATURES = [
    { Icon: Zap,       label: 'IoT мониторинг' },
    { Icon: MapPin,    label: 'GPS маршруты' },
    { Icon: BarChart3, label: 'Аналитика' },
];

// ─── main component ───────────────────────────────────────────────────────────

export default function Login() {
    const { i18n } = useTranslation();
    const { login, startPhoneLogin, verifyPhoneLogin, googleLogin } = useAuth();

    const [mode, setMode]               = useState('phone');
    const [phoneNumber, setPhoneNumber] = useState('+7');
    const [code, setCode]               = useState('');
    const [codeSent, setCodeSent]       = useState(false);
    const [email, setEmail]             = useState('');
    const [password, setPassword]       = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe]   = useState(false);
    const [isLoading, setIsLoading]     = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [error, setError]             = useState('');

    const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;

    useEffect(() => {
        setError('');
        setCode('');
        setCodeSent(false);
    }, [mode]);

    const isPhoneStepValid = useMemo(
        () => isValidPhone(phoneNumber) && (!codeSent || code.trim().length >= 4),
        [phoneNumber, codeSent, code],
    );

    const isEmailFormValid = useMemo(
        () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && password.length >= 6,
        [email, password],
    );

    const handlePhoneSubmit = async () => {
        if (!isValidPhone(phoneNumber)) {
            setError('Введите телефон в формате +77051234567');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            if (!codeSent) {
                const result = await startPhoneLogin(phoneNumber.trim(), mode === 'whatsapp' ? 'whatsapp' : 'sms');
                if (result.success) setCodeSent(true);
                else setError(result.error || 'Не удалось отправить код');
                return;
            }
            const result = await verifyPhoneLogin(phoneNumber.trim(), code.trim());
            if (!result.success) setError(result.error || 'Неверный код подтверждения');
        } catch (err) {
            setError('Произошла ошибка при входе по телефону');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEmailSubmit = async () => {
        if (!isEmailFormValid) {
            setError('Введите корректный email и пароль');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const result = await login(email.trim(), password);
            if (!result.success) setError(result.error || 'Ошибка авторизации');
        } catch (err) {
            setError('Произошла ошибка при попытке входа');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (mode === 'phone' || mode === 'whatsapp') handlePhoneSubmit();
        else handleEmailSubmit();
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        setIsGoogleLoading(true);
        setError('');
        try {
            const result = await googleLogin(credentialResponse.credential);
            if (!result?.success) setError(result?.error || 'Ошибка при входе через Google');
        } catch (err) {
            setError('Произошла ошибка при входе через Google');
            console.error(err);
        } finally {
            setIsGoogleLoading(false);
        }
    };

    const handleGoogleError = (googleError) => {
        console.error('Google login error:', googleError);
        toast.error('Произошла ошибка при авторизации через Google');
    };

    // ── render ────────────────────────────────────────────────────────────────
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="flex w-full rounded-2xl overflow-hidden shadow-2xl shadow-black/20 border border-slate-200"
        >
            {/* ── LEFT PANEL ─────────────────────────────────────────────── */}
            <div className="hidden md:flex md:flex-col relative w-[45%] bg-gradient-to-br from-slate-700 via-slate-600 to-teal-600 p-10 overflow-hidden select-none">
                {/* ambient glow */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_80%_20%,rgba(20,184,166,0.2),transparent)]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_20%_80%,rgba(20,184,166,0.12),transparent)]" />

                {/* logo */}
                <motion.div
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                    className="relative flex items-center gap-3 mb-2"
                >
                    <div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center">
                        <ShieldCheck className="w-4.5 h-4.5 text-teal-400" style={{ width: 18, height: 18 }} />
                    </div>
                    <span className="text-white font-semibold tracking-tight">MedicalWaste.kz</span>
                </motion.div>

                {/* network */}
                <div className="relative flex-1 flex items-center justify-center -mx-4">
                    <IotNetworkSVG />
                </div>

                {/* tagline */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35, duration: 0.4 }}
                    className="relative mt-2"
                >
                    <h2 className="text-xl font-bold text-white leading-snug">
                        Мониторинг медицинских<br />отходов в реальном времени
                    </h2>
                    <p className="mt-2 text-xs leading-5 text-slate-400 max-w-xs">
                        IoT-платформа для безопасного управления сбором и утилизацией медицинских отходов в Казахстане.
                    </p>
                </motion.div>

                {/* feature pills */}
                <div className="relative mt-5 flex flex-wrap gap-2">
                    {FEATURES.map(({ Icon, label }, i) => (
                        <motion.div
                            key={label}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 + i * 0.1, duration: 0.3 }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300"
                        >
                            <Icon style={{ width: 12, height: 12 }} className="text-teal-400" />
                            {label}
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* ── RIGHT PANEL ────────────────────────────────────────────── */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.4 }}
                className="flex-1 bg-white flex flex-col justify-center px-8 py-10 sm:px-12"
            >
                {/* mobile logo */}
                <div className="md:hidden flex items-center gap-2 mb-8">
                    <ShieldCheck className="text-teal-400" style={{ width: 20, height: 20 }} />
                    <span className="font-chakra font-semibold text-teal-300 text-xs tracking-widest uppercase">MedicalWaste.kz</span>
                </div>

                <div className="mb-7">
                    <h2 className="font-chakra text-2xl font-bold text-slate-900 tracking-tight">Вход в систему</h2>
                    <p className="mt-1 text-sm text-slate-500">Выберите способ авторизации</p>
                </div>

                {/* tab switcher */}
                <div className="relative grid grid-cols-3 rounded-xl bg-slate-100 p-1 mb-6">
                    {/* sliding pill — always mounted, translates between positions */}
                    <motion.div
                        className="absolute top-1 bottom-1 left-1 rounded-lg bg-white shadow-sm pointer-events-none"
                        style={{ width: 'calc(33.333% - 4px)' }}
                        initial={false}
                        animate={{ x: mode === 'phone' ? '0%' : mode === 'whatsapp' ? '100%' : '200%' }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                    <button
                        type="button"
                        onClick={() => setMode('phone')}
                        className="relative flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium z-10 transition-colors duration-200"
                        style={{ color: mode === 'phone' ? '#0f172a' : '#94a3b8' }}
                    >
                        <Phone style={{ width: 15, height: 15 }} />
                        <span>Телефон</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('whatsapp')}
                        className="relative flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium z-10 transition-colors duration-200"
                        style={{ color: mode === 'whatsapp' ? '#0f172a' : '#94a3b8' }}
                    >
                        <MessageCircle style={{ width: 15, height: 15 }} />
                        <span>WhatsApp</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('email')}
                        className="relative flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium z-10 transition-colors duration-200"
                        style={{ color: mode === 'email' ? '#0f172a' : '#94a3b8' }}
                    >
                        <Mail style={{ width: 15, height: 15 }} />
                        <span>Email</span>
                    </button>
                </div>

                {/* error */}
                <AnimatePresence initial={false}>
                    {error && (
                        <motion.div
                            key="error"
                            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                            transition={{ duration: 0.22 }}
                            className="overflow-hidden"
                        >
                            <div className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
                                <AlertCircle style={{ width: 15, height: 15 }} className="flex-shrink-0 mt-0.5" />
                                <p>{error}</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <form onSubmit={handleSubmit} noValidate>
                    {/* form fields — both always mounted; inactive is absolute so it
                        never contributes to layout height, just fades out in place */}
                    <div className="relative">
                        {/* ── phone section ── */}
                        <div
                            className="space-y-4 transition-opacity duration-200"
                            style={{
                                opacity: mode === 'phone' || mode === 'whatsapp' ? 1 : 0,
                                pointerEvents: mode === 'phone' || mode === 'whatsapp' ? 'auto' : 'none',
                                position: mode === 'phone' || mode === 'whatsapp' ? 'relative' : 'absolute',
                                top: 0, left: 0, right: 0,
                            }}
                        >
                            <div>
                                <label htmlFor="phoneNumber" className="text-sm font-medium text-slate-700 mb-1.5 block">
                                    Номер телефона
                                </label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" style={{ width: 15, height: 15 }} />
                                    <input
                                        id="phoneNumber"
                                        type="tel"
                                        autoComplete="tel"
                                        disabled={mode === 'email'}
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(normalizePhoneInput(e.target.value))}
                                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/25 focus:border-teal-500 transition-all placeholder:text-slate-300"
                                        placeholder="+77051234567"
                                    />
                                </div>
                                <p className="mt-1.5 text-xs text-slate-400">
                                    {mode === 'whatsapp'
                                        ? 'Код будет отправлен на этот номер WhatsApp.'
                                        : 'Используйте номер, указанный при регистрации.'}
                                </p>
                            </div>

                            <AnimatePresence initial={false}>
                                {codeSent && (
                                    <motion.div
                                        key="otp-block"
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.22 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="pt-1 space-y-3">
                                            <div>
                                                <label htmlFor="code" className="text-sm font-medium text-slate-700 mb-1.5 block">
                                                    {mode === 'whatsapp' ? 'Код из WhatsApp' : 'SMS-код'}
                                                </label>
                                                <input
                                                    id="code"
                                                    type="text"
                                                    inputMode="numeric"
                                                    autoComplete="one-time-code"
                                                    autoFocus
                                                    disabled={mode === 'email'}
                                                    value={code}
                                                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-800 text-center tracking-[0.45em] text-lg font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/25 focus:border-teal-500 transition-all placeholder:tracking-widest placeholder:text-slate-300"
                                                    placeholder="——————"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => { setCode(''); setCodeSent(false); setError(''); }}
                                                className="text-sm font-medium text-teal-400 hover:text-teal-300 transition-colors"
                                            >
                                                Отправить код заново
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* ── email section ── */}
                        <div
                            className="space-y-4 transition-opacity duration-200"
                            style={{
                                opacity: mode === 'email' ? 1 : 0,
                                pointerEvents: mode === 'email' ? 'auto' : 'none',
                                position: mode === 'email' ? 'relative' : 'absolute',
                                top: 0, left: 0, right: 0,
                            }}
                        >
                            <div>
                                <label htmlFor="email" className="text-sm font-medium text-slate-700 mb-1.5 block">
                                    Email
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" style={{ width: 15, height: 15 }} />
                                    <input
                                        id="email"
                                        type="email"
                                        autoComplete="email"
                                        disabled={mode !== 'email'}
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/25 focus:border-teal-500 transition-all placeholder:text-slate-300"
                                        placeholder="your@email.com"
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="password" className="text-sm font-medium text-slate-700 mb-1.5 block">
                                    Пароль
                                </label>
                                <div className="relative">
                                    <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" style={{ width: 15, height: 15 }} />
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="current-password"
                                        disabled={mode !== 'email'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/25 focus:border-teal-500 transition-all placeholder:text-slate-300"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        {showPassword
                                            ? <EyeOff style={{ width: 15, height: 15 }} />
                                            : <Eye style={{ width: 15, height: 15 }} />
                                        }
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* remember + forgot */}
                    <div className="flex items-center justify-between mt-4">
                        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                            />
                            Запомнить меня
                        </label>
                        <Link to="/forgot-password" className="text-sm font-medium text-teal-400 hover:text-teal-300 transition-colors">
                            Забыли пароль?
                        </Link>
                    </div>

                    {/* submit */}
                    <motion.div className="mt-5" whileTap={{ scale: 0.985 }}>
                        <Button
                            type="submit"
                            color="teal"
                            fullWidth
                            isLoading={isLoading}
                            disabled={mode === 'phone' || mode === 'whatsapp' ? !isPhoneStepValid : !isEmailFormValid}
                        >
                            {mode === 'phone' || mode === 'whatsapp' ? (
                                <>
                                    {mode === 'whatsapp'
                                        ? <MessageCircle className="mr-2" style={{ width: 15, height: 15 }} />
                                        : <ShieldCheck className="mr-2" style={{ width: 15, height: 15 }} />}
                                    {codeSent
                                        ? 'Подтвердить код'
                                        : mode === 'whatsapp'
                                            ? 'Получить код в WhatsApp'
                                            : 'Получить SMS-код'}
                                </>
                            ) : (
                                <>
                                    <LockKeyhole className="mr-2" style={{ width: 15, height: 15 }} />
                                    Войти
                                </>
                            )}
                        </Button>
                    </motion.div>

                    {/* Google OAuth */}
                    {googleClientId && (
                        <>
                            <div className="relative my-5">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-panel" />
                                </div>
                                <div className="relative flex justify-center">
                                    <span className="bg-white px-3 text-xs text-slate-400">или войдите через</span>
                                </div>
                            </div>
                            <GoogleOAuthProvider clientId={googleClientId}>
                                <div className={isGoogleLoading ? 'pointer-events-none opacity-60' : ''}>
                                    <GoogleLogin
                                        onSuccess={handleGoogleSuccess}
                                        onError={handleGoogleError}
                                        text="signin_with"
                                        shape="rectangular"
                                        width="100%"
                                        locale={i18n.language?.startsWith('ru') ? 'ru' : 'en'}
                                        theme="outline"
                                        logo_alignment="center"
                                    />
                                </div>
                            </GoogleOAuthProvider>
                        </>
                    )}
                </form>

                <p className="mt-6 text-center text-sm text-slate-500">
                    Нет аккаунта?{' '}
                    <Link to="/register" className="font-semibold text-teal-400 hover:text-teal-300 transition-colors">
                        Зарегистрироваться
                    </Link>
                </p>
            </motion.div>
        </motion.div>
    );
}
