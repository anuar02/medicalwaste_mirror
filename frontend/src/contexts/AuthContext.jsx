// contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import apiService from '../services/api';
import { storeAuthToken, removeAuthToken } from '../utils/authToken';

// Create the context
const AuthContext = createContext(null);

// Custom hook for using the auth context
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    // Check if user is already logged in via token in localStorage
    useEffect(() => {
        const checkAuthStatus = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    // No need to call setAuthToken since the API interceptor handles this
                    const response = await apiService.auth.verifyToken();
                    if (response.data.valid) {
                        const userData = response.data.data.user;
                        setUser(userData);
                    } else {
                        // Token is invalid, clear it
                        logout();
                    }
                } catch (err) {
                    // Error verifying token
                    console.error('Auth verification error:', err);
                    logout();
                }
            }
            setLoading(false);
        };

        checkAuthStatus();
    }, []);

    // Login function
    const login = async (email, password) => {
        setLoading(true);
        setError(null);

        try {
            const response = await apiService.auth.login({ email, password });
            const { token, data } = response.data;

            // Store token in localStorage
            localStorage.setItem('token', token);
            // No need to call setAuthToken - API interceptor will handle it

            // Set user in state
            setUser(data.user);

            // Success toast notification
            toast.success('Успешный вход в систему!');

            // Navigate to dashboard
            navigate('/');

            return { success: true };
        } catch (err) {
            console.error('Login error:', err);

            // Handle different error types
            const errorMessage = err.response?.data?.message || 'Ошибка авторизации, попробуйте позже';
            setError(errorMessage);
            toast.error(errorMessage);

            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    };

    // Register function
    const register = async (userData) => {
        setLoading(true);
        setError(null);

        try {
            const response = await apiService.auth.register(userData);
            const { token, data } = response.data;

            // Store token in localStorage
            localStorage.setItem('token', token);
            // No need to call setAuthToken - API interceptor will handle it

            // Set user in state
            setUser(data.user);

            // Success toast notification
            toast.success('Регистрация успешна!');

            // Navigate to dashboard
            navigate('/');

            return { success: true };
        } catch (err) {
            console.error('Registration error:', err);

            // Handle different error types
            const errorMessage = err.response?.data?.message || 'Ошибка регистрации, попробуйте позже';
            setError(errorMessage);
            toast.error(errorMessage);

            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    };

    // Logout function
    const logout = () => {
        // Clear token from localStorage
        localStorage.removeItem('token');
        removeAuthToken();

        // Clear user from state
        setUser(null);

        // Success toast notification
        toast.success('Выход выполнен успешно');

        // Navigate to login page
        navigate('/login');
    };

    // Forgot password function
    const forgotPassword = async (email) => {
        setLoading(true);
        setError(null);

        try {
            await apiService.auth.forgotPassword(email);

            // Success toast notification
            toast.success('Инструкции по сбросу пароля отправлены на ваш email');

            return { success: true };
        } catch (err) {
            console.error('Forgot password error:', err);

            // Handle different error types
            const errorMessage = err.response?.data?.message || 'Ошибка при отправке инструкций, попробуйте позже';
            setError(errorMessage);
            toast.error(errorMessage);

            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    };

    // Reset password function
    const resetPassword = async (token, password, passwordConfirm) => {
        setLoading(true);
        setError(null);

        try {
            const response = await apiService.auth.resetPassword(token, {
                password,
                passwordConfirm
            });

            const { token: newToken, data } = response.data;

            // Store token in localStorage
            localStorage.setItem('token', newToken);
            // No need to call setAuthToken - API interceptor will handle it

            // Set user in state
            setUser(data.user);

            // Success toast notification
            toast.success('Пароль успешно изменен!');

            // Navigate to dashboard
            navigate('/');

            return { success: true };
        } catch (err) {
            console.error('Reset password error:', err);

            // Handle different error types
            const errorMessage = err.response?.data?.message || 'Ошибка при сбросе пароля, попробуйте позже';
            setError(errorMessage);
            toast.error(errorMessage);

            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    };

    // Update user profile
    const updateProfile = async (profileData) => {
        setLoading(true);
        setError(null);

        try {
            const response = await apiService.users.updateProfile(profileData);

            // Update user in state
            setUser(response.data.data.user);

            // Success toast notification
            toast.success('Профиль успешно обновлен!');

            return { success: true };
        } catch (err) {
            console.error('Update profile error:', err);

            // Handle different error types
            const errorMessage = err.response?.data?.message || 'Ошибка при обновлении профиля, попробуйте позже';
            setError(errorMessage);
            toast.error(errorMessage);

            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    };

    // Change password
    const changePassword = async (currentPassword, password, passwordConfirm) => {
        setLoading(true);
        setError(null);

        try {
            await apiService.auth.changePassword({
                currentPassword,
                password,
                passwordConfirm
            });

            // Success toast notification
            toast.success('Пароль успешно изменен!');

            return { success: true };
        } catch (err) {
            console.error('Change password error:', err);

            // Handle different error types
            const errorMessage = err.response?.data?.message || 'Ошибка при изменении пароля, попробуйте позже';
            setError(errorMessage);
            toast.error(errorMessage);

            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    };

    // Value to be provided by the context
    const contextValue = {
        user,
        loading,
        error,
        login,
        register,
        logout,
        forgotPassword,
        resetPassword,
        updateProfile,
        changePassword,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isSupervisor: user?.role === 'supervisor' || user?.role === 'admin'
    };

    // Loading spinner for initial authentication check
    if (loading && !user) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-50">
                <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-teal-500"></div>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};