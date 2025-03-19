// middleware/errorHandlers.js
const AppError = require('../utils/appError');

/**
 * Handle development environment errors with detailed output
 */
const handleDevelopmentError = (err, res) => {
    res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack
    });
};

/**
 * Handle production environment errors with client-friendly output
 */
const handleProductionError = (err, res) => {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message
        });
    }
    // Programming or other unknown error: don't leak error details
    else {
        // Log error for server debugging
        console.error('ERROR 💥', err);

        // Send generic message
        res.status(500).json({
            status: 'error',
            message: 'Something went wrong'
        });
    }
};

/**
 * Handle MongoDB duplicate key error
 */
const handleDuplicateFieldsDB = (err) => {
    // Extract field name from error message
    const value = err.message.match(/(["'])(\\?.)*?\1/)[0];
    const message = `Duplicate field value: ${value}. Please use another value.`;
    return new AppError(message, 400);
};

/**
 * Handle Mongoose validation error
 */
const handleValidationErrorDB = (err) => {
    const errors = Object.values(err.errors).map(el => el.message);
    const message = `Invalid input data. ${errors.join('. ')}`;
    return new AppError(message, 400);
};

/**
 * Handle MongoDB cast error (invalid ID format)
 */
const handleCastErrorDB = (err) => {
    const message = `Invalid ${err.path}: ${err.value}`;
    return new AppError(message, 400);
};

/**
 * Handle JWT error
 */
const handleJWTError = () => {
    return new AppError('Invalid token. Please log in again.', 401);
};

/**
 * Handle JWT expired error
 */
const handleJWTExpiredError = () => {
    return new AppError('Your token has expired. Please log in again.', 401);
};

/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
        handleDevelopmentError(err, res);
    } else {
        let error = { ...err };
        error.message = err.message;
        error.name = err.name;

        // Handle specific error types
        if (error.code === 11000) error = handleDuplicateFieldsDB(error);
        if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
        if (error.name === 'CastError') error = handleCastErrorDB(error);
        if (error.name === 'JsonWebTokenError') error = handleJWTError();
        if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

        handleProductionError(error, res);
    }
};

/**
 * 404 Not Found middleware for unhandled routes
 */
const notFoundHandler = (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
};

module.exports = {
    errorHandler,
    notFoundHandler
};