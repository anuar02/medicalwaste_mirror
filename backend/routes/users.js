// routes/users.js
const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const {
    getProfile,
    assignCompany,
    updateProfile,
    getDepartments,
    updateUserRole,
    getPendingDrivers,
    verifyDriver,
    getAllDrivers,
    getDriverDetails,
    updateDriverDetails,
    getAllUsers,
    deactivateUser,
    activateUser, deleteUser
} = require('../controllers/userController');
const { auth, adminAuth, restrictTo} = require('../middleware/auth');
const { validateRequest } = require('../middleware/validators');

// Input validation for profile update
const updateProfileValidation = [
    body('username')
        .optional()
        .trim()
        .isLength({ min: 3, max: 30 })
        .withMessage('Username must be between 3 and 30 characters')
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('Username can only contain letters, numbers, underscores and hyphens'),
    body('email')
        .optional()
        .trim()
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail(),
    body('role')
        .isIn(['user', 'admin', 'supervisor', 'driver'])
        .withMessage('Invalid role'),
    body('department')
        .optional()
        .trim()
        .isIn([
            'Хирургическое Отделение',
            'Терапевтическое Отделение',
            'Педиатрическое Отделение',
            'Акушерское Отделение',
            'Инфекционное Отделение',
            'Лаборатория',
            'Реанимация',
            '' // Allow empty for clearing
        ])
        .withMessage('Invalid department selection')
];

router.get('/drivers', restrictTo('admin', 'supervisor'), getAllDrivers);
router.get('/drivers/pending', restrictTo('admin', 'supervisor'), getPendingDrivers);
router.get('/drivers/:driverId', getDriverDetails);
router.patch('/drivers/:driverId', updateDriverDetails);
router.post('/drivers/verify', restrictTo('admin', 'supervisor'), verifyDriver);
router.post('/assign-company', restrictTo('admin'), assignCompany);

// Routes for authenticated users
router.use(auth);

// Get current user profile
router.get('/profile', getProfile);

// Update current user profile
router.patch(
    '/profile',
    updateProfileValidation,
    validateRequest,
    updateProfile
);

// Get available departments
router.get('/departments', getDepartments);

// Admin-only routes
router.use(adminAuth);

router.delete('/:userId', restrictTo('admin'), deleteUser);

// Get all users
router.get('/', getAllUsers);

// Update user role
router.patch(
    '/:userId/role', // Matches the frontend's /users/${userId}/role
    [
        body('role')
            .isIn(['user', 'admin', 'supervisor', 'driver'])
            .withMessage('Invalid role')
    ],
    validateRequest,
    updateUserRole
);

// Deactivate user
router.patch(
    '/:userId/deactivate',
    [
        body('userId').isMongoId().withMessage('Invalid user ID')
    ],
    validateRequest,
    deactivateUser
);

// Activate user
router.patch(
    '/:userId/activate',
    [
        body('userId').isMongoId().withMessage('Invalid user ID')
    ],
    validateRequest,
    activateUser
);

module.exports = router;
