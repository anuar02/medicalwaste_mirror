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

// All routes below require authentication
router.use(auth);

// Get all companies (admin only)
router.get('/', restrictTo('admin'), getAllCompanies);

// Get single company
router.get('/:id',
    param('id').isMongoId().withMessage('Invalid company ID'),
    validateRequest,
    getCompany
);

// Get company statistics
router.get('/:id/stats',
    param('id').isMongoId().withMessage('Invalid company ID'),
    validateRequest,
    getCompanyStats
);

// Create new company (admin only)
router.post('/',
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
    restrictTo('admin'),
    param('id').isMongoId().withMessage('Invalid company ID'),
    validateRequest,
    updateCompany
);

// Delete company (admin only)
router.delete('/:id',
    restrictTo('admin'),
    param('id').isMongoId().withMessage('Invalid company ID'),
    validateRequest,
    deleteCompany
);

// Assign bins to company (admin only)
router.post('/assign-bins',
    restrictTo('admin'),
    [
        body('companyId').isMongoId().withMessage('Valid company ID is required'),
        body('binIds').isArray({ min: 1 }).withMessage('At least one bin ID is required')
    ],
    validateRequest,
    assignBinsToCompany
);

module.exports = router;