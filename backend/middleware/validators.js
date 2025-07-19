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

/**
 * Alias for sanitizeData to match route usage
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const sanitizeInput = (req, res, next) => {
    // Function to sanitize a string
    const sanitizeString = (str) => {
        if (typeof str !== 'string') return str;
        return str
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;')
            .trim(); // Also trim whitespace
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
 * Middleware to check if user has ownership/access to a specific bin
 * This assumes you have a WasteBin model to check against
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const checkBinOwnership = async (req, res, next) => {
    try {
        const binId = req.params.id;
        const user = req.user;

        if (!binId) {
            return res.status(400).json({
                status: 'fail',
                message: 'Bin ID is required'
            });
        }

        if (!user) {
            return res.status(401).json({
                status: 'fail',
                message: 'Authentication required'
            });
        }

        // If user is admin, allow access to all bins
        if (user.role === 'admin') {
            return next();
        }

        // For other users, you might want to check:
        // 1. If the bin belongs to their department
        // 2. If they have explicit access to this bin
        // 3. If they are a supervisor with broader access

        // Example implementation (adjust based on your WasteBin model):
        // Uncomment and modify based on your actual model structure
        /*
        const WasteBin = require('../models/WasteBin');
        const bin = await WasteBin.findOne({
            $or: [
                { _id: binId },
                { binId: binId }
            ]
        });

        if (!bin) {
            return res.status(404).json({
                status: 'fail',
                message: 'Bin not found'
            });
        }

        // Check ownership based on department or user access
        const hasAccess = (
            bin.department === user.department ||
            user.role === 'supervisor' ||
            (bin.authorizedUsers && bin.authorizedUsers.includes(user.id))
        );

        if (!hasAccess) {
            return res.status(403).json({
                status: 'fail',
                message: 'Access denied to this bin'
            });
        }
        */

        // Temporary implementation - allows all authenticated users
        // Replace this with actual ownership logic above
        console.log(`Access check for bin ${binId} by user ${user.id || user._id}`);

        next();
    } catch (error) {
        console.error('Bin ownership check error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Server error during ownership check'
        });
    }
};

/**
 * Enhanced bin ownership check with caching for better performance
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const checkBinOwnershipWithCache = async (req, res, next) => {
    try {
        const binId = req.params.id;
        const user = req.user;

        // Create cache key
        const cacheKey = `bin_access_${user.id || user._id}_${binId}`;

        // Check cache first (if you implement caching)
        // const cachedResult = cache.get(cacheKey);
        // if (cachedResult !== undefined) {
        //     return cachedResult ? next() : res.status(403).json({
        //         status: 'fail',
        //         message: 'Access denied to this bin'
        //     });
        // }

        // If not in cache, perform the full check
        // ... same logic as checkBinOwnership above ...
        // Then cache the result

        // For now, just call the regular check
        return checkBinOwnership(req, res, next);
    } catch (error) {
        console.error('Cached bin ownership check error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Server error during ownership check'
        });
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
    sanitizeInput,        // New export
    checkBinOwnership,    // New export
    checkBinOwnershipWithCache, // Alternative with caching
    validateApiKey,
    auth
};