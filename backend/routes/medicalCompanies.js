const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();

const {
    getMedicalCompanies,
    createMedicalCompany,
    updateMedicalCompany,
    deleteMedicalCompany
} = require('../controllers/driverController');

const { auth, adminAuth } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validators');

// Validation for medical company
const medicalCompanyValidation = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Company name is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Company name must be between 2-100 characters'),

    body('licenseNumber')
        .trim()
        .notEmpty()
        .withMessage('License number is required')
        .isLength({ min: 5, max: 30 })
        .withMessage('License number must be between 5-30 characters'),

    body('contactInfo.email')
        .isEmail()
        .withMessage('Valid email is required')
        .normalizeEmail(),

    body('contactInfo.phone')
        .optional()
        .trim()
        .matches(/^\+?[\d\s\-\(\)]{10,20}$/)
        .withMessage('Phone number must be valid'),

    body('certificationExpiry')
        .isISO8601()
        .withMessage('Valid certification expiry date is required')
        .custom((value) => {
            if (new Date(value) <= new Date()) {
                throw new Error('Certification expiry date must be in the future');
            }
            return true;
        }),

    body('address.street').optional().trim().isLength({ max: 200 }),
    body('address.city').optional().trim().isLength({ max: 50 }),
    body('address.region').optional().trim().isLength({ max: 50 }),
    body('address.postalCode').optional().trim().isLength({ max: 20 }),

    body('wasteTypes')
        .optional()
        .isArray()
        .withMessage('Waste types must be an array'),

    body('wasteTypes.*')
        .optional()
        .isIn(['infectious', 'pathological', 'pharmaceutical', 'sharps', 'chemical'])
        .withMessage('Invalid waste type')
];

// Public route for getting active companies (for driver registration)
router.get('/', getMedicalCompanies);

// Protected routes
router.use(auth);
router.use(adminAuth);

// Create medical company
router.post('/', medicalCompanyValidation, validateRequest, createMedicalCompany);

// Update medical company
router.patch('/:id', [
    param('id').isMongoId().withMessage('Valid company ID is required'),
    ...medicalCompanyValidation
], validateRequest, updateMedicalCompany);

// Delete medical company
router.delete('/:id', [
    param('id').isMongoId().withMessage('Valid company ID is required')
], validateRequest, deleteMedicalCompany);

module.exports = router;
