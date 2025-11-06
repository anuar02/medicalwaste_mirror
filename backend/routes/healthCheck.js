// routes/healthCheck.js
const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const {
    receiveHealthCheck,
    getLatestHealthCheck,
    getHealthCheckHistory,
    getAllDevicesHealth,
    getUnhealthyDevices,
    getHealthStatistics,
    deleteOldHealthChecks
} = require('../controllers/healthCheckController');
const { auth, restrictTo } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validators');

// Validation for health check data from device
const healthCheckValidation = [
    body('binId')
        .trim()
        .notEmpty()
        .withMessage('Bin ID is required'),
    body('macAddress')
        .trim()
        .notEmpty()
        .withMessage('MAC address is required'),
    body('wifiConnected')
        .optional()
        .isBoolean()
        .withMessage('WiFi connected must be boolean'),
    body('wifiSignalStrength')
        .optional()
        .isInt()
        .withMessage('WiFi signal strength must be integer'),
    body('serverReachable')
        .optional()
        .isBoolean()
        .withMessage('Server reachable must be boolean'),
    body('overallStatus')
        .optional()
        .isIn(['healthy', 'unhealthy', 'warning'])
        .withMessage('Overall status must be healthy, unhealthy, or warning')
];

// Public route - device sends health check data (requires API key)
router.post(
    '/',
    healthCheckValidation,
    validateRequest,
    receiveHealthCheck
);

// Protected routes - require authentication
router.use(auth);

// Get all devices with health status
router.get('/devices', getAllDevicesHealth);

// Get unhealthy devices
router.get('/unhealthy', getUnhealthyDevices);

// Get health statistics
router.get('/statistics', [
    query('from')
        .optional()
        .isISO8601()
        .withMessage('From date must be valid ISO date'),
    query('to')
        .optional()
        .isISO8601()
        .withMessage('To date must be valid ISO date')
], validateRequest, getHealthStatistics);

// Get latest health check for specific bin
router.get('/bin/:binId/latest', [
    param('binId')
        .trim()
        .notEmpty()
        .withMessage('Bin ID is required')
], validateRequest, getLatestHealthCheck);

// Get health check history for specific bin
router.get('/bin/:binId/history', [
    param('binId')
        .trim()
        .notEmpty()
        .withMessage('Bin ID is required'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100')
], validateRequest, getHealthCheckHistory);

// Admin only routes
router.use(restrictTo('admin'));

// Delete old health check data
router.delete('/cleanup', [
    query('days')
        .optional()
        .isInt({ min: 1, max: 365 })
        .withMessage('Days must be between 1 and 365')
], validateRequest, deleteOldHealthChecks);

module.exports = router;
