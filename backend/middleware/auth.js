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
        const user = await User.findById(decoded.userId);
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
/**
 * Device authentication middleware for IoT devices
 * Checks for X-API-Key header instead of JWT token
 */
const deviceAuth = async (req, res, next) => {
    try {
        // Get API key from headers
        const apiKey = req.headers['x-api-key'];

        // Log for debugging
        console.log('Device auth - received API key:', apiKey);

        if (!apiKey) {
            return res.status(401).json({
                status: 'fail',
                message: 'API key required in X-API-Key header'
            });
        }

        // Check against your expected API key
        const expectedApiKey = process.env.DEVICE_API_KEY || '61e22b5ce396dc63971206c55f406c4643fba0f2bb5abaaf96aa788df7574931';

        if (apiKey !== expectedApiKey) {
            console.log('Device auth - invalid API key:', apiKey);
            return res.status(401).json({
                status: 'fail',
                message: 'Invalid API key'
            });
        }

        // Set device authentication flag
        req.authenticated = true;
        req.authType = 'device';
        req.userId = 'device'; // For logging purposes

        console.log('Device auth - success');
        next();
    } catch (error) {
        console.error('Device auth error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Authentication error'
        });
    }
};
/**
 * Middleware to restrict access to certain roles
 * @param  {...String} roles - Roles allowed to access the route
 * @returns {Function} - Express middleware
 */
const restrictTo = (...roles) => {
    return (req, res, next) => {
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
    deviceAuth,
    supervisorAuth
};