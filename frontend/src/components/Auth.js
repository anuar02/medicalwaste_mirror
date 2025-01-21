// Auth.js
import React, { useState, createContext, useContext, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        if (token && storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    const login = async (username, password) => {
        try {
            const response = await fetch('https://narutouzumaki.kz/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) {
                throw new Error('Login failed');
            }

            const data = await response.json();
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify({
                username: data.username,
                role: data.role
            }));
            setUser({
                username: data.username,
                role: data.role
            });
            navigate('/');
            return true;
        } catch (error) {
            console.error('Login error:', error);
            return false;
        }
    };

    const register = async (username, password) => {
        try {
            const response = await fetch('https://narutouzumaki.kz/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, role: 'user' }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Registration failed');
            }

            const data = await response.json();
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify({
                username: data.username,
                role: data.role
            }));
            setUser({
                username: data.username,
                role: data.role
            });
            navigate('/');
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        navigate('/login');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, register }}>
            {children}
        </AuthContext.Provider>
    );
};

export const Login = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const { login, register } = useContext(AuthContext);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!isLogin && password !== confirmPassword) {
            setError('Пароли не совпадают');
            return;
        }

        if (isLogin) {
            const success = await login(username, password);
            if (!success) {
                setError('Неверные учетные данные');
            }
        } else {
            const { success, error: registrationError } = await register(username, password);
            if (!success) {
                setError(registrationError || 'Ошибка при регистрации');
            }
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 w-full max-w-md">
                <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">
                    {isLogin ? 'Вход в систему' : 'Регистрация'}
                </h2>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Имя пользователя
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Пароль
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg"
                            required
                        />
                    </div>

                    {!isLogin && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Подтвердите пароль
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg"
                                required
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full bg-teal-600 text-white py-2 px-4 rounded-lg hover:bg-teal-700 transition-colors"
                    >
                        {isLogin ? 'Войти' : 'Зарегистрироваться'}
                    </button>

                    <div className="text-center">
                        <button
                            type="button"
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setError('');
                            }}
                            className="text-teal-600 hover:text-teal-700 text-sm"
                        >
                            {isLogin ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export const ProtectedRoute = ({ children }) => {
    const { user } = useContext(AuthContext);

    if (!user) {
        return <Navigate to="/login" />;
    }

    return children;
};

export const useAuth = () => useContext(AuthContext);