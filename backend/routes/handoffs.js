const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, param, query } = require('express-validator');
const {
    createHandoff,
    getHandoffs,
    getHandoffById,
    confirmHandoff,
    confirmHandoffByToken,
    getPublicHandoff,
    disputeHandoff,
    resolveHandoff,
    resendHandoffNotification,
    getHandoffChain
} = require('../controllers/handoffController');
const { auth, restrictTo } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validators');

const router = express.Router();

const tokenLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    keyGenerator: (req) => req.params.token || req.ip,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many confirmation attempts, please try again later.'
});

router.get(
    '/public/:token',
    tokenLimiter,
    [
        param('token').notEmpty().withMessage('Token is required')
    ],
    validateRequest,
    getPublicHandoff
);

router.post(
    '/confirm/:token',
    tokenLimiter,
    [
        param('token').notEmpty().withMessage('Token is required')
    ],
    validateRequest,
    confirmHandoffByToken
);

router.use(auth);

router.get(
    '/chain/:sessionId',
    restrictTo('admin', 'supervisor', 'driver'),
    [
        param('sessionId').notEmpty().withMessage('Session ID is required')
    ],
    validateRequest,
    getHandoffChain
);

router.get(
    '/',
    restrictTo('admin', 'supervisor', 'driver'),
    [
        query('status').optional().isString().withMessage('Invalid status'),
        query('type').optional().isIn(['facility_to_driver', 'driver_to_incinerator']).withMessage('Invalid type'),
        query('session').optional().isMongoId().withMessage('Invalid session')
    ],
    validateRequest,
    getHandoffs
);

router.get(
    '/:handoffId',
    restrictTo('admin', 'supervisor', 'driver'),
    [
        param('handoffId').notEmpty().withMessage('Handoff ID is required')
    ],
    validateRequest,
    getHandoffById
);

router.patch(
    '/:handoffId/confirm',
    restrictTo('admin', 'supervisor', 'driver'),
    [
        param('handoffId').notEmpty().withMessage('Handoff ID is required')
    ],
    validateRequest,
    confirmHandoff
);

router.patch(
    '/:handoffId/dispute',
    restrictTo('admin', 'supervisor', 'driver'),
    [
        param('handoffId').notEmpty().withMessage('Handoff ID is required'),
        body('reason').optional().isString().withMessage('Invalid reason'),
        body('description').optional().isString().withMessage('Invalid description'),
        body('photos').optional().isArray().withMessage('photos must be an array')
    ],
    validateRequest,
    disputeHandoff
);

router.patch(
    '/:handoffId/resolve',
    restrictTo('admin', 'supervisor'),
    [
        param('handoffId').notEmpty().withMessage('Handoff ID is required'),
        body('resolution').optional().isString().withMessage('Invalid resolution')
    ],
    validateRequest,
    resolveHandoff
);

router.post(
    '/:handoffId/resend-notification',
    restrictTo('admin', 'supervisor'),
    [
        param('handoffId').notEmpty().withMessage('Handoff ID is required')
    ],
    validateRequest,
    resendHandoffNotification
);

router.post(
    '/',
    restrictTo('driver', 'supervisor', 'admin'),
    [
        body('type')
            .isIn(['facility_to_driver', 'driver_to_incinerator'])
            .withMessage('Invalid handoff type'),
        body('company').optional().isMongoId().withMessage('Invalid company'),
        body('sessionId').optional().isString().withMessage('Invalid sessionId'),
        body('containers').optional().isArray().withMessage('containers must be an array'),
        body('containers.*.container').optional().isMongoId().withMessage('Invalid container ID'),
        body('containerIds').optional().isArray().withMessage('containerIds must be an array'),
        body('containerIds.*').optional().isMongoId().withMessage('Invalid container ID'),
        body('facility').optional().isMongoId().withMessage('Invalid facility'),
        body('incinerationPlant').optional().isMongoId().withMessage('Invalid incineration plant'),
        body().custom((value) => {
            const hasContainers = Array.isArray(value.containers) && value.containers.length > 0;
            const hasContainerIds = Array.isArray(value.containerIds) && value.containerIds.length > 0;
            if (!hasContainers && !hasContainerIds) {
                throw new Error('Either containers or containerIds must be provided');
            }
            if (value.type === 'driver_to_incinerator' && !value.sessionId) {
                throw new Error('sessionId is required for driver_to_incinerator');
            }
            if (value.type === 'driver_to_incinerator' && !value.incinerationPlant && !value.receiver?.phone) {
                throw new Error('incinerationPlant or receiver.phone is required for driver_to_incinerator');
            }
            if (value.type === 'facility_to_driver' && !value.sessionId && !value.receiver?.user) {
                throw new Error('receiver.user is required when sessionId is not provided');
            }
            return true;
        })
    ],
    validateRequest,
    createHandoff
);

module.exports = router;
