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

    // Google Auth URL retrieval
    const getGoogleAuthUrl = async () => {
        try {
            // Debug the API service structure
            console.log('API Service:', apiService);
            console.log('Auth methods:', apiService.auth);

            // Check if the method exists
            if (!apiService.auth || typeof apiService.auth.getGoogleAuthUrl !== 'function') {
                console.error('API method getGoogleAuthUrl is not defined or not accessible');
                toast.error('Ошибка при подключении к Google');
                return null;
            }

            const response = await apiService.auth.getGoogleAuthUrl();
            console.log('Google Auth URL response:', response);
            return response.data.data.authUrl;
        } catch (err) {
            console.error('Google Auth URL error:', err);
            const errorMessage = err.response?.data?.message || 'Ошибка при подключении к Google, попробуйте позже';
            toast.error(errorMessage);
            return null;
        }
    };


    // Google OAuth Callback handler
    const handleGoogleCallback = async (code) => {
        setLoading(true);
        setError(null);

        try {
            console.log('Processing Google OAuth code in AuthContext:', code);

            if (!apiService.auth || typeof apiService.auth.googleCallback !== 'function') {
                console.error('API method googleCallback is not defined or not accessible');
                console.log('Available auth methods:', Object.keys(apiService.auth));
                setLoading(false);
                return { success: false, error: 'Метод API не реализован' };
            }

            // Make sure your backend endpoint expects the code in this format
            const response = await apiService.auth.googleCallback({ code });
            console.log('Google callback response:', response);

            const { token, data } = response.data;

            // Store token in localStorage
            localStorage.setItem('token', token);
            if (response.data.refreshToken) {
                localStorage.setItem('refreshToken', response.data.refreshToken);
            }

            // Set user in state
            setUser(data.user);

            return { success: true };
        } catch (err) {
            console.error('Google OAuth error:', err);

            // Handle different error types
            const errorMessage = err.response?.data?.message || 'Ошибка аутентификации через Google, попробуйте позже';
            setError(errorMessage);

            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    };


    // Google Direct Login (with Google ID token)
    const googleLogin = async (idToken) => {
        setLoading(true);
        setError(null);

        try {
            console.log('Processing Google ID token in AuthContext');

            if (!apiService.auth || typeof apiService.auth.googleLogin !== 'function') {
                console.error('API method googleLogin is not defined or not accessible');
                console.log('Available auth methods:', Object.keys(apiService.auth));
                setLoading(false);
                return { success: false, error: 'Метод API не реализован' };
            }

            // Call your API with the ID token
            const response = await apiService.auth.googleLogin({ idToken });
            console.log('Google login response:', response);

            const { token, data } = response.data;

            // Store token in localStorage
            localStorage.setItem('token', token);
            if (response.data.refreshToken) {
                localStorage.setItem('refreshToken', response.data.refreshToken);
            }

            // Set user in state
            setUser(data.user);

            // Success toast notification
            toast.success('Успешный вход через Google!');

            return { success: true };
        } catch (err) {
            console.error('Google login error:', err);

            // Handle different error types
            const errorMessage = err.response?.data?.message || 'Ошибка при входе через Google, попробуйте позже';
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
        localStorage.removeItem('refreshToken');
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
        try {
            const response = await apiService.auth.forgotPassword(email)

            // Any response from the server is treated as success
            // This is a security measure to not reveal if the email exists
            return response.data;
        } catch (error) {
            console.error('Password reset error:', error);

            // Re-throw the error to be handled by the component
            throw error;
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
        getGoogleAuthUrl,
        handleGoogleCallback,
        googleLogin,
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