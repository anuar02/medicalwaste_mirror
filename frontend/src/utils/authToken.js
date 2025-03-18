// utils/authToken.js
import axios from 'axios';
import apiService from '../services/api';

/**
 * Set the authentication token in the API headers
 * @param {string} token - JWT token
 */
export const setAuthToken = (token) => {
    if (token) {
        // Apply to axios default headers for future instances
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        // No need to set the header here as it's already handled in the interceptor
        // The api service already sets the token from localStorage in the request interceptor
    } else {
        // Remove header if token is not present
        delete axios.defaults.headers.common['Authorization'];
    }
};

/**
 * Remove the authentication token from the API headers
 */
export const removeAuthToken = () => {
    delete axios.defaults.headers.common['Authorization'];
};

/**
 * Get the authentication token from localStorage
 * @returns {string|null} JWT token or null if not found
 */
export const getAuthToken = () => {
    return localStorage.getItem('token');
};

/**
 * Store the authentication token in localStorage
 * @param {string} token - JWT token
 */
export const storeAuthToken = (token) => {
    localStorage.setItem('token', token);
};

/**
 * Parse a JWT token to get its payload
 * @param {string} token - JWT token
 * @returns {object|null} Decoded token payload or null if invalid
 */
export const parseJwt = (token) => {
    try {
        // Get the base64 encoded payload
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');

        // Decode the payload
        const jsonPayload = decodeURIComponent(
            window
                .atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );

        return JSON.parse(jsonPayload);
    } catch (error) {
        return null;
    }
};

/**
 * Check if a JWT token is expired
 * @param {string} token - JWT token
 * @returns {boolean} True if token is expired, false otherwise
 */
export const isTokenExpired = (token) => {
    const payload = parseJwt(token);

    if (!payload || !payload.exp) {
        return true;
    }

    // Get current time in seconds
    const currentTime = Math.floor(Date.now() / 1000);

    // Check if token is expired
    return payload.exp < currentTime;
};

/**
 * Check if a token needs to be refreshed (close to expiration)
 * @param {string} token - JWT token
 * @param {number} thresholdMinutes - Minutes before expiration to consider for refresh
 * @returns {boolean} True if token needs refresh, false otherwise
 */
export const needsRefresh = (token, thresholdMinutes = 5) => {
    const payload = parseJwt(token);

    if (!payload || !payload.exp) {
        return true;
    }

    // Get current time in seconds
    const currentTime = Math.floor(Date.now() / 1000);

    // Calculate threshold in seconds
    const threshold = thresholdMinutes * 60;

    // Check if token is close to expiration
    return payload.exp - currentTime < threshold;
};