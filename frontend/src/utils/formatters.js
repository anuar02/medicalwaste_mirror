// utils/formatters.js

/**
 * Format a date to a human-readable string
 * @param {string|Date} date - Date to format
 * @param {boolean} includeTime - Whether to include time in the format
 * @param {boolean} useRelative - Whether to use relative time for recent dates
 * @returns {string} Formatted date string
 */
export const formatDate = (date, includeTime = true, useRelative = false) => {
    if (!date) return 'Не указано';

    const dateObj = new Date(date);

    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
        return 'Некорректная дата';
    }

    // Use relative time for recent dates if requested
    if (useRelative) {
        const now = new Date();
        const diffMs = now - dateObj;
        const diffSec = Math.round(diffMs / 1000);
        const diffMin = Math.round(diffSec / 60);
        const diffHour = Math.round(diffMin / 60);
        const diffDay = Math.round(diffHour / 24);

        if (diffSec < 10) return 'Только что';
        if (diffSec < 60) return `${diffSec} сек. назад`;
        if (diffMin < 60) return `${diffMin} мин. назад`;
        if (diffHour < 24) return `${diffHour} ч. назад`;
        if (diffDay < 7) return `${diffDay} д. назад`;
    }

    // Format date options
    const dateOptions = { day: 'numeric', month: 'short', year: 'numeric' };

    // Add time options if requested
    if (includeTime) {
        dateOptions.hour = '2-digit';
        dateOptions.minute = '2-digit';
    }

    return dateObj.toLocaleString('ru-RU', dateOptions);
};

/**
 * Format a time string from a date
 * @param {string|Date} date - Date to extract time from
 * @returns {string} Formatted time string
 */
export const formatTime = (date) => {
    if (!date) return '';

    const dateObj = new Date(date);

    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
        return '';
    }

    return dateObj.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
};

/**
 * Format a percentage value with specified precision
 * @param {number} value - Value to format
 * @param {number} precision - Number of decimal places
 * @returns {string} Formatted percentage string
 */
export const formatPercentage = (value, precision = 0) => {
    if (value === null || value === undefined) return '-';

    return `${parseFloat(value).toFixed(precision)}%`;
};

/**
 * Format a currency value
 * @param {number} value - Value to format
 * @param {string} currency - Currency code
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (value, currency = 'KZT') => {
    if (value === null || value === undefined) return '-';

    return new Intl.NumberFormat('ru-KZ', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};

/**
 * Format a number with thousands separators
 * @param {number} value - Value to format
 * @param {number} precision - Number of decimal places
 * @returns {string} Formatted number string
 */
export const formatNumber = (value, precision = 0) => {
    if (value === null || value === undefined) return '-';

    return new Intl.NumberFormat('ru-KZ', {
        minimumFractionDigits: precision,
        maximumFractionDigits: precision,
    }).format(value);
};

/**
 * Format a file size in bytes to a human-readable string
 * @param {number} bytes - Size in bytes
 * @param {number} precision - Number of decimal places
 * @returns {string} Formatted file size string
 */
export const formatFileSize = (bytes, precision = 1) => {
    if (bytes === 0) return '0 Байт';

    const k = 1024;
    const sizes = ['Байт', 'КБ', 'МБ', 'ГБ', 'ТБ'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(precision))} ${sizes[i]}`;
};

/**
 * Truncate a string to a specified length
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length
 * @param {string} suffix - Suffix to add to truncated string
 * @returns {string} Truncated string
 */
export const truncateString = (str, maxLength = 50, suffix = '...') => {
    if (!str) return '';
    if (str.length <= maxLength) return str;

    return `${str.substring(0, maxLength - suffix.length)}${suffix}`;
};

/**
 * Format a phone number to a standard format
 * @param {string} phone - Phone number to format
 * @returns {string} Formatted phone number
 */
export const formatPhoneNumber = (phone) => {
    if (!phone) return '';

    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');

    // Format for Kazakhstan phone numbers (7xxxxxxxxxx)
    if (digits.length === 11 && digits.startsWith('7')) {
        return `+${digits.substring(0, 1)} (${digits.substring(1, 4)}) ${digits.substring(4, 7)}-${digits.substring(7, 9)}-${digits.substring(9, 11)}`;
    }

    // Return original if can't format
    return phone;
};