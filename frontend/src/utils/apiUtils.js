// utils/apiUtils.js
import { toast } from 'react-hot-toast';

// Debug function to help understand API response structure
export const debugApiResponse = (response, label = 'API Response') => {
    if (process.env.NODE_ENV === 'development') {
        console.group(`🔍 ${label}`);
        console.log('Full Response:', response);
        console.log('Response Data:', response?.data);
        console.log('Response Status:', response?.status);
        console.log('Response Headers:', response?.headers);

        // Try to identify the data structure
        if (response?.data) {
            console.log('Data Type:', typeof response.data);
            console.log('Is Array:', Array.isArray(response.data));

            if (response.data.data) {
                console.log('Nested Data:', response.data.data);
                console.log('Nested Data Type:', typeof response.data.data);
            }

            if (response.data.bin) {
                console.log('Bin Data:', response.data.bin);
            }

            if (response.data.history) {
                console.log('History Data:', response.data.history);
            }
        }
        console.groupEnd();
    }
    return response;
};

// Safe data extractor with multiple fallback patterns
export const extractBinData = (response) => {
    try {
        debugApiResponse(response, 'Extracting Bin Data');

        // Common patterns for bin data
        const possiblePaths = [
            response?.data?.data?.bin,
            response?.data?.bin,
            response?.data?.data,
            response?.data,
            response?.bin
        ];

        for (const path of possiblePaths) {
            if (path && typeof path === 'object' && (path.binId || path.id || path._id)) {
                console.log('✅ Found bin data at path:', path);
                return path;
            }
        }

        console.warn('⚠️ No bin data found in response');
        return null;
    } catch (error) {
        console.error('❌ Error extracting bin data:', error);
        return null;
    }
};

// Safe data extractor for history data
export const extractHistoryData = (response) => {
    try {
        debugApiResponse(response, 'Extracting History Data');

        // Common patterns for history data
        const possiblePaths = [
            response?.data?.data?.history,
            response?.data?.history,
            response?.data?.data,
            response?.data
        ];

        for (const path of possiblePaths) {
            if (Array.isArray(path)) {
                console.log('✅ Found history array with', path.length, 'items');
                return path;
            }
        }

        // If we get an object with a history property
        if (response?.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
            for (const [key, value] of Object.entries(response.data)) {
                if (Array.isArray(value) && key.toLowerCase().includes('history')) {
                    console.log('✅ Found history array at key:', key);
                    return value;
                }
            }
        }

        console.warn('⚠️ No history data found in response');
        return [];
    } catch (error) {
        console.error('❌ Error extracting history data:', error);
        return [];
    }
};

// Generic list data extractor
export const extractListData = (response, itemType = 'items') => {
    try {
        debugApiResponse(response, `Extracting ${itemType} List`);

        const possiblePaths = [
            response?.data?.data?.items,
            response?.data?.data,
            response?.data?.items,
            response?.data
        ];

        for (const path of possiblePaths) {
            if (Array.isArray(path)) {
                console.log('✅ Found', itemType, 'array with', path.length, 'items');
                return path;
            }
        }

        console.warn(`⚠️ No ${itemType} data found in response`);
        return [];
    } catch (error) {
        console.error(`❌ Error extracting ${itemType} data:`, error);
        return [];
    }
};

// Error handler for API calls
export const handleApiError = (error, context = 'API Call') => {
    console.error(`❌ ${context} Error:`, error);

    let message = 'Произошла неизвестная ошибка';

    if (error.response) {
        // Server responded with error status
        const { status, data } = error.response;
        message = data?.message || data?.error || `Ошибка сервера (${status})`;

        console.error('Error Status:', status);
        console.error('Error Data:', data);
    } else if (error.request) {
        // Request made but no response
        message = 'Нет ответа от сервера. Проверьте подключение к интернету.';
        console.error('No response received:', error.request);
    } else {
        // Error in request setup
        message = error.message || 'Ошибка при настройке запроса';
        console.error('Request setup error:', error.message);
    }

    // Don't show toast for certain errors (like 401 which is handled by interceptor)
    if (error.response?.status !== 401) {
        toast.error(message);
    }

    return {
        message,
        status: error.response?.status,
        data: error.response?.data,
        originalError: error
    };
};

// Validate bin data structure
export const validateBinData = (bin) => {
    if (!bin) {
        console.warn('⚠️ Bin data is null or undefined');
        return false;
    }

    const requiredFields = ['binId', 'status'];
    const missingFields = requiredFields.filter(field => !bin[field]);

    if (missingFields.length > 0) {
        console.warn('⚠️ Bin data missing required fields:', missingFields);
        console.log('Available fields:', Object.keys(bin));
    }

    // Validate numeric fields
    const numericFields = ['fullness', 'alertThreshold', 'capacity'];
    numericFields.forEach(field => {
        if (bin[field] !== undefined && (isNaN(bin[field]) || bin[field] < 0)) {
            console.warn(`⚠️ Invalid ${field} value:`, bin[field]);
        }
    });

    // Validate location data
    if (bin.location) {
        if (!bin.location.coordinates || !Array.isArray(bin.location.coordinates)) {
            console.warn('⚠️ Invalid location coordinates:', bin.location);
        } else if (bin.location.coordinates.length !== 2) {
            console.warn('⚠️ Location coordinates should have 2 values:', bin.location.coordinates);
        }
    }

    return true;
};

// Validate history data structure
export const validateHistoryData = (history) => {
    if (!Array.isArray(history)) {
        console.warn('⚠️ History data is not an array:', typeof history);
        return false;
    }

    if (history.length === 0) {
        console.info('ℹ️ History array is empty');
        return true;
    }

    // Check first few items for required fields
    const sampleSize = Math.min(3, history.length);
    const requiredFields = ['timestamp', 'fullness'];

    for (let i = 0; i < sampleSize; i++) {
        const item = history[i];
        const missingFields = requiredFields.filter(field =>
            item[field] === undefined &&
            item[field.replace('timestamp', 'time')] === undefined &&
            item[field.replace('timestamp', 'createdAt')] === undefined
        );

        if (missingFields.length > 0) {
            console.warn(`⚠️ History item ${i} missing fields:`, missingFields);
            console.log('Available fields:', Object.keys(item));
        }

        // Validate timestamp
        const timestamp = item.timestamp || item.time || item.createdAt;
        if (timestamp && isNaN(new Date(timestamp).getTime())) {
            console.warn(`⚠️ Invalid timestamp in history item ${i}:`, timestamp);
        }

        // Validate fullness
        if (item.fullness !== undefined && (isNaN(item.fullness) || item.fullness < 0 || item.fullness > 100)) {
            console.warn(`⚠️ Invalid fullness in history item ${i}:`, item.fullness);
        }
    }

    return true;
};

// Process and clean history data
export const processHistoryData = (rawHistory) => {
    try {
        if (!Array.isArray(rawHistory)) {
            console.warn('⚠️ Cannot process non-array history data');
            return [];
        }

        console.log('📊 Processing', rawHistory.length, 'history items');

        const processed = rawHistory
            .map((item, index) => {
                // Handle different timestamp field names
                const timestamp = item.timestamp || item.time || item.createdAt || item.date;
                const parsedTimestamp = new Date(timestamp);

                // Skip items with invalid timestamps
                if (!timestamp || isNaN(parsedTimestamp.getTime())) {
                    console.warn(`⚠️ Skipping history item ${index} with invalid timestamp:`, timestamp);
                    return null;
                }

                // Clean and validate fullness
                let fullness = Number(item.fullness);
                if (isNaN(fullness)) {
                    console.warn(`⚠️ Invalid fullness in item ${index}, setting to 0:`, item.fullness);
                    fullness = 0;
                }

                // Ensure fullness is within valid range
                fullness = Math.max(0, Math.min(100, fullness));

                return {
                    time: timestamp,
                    fullness: fullness,
                    timestamp: parsedTimestamp,
                    temperature: item.temperature ? Number(item.temperature) : null,
                    weight: item.weight ? Number(item.weight) : null,
                    trend: item.trend || 0,
                    prediction: item.prediction || null,
                    // Preserve original item for debugging
                    _original: process.env.NODE_ENV === 'development' ? item : undefined
                };
            })
            .filter(item => item !== null) // Remove invalid items
            .sort((a, b) => a.timestamp - b.timestamp); // Sort by timestamp

        console.log('✅ Processed', processed.length, 'valid history items');

        if (processed.length !== rawHistory.length) {
            console.warn(`⚠️ Filtered out ${rawHistory.length - processed.length} invalid items`);
        }

        return processed;
    } catch (error) {
        console.error('❌ Error processing history data:', error);
        return [];
    }
};

// Smart API response handler that tries different extraction methods
export const smartExtractData = (response, dataType = 'data') => {
    try {
        debugApiResponse(response, `Smart Extract ${dataType}`);

        // Handle different response structures
        const extractors = {
            bin: extractBinData,
            history: extractHistoryData,
            list: extractListData,
            default: (resp) => resp?.data?.data || resp?.data || resp
        };

        const extractor = extractors[dataType] || extractors.default;
        return extractor(response);
    } catch (error) {
        console.error(`❌ Error in smart extraction for ${dataType}:`, error);
        return dataType === 'history' ? [] : null;
    }
};

// Create a React Query wrapper with better error handling
export const createQueryWrapper = (queryFn, options = {}) => {
    return {
        ...options,
        queryFn: async (...args) => {
            try {
                const response = await queryFn(...args);
                return response;
            } catch (error) {
                handleApiError(error, options.context || 'Query');
                throw error;
            }
        },
        onError: (error) => {
            handleApiError(error, options.context || 'Query');
            if (options.onError) {
                options.onError(error);
            }
        }
    };
};

// Enhanced mutation wrapper
export const createMutationWrapper = (mutationFn, options = {}) => {
    return {
        ...options,
        mutationFn: async (...args) => {
            try {
                const response = await mutationFn(...args);
                if (options.successMessage) {
                    toast.success(options.successMessage);
                }
                return response;
            } catch (error) {
                const errorInfo = handleApiError(error, options.context || 'Mutation');
                if (options.errorMessage) {
                    toast.error(options.errorMessage);
                }
                throw error;
            }
        },
        onError: (error) => {
            if (!options.errorMessage) { // Only handle if no custom message
                handleApiError(error, options.context || 'Mutation');
            }
            if (options.onError) {
                options.onError(error);
            }
        },
        onSuccess: (data, variables, context) => {
            if (options.successMessage && !options.mutationFn.hasShownSuccess) {
                toast.success(options.successMessage);
            }
            if (options.onSuccess) {
                options.onSuccess(data, variables, context);
            }
        }
    };
};

// Utility to check if response indicates success
export const isResponseSuccessful = (response) => {
    // Check HTTP status
    if (response?.status && (response.status < 200 || response.status >= 300)) {
        return false;
    }

    // Check explicit success field
    if (response?.data?.success === false) {
        return false;
    }

    // Check for error field
    if (response?.data?.error) {
        return false;
    }

    return true;
};

// Format API errors for display
export const formatApiError = (error) => {
    if (typeof error === 'string') {
        return error;
    }

    if (error?.response?.data?.message) {
        return error.response.data.message;
    }

    if (error?.message) {
        return error.message;
    }

    return 'Произошла неизвестная ошибка';
};

// Debug hook for API calls (use in components during development)
export const useApiDebug = (enabled = process.env.NODE_ENV === 'development') => {
    return {
        log: (message, data) => {
            if (enabled) {
                console.log(`🔧 ${message}`, data);
            }
        },
        warn: (message, data) => {
            if (enabled) {
                console.warn(`⚠️ ${message}`, data);
            }
        },
        error: (message, data) => {
            if (enabled) {
                console.error(`❌ ${message}`, data);
            }
        },
        group: (label, fn) => {
            if (enabled) {
                console.group(label);
                fn();
                console.groupEnd();
            }
        }
    };
};

// Performance monitoring for API calls
export const measureApiCall = async (apiCall, label = 'API Call') => {
    const startTime = performance.now();

    try {
        const result = await apiCall();
        const duration = performance.now() - startTime;

        if (process.env.NODE_ENV === 'development') {
            console.log(`⏱️ ${label} completed in ${duration.toFixed(2)}ms`);
        }

        return result;
    } catch (error) {
        const duration = performance.now() - startTime;
        console.error(`⏱️ ${label} failed after ${duration.toFixed(2)}ms:`, error);
        throw error;
    }
};

export default {
    debugApiResponse,
    extractBinData,
    extractHistoryData,
    extractListData,
    handleApiError,
    validateBinData,
    validateHistoryData,
    processHistoryData,
    smartExtractData,
    createQueryWrapper,
    createMutationWrapper,
    isResponseSuccessful,
    formatApiError,
    useApiDebug,
    measureApiCall
};