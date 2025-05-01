// controllers/telegramController.js
const User = require('../models/User');
const AppError = require('../utils/appError');
const { logger } = require('../middleware/loggers');
const { sendTelegramMessage } = require('../utils/telegram');

/**
 * Get current user's Telegram status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.getStatus = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return next(new AppError('User not found', 404));
        }

        // Return Telegram status information
        res.status(200).json({
            status: 'success',
            data: {
                telegram: {
                    active: user.telegram?.active || false,
                    chatId: user.telegram?.chatId || null,
                    receiveNotifications: user.notificationPreferences?.receiveAlerts || false
                }
            }
        });
    } catch (error) {
        logger.error(`Error getting Telegram status: ${error.message}`);
        next(new AppError('Failed to get Telegram status', 500));
    }
};

/**
 * Connect user account to Telegram using chat ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.connectTelegram = async (req, res, next) => {
    try {
        const { chatId } = req.body;

        if (!chatId) {
            return next(new AppError('Telegram Chat ID is required', 400));
        }

        // Check if chat ID is already connected to another account
        const existingUser = await User.findOne({ 'telegram.chatId': chatId });

        if (existingUser && existingUser._id.toString() !== req.user._id.toString()) {
            return next(new AppError('This Telegram account is already connected to another user', 400));
        }

        // Update user's Telegram information
        const user = await User.findByIdAndUpdate(
            req.user._id,
            {
                'telegram.chatId': chatId,
                'telegram.active': true,
                'notificationPreferences.receiveAlerts': true
            },
            { new: true, runValidators: true }
        );

        if (!user) {
            return next(new AppError('User not found', 404));
        }

        // Send welcome message to user's Telegram
        try {
            await sendTelegramMessage(
                chatId,
                `*✅ Connection Successful*\n\n` +
                `Your Telegram account has been successfully connected to user *${user.username}*.\n\n` +
                `You will now receive waste bin alerts and system notifications on Telegram.`,
            );
        } catch (error) {
            logger.warn(`Could not send welcome message to Telegram: ${error.message}`);
            // Continue even if the welcome message fails
        }

        res.status(200).json({
            status: 'success',
            message: 'Telegram connected successfully',
            data: {
                user: {
                    id: user._id,
                    username: user.username,
                    telegram: user.telegram,
                    notificationPreferences: user.notificationPreferences
                }
            }
        });
    } catch (error) {
        logger.error(`Error connecting Telegram: ${error.message}`);
        next(new AppError('Failed to connect Telegram account', 500));
    }
};

/**
 * Disconnect user account from Telegram
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.disconnectTelegram = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return next(new AppError('User not found', 404));
        }

        const previousChatId = user.telegram.chatId;

        // Update user's Telegram information
        user.telegram.chatId = null;
        user.telegram.active = false;
        await user.save();

        // Send disconnection message to user's previous Telegram chat
        if (previousChatId) {
            try {
                await sendTelegramMessage(
                    previousChatId,
                    `*ℹ️ Account Disconnected*\n\n` +
                    `Your Telegram account has been disconnected from user *${user.username}*.\n\n` +
                    `You will no longer receive notifications from the Medical Waste Management System.`,
                );
            } catch (error) {
                logger.warn(`Could not send disconnection message to Telegram: ${error.message}`);
                // Continue even if the message fails
            }
        }

        res.status(200).json({
            status: 'success',
            message: 'Telegram disconnected successfully',
            data: {
                user: {
                    id: user._id,
                    username: user.username,
                    telegram: user.telegram
                }
            }
        });
    } catch (error) {
        logger.error(`Error disconnecting Telegram: ${error.message}`);
        next(new AppError('Failed to disconnect Telegram account', 500));
    }
};

/**
 * Toggle Telegram notifications for user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.toggleNotifications = async (req, res, next) => {
    try {
        const { receiveAlerts } = req.body;

        if (receiveAlerts === undefined) {
            return next(new AppError('receiveAlerts field is required', 400));
        }

        const user = await User.findById(req.user._id);

        if (!user) {
            return next(new AppError('User not found', 404));
        }

        // Check if Telegram is connected
        if (!user.telegram.chatId) {
            return next(new AppError('Telegram is not connected to this account', 400));
        }

        // Update notification preferences
        user.notificationPreferences.receiveAlerts = receiveAlerts;
        await user.save();

        // Send notification status update message
        try {
            const statusMessage = receiveAlerts
                ? `*✅ Notifications Enabled*\n\nYou will now receive waste bin alerts on Telegram.`
                : `*🔕 Notifications Disabled*\n\nYou will no longer receive waste bin alerts on Telegram.`;

            await sendTelegramMessage(user.telegram.chatId, statusMessage);
        } catch (error) {
            logger.warn(`Could not send notification status update to Telegram: ${error.message}`);
            // Continue even if the message fails
        }

        res.status(200).json({
            status: 'success',
            message: `Notifications ${receiveAlerts ? 'enabled' : 'disabled'} successfully`,
            data: {
                user: {
                    id: user._id,
                    username: user.username,
                    notificationPreferences: user.notificationPreferences
                }
            }
        });
    } catch (error) {
        logger.error(`Error toggling notifications: ${error.message}`);
        next(new AppError('Failed to update notification preferences', 500));
    }
};

/**
 * Send test notification to user's Telegram
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.sendTestNotification = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return next(new AppError('User not found', 404));
        }

        // Check if Telegram is connected
        if (!user.telegram.chatId || !user.telegram.active) {
            return next(new AppError('Telegram is not connected to this account', 400));
        }

        // Send test message
        const testMessage = `
*🧪 Test Notification*

This is a test notification from the Medical Waste Management System.

If you received this message, your Telegram notifications are working properly.

*User:* ${user.username}
*Department:* ${user.department || 'Not specified'}
*Time:* ${new Date().toLocaleString()}
`;

        await sendTelegramMessage(user.telegram.chatId, testMessage);

        res.status(200).json({
            status: 'success',
            message: 'Test notification sent successfully'
        });
    } catch (error) {
        logger.error(`Error sending test notification: ${error.message}`);
        next(new AppError('Failed to send test notification', 500));
    }
};

module.exports = exports;