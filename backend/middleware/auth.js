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
    supervisorAuth
};