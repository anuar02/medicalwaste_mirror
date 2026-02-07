import axios from 'axios';
import toast from 'react-hot-toast';

// Create Axios instance with common configuration
export const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || '/api',
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000, // 10 second timeout
});

// Request interceptor (unchanged from your original)
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

// Response interceptor (unchanged from your original)
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

// Wrapper function to maintain compatibility while adding enhanced error handling
const createCompatibleMethod = (apiCall) => {
    return async (...args) => {
        try {
            const response = await apiCall(...args);
            // Log successful API calls in development
            if (process.env.NODE_ENV === 'development') {
                console.log(`✅ API Success:`, {
                    method: apiCall.name,
                    args,
                    response: response.data
                });
            }
            return response;
        } catch (error) {
            // Enhanced error logging
            if (process.env.NODE_ENV === 'development') {
                console.error(`❌ API Error:`, {
                    method: apiCall.name,
                    args,
                    error: error.response?.data || error.message,
                    status: error.response?.status
                });
            }
            throw error;
        }
    };
};

// API Service methods - EXACTLY the same interface as your original
const apiService = {
    // Auth endpoints (unchanged interface)
    auth: {
        login: createCompatibleMethod((credentials) => api.post('/auth/login', credentials)),
        register: createCompatibleMethod((userData) => api.post('/auth/register', userData)),
        logout: createCompatibleMethod(() => api.post('/auth/logout')),
        verifyToken: createCompatibleMethod(() => api.get('/auth/verify')),
        forgotPassword: createCompatibleMethod((email) => api.post('/auth/forgot-password', { email })),
        resetPassword: createCompatibleMethod((token, passwords) => api.post(`/auth/reset-password/${token}`, passwords)),
        changePassword: createCompatibleMethod((passwords) => api.post('/auth/change-password', passwords)),
        getGoogleAuthUrl: createCompatibleMethod(() => api.get('/auth/google/url')),
        googleCallback: createCompatibleMethod((code) => api.post('/auth/google/callback', { code })),
        googleLogin: createCompatibleMethod((data) => api.post('/auth/google/login', data))
    },

    // User endpoints (unchanged interface)
    users: {
        getCurrentUser: createCompatibleMethod(() => api.get('/users/profile')),
        getProfile: createCompatibleMethod(() => api.get('/users/profile')),
        updateProfile: createCompatibleMethod((data) => api.patch('/users/profile', data)),
        updatePhone: createCompatibleMethod((data) => api.patch('/users/phone', data)),
        startPhoneVerification: createCompatibleMethod((data) => api.post('/users/phone/verify/start', data)),
        checkPhoneVerification: createCompatibleMethod((data) => api.post('/users/phone/verify/check', data)),
        getDepartments: createCompatibleMethod(() => api.get('/users/departments')),
        getAllUsers: createCompatibleMethod(() => api.get('/users')),
        deleteUser: createCompatibleMethod((userId) => api.delete(`/users/${userId}`)),
        updateUserRole: createCompatibleMethod((userId, data) => api.patch(`/users/${userId}/role`, data)),
    },

    // Devices endpoints (unchanged interface)
    devices: {
        getPendingDevices: createCompatibleMethod(() => api.get('/devices/pending')),
        configureDevice: createCompatibleMethod((deviceId, data) => api.post(`/devices/${deviceId}/configure`, data)),
        getAll: createCompatibleMethod(() => api.get('/devices')),
        getById: createCompatibleMethod((deviceId) => api.get(`/devices/${deviceId}`)),
        delete: createCompatibleMethod((deviceId) => api.delete(`/devices/${deviceId}`)),
    },

    // Waste Bin endpoints (enhanced but same interface)
    wasteBins: {
        // ===== BASIC CRUD OPERATIONS =====
        getAll: createCompatibleMethod((params = {}) => {
            const queryParams = {
                page: params.page || 1,
                limit: params.limit || 20,
                sortBy: params.sortBy || 'updatedAt',
                sortOrder: params.sortOrder || 'desc',
                ...params
            };
            return api.get('/waste-bins', { params: queryParams });
        }),

        getById: createCompatibleMethod((binId) => api.get(`/waste-bins/${binId}`)),

        create: createCompatibleMethod((binData) => api.post('/waste-bins', binData)),

        update: createCompatibleMethod((binId, binData) => api.patch(`/waste-bins/${binId}`, binData)),

        delete: createCompatibleMethod((binId) => api.delete(`/waste-bins/${binId}`)),

        getDevicesHealth: () => api.get('/health-check/devices'),
        getHealthStatistics: () => api.get('/health-check/statistics'),
        getUnhealthyDevices: () => api.get('/health-check/unhealthy'),

        // ===== HISTORY & TIME PERIODS =====

        // Quick access methods for frontend time period selector
        getHistory1h: createCompatibleMethod((binId) => api.get(`/waste-bins/${binId}/history/1h`)),
        getHistory6h: createCompatibleMethod((binId) => api.get(`/waste-bins/${binId}/history/6h`)),
        getHistory24h: createCompatibleMethod((binId) => api.get(`/waste-bins/${binId}/history/24h`)),
        getHistory7d: createCompatibleMethod((binId) => api.get(`/waste-bins/${binId}/history/7d`)),
        getHistory30d: createCompatibleMethod((binId) => api.get(`/waste-bins/${binId}/history/30d`)),

        // Flexible history method with custom parameters
        getHistory: createCompatibleMethod((binId, params = {}) => {
            const queryParams = {
                period: params.period,
                interval: params.interval,
                aggregation: params.aggregation || 'avg',
                startDate: params.startDate,
                endDate: params.endDate,
                limit: params.limit || 1000,
                ...params
            };
            return api.get(`/waste-bins/${binId}/history`, { params: queryParams });
        }),

        // Convenience method for time period selector compatibility
        getHistoryByPeriod: createCompatibleMethod((binId, period) => {
            const periodRoutes = {
                '1h': () => api.get(`/waste-bins/${binId}/history/1h`),
                '6h': () => api.get(`/waste-bins/${binId}/history/6h`),
                '24h': () => api.get(`/waste-bins/${binId}/history/24h`),
                '7d': () => api.get(`/waste-bins/${binId}/history/7d`),
                '30d': () => api.get(`/waste-bins/${binId}/history/30d`)
            };

            return periodRoutes[period] ?
                periodRoutes[period]() :
                api.get(`/waste-bins/${binId}/history`, { params: { period } });
        }),

        // ===== LOCATION & PROXIMITY =====
        getNearby: createCompatibleMethod((params = {}) => {
            const queryParams = {
                latitude: params.latitude,
                longitude: params.longitude,
                radius: params.radius || 1, // km
                ...params
            };
            return api.get('/waste-bins/nearby', { params: queryParams });
        }),

        // ===== ALERTS & MONITORING =====
        getOverfilled: createCompatibleMethod((threshold = 80) =>
            api.get('/waste-bins/overfilled', { params: { threshold } })
        ),

        getAlerts: createCompatibleMethod((binId, params = {}) => {
            const queryParams = {
                status: params.status || 'active',
                ...params
            };
            return api.get(`/waste-bins/${binId}/alerts`, { params: queryParams });
        }),

        sendManualAlert: createCompatibleMethod((binId, alertData = {}) => {
            const payload = {
                alertType: alertData.alertType || 'manual',
                message: alertData.message,
                priority: alertData.priority || 'medium',
                ...alertData
            };
            return api.post(`/waste-bins/${binId}/send-alert`, payload);
        }),

        dismissAlert: createCompatibleMethod((alertId) => api.patch(`/alerts/${alertId}/dismiss`)),

        // ===== STATISTICS & ANALYTICS =====
        getStatistics: createCompatibleMethod((params = {}) => {
            const queryParams = {
                period: params.period || 'day',
                department: params.department,
                ...params
            };
            return api.get('/waste-bins/statistics', { params: queryParams });
        }),

        getAnalytics: createCompatibleMethod((params = {}) => {
            const queryParams = {
                startDate: params.startDate,
                endDate: params.endDate,
                groupBy: params.groupBy || 'day',
                ...params
            };
            return api.get('/waste-bins/analytics', { params: queryParams });
        }),

        getMetrics: createCompatibleMethod(() => api.get('/waste-bins/metrics')),

        // ===== PREDICTIONS & MAINTENANCE =====
        predictMaintenance: createCompatibleMethod((binId) =>
            api.get(`/waste-bins/${binId}/predict-maintenance`)
        ),

        // ===== COLLECTION MANAGEMENT =====
        scheduleCollection: createCompatibleMethod((binId, scheduleData) => {
            const payload = {
                scheduledFor: scheduleData.scheduledFor,
                priority: scheduleData.priority || 'medium',
                notes: scheduleData.notes,
                ...scheduleData
            };
            return api.post(`/waste-bins/${binId}/schedule-collection`, payload);
        }),

        getCollectionRoutes: createCompatibleMethod((params = {}) => {
            const queryParams = {
                date: params.date || new Date().toISOString().split('T')[0],
                optimize: params.optimize || false,
                ...params
            };
            return api.get('/waste-bins/collection-routes', { params: queryParams });
        }),

        optimizeRoutes: createCompatibleMethod((optimizationData) => {
            const payload = {
                date: optimizationData.date,
                vehicleCapacity: optimizationData.vehicleCapacity || 100,
                maxDistance: optimizationData.maxDistance || 50,
                ...optimizationData
            };
            return api.post('/waste-bins/optimize-routes', payload);
        }),

        // ===== DEVICE & IoT MANAGEMENT =====
        setCollectingMode: createCompatibleMethod((binId, isCollecting) =>
            api.post(`/waste-bins/${binId}/set-collecting-mode`, { isCollecting })
        ),

        sendDeviceCommand: createCompatibleMethod((commandData) => {
            const payload = {
                deviceId: commandData.deviceId,
                command: commandData.command,
                params: commandData.params || {},
                priority: commandData.priority || 'medium',
                ...commandData
            };
            return api.post('/waste-bins/device-command', payload);
        }),

        // ===== BULK OPERATIONS =====
        bulkUpdate: createCompatibleMethod((binIds, updates) => {
            const payload = {
                binIds: Array.isArray(binIds) ? binIds : [binIds],
                updates: updates
            };
            return api.patch('/waste-bins/bulk-update', payload);
        }),

        // ===== DATA EXPORT =====
        exportData: createCompatibleMethod((format = 'csv', params = {}) => {
            const queryParams = {
                startDate: params.startDate,
                endDate: params.endDate,
                departments: params.departments,
                ...params
            };
            return api.get(`/waste-bins/export/${format}`, {
                params: queryParams,
                responseType: 'blob' // For file downloads
            });
        }),

        // ===== UTILITY METHODS =====

        // Get current status of multiple bins
        getBulkStatus: createCompatibleMethod((binIds) => {
            const params = { binIds: binIds.join(',') };
            return api.get('/waste-bins', { params });
        }),

        // Search bins with advanced filters
        search: createCompatibleMethod((searchParams) => {
            const queryParams = {
                q: searchParams.query,
                department: searchParams.department,
                wasteType: searchParams.wasteType,
                status: searchParams.status,
                minFullness: searchParams.minFullness,
                maxFullness: searchParams.maxFullness,
                ...searchParams
            };
            return api.get('/waste-bins', { params: queryParams });
        }),

        // Get bins by department
        getByDepartment: createCompatibleMethod((department, params = {}) => {
            const queryParams = { department, ...params };
            return api.get('/waste-bins', { params: queryParams });
        }),

        // Get bins by waste type
        getByWasteType: createCompatibleMethod((wasteType, params = {}) => {
            const queryParams = { wasteType, ...params };
            return api.get('/waste-bins', { params: queryParams });
        }),

        // Get bins requiring attention (overfilled, maintenance due, etc.)
        getRequiringAttention: createCompatibleMethod((params = {}) => {
            const queryParams = {
                minFullness: params.threshold || 75,
                status: 'active',
                ...params
            };
            return api.get('/waste-bins', { params: queryParams });
        }),

        // ===== REALTIME DATA =====

        // Get latest sensor reading for a bin
        getLatestReading: createCompatibleMethod((binId) =>
            api.get(`/waste-bins/${binId}/latest-reading`)
        ),

        // Get current trend for a bin
        getTrend: createCompatibleMethod((binId, hours = 24) =>
            api.get(`/waste-bins/${binId}/trend`, { params: { hours } })
        ),

        // ===== ERROR HANDLING HELPERS =====

        // Wrapper for API calls with enhanced error handling
        async safeApiCall(apiMethod, ...args) {
            try {
                const response = await apiMethod(...args);
                return { success: true, data: response.data };
            } catch (error) {
                console.error('API call failed:', error);
                return {
                    success: false,
                    error: error.response?.data?.message || 'API call failed',
                    status: error.response?.status
                };
            }
        },

        // Batch multiple API calls
        async batchCalls(calls) {
            const promises = calls.map(call => this.safeApiCall(call.method, ...call.args));
            const results = await Promise.allSettled(promises);
            return results.map((result, index) => ({
                id: calls[index].id,
                ...result.value
            }));
        }
    },

    // Legacy driver endpoints (maintaining exact interface)
    registerDriver: createCompatibleMethod((data) => api.post('/drivers/register', data)),
    getDriverProfile: createCompatibleMethod(() => api.get('/drivers/profile')),
    getPendingDrivers: createCompatibleMethod(() => api.get('/drivers/pending')),
    verifyDriver: createCompatibleMethod((id, data) => api.patch(`/drivers/verify/${id}`, data)),
    getAllDrivers: createCompatibleMethod(() => api.get('/drivers')),

    // Legacy medical company endpoints (maintaining exact interface)
    getMedicalCompanies: createCompatibleMethod(() => api.get('/medical-companies')),
    createMedicalCompany: createCompatibleMethod((data) => api.post('/medical-companies', data)),
    updateMedicalCompany: createCompatibleMethod((id, data) => api.patch(`/medical-companies/${id}`, data)),
    deleteMedicalCompany: createCompatibleMethod((id) => api.delete(`/medical-companies/${id}`)),

    // Device tracking endpoints
    tracking: {
        getAllDevices: createCompatibleMethod(() => api.get('/tracking/devices')),
        getDeviceLocation: createCompatibleMethod((deviceId) => api.get(`/tracking/devices/${deviceId}`)),
        getDeviceHistory: createCompatibleMethod((deviceId, params) => api.get(`/tracking/history/${deviceId}`, { params })),
        getCollectionPoints: createCompatibleMethod((params) => api.get('/tracking/collection-points', { params })),
        getDriverStats: createCompatibleMethod((driverId, params) => api.get(`/tracking/driver-stats/${driverId}`, { params })),
        sendCommand: createCompatibleMethod((data) => api.post('/tracking/send-command', data))
    },

    // Structured driver endpoints (as per your original)
    drivers: {
        registerDriver: createCompatibleMethod((data) => api.post('/drivers/register', data)),
        getDriverProfile: createCompatibleMethod(() => api.get('/drivers/profile')),
        updateDriverProfile: createCompatibleMethod((data) => api.patch('/drivers/profile', data)),
        getPendingDrivers: createCompatibleMethod(() => api.get('/drivers/pending')),
        verifyDriver: createCompatibleMethod((id, data) => api.patch(`/drivers/verify/${id}`, data)),
        getAllDrivers: createCompatibleMethod((params) => api.get('/drivers', { params })),

        getAll: () => api.get('/users/drivers'),
        getPending: () => api.get('/users/drivers/pending'),
        getOne: (id) => api.get(`/users/drivers/${id}`),
        update: (id, data) => api.patch(`/users/drivers/${id}`, data),
        verify: (data) => api.post('/users/drivers/verify', data)
    },

    healthCheck: {
        // Get all devices with their health status
        getDevicesHealth: () => api.get('/health-check/devices'),

        // Get unhealthy devices
        getUnhealthyDevices: () => api.get('/health-check/unhealthy'),

        // Get health statistics
        getHealthStatistics: (params) => api.get('/health-check/statistics', { params }),

        // Get latest health check for specific bin
        getLatestHealthCheck: (binId) => api.get(`/health-check/bin/${binId}/latest`),

        // Get health check history for specific bin
        getHealthCheckHistory: (binId, params) => api.get(`/health-check/bin/${binId}/history`, { params }),

        // Delete old health check data (admin only)
        deleteOldHealthChecks: (days) => api.delete(`/health-check/cleanup?days=${days}`)
    },

    companies: {
        getAll: () => api.get('/companies'),
        getActive: () => api.get('/companies/active'),
        getOne: (id) => api.get(`/companies/${id}`),
        getStats: (id) => api.get(`/companies/${id}/stats`),
        create: (data) => api.post('/companies', data),
        update: (id, data) => api.patch(`/companies/${id}`, data),
        delete: (id) => api.delete(`/companies/${id}`),
        assignBins: (data) => api.post('/companies/assign-bins', data)
    },

    collections: {
        start: (data) => api.post('/collections/start', data),
        stop: (data) => api.post('/collections/stop', data),
        recordLocation: (data) => api.post('/collections/location', data),
        addContainer: (data) => api.post('/collections/add-container', data),
        markVisited: (data) => api.post('/collections/mark-visited', data),
        getActive: () => api.get('/collections/active'),
        getActiveDrivers: () => api.get('/collections/active-drivers'),
        getHistory: (driverId, params) => api.get(`/collections/history/${driverId || ''}`, { params }),
        getSessionRoute: (sessionId) => api.get(`/collections/session/${sessionId}/route`)
    },

    routes: {
        getAll: createCompatibleMethod((params = {}) => api.get('/routes', { params })),
        getToday: createCompatibleMethod(() => api.get('/routes/today')),
        getById: createCompatibleMethod((id) => api.get(`/routes/${id}`)),
        create: createCompatibleMethod((data) => api.post('/routes', data)),
        update: createCompatibleMethod((id, data) => api.patch(`/routes/${id}`, data)),
        delete: createCompatibleMethod((id) => api.delete(`/routes/${id}`)),
        optimize: createCompatibleMethod((id) => api.post(`/routes/${id}/optimize`)),
        getStats: createCompatibleMethod((id) => api.get(`/routes/${id}/stats`)),
        getComparison: createCompatibleMethod((id, sessionId) => api.get(`/routes/${id}/comparison/${sessionId}`)),
        getSuggestions: createCompatibleMethod(() => api.get('/routes/suggestions')),
        approveSuggestion: createCompatibleMethod((id, data) => api.post(`/routes/suggestions/${id}/approve`, data))
    },

    handoffs: {
        getAll: createCompatibleMethod((params = {}) => api.get('/handoffs', { params })),
        getById: createCompatibleMethod((id) => api.get(`/handoffs/${id}`)),
        create: createCompatibleMethod((data) => api.post('/handoffs', data)),
        confirm: createCompatibleMethod((id) => api.patch(`/handoffs/${id}/confirm`)),
        dispute: createCompatibleMethod((id, data) => api.patch(`/handoffs/${id}/dispute`, data)),
        resolve: createCompatibleMethod((id, data) => api.patch(`/handoffs/${id}/resolve`, data)),
        resendNotification: createCompatibleMethod((id) => api.post(`/handoffs/${id}/resend-notification`)),
        getChain: createCompatibleMethod((sessionId) => api.get(`/handoffs/chain/${sessionId}`)),
        getPublic: createCompatibleMethod((token) => api.get(`/handoffs/public/${token}`)),
        confirmByToken: createCompatibleMethod((token) => api.post(`/handoffs/confirm/${token}`))
    },

    notifications: {
        getHandoffLogs: createCompatibleMethod((handoffId) => api.get(`/notifications/handoff/${handoffId}`))
    },

    incinerationPlants: {
        getAll: createCompatibleMethod((params = {}) => api.get('/incineration-plants', { params })),
        getById: createCompatibleMethod((id) => api.get(`/incineration-plants/${id}`)),
        create: createCompatibleMethod((data) => api.post('/incineration-plants', data)),
        update: createCompatibleMethod((id, data) => api.patch(`/incineration-plants/${id}`, data)),
        delete: createCompatibleMethod((id) => api.delete(`/incineration-plants/${id}`))
    },

    // Structured medical company endpoints (as per your original)
    medicalCompanies: {
        getMedicalCompanies: createCompatibleMethod(() => api.get('/medical-companies')),
        createMedicalCompany: createCompatibleMethod((data) => api.post('/medical-companies', data)),
        updateMedicalCompany: createCompatibleMethod((id, data) => api.patch(`/medical-companies/${id}`, data)),
        deleteMedicalCompany: createCompatibleMethod((id) => api.delete(`/medical-companies/${id}`))
    },

    telegram: {
        // Get Telegram connection status
        getStatus: createCompatibleMethod(() => api.get('/telegram/status')),

        // Connect Telegram account with chatId
        connect: createCompatibleMethod((data) => api.post('/telegram/connect', data)),

        // Disconnect Telegram account
        disconnect: createCompatibleMethod(() => api.post('/telegram/disconnect')),

        // Toggle notification preferences
        toggleNotifications: createCompatibleMethod((data) => api.post('/telegram/toggle-notifications', data)),

        // Send test notification
        sendTestNotification: createCompatibleMethod(() => api.post('/telegram/test-notification')),
    },
};

export default apiService;
