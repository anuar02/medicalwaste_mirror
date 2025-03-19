// server.js - Main application file
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

// Import routes
const authRoutes = require('./routes/auth');
const wasteBinRoutes = require('./routes/wasteBins');
const historyRoutes = require('./routes/history');
const userRoutes = require('./routes/users');
const deviceRoutes = require('./routes/devices');

// Import middlewares
const { errorHandler, notFoundHandler } = require('./middleware/errorHandlers');
const { requestLogger } = require('./middleware/loggers');

const app = express();

// Create a write stream for access logs
const accessLogStream = fs.createWriteStream(
    path.join(__dirname, 'logs', 'access.log'),
    { flags: 'a' }
);

// Security Headers
app.use(helmet());

// Request logging
app.use(morgan('combined', { stream: accessLogStream }));
app.use(requestLogger);

// CORS Configuration
app.use(cors({
    origin: ['https://narutouzumaki.kz', 'http://localhost:3001'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400 // 24 hours
}));

// Rate limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
});

// Apply rate limiter to all routes
app.use(apiLimiter);

// More strict rate limiting for authentication endpoints
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100, // limit each IP to 10 login attempts per hour
    message: 'Too many login attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
});

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Compression
app.use(compression());

// Cache control
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
});

// MongoDB Connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 15000,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 15000,
            writeConcern: { w: 1, j: true },
        });
        console.log('Connected to MongoDB successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1); // Exit process if DB connection fails
    }
};

// Handle MongoDB connection events
mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected, attempting to reconnect...');
    setTimeout(connectDB, 5000);
});

// Connect to MongoDB
connectDB();

// Mount routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/waste-bins', wasteBinRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/users', userRoutes);
app.use('/api/devices', deviceRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Error handling - must be after routes
app.use(notFoundHandler);
app.use(errorHandler);

// Server startup
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received. Closing server...');
    server.close(() => {
        console.log('Server closed.');
        mongoose.connection.close(false, () => {
            console.log('MongoDB connection closed.');
            process.exit(0);
        });
    });
});

module.exports = { app, server };