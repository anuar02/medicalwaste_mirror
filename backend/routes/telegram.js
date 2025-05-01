// routes/telegramRoutes.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const telegramController = require('../controllers/telegramController');
const { auth, restrictTo } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validators');

// Input validation for connecting Telegram
const connectTelegramValidation = [
    body('chatId')
        .trim()
        .notEmpty()
        .withMessage('Telegram Chat ID is required')
        .isNumeric()
        .withMessage('Telegram Chat ID must be numeric')
];

// Input validation for toggling notifications
const toggleNotificationsValidation = [
    body('receiveAlerts')
        .isBoolean()
        .withMessage('receiveAlerts must be a boolean value')
];

// Protect all routes - Telegram functionality requires authentication
router.use(auth);

router.get('/status', telegramController.getStatus);


// Telegram connection routes
router.post(
    '/connect',
    connectTelegramValidation,
    validateRequest,
    telegramController.connectTelegram
);

router.post(
    '/disconnect',
    telegramController.disconnectTelegram
);

router.post(
    '/toggle-notifications',
    toggleNotificationsValidation,
    validateRequest,
    telegramController.toggleNotifications
);

router.post(
    '/test-notification',
    telegramController.sendTestNotification
);

// Admin only routes
router.use(restrictTo('admin'));

// For future admin-only Telegram functions
// e.g., broadcast messages, manage system notifications, etc.

module.exports = router;