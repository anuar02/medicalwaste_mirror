// routes/tracking.js - Updated with collection functionality
const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const {
    recordLocation,
    checkCommands,
    confirmCommand,
    sendCommand,
    getDeviceHistory,
    getLastLocation,
    getAllDevicesLocations,
    getCollectionPoints,
    getDriverStats
} = require('../controllers/trackingController');
const { auth, validateApiKey } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validators');

// Input validation for location recording
const locationRecordValidation = [
    body('deviceId')
        .trim()
        .notEmpty()
        .withMessage('Device ID is required'),
    body('latitude')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Latitude must be between -90 and 90'),
    body('longitude')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Longitude must be between -180 and 180'),
    body('altitude')
        .optional()
        .isFloat()
        .withMessage('Altitude must be a number'),
    body('speed')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Speed must be a positive number'),
    body('course')
        .optional()
        .isFloat({ min: 0, max: 360 })
        .withMessage('Course must be between 0 and 360 degrees'),
    body('battery')
        .optional()
        .isInt({ min: 0, max: 100 })
        .withMessage('Battery must be between 0 and 100 percent'),
    body('isCollecting')
        .optional()
        .isBoolean()
        .withMessage('isCollecting must be a boolean'),
    body('isCheckpoint')
        .optional()
        .isBoolean()
        .withMessage('isCheckpoint must be a boolean'),
    body('timestamp')
        .optional()
        .isISO8601()
        .withMessage('Timestamp must be a valid ISO date')
];

// Input validation for command
const commandValidation = [
    body('deviceId')
        .trim()
        .notEmpty()
        .withMessage('Device ID is required'),
    body('command')
        .trim()
        .notEmpty()
        .withMessage('Command is required')
        .isIn(['setCollectingMode', 'restart', 'updateConfig', 'requestLocation', 'sleep'])
        .withMessage('Invalid command')
];

// Routes for device communication (API key validation)
router.post('/record', locationRecordValidation, recordLocation);
router.get('/check-commands', checkCommands);
router.post('/confirm-command', confirmCommand);

// Protected routes (requires authentication)
router.use(auth);

// Routes for all authenticated users
router.get('/devices', getAllDevicesLocations);
router.get('/devices/:deviceId',
    param('deviceId').trim().notEmpty().withMessage('Device ID is required'),
    validateRequest,
    getLastLocation
);
router.get('/history/:deviceId', [
    param('deviceId').trim().notEmpty().withMessage('Device ID is required'),
    query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000'),
    query('from').optional().isISO8601().withMessage('From date must be valid ISO date'),
    query('to').optional().isISO8601().withMessage('To date must be valid ISO date')
], validateRequest, getDeviceHistory);

// Collection-specific routes
router.get('/collection-points', getCollectionPoints);
router.get('/driver-stats/:driverId', [
    param('driverId').trim().notEmpty().withMessage('Driver ID is required'),
    query('from').optional().isISO8601().withMessage('From date must be valid ISO date'),
    query('to').optional().isISO8601().withMessage('To date must be valid ISO date')
], validateRequest, getDriverStats);

// Admin routes for sending commands
router.post('/send-command', commandValidation, validateRequest, sendCommand);

module.exports = router;