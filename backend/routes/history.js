// routes/history.js
const express = require('express');
const router = express.Router();
const { param, query } = require('express-validator');
const {
    getBinHistory,
    getMultipleBinsHistory,
    getAggregatedHistory,
    deleteHistoryData,
    exportHistoryData
} = require('../controllers/historyController');
const { auth, restrictTo, adminAuth } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validators');

// All routes require authentication
router.use(auth);

// Get history for a single bin
router.get('/bin/:id', [
    param('id').trim().notEmpty().withMessage('Bin ID is required'),
    query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000'),
    query('from').optional().isISO8601().withMessage('From date must be valid ISO date'),
    query('to').optional().isISO8601().withMessage('To date must be valid ISO date')
], validateRequest, getBinHistory);

// Get history for multiple bins
router.get('/bins', [
    query('ids').notEmpty().withMessage('Bin IDs are required'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('from').optional().isISO8601().withMessage('From date must be valid ISO date'),
    query('to').optional().isISO8601().withMessage('To date must be valid ISO date')
], validateRequest, getMultipleBinsHistory);

// Get aggregated history data (hourly, daily, weekly)
router.get('/aggregated/:id', [
    param('id').trim().notEmpty().withMessage('Bin ID is required'),
    query('timeFrame').isIn(['hour', 'day', 'week']).withMessage('Time frame must be hour, day, or week'),
    query('from').optional().isISO8601().withMessage('From date must be valid ISO date'),
    query('to').optional().isISO8601().withMessage('To date must be valid ISO date')
], validateRequest, getAggregatedHistory);

// Export history data (CSV, JSON)
router.get('/export/:id', [
    param('id').trim().notEmpty().withMessage('Bin ID is required'),
    query('format').isIn(['csv', 'json']).withMessage('Format must be csv or json'),
    query('from').optional().isISO8601().withMessage('From date must be valid ISO date'),
    query('to').optional().isISO8601().withMessage('To date must be valid ISO date')
], validateRequest, exportHistoryData);

// Admin routes
router.use(restrictTo('admin'));

// Delete history data (admin only)
router.delete('/:id', [
    param('id').trim().notEmpty().withMessage('Bin ID is required'),
    query('from').optional().isISO8601().withMessage('From date must be valid ISO date'),
    query('to').optional().isISO8601().withMessage('To date must be valid ISO date'),
    query('confirm').equals('true').withMessage('Confirmation required')
], validateRequest, deleteHistoryData);

module.exports = router;