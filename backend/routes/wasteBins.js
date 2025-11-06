const express = require('express');
const router = express.Router();
const {body, param, query} = require('express-validator');
const rateLimit = require('express-rate-limit');

// Simple audit logging function (you can enhance this later)
const logActivity = (action) => {
    return (req, res, next) => {
        console.log(`[${new Date().toISOString()}] ${action} - User: ${req.user?.id || 'anonymous'} - IP: ${req.ip}`);
        next();
    };
};

const {
    getAllBins,
    getBin,
    createBin,
    updateBin,
    deleteBin,
    getBinHistory,
    updateBinLevel,
    registerDevice,
    checkDeviceRegistration,
    getNearbyBins,
    getOverfilledBins,
    getStatistics,
    sendManualAlert,
    bulkUpdateBins,
    exportBinData,
    getBinAnalytics,
    predictMaintenance,
    getBinAlerts,
    dismissAlert,
    scheduleCollection,
    getCollectionRoutes,
    optimizeRoutes,
    getBinMetrics,
    setCollectingMode,
    sendDeviceCommand,
    getDeviceCommands,
    markCommandExecuted
} = require('../controllers/wasteBinController');

const {
    auth,
    restrictTo,
    apiKeyAuth,
    deviceAuth
} = require('../middleware/auth');

const {
    validateRequest,
    sanitizeInput,
    checkBinOwnership
} = require('../middleware/validators');

// Rate limiting for different endpoint types
const createBinLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 bin creation requests per windowMs
    message: {
        status: 'fail',
        message: 'Too many bins created, try again later'
    }
});

const wasteLevelLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // Allow frequent updates from IoT devices
    message: {
        status: 'fail',
        message: 'Rate limit exceeded for waste level updates'
    }
});

const alertLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 5, // Limit manual alerts
    message: {
        status: 'fail',
        message: 'Too many manual alerts sent, try again later'
    }
});

// Enhanced validation schemas
const wasteTypes = [
    'Острые Медицинские Отходы',
    'Инфекционные Отходы',
    'Патологические Отходы',
    'Фармацевтические Отходы',
    'Химические Отходы',
    'Радиоактивные Отходы',
    'Общие Медицинские Отходы',
    'Цитотоксические Отходы',
    'Лабораторные Отходы'
];

const binStatuses = ['active', 'maintenance', 'offline', 'decommissioned', 'cleaning'];
const alertTypes = ['overfull', 'maintenance_due', 'sensor_error', 'temperature_high', 'manual'];
const priorityLevels = ['low', 'medium', 'high', 'critical'];

// Input validation for bin creation
const createBinValidation = [
    body('binId')
        .trim()
        .notEmpty()
        .withMessage('Bin ID is required')
        .matches(/^[A-Z]+-\d{3,}$/)
        .withMessage('Bin ID must be in format DEPT-123')
        .isLength({max: 50})
        .withMessage('Bin ID too long'),
    body('department')
        .trim()
        .notEmpty()
        .withMessage('Department is required')
        .isLength({max: 100})
        .withMessage('Department name too long')
        .matches(/^[a-zA-Zа-яА-Я0-9\s\-_]+$/)
        .withMessage('Department contains invalid characters'),
    body('wasteType')
        .trim()
        .notEmpty()
        .withMessage('Waste type is required')
        .isIn(wasteTypes)
        .withMessage('Invalid waste type'),
    body('capacity')
        .optional()
        .isFloat({min: 1, max: 1000})
        .withMessage('Capacity must be between 1 and 1000 liters'),
    body('containerHeight')
        .optional()
        .isInt({min: 10, max: 200})
        .withMessage('Container height must be between 10 and 200 cm'),
    body('alertThreshold')
        .optional()
        .isInt({min: 50, max: 95})
        .withMessage('Alert threshold must be between 50 and 95'),
    body('criticalThreshold')
        .optional()
        .isInt({min: 80, max: 100})
        .withMessage('Critical threshold must be between 80 and 100'),
    body('latitude')
        .optional()
        .isFloat({min: -90, max: 90})
        .withMessage('Invalid latitude'),
    body('longitude')
        .optional()
        .isFloat({min: -180, max: 180})
        .withMessage('Invalid longitude'),
    body('floor')
        .optional()
        .isInt({min: -5, max: 50})
        .withMessage('Floor must be between -5 and 50'),
    body('room')
        .optional()
        .trim()
        .isLength({max: 50})
        .withMessage('Room identifier too long'),
    body('description')
        .optional()
        .trim()
        .isLength({max: 500})
        .withMessage('Description too long'),
    body('maintenanceInterval')
        .optional()
        .isInt({min: 1, max: 365})
        .withMessage('Maintenance interval must be between 1 and 365 days')
];

// Enhanced update validation - ADDED containerHeight support
const updateBinValidation = [
    body('department')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Department cannot be empty')
        .isLength({max: 100})
        .withMessage('Department name too long'),
    body('wasteType')
        .optional()
        .isIn(wasteTypes)
        .withMessage('Invalid waste type'),
    body('containerHeight')
        .optional()
        .isInt({min: 10, max: 200})
        .withMessage('Container height must be between 10 and 200 cm'),
    body('alertThreshold')
        .optional()
        .isInt({min: 50, max: 95})
        .withMessage('Alert threshold must be between 50 and 95'),
    body('criticalThreshold')
        .optional()
        .isInt({min: 80, max: 100})
        .withMessage('Critical threshold must be between 80 and 100'),
    body('status')
        .optional()
        .isIn(binStatuses)
        .withMessage('Invalid status'),
    body('capacity')
        .optional()
        .isFloat({min: 1, max: 1000})
        .withMessage('Invalid capacity'),
    body('maintenanceInterval')
        .optional()
        .isInt({min: 1, max: 365})
        .withMessage('Invalid maintenance interval')
];

// Enhanced waste level validation
const wasteLevelValidation = [
    body('binId')
        .trim()
        .notEmpty()
        .withMessage('Bin ID is required')
        .isLength({max: 50})
        .withMessage('Bin ID too long'),
    body('distance')
        .isFloat({min: 0, max: 500})
        .withMessage('Distance must be between 0 and 500 cm'),
    body('latitude')
        .optional()
        .isFloat({min: -90, max: 90})
        .withMessage('Invalid latitude'),
    body('longitude')
        .optional()
        .isFloat({min: -180, max: 180})
        .withMessage('Invalid longitude'),
    body('temperature')
        .optional()
        .isFloat({min: -50, max: 100})
        .withMessage('Temperature must be between -50 and 100°C'),
    body('humidity')
        .optional()
        .isFloat({min: 0, max: 100})
        .withMessage('Humidity must be between 0 and 100%'),
    body('weight')
        .optional()
        .isFloat({min: 0, max: 1000})
        .withMessage('Weight must be between 0 and 1000 kg'),
    body('batteryLevel')
        .optional()
        .isFloat({min: 0, max: 100})
        .withMessage('Battery level must be between 0 and 100%'),
    body('signalStrength')
        .optional()
        .isInt({min: -120, max: 0})
        .withMessage('Invalid signal strength')
];

// Add missing pagination validation
const paginationValidation = [
    query('page')
        .optional()
        .isInt({min: 1, max: 1000})
        .withMessage('Page must be between 1 and 1000'),
    query('limit')
        .optional()
        .isInt({min: 1, max: 100})
        .withMessage('Limit must be between 1 and 100'),
    query('sortBy')
        .optional()
        .isIn(['createdAt', 'updatedAt', 'department', 'wasteType', 'fullness', 'lastCollection'])
        .withMessage('Invalid sort field'),
    query('sortOrder')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('Sort order must be asc or desc')
];

// Time period filtering validation for frontend chart compatibility
const timePeriodValidation = [
    query('period')
        .optional()
        .isIn(['1h', '6h', '24h', '7d', '30d', 'custom'])
        .withMessage('Period must be one of: 1h, 6h, 24h, 7d, 30d, custom'),
    query('interval')
        .optional()
        .isIn(['5min', '15min', '30min', '1h', '6h', '1d'])
        .withMessage('Interval must be one of: 5min, 15min, 30min, 1h, 6h, 1d'),
    query('aggregation')
        .optional()
        .isIn(['avg', 'min', 'max', 'first', 'last'])
        .withMessage('Aggregation must be one of: avg, min, max, first, last'),
    query('page')
        .optional()
        .isInt({min: 1, max: 1000})
        .withMessage('Page must be between 1 and 1000'),
    query('limit')
        .optional()
        .isInt({min: 1, max: 100})
        .withMessage('Limit must be between 1 and 100'),
    query('sortBy')
        .optional()
        .isIn(['createdAt', 'updatedAt', 'department', 'wasteType', 'fullness', 'lastCollection'])
        .withMessage('Invalid sort field'),
    query('sortOrder')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('Sort order must be asc or desc')
];

const filterValidation = [
    query('department')
        .optional()
        .trim()
        .isLength({max: 100})
        .withMessage('Department filter too long'),
    query('wasteType')
        .optional()
        .isIn(wasteTypes)
        .withMessage('Invalid waste type filter'),
    query('status')
        .optional()
        .isIn(binStatuses)
        .withMessage('Invalid status filter'),
    query('minFullness')
        .optional()
        .isFloat({min: 0, max: 100})
        .withMessage('Min fullness must be between 0 and 100'),
    query('maxFullness')
        .optional()
        .isFloat({min: 0, max: 100})
        .withMessage('Max fullness must be between 0 and 100')
];

// Device command validation
const deviceCommandValidation = [
    body('deviceId')
        .trim()
        .notEmpty()
        .withMessage('Device ID is required')
        .isLength({max: 50})
        .withMessage('Device ID too long'),
    body('command')
        .trim()
        .notEmpty()
        .withMessage('Command is required')
        .isIn(['setCollectingMode', 'calibrate', 'restart', 'updateFirmware', 'setInterval'])
        .withMessage('Invalid command'),
    body('params')
        .optional()
        .isObject()
        .withMessage('Parameters must be an object'),
    body('priority')
        .optional()
        .isIn(priorityLevels)
        .withMessage('Invalid priority level')
];

// Manual alert validation
const manualAlertValidation = [
    body('alertType')
        .optional()
        .isIn(alertTypes)
        .withMessage('Invalid alert type'),
    body('message')
        .optional()
        .trim()
        .isLength({max: 500})
        .withMessage('Alert message too long'),
    body('priority')
        .optional()
        .isIn(priorityLevels)
        .withMessage('Invalid priority level')
];

// Collection scheduling validation
const collectionScheduleValidation = [
    body('scheduledFor')
        .isISO8601()
        .withMessage('Invalid scheduled date')
        .custom(value => {
            if (new Date(value) <= new Date()) {
                throw new Error('Scheduled date must be in the future');
            }
            return true;
        }),
    body('priority')
        .optional()
        .isIn(priorityLevels)
        .withMessage('Invalid priority level'),
    body('notes')
        .optional()
        .trim()
        .isLength({max: 500})
        .withMessage('Notes too long')
];

// Bulk operations validation
const bulkUpdateValidation = [
    body('binIds')
        .isArray({min: 1, max: 100})
        .withMessage('Must provide 1-100 bin IDs'),
    body('binIds.*')
        .trim()
        .notEmpty()
        .withMessage('Bin ID cannot be empty'),
    body('updates')
        .isObject()
        .withMessage('Updates must be an object')
];

// ===========================================
// PUBLIC ROUTES (API Key or Device Auth)
// ===========================================

// Device routes - no rate limiting for critical IoT operations
router.post('/waste-level',
    deviceAuth,
    ...wasteLevelValidation,
    validateRequest,
    sanitizeInput,
    logActivity('waste_level_update'),
    updateBinLevel
);

// Device registration and commands
router.get('/check-device', apiKeyAuth, checkDeviceRegistration);
router.post('/register-device', apiKeyAuth, registerDevice);
router.get('/device-commands/:deviceId',
    deviceAuth,
    param('deviceId').trim().notEmpty(),
    validateRequest,
    getDeviceCommands
);
router.patch('/device-commands/:commandId/executed',
    deviceAuth,
    param('commandId').isMongoId(),
    validateRequest,
    markCommandExecuted
);

// ===========================================
// AUTHENTICATED USER ROUTES
// ===========================================
router.use(auth);

// Read operations - CACHE REMOVED for immediate updates
router.get('/',
    ...paginationValidation,
    ...filterValidation,
    validateRequest,
    getAllBins
);

router.get('/nearby',
    query('latitude').isFloat({min: -90, max: 90}),
    query('longitude').isFloat({min: -180, max: 180}),
    query('radius').optional().isFloat({min: 0.1, max: 50}),
    validateRequest,
    getNearbyBins
);

router.get('/overfilled',
    query('threshold').optional().isInt({min: 70, max: 100}),
    validateRequest,
    getOverfilledBins
);

router.get('/statistics',
    query('period').optional().isIn(['hour', 'day', 'week', 'month', 'year']),
    query('department').optional().trim(),
    validateRequest,
    getStatistics
);

router.get('/analytics',
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('groupBy').optional().isIn(['hour', 'day', 'week', 'month']),
    validateRequest,
    getBinAnalytics
);

router.get('/metrics',
    validateRequest,
    getBinMetrics
);

// Individual bin operations - CACHE REMOVED
router.get('/:id',
    param('id').trim().notEmpty(),
    validateRequest,
    checkBinOwnership,
    getBin
);

// Quick access routes for frontend time period selector
router.get('/:id/history/1h',
    param('id').trim().notEmpty(),
    validateRequest,
    checkBinOwnership,
    (req, res, next) => {
        req.query.period = '1h';
        req.query.interval = '5min';
        next();
    },
    getBinHistory
);

router.get('/:id/history/6h',
    param('id').trim().notEmpty(),
    validateRequest,
    checkBinOwnership,
    (req, res, next) => {
        req.query.period = '6h';
        req.query.interval = '15min';
        next();
    },
    getBinHistory
);

router.get('/:id/history/24h',
    param('id').trim().notEmpty(),
    validateRequest,
    checkBinOwnership,
    (req, res, next) => {
        req.query.period = '24h';
        req.query.interval = '1h';
        next();
    },
    getBinHistory
);

router.get('/:id/history/7d',
    param('id').trim().notEmpty(),
    validateRequest,
    checkBinOwnership,
    (req, res, next) => {
        req.query.period = '7d';
        req.query.interval = '6h';
        next();
    },
    getBinHistory
);

router.get('/:id/history/30d',
    param('id').trim().notEmpty(),
    validateRequest,
    checkBinOwnership,
    (req, res, next) => {
        req.query.period = '30d';
        req.query.interval = '1d';
        next();
    },
    getBinHistory
);

router.get('/:id/history',
    param('id').trim().notEmpty(),
    ...timePeriodValidation,
    validateRequest,
    checkBinOwnership,
    getBinHistory
);

router.get('/:id/alerts',
    param('id').trim().notEmpty(),
    query('status').optional().isIn(['active', 'dismissed', 'resolved']),
    validateRequest,
    checkBinOwnership,
    getBinAlerts
);

// Alert operations
router.post('/:id/send-alert',
    alertLimiter,
    param('id').trim().notEmpty(),
    ...manualAlertValidation,
    validateRequest,
    checkBinOwnership,
    logActivity('manual_alert'),
    sendManualAlert
);

router.patch('/alerts/:alertId/dismiss',
    param('alertId').isMongoId(),
    validateRequest,
    logActivity('alert_dismiss'),
    dismissAlert
);

// Prediction and maintenance - CACHE REMOVED
router.get('/:id/predict-maintenance',
    param('id').trim().notEmpty(),
    validateRequest,
    checkBinOwnership,
    predictMaintenance
);

// ===========================================
// SUPERVISOR & ADMIN ROUTES
// ===========================================
router.use(restrictTo('admin', 'supervisor'));

// Bin management
router.post('/',
    createBinLimiter,
    ...createBinValidation,
    validateRequest,
    sanitizeInput,
    logActivity('bin_create'),
    createBin
);

router.patch('/:id',
    param('id').isMongoId(),
    ...updateBinValidation,
    validateRequest,
    sanitizeInput,
    restrictTo('admin', 'supervisor'),
    (req, res, next) => {
        if (req.user?.role === 'admin') return next();
        return checkBinOwnership(req, res, next);
    },
    logActivity('bin_update'),
    updateBin
);

// Collection management
router.post('/:id/schedule-collection',
    param('id').trim().notEmpty(),
    ...collectionScheduleValidation,
    validateRequest,
    checkBinOwnership,
    logActivity('collection_schedule'),
    scheduleCollection
);

router.get('/collection-routes',
    query('date').optional().isISO8601(),
    query('optimize').optional().isBoolean(),
    validateRequest,
    getCollectionRoutes
);

router.post('/optimize-routes',
    body('date').isISO8601(),
    body('vehicleCapacity').optional().isInt({min: 1, max: 1000}),
    body('maxDistance').optional().isFloat({min: 1, max: 500}),
    validateRequest,
    optimizeRoutes
);

// Device commands
router.post('/device-command',
    ...deviceCommandValidation,
    validateRequest,
    logActivity('device_command'),
    sendDeviceCommand
);

router.post('/:id/set-collecting-mode',
    param('id').trim().notEmpty(),
    body('isCollecting').isBoolean(),
    validateRequest,
    checkBinOwnership,
    logActivity('collecting_mode_change'),
    setCollectingMode
);

// Bulk operations
router.patch('/bulk-update',
    ...bulkUpdateValidation,
    validateRequest,
    logActivity('bulk_update'),
    bulkUpdateBins
);

// Data export - CACHE REMOVED
router.get('/export/:format',
    param('format').isIn(['csv', 'xlsx', 'pdf']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('departments').optional(),
    validateRequest,
    logActivity('data_export'),
    exportBinData
);

// ===========================================
// ADMIN ONLY ROUTES
// ===========================================
router.use(restrictTo('admin'));

router.delete('/:id',
    param('id').trim().notEmpty(),
    validateRequest,
    logActivity('bin_delete'),
    deleteBin
);

// Advanced analytics and system management
router.get('/system/health',
    validateRequest,
    (req, res) => {
        res.json({
            status: 'success',
            data: {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                timestamp: new Date().toISOString()
            }
        });
    }
);

// Error handling middleware
router.use((error, req, res, next) => {
    console.error('Waste Bin Router Error:', error);

    if (error.name === 'ValidationError') {
        return res.status(400).json({
            status: 'fail',
            message: 'Validation failed',
            errors: error.errors
        });
    }

    if (error.code === 11000) {
        return res.status(409).json({
            status: 'fail',
            message: 'Duplicate bin ID'
        });
    }

    res.status(500).json({
        status: 'error',
        message: 'Internal server error'
    });
});

module.exports = router;