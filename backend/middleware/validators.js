// middleware/validators.js
const ApiKey = require('../models/apiKey'); // Adjust based on your model structure
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
        return res.status(400).json({
            status: 'fail',
            errors: errors.array()
        });
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


// API key validation middleware
const jwt = require('jsonwebtoken');
const auth = (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid authentication token' });
    }
};

// API key validation middleware (for IoT devices)
const validateApiKey = async (req, res, next) => {
    try {
        // Get API key from header
        const apiKey = req.header('X-API-Key');

        if (!apiKey) {
            return res.status(401).json({ error: 'API key is required' });
        }

        // Find API key in database
        const validKey = await ApiKey.findOne({ key: apiKey, active: true });

        if (!validKey) {
            return res.status(403).json({ error: 'Invalid or inactive API key' });
        }

        // Add device info to request
        req.deviceId = validKey.deviceId;

        // Update last used timestamp
        await ApiKey.updateOne(
            { _id: validKey._id },
            { $set: { lastUsed: new Date() } }
        );

        next();
    } catch (error) {
        console.error('API key validation error:', error);
        res.status(500).json({ error: 'Server error during API key validation' });
    }
};

module.exports = {
    validateRequest,
    sanitizeData,
    validateApiKey
};