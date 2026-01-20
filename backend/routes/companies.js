// routes/companies.js
const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const {
    getAllCompanies,
    getActiveCompanies,
    getCompany,
    createCompany,
    updateCompany,
    deleteCompany,
    getCompanyStats,
    assignBinsToCompany
} = require('../controllers/companyController');
const { auth, restrictTo } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validators');

// Public route for getting active companies (for registration dropdown)
router.get('/active', getActiveCompanies);

// Get all companies (admin only) - auth + restrictTo explicitly
router.get('/', auth, restrictTo('admin'), getAllCompanies);

// Get single company - FIXED: add auth explicitly
router.get('/:id',
    auth,  // Add auth explicitly here
    restrictTo('admin'),
    param('id').isMongoId().withMessage('Invalid company ID'),
    validateRequest,
    getCompany
);

// Get company statistics - FIXED: add auth explicitly
router.get('/:id/stats',
    auth,  // Add auth explicitly here
    restrictTo('admin'),
    param('id').isMongoId().withMessage('Invalid company ID'),
    validateRequest,
    getCompanyStats
);

// Create new company (admin only)
router.post('/',
    auth,  // Add auth explicitly
    restrictTo('admin'),
    [
        body('name').trim().notEmpty().withMessage('Company name is required'),
        body('licenseNumber').trim().notEmpty().withMessage('License number is required'),
        body('contactInfo.email').isEmail().withMessage('Valid email is required'),
        body('certificationExpiry').isISO8601().withMessage('Valid certification expiry date is required')
    ],
    validateRequest,
    createCompany
);

// Update company (admin only)
router.patch('/:id',
    auth,  // Add auth explicitly
    restrictTo('admin'),
    param('id').isMongoId().withMessage('Invalid company ID'),
    validateRequest,
    updateCompany
);

// Delete company (admin only)
router.delete('/:id',
    auth,  // Add auth explicitly
    restrictTo('admin'),
    param('id').isMongoId().withMessage('Invalid company ID'),
    validateRequest,
    deleteCompany
);

// Assign bins to company (admin only)
router.post('/assign-bins',
    auth,  // Add auth explicitly
    restrictTo('admin'),
    [
        body('companyId').isMongoId().withMessage('Valid company ID is required'),
        body('binIds').isArray({ min: 1 }).withMessage('At least one bin ID is required')
    ],
    validateRequest,
    assignBinsToCompany
);

module.exports = router;