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

// Helper function to safely extract user data from API response
const extractUserData = (response) => {
    try {
        // Try different response patterns
        if (response?.data?.data?.user) {
            return response.data.data.user;
        }
        if (response?.data?.user) {
            return response.data.user;
        }
        if (response?.data?.data) {
            return response.data.data;
        }
        if (response?.user) {
            return response.user;
        }
        return response?.data || null;
    } catch (error) {
        console.error('Error extracting user data:', error);
        return null;
    }
};

// Helper function to safely extract token from API response
const extractToken = (response) => {
    try {
        // Try different response patterns
        if (response?.data?.token) {
            return response.data.token;
        }
        if (response?.data?.data?.token) {
            return response.data.data.token;
        }
        if (response?.token) {
            return response.token;
        }
        return null;
    } catch (error) {
        console.error('Error extracting token:', error);
        return null;
    }
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
                    console.log('Checking auth status with token:', token);

                    const response = await apiService.auth.verifyToken();
                    console.log('Auth verification response:', response);

                    // Handle different response structures
                    const isValid = response?.data?.valid ||
                        response?.data?.data?.valid ||
                        response?.valid ||
                        (response?.status === 200);

                    if (isValid) {
                        let userData = extractUserData(response);

                        // If userData exists but is missing critical fields (like verificationStatus for drivers),
                        // fetch the complete profile
                        if (userData && userData.id) {
                            const needsFullProfile =
                                (userData.role === 'driver' && !userData.verificationStatus) ||
                                !userData.company ||
                                !userData.createdAt;

                            if (needsFullProfile) {
                                console.log('Token valid but missing data, fetching full profile...');
                                try {
                                    const profileResponse = await apiService.users.getCurrentUser();
                                    console.log('Full profile response:', profileResponse);

                                    const fullUserData = extractUserData(profileResponse);

                                    if (fullUserData) {
                                        console.log('Full user data loaded:', fullUserData);
                                        setUser(fullUserData);
                                    } else {
                                        console.log('Could not extract full profile, using partial data:', userData);
                                        setUser(userData);
                                    }
                                } catch (profileErr) {
                                    console.error('Error fetching full profile:', profileErr);
                                    // Use the partial user data we have
                                    console.log('Using partial user data:', userData);
                                    setUser(userData);
                                }
                            } else {
                                console.log('User authenticated with complete data:', userData);
                                setUser(userData);
                            }
                        } else if (userData) {
                            console.log('User authenticated:', userData);
                            setUser(userData);
                        } else {
                            console.warn('Valid token but no user data found');
                            logout();
                        }
                    } else {
                        console.log('Token is invalid');
                        logout();
                    }
                } catch (err) {
                    console.error('Auth verification error:', err);

                    // Only logout if it's a real auth error (not network issues)
                    if (err.response?.status === 401 || err.response?.status === 403) {
                        logout();
                    } else {
                        // For network errors, just log but don't logout
                        console.warn('Network error during auth check, keeping user logged in');
                    }
                }
            } else {
                console.log('No token found in localStorage');
            }
            setLoading(false);
        };

        checkAuthStatus();
    }, []);

    // Login function
    const login = async (email, password) => {
        console.log('Attempting login for:', email);
        setLoading(true);
        setError(null);

        try {
            const response = await apiService.auth.login({ email, password });
            console.log('Login response:', response);

            const token = extractToken(response);
            const userData = extractUserData(response);

            if (!token) {
                throw new Error('No token received from server');
            }

            if (!userData) {
                throw new Error('No user data received from server');
            }

            // Store token in localStorage
            localStorage.setItem('token', token);
            console.log('Token stored:', token);

            // Set user in state
            setUser(userData);
            console.log('User set in state:', userData);

            // Success toast notification
            toast.success('Успешный вход в систему!');

            // Navigate to dashboard
            navigate('/');

            return { success: true };
        } catch (err) {
            console.error('Login error:', err);

            // Handle different error types
            let errorMessage = 'Ошибка авторизации, попробуйте позже';

            if (err.response?.data?.message) {
                errorMessage = err.response.data.message;
            } else if (err.message) {
                errorMessage = err.message;
            }

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
            console.log('Getting Google Auth URL...');
            console.log('API Service structure:', {
                hasAuth: !!apiService.auth,
                authMethods: apiService.auth ? Object.keys(apiService.auth) : 'N/A'
            });

            if (!apiService.auth?.getGoogleAuthUrl) {
                console.error('getGoogleAuthUrl method not found');
                toast.error('Ошибка при подключении к Google');
                return null;
            }

            const response = await apiService.auth.getGoogleAuthUrl();
            console.log('Google Auth URL response:', response);

            // Try different response patterns
            const authUrl = response?.data?.data?.authUrl ||
                response?.data?.authUrl ||
                response?.authUrl ||
                response?.data;

            if (!authUrl) {
                throw new Error('No auth URL received from server');
            }

            return authUrl;
        } catch (err) {
            console.error('Google Auth URL error:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Ошибка при подключении к Google';
            toast.error(errorMessage);
            return null;
        }
    };

    // Google OAuth Callback handler
    const handleGoogleCallback = async (code) => {
        console.log('Processing Google OAuth callback with code:', code);
        setLoading(true);
        setError(null);

        try {
            if (!apiService.auth?.googleCallback) {
                console.error('googleCallback method not found');
                const availableMethods = apiService.auth ? Object.keys(apiService.auth) : [];
                console.log('Available auth methods:', availableMethods);
                return { success: false, error: 'Метод API не реализован' };
            }

            const response = await apiService.auth.googleCallback(code);
            console.log('Google callback response:', response);

            const token = extractToken(response);
            const userData = extractUserData(response);

            if (!token) {
                throw new Error('No token received from Google OAuth');
            }

            if (!userData) {
                throw new Error('No user data received from Google OAuth');
            }

            // Store tokens
            localStorage.setItem('token', token);

            const refreshToken = response?.data?.refreshToken ||
                response?.data?.data?.refreshToken ||
                response?.refreshToken;
            if (refreshToken) {
                localStorage.setItem('refreshToken', refreshToken);
            }

            // Set user in state
            setUser(userData);

            toast.success('Успешный вход через Google!');
            return { success: true };
        } catch (err) {
            console.error('Google OAuth error:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Ошибка аутентификации через Google';
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    };

    // Google Direct Login (with Google ID token)
    const googleLogin = async (idToken) => {
        console.log('Processing Google ID token login');
        setLoading(true);
        setError(null);

        try {
            if (!apiService.auth?.googleLogin) {
                console.error('googleLogin method not found');
                const availableMethods = apiService.auth ? Object.keys(apiService.auth) : [];
                console.log('Available auth methods:', availableMethods);
                return { success: false, error: 'Метод API не реализован' };
            }

            const response = await apiService.auth.googleLogin({ idToken });
            console.log('Google login response:', response);

            const token = extractToken(response);
            const userData = extractUserData(response);

            if (!token) {
                throw new Error('No token received from Google login');
            }

            if (!userData) {
                throw new Error('No user data received from Google login');
            }

            // Store tokens
            localStorage.setItem('token', token);

            const refreshToken = response?.data?.refreshToken ||
                response?.data?.data?.refreshToken ||
                response?.refreshToken;
            if (refreshToken) {
                localStorage.setItem('refreshToken', refreshToken);
            }

            // Set user in state
            setUser(userData);

            toast.success('Успешный вход через Google!');
            return { success: true };
        } catch (err) {
            console.error('Google login error:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Ошибка при входе через Google';
            setError(errorMessage);
            toast.error(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    };

    // Register function
    const register = async (userData) => {
        console.log('Attempting registration for:', userData.email);
        setLoading(true);
        setError(null);

        try {
            const response = await apiService.auth.register(userData);
            console.log('Registration response:', response);

            const token = extractToken(response);
            const userDataResponse = extractUserData(response);

            if (!token) {
                throw new Error('No token received from registration');
            }

            if (!userDataResponse) {
                throw new Error('No user data received from registration');
            }

            // Store token in localStorage
            localStorage.setItem('token', token);

            // Set user in state
            setUser(userDataResponse);

            toast.success('Регистрация успешна!');
            navigate('/');

            return { success: true };
        } catch (err) {
            console.error('Registration error:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Ошибка регистрации';
            setError(errorMessage);
            toast.error(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    };

    // Logout function
    const logout = () => {
        console.log('Logging out user');

        // Clear tokens from localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        removeAuthToken();

        // Clear user from state
        setUser(null);
        setError(null);

        // Success toast notification
        toast.success('Выход выполнен успешно');

        // Navigate to login page
        navigate('/login');
    };

    // Forgot password function
    const forgotPassword = async (email) => {
        console.log('Requesting password reset for:', email);
        try {
            const response = await apiService.auth.forgotPassword(email);
            console.log('Forgot password response:', response);

            // Return the response data, handling different structures
            return response?.data?.data || response?.data || response;
        } catch (error) {
            console.error('Password reset error:', error);
            throw error;
        }
    };

    // Reset password function
    const resetPassword = async (token, password, passwordConfirm) => {
        console.log('Resetting password with token');
        setLoading(true);
        setError(null);

        try {
            const response = await apiService.auth.resetPassword(token, {
                password,
                passwordConfirm
            });
            console.log('Reset password response:', response);

            const newToken = extractToken(response);
            const userData = extractUserData(response);

            if (newToken && userData) {
                // Store token in localStorage
                localStorage.setItem('token', newToken);

                // Set user in state
                setUser(userData);

                toast.success('Пароль успешно изменен!');
                navigate('/');
            } else {
                // Password reset successful but no auto-login
                toast.success('Пароль успешно изменен! Пожалуйста, войдите в систему.');
                navigate('/login');
            }

            return { success: true };
        } catch (err) {
            console.error('Reset password error:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Ошибка при сбросе пароля';
            setError(errorMessage);
            toast.error(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    };

    // Update user profile
    const updateProfile = async (profileData) => {
        console.log('Updating profile:', profileData);
        setLoading(true);
        setError(null);

        try {
            const response = await apiService.users.updateProfile(profileData);
            console.log('Update profile response:', response);

            const userData = extractUserData(response);
            if (userData) {
                setUser(userData);
            } else {
                // If we can't extract user data, merge with existing user
                setUser(prevUser => ({ ...prevUser, ...profileData }));
            }

            toast.success('Профиль успешно обновлен!');
            return { success: true };
        } catch (err) {
            console.error('Update profile error:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Ошибка при обновлении профиля';
            setError(errorMessage);
            toast.error(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    };

    // Change password
    const changePassword = async (currentPassword, password, passwordConfirm) => {
        console.log('Changing password');
        setLoading(true);
        setError(null);

        try {
            const response = await apiService.auth.changePassword({
                currentPassword,
                password,
                passwordConfirm
            });
            console.log('Change password response:', response);

            toast.success('Пароль успешно изменен!');
            return { success: true };
        } catch (err) {
            console.error('Change password error:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Ошибка при изменении пароля';
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
        isSupervisor: user?.role === 'supervisor' || user?.role === 'admin',
        isDriver: user?.role === 'driver' && user?.verificationStatus === 'approved',
        isPendingDriver: user?.role === 'driver' && user?.verificationStatus === 'pending',
        userCompany: user?.company
    };

    // Enhanced loading spinner with more info in development
    if (loading && !user) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-50">
                <div className="text-center">
                    <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-teal-500 mx-auto"></div>
                    {process.env.NODE_ENV === 'development' && (
                        <p className="mt-4 text-sm text-slate-500">Проверка аутентификации...</p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};
