// middleware/validators.js
const { validationResult } = require('express-validator');
const AppError = require('../utils/appError');

/**
 * Middleware to validate request data using express-validator
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        // Extract error messages
        const errorMessages = errors.array().map(err =>
            `${err.param}: ${err.msg}`
        ).join('. ');

        return next(new AppError(errorMessages, 400));
    }

    next();
};

/**
 * Sanitize middleware for preventing XSS attacks
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const sanitizeData = (req, res, next) => {
    // Function to sanitize a string
    const sanitizeString = (str) => {
        if (typeof str !== 'string') return str;
        return str
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    };

    // Function to recursively sanitize an object
    const sanitizeObject = (obj) => {
        if (!obj) return obj;

        if (typeof obj === 'string') {
            return sanitizeString(obj);
        }

        if (Array.isArray(obj)) {
            return obj.map(item => sanitizeObject(item));
        }

        if (typeof obj === 'object') {
            const sanitized = {};
            for (const [key, value] of Object.entries(obj)) {
                sanitized[key] = sanitizeObject(value);
            }
            return sanitized;
        }

        return obj;
    };

    // Sanitize request body, query and params
    if (req.body) {
        req.body = sanitizeObject(req.body);
    }

    if (req.query) {
        req.query = sanitizeObject(req.query);
    }

    if (req.params) {
        req.params = sanitizeObject(req.params);
    }

    next();
};

/**
 * API key validation middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const validateApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        return next(new AppError('API key is missing', 401));
    }

    // Check if API key is valid (from database or environment variable)
    if (apiKey !== process.env.API_KEY) {
        return next(new AppError('Invalid API key', 401));
    }

    next();
};

module.exports = {
    validateRequest,
    sanitizeData,
    validateApiKey
};