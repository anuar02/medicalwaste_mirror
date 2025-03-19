import axios from 'axios';
import toast from 'react-hot-toast';

// Create Axios instance with common configuration
const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000, // 10 second timeout
});

// Request interceptor
api.interceptors.request.use(
    (config) => {
        // You can modify the request config here
        // For example, add a loading indicator

        // Get token from localStorage
        const token = localStorage.getItem('token');

        // Add token to Authorization header if it exists
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => {
        // Handle request errors
        console.error('API Request Error:', error);
        return Promise.reject(error);
    }
);

// Response interceptor
api.interceptors.response.use(
    (response) => {
        // You can modify the response data here
        return response;
    },
    (error) => {
        // Handle response errors
        console.error('API Response Error:', error);

        // Handle different error types
        if (error.response) {
            // Server responded with an error status code
            const { status, data } = error.response;

            switch (status) {
                case 401:
                    // Unauthorized - Token expired or invalid
                    if (window.location.pathname !== '/login') {
                        localStorage.removeItem('token');
                        toast.error('Сессия истекла. Пожалуйста, войдите снова.');
                        setTimeout(() => {
                            window.location.href = '/login';
                        }, 1500);
                    }
                    break;
                case 403:
                    // Forbidden - User doesn't have permission
                    toast.error('У вас нет прав для выполнения этого действия');
                    break;
                case 404:
                    // Not Found
                    toast.error('Запрашиваемый ресурс не найден');
                    break;
                case 422:
                    // Validation Error
                    if (data.errors && Array.isArray(data.errors)) {
                        // Display validation errors
                        data.errors.forEach((err) => {
                            toast.error(err.msg || 'Ошибка валидации');
                        });
                    } else {
                        toast.error(data.message || 'Ошибка валидации');
                    }
                    break;
                case 429:
                    // Too Many Requests
                    toast.error('Слишком много запросов. Пожалуйста, попробуйте позже.');
                    break;
                case 500:
                case 502:
                case 503:
                case 504:
                    // Server Error
                    toast.error('Ошибка сервера. Пожалуйста, попробуйте позже.');
                    break;
                default:
                    toast.error(data.message || 'Произошла ошибка');
            }
        } else if (error.request) {
            // Request was made but no response received (network error)
            toast.error('Нет соединения с сервером. Проверьте подключение к интернету.');
        } else {
            // Error in setting up the request
            toast.error('Произошла ошибка при отправке запроса');
        }

        return Promise.reject(error);
    }
);

// API Service methods
const apiService = {
    // Auth endpoints
    auth: {
        login: (credentials) => api.post('/auth/login', credentials),
        register: (userData) => api.post('/auth/register', userData),
        logout: () => api.post('/auth/logout'),
        verifyToken: () => api.get('/auth/verify'),
        forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
        resetPassword: (token, passwords) => api.post(`/auth/reset-password/${token}`, passwords),
        changePassword: (passwords) => api.post('/auth/change-password', passwords),
    },

    // User endpoints
    users: {
        getProfile: () => api.get('/users/profile'),
        updateProfile: (data) => api.patch('/users/profile', data),
        getDepartments: () => api.get('/users/departments'),
        getAllUsers: () => api.get('/users'),
        deleteUser: (userId) => api.delete(`/users/${userId}`),
        updateUserRole: (userId, data) => api.patch(`/users/${userId}/role`, data),
    },

    // Waste Bin endpoints
    wasteBins: {
        getAll: (params) => api.get('/waste-bins', { params }),
        getById: (binId) => api.get(`/waste-bins/${binId}`),
        create: (binData) => api.post('/waste-bins', binData),
        update: (binId, binData) => api.patch(`/waste-bins/${binId}`, binData),
        delete: (binId) => api.delete(`/waste-bins/${binId}`),
        getHistory: (binId, params) => api.get(`/waste-bins/${binId}/history`, { params }),
        getNearby: (params) => api.get('/waste-bins/nearby', { params }),
        getOverfilled: () => api.get('/waste-bins/overfilled'),
        getStatistics: () => api.get('/waste-bins/statistics'),
    },
};

export default apiService;