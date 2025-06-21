const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();

const {
    registerDriver,
    getPendingVerifications,
    verifyDriver,
    getAllDrivers,
    getDriverProfile,
    updateDriverProfile
} = require('../controllers/driverController');

const { auth, adminAuth, restrictTo } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validators');

// Validation schemas
const driverRegistrationValidation = [
    body('licenseNumber')
        .trim()
        .notEmpty()
        .withMessage('Driver license number is required')
        .isLength({ min: 8, max: 20 })
        .withMessage('License number must be between 8-20 characters'),

    body('licenseExpiry')
        .isISO8601()
        .withMessage('Valid license expiry date is required')
        .custom((value) => {
            if (new Date(value) <= new Date()) {
                throw new Error('License expiry date must be in the future');
            }
            return true;
        }),

    body('medicalCompanyId')
        .isMongoId()
        .withMessage('Valid medical company ID is required'),

    body('vehicleInfo.plateNumber')
        .trim()
        .notEmpty()
        .withMessage('Vehicle plate number is required')
        .isLength({ min: 6, max: 10 })
        .withMessage('Plate number must be between 6-10 characters'),

    body('vehicleInfo.model')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('Vehicle model cannot exceed 50 characters'),

    body('vehicleInfo.year')
        .optional()
        .isInt({ min: 1990, max: new Date().getFullYear() + 1 })
        .withMessage('Vehicle year must be valid'),

    body('vehicleInfo.capacity')
        .optional()
        .isNumeric()
        .withMessage('Vehicle capacity must be a number'),

    body('emergencyContact.name')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Emergency contact name cannot exceed 100 characters'),

    body('emergencyContact.phone')
        .optional()
        .trim()
        .matches(/^\+?[\d\s\-\(\)]{10,20}$/)
        .withMessage('Emergency contact phone must be valid'),
];

const driverVerificationValidation = [
    param('driverId').isMongoId().withMessage('Valid driver ID is required'),
    body('approved').isBoolean().withMessage('Approval status is required'),
    body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters')
];

// Protected routes (require authentication)
router.use(auth);

// Driver registration (for users who want to become drivers)
router.post('/register', driverRegistrationValidation, validateRequest, registerDriver);

// Get driver's own profile
router.get('/profile', getDriverProfile);

// Update driver's own profile (limited fields)
router.patch('/profile', [
    body('emergencyContact.name').optional().trim().isLength({ max: 100 }),
    body('emergencyContact.phone').optional().trim().matches(/^\+?[\d\s\-\(\)]{10,20}$/),
    body('certifications').optional().isArray()
], validateRequest, updateDriverProfile);

// Admin-only routes
router.use(adminAuth);

// Get all drivers with optional filtering
router.get('/', getAllDrivers);

// Get pending driver verifications
router.get('/pending', getPendingVerifications);

// Verify/reject driver application
router.patch('/verify/:driverId', driverVerificationValidation, validateRequest, verifyDriver);

module.exports = router;