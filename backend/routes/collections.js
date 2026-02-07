// routes/collections.js
const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const {
    startCollection,
    stopCollection,
    recordDriverLocation,
    addContainerToSession,
    getActiveSession,
    getCollectionHistory,
    getActiveDrivers,
    getSessionRoute
} = require('../controllers/collectionController');
const { auth, restrictTo } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validators');

// All routes require authentication
router.use(auth);

// Driver routes
router.post('/start',
    restrictTo('driver'),
    [
        body('containerIds').optional().isArray({ min: 1 }).withMessage('containerIds must be a non-empty array'),
        body('containerIds.*').customSanitizer(v => (v == null ? v : String(v).trim())),
        body('routeId').optional().isMongoId().withMessage('routeId must be a valid ID'),
        body('startLocation.coordinates').optional().isArray({ min: 2, max: 2 }).withMessage('Invalid coordinates'),
    ],
    validateRequest,
    startCollection
);

router.post('/stop',
    restrictTo('driver'),
    [
        body('sessionId').trim().notEmpty().withMessage('Session ID is required'),
        body('endLocation.coordinates').optional().isArray({ min: 2, max: 2 }).withMessage('Invalid coordinates')
    ],
    validateRequest,
    stopCollection
);

router.post('/location',
    restrictTo('driver'),
    [
        body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude is required'),
        body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude is required'),
        body('accuracy').optional().isFloat({ min: 0 }).withMessage('Accuracy must be positive'),
        body('speed').optional().isFloat({ min: 0 }).withMessage('Speed must be positive')
    ],
    validateRequest,
    recordDriverLocation
);

router.post('/add-container',
    restrictTo('driver'),
    [
        body('containerId').isMongoId().withMessage('Valid container ID is required')
    ],
    validateRequest,
    addContainerToSession
);

router.get('/active',
    restrictTo('driver'),
    getActiveSession
);

router.get('/history/:driverId?',
    [
        param('driverId').optional().isMongoId().withMessage('Invalid driver ID'),
        query('from').optional().isISO8601().withMessage('Invalid from date'),
        query('to').optional().isISO8601().withMessage('Invalid to date'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
        query('page').optional().isInt({ min: 1 }).withMessage('Page must be at least 1')
    ],
    validateRequest,
    getCollectionHistory
);

// Supervisor/Admin routes
router.get('/active-drivers',
    restrictTo('admin', 'supervisor'),
    getActiveDrivers
);

router.get('/session/:sessionId/route',
    [
        param('sessionId').trim().notEmpty().withMessage('Session ID is required')
    ],
    validateRequest,
    getSessionRoute
);

module.exports = router;
