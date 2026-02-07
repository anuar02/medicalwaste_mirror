const express = require('express');
const { param } = require('express-validator');
const { auth, restrictTo } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validators');
const { getHandoffNotifications } = require('../controllers/handoffController');

const router = express.Router();

router.use(auth);

router.get(
    '/handoff/:handoffId',
    restrictTo('admin', 'supervisor'),
    [
        param('handoffId').notEmpty().withMessage('Handoff ID is required')
    ],
    validateRequest,
    getHandoffNotifications
);

module.exports = router;
