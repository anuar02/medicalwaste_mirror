// server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

const { initializeBot } = require('./utils/telegram');
const { logger } = require('./middleware/loggers');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandlers');
const { requestLogger } = require('./middleware/loggers');
const { initializeGpsWebSocket } = require('./utils/gpsWebSocket');
const { startSmartSchedulerJob } = require('./jobs/smartSchedulerCron');

// Routes
const authRoutes = require('./routes/auth');
const wasteBinRoutes = require('./routes/wasteBins');
const companyRoutes = require('./routes/companies');
const collectionRoutes = require('./routes/collections');
const historyRoutes = require('./routes/history');
const userRoutes = require('./routes/users');
const deviceRoutes = require('./routes/devices');
const trackingRoutes = require('./routes/tracking');
const adminRoutes = require('./routes/admin');
const telegramRoutes = require('./routes/telegram');
const driverRoutes = require('./routes/drivers');
const medicalCompanyRoutes = require('./routes/medicalCompanies');
const gpsRoutes = require('./routes/gps');
const deviceLogsRoutes = require('./routes/deviceLogs');
const healthCheckRoutes = require('./routes/healthCheck');
const routeRoutes = require('./routes/routes');
const handoffRoutes = require('./routes/handoffs');
const notificationRoutes = require('./routes/notifications');
const incinerationPlantRoutes = require('./routes/incinerationPlants');

const app = express();

// If behind proxy/ingress
app.set('trust proxy', 'loopback');

// ------------------------------------
// Telegram bot (optional)
// ------------------------------------
if (process.env.TELEGRAM_BOT_TOKEN) {
    initializeBot()
        .then(() => logger.info('Telegram bot initialized successfully'))
        .catch(err => logger.error(`Failed to initialize Telegram bot: ${err.message}`));
} else {
    logger.warn('TELEGRAM_BOT_TOKEN not set. Telegram notifications will not work.');
}

// ------------------------------------
// Logging
// ------------------------------------
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
const accessLogStream = fs.createWriteStream(path.join(logsDir, 'access.log'), { flags: 'a' });

app.use(morgan('combined', { stream: accessLogStream }));
app.use(requestLogger);

// ------------------------------------
// Security headers
// NOTE: allow cross-origin resources for WebView use cases
// ------------------------------------
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// ------------------------------------
// CORS (MUST come before any rate limiters/auth/routes)
// Allows Capacitor (iOS/Android WebView), localhost, and your production domain.
// ------------------------------------
const ALLOWED_ORIGINS = [
    'https://medicalwaste.kz',
    'http://localhost',
    'https://localhost',
    'http://localhost:3000',
    'http://localhost:4000',
    'capacitor://localhost' // Capacitor WebView origin
];

app.use(cors({
    origin: (origin, cb) => {
        // Mobile WebView often sends no Origin; allow such requests
        if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
        return cb(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Requested-With'],
    exposedHeaders: ['Authorization'],
    credentials: false, // Using Bearer tokens, not cookies
    maxAge: 86400
}));

// Fast-track all preflight requests (critical for mobile/webviews)
app.options('*', cors());

// ------------------------------------
// Rate limiting (after OPTIONS so preflights aren’t blocked)
// ------------------------------------
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5000,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
});
app.use(apiLimiter);

const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 100,
    message: 'Too many login attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
});

// ------------------------------------
// Parsers & performance
// ------------------------------------
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(compression());

// No-store for API responses
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
});

// ------------------------------------
// MongoDB
// ------------------------------------
async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 15000,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 15000,
            // Mongoose v6+ uses these by default, leaving explicit for clarity:
            useNewUrlParser: true,
            useUnifiedTopology: true,
            writeConcern: { w: 1, j: true }
        });
        console.log('Connected to MongoDB successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
}
mongoose.connection.on('error', err => console.error('MongoDB connection error:', err));
mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected, attempting to reconnect...');
    setTimeout(connectDB, 5000);
});
connectDB();

// ------------------------------------
// Routes
// ------------------------------------
app.use('/api/health-check', healthCheckRoutes);
app.use('/api', deviceLogsRoutes);
app.use('/api/gps', gpsRoutes);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api/waste-bins', wasteBinRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/users', userRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/medical-companies', medicalCompanyRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/handoffs', handoffRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/incineration-plants', incinerationPlantRoutes);

// Lightweight health endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// ------------------------------------
// Errors (must be after routes)
// ------------------------------------
app.use(notFoundHandler);
app.use(errorHandler);

// ------------------------------------
// Server & GPS WebSocket
// ------------------------------------
const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const cleanupGpsWs = initializeGpsWebSocket(server);
const cleanupSmartScheduler = startSmartSchedulerJob();

// ------------------------------------
// Graceful shutdown
// ------------------------------------
async function gracefulShutdown(signal) {
    console.log(`${signal} signal received. Starting graceful shutdown...`);
    try {
        if (cleanupGpsWs) {
            cleanupGpsWs();
            console.log('✓ GPS WebSocket cleaned up');
        }
        if (cleanupSmartScheduler) {
            cleanupSmartScheduler();
            console.log('✓ Smart scheduler job stopped');
        }
        await new Promise((resolve, reject) => {
            server.close(err => (err ? reject(err) : resolve()));
        });
        console.log('✓ HTTP server closed');

        await mongoose.connection.close();
        console.log('✓ MongoDB connection closed');

        console.log('Graceful shutdown completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error during graceful shutdown:', error);
        process.exit(1);
    }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});

module.exports = { app, server };
