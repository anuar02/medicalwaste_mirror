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
            console.log('Data Keys:', Object.keys(response.data));

            if (response.data.data) {
                console.log('Nested Data:', response.data.data);
                console.log('Nested Data Type:', typeof response.data.data);
                if (typeof response.data.data === 'object') {
                    console.log('Nested Data Keys:', Object.keys(response.data.data));
                }
            }

            if (response.data.history) {
                console.log('History Data Length:', response.data.history?.length);
            }

            if (response.data.bin) {
                console.log('Bin Data:', response.data.bin);
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
            response?.data?.data?.bin,    // nested structure
            response?.data?.bin,          // direct bin property
            response?.data?.data,         // data is the bin itself
            response?.data,               // response.data is the bin
            response?.bin,                // direct bin property on response
            response                      // response itself is the bin
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

// Enhanced history data extractor for your specific API structure
export const extractHistoryData = (response) => {
    try {
        debugApiResponse(response, 'Extracting History Data');

        // Your API structure: { data: { history: [...] } }
        const possiblePaths = [
            response?.data?.data?.history,    // { data: { data: { history: [...] } } }
            response?.data?.history,          // { data: { history: [...] } } <- Your structure
            response?.data?.data,             // { data: { data: [...] } }
            response?.data,                   // { data: [...] }
            response?.history,                // { history: [...] }
            response                          // [...] - direct array
        ];

        for (const path of possiblePaths) {
            if (Array.isArray(path)) {
                console.log('✅ Found history array with', path.length, 'items');
                return path;
            }
        }

        // Special case: if response.data is an object with various properties,
        // look for any array that might be history data
        if (response?.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
            for (const [key, value] of Object.entries(response.data)) {
                if (Array.isArray(value)) {
                    // Check if this array looks like history data
                    if (value.length > 0 && value[0] &&
                        (value[0]._id || value[0].timestamp || value[0].time || value[0].avgFullness)) {
                        console.log('✅ Found history-like array at key:', key, 'with', value.length, 'items');
                        return value;
                    }
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
            response?.data,
            response?.items,
            response
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
    const numericFields = ['fullness', 'alertThreshold', 'capacity', 'distance', 'containerHeight'];
    numericFields.forEach(field => {
        if (bin[field] !== undefined && (isNaN(Number(bin[field])) || Number(bin[field]) < 0)) {
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

// Enhanced history data validation for your API structure
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

    // Your API returns items with _id, avgFullness, avgDistance, etc.
    const requiredFields = ['_id', 'avgFullness'];
    const optionalFields = ['avgDistance', 'avgTemperature', 'avgWeight', 'firstTimestamp', 'lastTimestamp', 'count'];

    for (let i = 0; i < sampleSize; i++) {
        const item = history[i];
        const missingRequired = requiredFields.filter(field => item[field] === undefined);

        if (missingRequired.length > 0) {
            console.warn(`⚠️ History item ${i} missing required fields:`, missingRequired);
            console.log('Available fields:', Object.keys(item));
        }

        // Validate timestamp (could be _id, firstTimestamp, or lastTimestamp)
        const timestamp = item._id || item.firstTimestamp || item.lastTimestamp;
        if (timestamp) {
            const parsedDate = new Date(timestamp);
            if (isNaN(parsedDate.getTime())) {
                console.warn(`⚠️ Invalid timestamp in history item ${i}:`, timestamp);
            }
        }

        // Validate fullness
        if (item.avgFullness !== undefined &&
            (isNaN(Number(item.avgFullness)) || Number(item.avgFullness) < 0 || Number(item.avgFullness) > 100)) {
            console.warn(`⚠️ Invalid avgFullness in history item ${i}:`, item.avgFullness);
        }
    }

    return true;
};

// Process and clean history data for your API structure
export const processHistoryData = (rawHistory) => {
    try {
        if (!Array.isArray(rawHistory)) {
            console.warn('⚠️ Cannot process non-array history data');
            return [];
        }

        console.log('📊 Processing', rawHistory.length, 'history items');

        const processed = rawHistory
            .map((item, index) => {
                // Handle your API's timestamp format
                // Your API uses _id as a date-time string like "2025-08-28 11:00"
                // and also provides firstTimestamp and lastTimestamp
                let timestamp = item.firstTimestamp || item.lastTimestamp || item._id;

                // If _id is a time string like "2025-08-28 11:00", convert to proper ISO string
                if (typeof timestamp === 'string' && timestamp.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/)) {
                    timestamp = timestamp + ':00.000Z'; // Convert to proper ISO format
                }

                const parsedTimestamp = new Date(timestamp);

                // Skip items with invalid timestamps
                if (!timestamp || isNaN(parsedTimestamp.getTime())) {
                    console.warn(`⚠️ Skipping history item ${index} with invalid timestamp:`, timestamp);
                    return null;
                }

                // Use avgFullness from your API
                let fullness = Number(item.avgFullness);
                if (isNaN(fullness)) {
                    console.warn(`⚠️ Invalid avgFullness in item ${index}, setting to 0:`, item.avgFullness);
                    fullness = 0;
                }

                // Ensure fullness is within valid range
                fullness = Math.max(0, Math.min(100, fullness));

                return {
                    time: parsedTimestamp.toISOString(), // Standardize time format
                    fullness: fullness,
                    timestamp: parsedTimestamp,
                    temperature: item.avgTemperature ? Number(item.avgTemperature) : null,
                    weight: item.avgWeight ? Number(item.avgWeight) : null,
                    distance: item.avgDistance ? Number(item.avgDistance) : null,
                    containerHeight: item.avgContainerHeight ? Number(item.avgContainerHeight) : null,
                    count: item.count || 1, // Number of readings averaged
                    trend: 0, // Calculate if needed
                    prediction: null, // Add prediction logic if needed
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

        // Add trend calculation
        for (let i = 1; i < processed.length; i++) {
            processed[i].trend = processed[i].fullness - processed[i - 1].fullness;
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
        return dataType === 'history' || dataType === 'list' ? [] : null;
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