// middleware/auth.js
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const User = require('../models/User');
const AppError = require('../utils/appError');

/**
 * Middleware to check if user is authenticated
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const auth = async (req, res, next) => {
    try {
        // 1) Check if token exists
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return next(new AppError('You are not logged in. Please log in to get access.', 401));
        }

        // 2) Verify token
        const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

        // 3) Check if user still exists
        const user = await User.findById(decoded.id);
        if (!user) {
            return next(new AppError('The user belonging to this token no longer exists.', 401));
        }

        // 4) Check if user is active
        if (!user.active) {
            return next(new AppError('This user account has been deactivated.', 401));
        }

        // 5) Check if token was issued before password change
        if (user.passwordChangedAt) {
            const changedTimestamp = parseInt(user.passwordChangedAt.getTime() / 1000, 10);
            if (decoded.iat < changedTimestamp) {
                return next(new AppError('User recently changed password. Please log in again.', 401));
            }
        }

        // 6) Check if account is locked
        if (user.lockedUntil && user.lockedUntil > Date.now()) {
            const minutesLeft = Math.ceil((user.lockedUntil - Date.now()) / (60 * 1000));
            return next(
                new AppError(
                    `Account is temporarily locked due to too many failed login attempts. Please try again in ${minutesLeft} minutes.`,
                    403
                )
            );
        }

        // Grant access to protected route
        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return next(new AppError('Invalid token. Please log in again.', 401));
        }
        if (error.name === 'TokenExpiredError') {
            return next(new AppError('Your token has expired. Please log in again.', 401));
        }
        next(error);
    }
};

// Add these functions to your middleware/auth.js file

const ApiKey = require('../models/apiKey'); // Adjust path based on your model location

/**
 * API key authentication middleware for IoT devices
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const apiKeyAuth = async (req, res, next) => {
    try {
        // Get API key from header
        const apiKey = req.header('X-API-Key');

        if (!apiKey) {
            return next(new AppError('API key is required', 401));
        }

        // Find API key in database
        const validKey = await ApiKey.findOne({
            key: apiKey,
            active: true
        });

        if (!validKey) {
            return next(new AppError('Invalid or inactive API key', 403));
        }

        // Check if API key has expired
        if (validKey.expiresAt && validKey.expiresAt < new Date()) {
            return next(new AppError('API key has expired', 403));
        }

        // Add device info to request
        req.deviceId = validKey.deviceId;
        req.apiKey = validKey;

        // Update last used timestamp
        await ApiKey.updateOne(
            { _id: validKey._id },
            {
                $set: { lastUsed: new Date() },
                $inc: { usageCount: 1 }
            }
        );

        next();
    } catch (error) {
        console.error('API key validation error:', error);
        next(new AppError('Server error during API key validation', 500));
    }
};

/**
 * Device authentication middleware - specifically for IoT device endpoints
 * This is more restrictive than apiKeyAuth and includes additional device-specific checks
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const deviceAuth = async (req, res, next) => {
    try {
        // Get device credentials from headers
        const deviceId = req.header('X-Device-ID');
        const deviceSecret = req.header('X-Device-Secret');
        const apiKey = req.header('X-API-Key');

        // If API key is provided, use API key auth
        if (apiKey) {
            return apiKeyAuth(req, res, next);
        }

        // Otherwise, require device ID and secret
        if (!deviceId || !deviceSecret) {
            return next(new AppError('Device authentication required', 401));
        }

        // Verify device credentials
        // You might want to create a Device model for this
        const validKey = await ApiKey.findOne({
            deviceId: deviceId,
            deviceSecret: deviceSecret, // If you store device secrets
            active: true
        });

        if (!validKey) {
            return next(new AppError('Invalid device credentials', 403));
        }

        // Check if device is registered and active
        if (validKey.status !== 'active') {
            return next(new AppError('Device is not active', 403));
        }

        // Rate limiting check for specific device
        const now = new Date();
        const oneMinuteAgo = new Date(now.getTime() - 60000);

        // Simple rate limiting - you might want to use Redis for this
        if (validKey.lastRequest && validKey.lastRequest > oneMinuteAgo) {
            const requestsInLastMinute = validKey.recentRequests || 0;
            if (requestsInLastMinute > 100) { // 100 requests per minute limit
                return next(new AppError('Device rate limit exceeded', 429));
            }
        }

        // Update device info
        req.deviceId = validKey.deviceId;
        req.device = validKey;

        // Update last request timestamp
        await ApiKey.updateOne(
            { _id: validKey._id },
            {
                $set: {
                    lastRequest: now,
                    lastUsed: now
                },
                $inc: {
                    usageCount: 1,
                    recentRequests: 1
                }
            }
        );

        next();
    } catch (error) {
        console.error('Device authentication error:', error);
        next(new AppError('Server error during device authentication', 500));
    }
};

/**
 * Alternative simple device auth if you don't need complex device management
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const simpleDeviceAuth = async (req, res, next) => {
    try {
        const apiKey = req.header('X-API-Key') || req.header('Authorization')?.replace('Bearer ', '');

        if (!apiKey) {
            return next(new AppError('Device authentication required', 401));
        }

        // Simple API key validation
        const validKey = await ApiKey.findOne({
            key: apiKey,
            active: true
        });

        if (!validKey) {
            return next(new AppError('Invalid device credentials', 403));
        }

        req.deviceId = validKey.deviceId;
        req.device = validKey;

        // Update usage
        await ApiKey.updateOne(
            { _id: validKey._id },
            { $set: { lastUsed: new Date() } }
        );

        next();
    } catch (error) {
        console.error('Simple device auth error:', error);
        next(new AppError('Server error during device authentication', 500));
    }
};


/**
 * Middleware to restrict access to certain roles
 * @param  {...String} roles - Roles allowed to access the route
 * @returns {Function} - Express middleware
 */
const restrictTo = (...roles) => {
    return (req, res, next) => {
        // Check if req.user exists (should be set by auth middleware)
        if (!req.user) {
            return next(
                new AppError('Authentication required. Please log in.', 401)
            );
        }

        // Check if user's role is in the allowed roles
        if (!roles.includes(req.user.role)) {
            return next(
                new AppError('You do not have permission to perform this action.', 403)
            );
        }
        next();
    };
};

/**
 * Admin auth middleware - combines auth and admin role check
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const adminAuth = [auth, restrictTo('admin')];

/**
 * Supervisor auth middleware - combines auth and supervisor or admin role check
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const supervisorAuth = [auth, restrictTo('admin', 'supervisor')];

module.exports = {
    auth,
    restrictTo,
    adminAuth,
    supervisorAuth,
    apiKeyAuth,      // Add this
    deviceAuth,      // Add this
    simpleDeviceAuth // Alternative option
};
