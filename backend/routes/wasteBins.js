const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
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
    sendManualAlert // New controller method for manual alerts
} = require('../controllers/wasteBinController');
const { auth, restrictTo, adminAuth, supervisorAuth } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validators');

// Input validation for bin creation
const createBinValidation = [
    body('binId')
        .trim()
        .notEmpty()
        .withMessage('Bin ID is required')
        .matches(/^[A-Z]+-\d{3,}$/)
        .withMessage('Bin ID must be in format DEPT-123'),
    body('department')
        .trim()
        .notEmpty()
        .withMessage('Department is required'),
    body('wasteType')
        .trim()
        .notEmpty()
        .withMessage('Waste type is required')
        .isIn([
            'Острые Медицинские Отходы',
            'Инфекционные Отходы',
            'Патологические Отходы',
            'Фармацевтические Отходы',
            'Химические Отходы',
            'Радиоактивные Отходы',
            'Общие Медицинские Отходы'
        ])
        .withMessage('Invalid waste type'),
    body('latitude')
        .optional()
        .isFloat({ min: -90, max: 90 })
        .withMessage('Latitude must be between -90 and 90'),
    body('longitude')
        .optional()
        .isFloat({ min: -180, max: 180 })
        .withMessage('Longitude must be between -180 and 180')
];

// Input validation for bin update
const updateBinValidation = [
    body('department')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Department cannot be empty'),
    body('wasteType')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Waste type cannot be empty')
        .isIn([
            'Острые Медицинские Отходы',
            'Инфекционные Отходы',
            'Патологические Отходы',
            'Фармацевтические Отходы',
            'Химические Отходы',
            'Радиоактивные Отходы',
            'Общие Медицинские Отходы'
        ])
        .withMessage('Invalid waste type'),
    body('alertThreshold')
        .optional()
        .isInt({ min: 50, max: 95 })
        .withMessage('Alert threshold must be between 50 and 95'),
    body('status')
        .optional()
        .isIn(['active', 'maintenance', 'offline', 'decommissioned'])
        .withMessage('Invalid status')
];

const wasteLevelValidation = [
    body('binId')
        .trim()
        .notEmpty()
        .withMessage('Bin ID is required'),
    body('distance')
        .isFloat({ min: 0 })
        .withMessage('Distance must be a positive number'),
    body('latitude')
        .optional()
        .isFloat({ min: -90, max: 90 })
        .withMessage('Latitude must be between -90 and 90'),
    body('longitude')
        .optional()
        .isFloat({ min: -180, max: 180 })
        .withMessage('Longitude must be between -180 and 180'),
    body('temperature')
        .optional()
        .isFloat()
        .withMessage('Temperature must be a number'),
    body('weight')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Weight must be a positive number')
];

router.post('/waste-level', deviceAuth, wasteLevelValidation, validateRequest, updateBinLevel);
router.get('/check-device', deviceAuth, checkDeviceRegistration);
router.post('/register-device', deviceAuth, registerDevice);

// Add device command routes if you have them
router.get('/get-device-commands', deviceAuth, getDeviceCommands);
router.post('/acknowledge-command', deviceAuth, acknowledgeCommand);

// ===== WEB APP ROUTES (using JWT auth) =====
// These routes are for the web application and require JWT authentication

// Public health check (no auth needed)
router.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Protected routes for web app users
router.use(auth); // Apply JWT auth to all routes below this point

// Routes for all authenticated web users
router.get('/', getAllBins);
router.get('/nearby', getNearbyBins);
router.get('/overfilled', getOverfilledBins);
router.get('/statistics', getStatistics);
router.get('/:id', param('id').trim().notEmpty(), validateRequest, getBin);
router.get('/:id/history', param('id').trim().notEmpty(), validateRequest, getBinHistory);

// Manual alert route for authenticated users
router.post(
    '/:id/send-alert',
    param('id').trim().notEmpty().withMessage('Bin ID is required'),
    validateRequest,
    sendManualAlert
);

// Routes for supervisors and admins only
router.use(restrictTo('admin', 'supervisor'));
router.post('/', createBinValidation, validateRequest, createBin);
router.patch('/:id', param('id').trim().notEmpty(), updateBinValidation, validateRequest, updateBin);

// Routes for admins only
router.use(restrictTo('admin'));
router.delete('/:id', param('id').trim().notEmpty(), validateRequest, deleteBin);

module.exports = router;