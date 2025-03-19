// middleware/loggers.js
const winston = require('winston');
const { format, transports } = winston;

// Create logger instance
const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: format.combine(
        format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        format.errors({ stack: true }),
        format.splat(),
        format.json()
    ),
    defaultMeta: { service: 'medical-waste-api' },
    transports: [
        // Write logs to console
        new transports.Console({
            format: format.combine(
                format.colorize(),
                format.printf(
                    ({ timestamp, level, message, ...meta }) => {
                        return `${timestamp} [${level}]: ${message} ${
                            Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
                        }`;
                    }
                )
            )
        }),
        // Write to error and combined logs
        new transports.File({ filename: 'logs/error.log', level: 'error' }),
        new transports.File({ filename: 'logs/combined.log' })
    ]
});

// Request logging middleware
const requestLogger = (req, res, next) => {
    // Skip logging for health checks and static assets
    if (req.path === '/api/health' || req.path.startsWith('/static')) {
        return next();
    }

    const start = Date.now();

    // Log on response finish
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logLevel = res.statusCode >= 400 ? 'warn' : 'info';

        logger[logLevel]({
            message: `${req.method} ${req.originalUrl}`,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
            userId: req.user ? req.user._id : 'unauthenticated'
        });
    });

    next();
};

// Export logger and middleware
module.exports = {
    logger,
    requestLogger
};