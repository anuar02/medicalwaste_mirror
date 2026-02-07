const express = require('express');
const { body, param, query } = require('express-validator');
const {
    createRoute,
    getRoutes,
    getRouteById,
    updateRoute,
    deleteRoute,
    getTodayRoutes,
    getRouteStats,
    getRouteSuggestions,
    approveSuggestedRoute,
    optimizeRoute,
    getRouteComparison
} = require('../controllers/routeController');
const { auth, restrictTo } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validators');

const router = express.Router();

router.use(auth);

router.get(
    '/',
    restrictTo('admin', 'supervisor', 'driver'),
    [
        query('assignedDriver').optional().isMongoId().withMessage('Invalid assignedDriver'),
        query('status').optional().isIn(['suggested', 'active', 'paused', 'archived']).withMessage('Invalid status'),
        query('day').optional().isIn(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']).withMessage('Invalid day')
    ],
    validateRequest,
    getRoutes
);

router.post(
    '/',
    restrictTo('admin', 'supervisor'),
    [
        body('name').trim().notEmpty().withMessage('Route name is required'),
        body('company').optional().isMongoId().withMessage('Invalid company'),
        body('assignedDriver').optional({ nullable: true }).isMongoId().withMessage('Invalid assignedDriver'),
        body('stops').optional().isArray().withMessage('stops must be an array'),
        body('stops.*.order').optional().isInt({ min: 1 }).withMessage('Stop order must be >= 1')
    ],
    validateRequest,
    createRoute
);

router.get(
    '/today',
    restrictTo('admin', 'supervisor', 'driver'),
    getTodayRoutes
);

router.get(
    '/suggestions',
    restrictTo('admin', 'supervisor'),
    getRouteSuggestions
);

router.post(
    '/suggestions/:id/approve',
    restrictTo('admin', 'supervisor'),
    [
        param('id').isMongoId().withMessage('Invalid route ID'),
        body('assignedDriver').optional().isMongoId().withMessage('Invalid assignedDriver'),
        body('assignedVehicle').optional().isString().withMessage('Invalid assignedVehicle')
    ],
    validateRequest,
    approveSuggestedRoute
);

router.get(
    '/:id/stats',
    restrictTo('admin', 'supervisor', 'driver'),
    [
        param('id').isMongoId().withMessage('Invalid route ID')
    ],
    validateRequest,
    getRouteStats
);

router.get(
    '/:id/comparison/:sessionId',
    restrictTo('admin', 'supervisor', 'driver'),
    [
        param('id').isMongoId().withMessage('Invalid route ID'),
        param('sessionId').notEmpty().withMessage('Session ID is required')
    ],
    validateRequest,
    getRouteComparison
);

router.post(
    '/:id/optimize',
    restrictTo('admin', 'supervisor'),
    [
        param('id').isMongoId().withMessage('Invalid route ID')
    ],
    validateRequest,
    optimizeRoute
);

router.get(
    '/:id',
    restrictTo('admin', 'supervisor', 'driver'),
    [
        param('id').isMongoId().withMessage('Invalid route ID')
    ],
    validateRequest,
    getRouteById
);

router.patch(
    '/:id',
    restrictTo('admin', 'supervisor'),
    [
        param('id').isMongoId().withMessage('Invalid route ID'),
        body('company').optional().isMongoId().withMessage('Invalid company'),
        body('assignedDriver').optional({ nullable: true }).isMongoId().withMessage('Invalid assignedDriver'),
        body('status').optional().isIn(['suggested', 'active', 'paused', 'archived']).withMessage('Invalid status')
    ],
    validateRequest,
    updateRoute
);

router.delete(
    '/:id',
    restrictTo('admin', 'supervisor'),
    [
        param('id').isMongoId().withMessage('Invalid route ID')
    ],
    validateRequest,
    deleteRoute
);

module.exports = router;
