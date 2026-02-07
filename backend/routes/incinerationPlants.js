const express = require('express');
const { body, param, query } = require('express-validator');
const {
    getIncinerationPlants,
    getIncinerationPlant,
    createIncinerationPlant,
    updateIncinerationPlant,
    deleteIncinerationPlant
} = require('../controllers/incinerationPlantController');
const { auth, restrictTo } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validators');

const router = express.Router();

router.use(auth);

router.get(
    '/',
    restrictTo('admin', 'supervisor', 'driver'),
    [
        query('active').optional().isIn(['true', 'false']).withMessage('Invalid active filter')
    ],
    validateRequest,
    getIncinerationPlants
);

router.post(
    '/',
    restrictTo('admin', 'supervisor'),
    [
        body('name').trim().notEmpty().withMessage('Name is required')
    ],
    validateRequest,
    createIncinerationPlant
);

router.get(
    '/:id',
    restrictTo('admin', 'supervisor'),
    [
        param('id').isMongoId().withMessage('Invalid ID')
    ],
    validateRequest,
    getIncinerationPlant
);

router.patch(
    '/:id',
    restrictTo('admin', 'supervisor'),
    [
        param('id').isMongoId().withMessage('Invalid ID')
    ],
    validateRequest,
    updateIncinerationPlant
);

router.delete(
    '/:id',
    restrictTo('admin', 'supervisor'),
    [
        param('id').isMongoId().withMessage('Invalid ID')
    ],
    validateRequest,
    deleteIncinerationPlant
);

module.exports = router;
