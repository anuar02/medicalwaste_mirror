// utils/telegram.js
const { Telegraf } = require('telegraf');
const { logger } = require('../middleware/loggers');
const User = require('../models/User');

// Create Telegram bot instance
const bot = process.env.TELEGRAM_BOT_TOKEN
    ? new Telegraf(process.env.TELEGRAM_BOT_TOKEN)
    : null;

if (!bot) {
    logger.warn('TELEGRAM_BOT_TOKEN not set. Telegram notifications will not work.');
}

/**
 * Initialize the Telegram bot with commands and handlers
 * @returns {Promise<void>}
 */
const initializeBot = async () => {
    if (!bot) {
        logger.error('Cannot initialize Telegram bot: Bot token not set');
        return;
    }

    try {
        // Set bot commands
        await bot.telegram.setMyCommands([
            { command: 'start', description: 'Start the bot and register your account' },
            { command: 'help', description: 'Get help information' },
            { command: 'status', description: 'Check your notification status' },
            { command: 'stop', description: 'Stop receiving notifications' }
        ]);

        // Handle /start command - user registration
        bot.command('start', async (ctx) => {
            const telegramUsername = ctx.from.username;
            const chatId = ctx.chat.id.toString();

            await ctx.reply(
                `Welcome to the Medical Waste Management System! 🏥\n\n` +
                `Your Chat ID: ${chatId}\n\n` +
                `To connect this Telegram account to your system account, please use the following command in the web application:\n\n` +
                `/connect ${chatId}\n\n` +
                `Or visit the "Profile" section and enter your Chat ID manually.`
            );

            logger.info(`Telegram user @${telegramUsername} (${chatId}) started the bot`);
        });

        // Handle /help command
        bot.command('help', async (ctx) => {
            await ctx.reply(
                `*Medical Waste Management System - Help*\n\n` +
                `Available commands:\n` +
                `• /start - Register your Telegram account\n` +
                `• /status - Check your notification status\n` +
                `• /stop - Stop receiving notifications\n` +
                `• /help - Show this help message\n\n` +
                `For additional assistance, please contact your system administrator.`,
                { parse_mode: 'Markdown' }
            );
        });

        // Handle /status command
        bot.command('status', async (ctx) => {
            const chatId = ctx.chat.id.toString();

            try {
                const user = await User.findOne({ 'telegram.chatId': chatId });

                if (!user) {
                    return ctx.reply(
                        `❌ Your Telegram account is not connected to any user in the system.\n\n` +
                        `Please use the /start command and follow the instructions to connect your account.`
                    );
                }

                const status = user.telegram.active && user.notificationPreferences.receiveAlerts
                    ? '✅ Active'
                    : '❌ Inactive';

                await ctx.reply(
                    `*Notification Status*\n\n` +
                    `User: ${user.username}\n` +
                    `Department: ${user.department || 'Not specified'}\n` +
                    `Notifications: ${status}\n\n` +
                    `To change your notification preferences, visit your profile in the web application.`,
                    { parse_mode: 'Markdown' }
                );
            } catch (error) {
                logger.error(`Error in Telegram status command: ${error.message}`);
                await ctx.reply('An error occurred while checking your status. Please try again later.');
            }
        });

        // Handle /stop command
        bot.command('stop', async (ctx) => {
            const chatId = ctx.chat.id.toString();

            try {
                const user = await User.findOne({ 'telegram.chatId': chatId });

                if (!user) {
                    return ctx.reply('Your Telegram account is not connected to any user in the system.');
                }

                user.notificationPreferences.receiveAlerts = false;
                await user.save();

                await ctx.reply(
                    `✅ Notifications stopped successfully.\n\n` +
                    `You will no longer receive alert notifications.\n` +
                    `You can enable notifications again from your profile in the web application.`
                );

                logger.info(`User ${user.username} stopped Telegram notifications`);
            } catch (error) {
                logger.error(`Error in Telegram stop command: ${error.message}`);
                await ctx.reply('An error occurred while processing your request. Please try again later.');
            }
        });

        // Basic error handling
        bot.catch((err, ctx) => {
            logger.error(`Telegram bot error: ${err.message}`);
            ctx.reply('An error occurred. Please try again later.');
        });

        // Start the bot
        await bot.launch();
        logger.info('Telegram bot started successfully');

        // Enable graceful stop
        process.once('SIGINT', () => bot.stop('SIGINT'));
        process.once('SIGTERM', () => bot.stop('SIGTERM'));
    } catch (error) {
        logger.error(`Failed to initialize Telegram bot: ${error.message}`);
        throw error;
    }
};

/**
 * Send a notification message to a specific user's Telegram chat
 * @param {string} chatId - User's Telegram chat ID
 * @param {string} message - Message text (supports Markdown)
 * @param {Object} options - Additional Telegram message options
 * @returns {Promise<Object>} - Telegram message response
 */
const sendTelegramMessage = async (chatId, message, options = {}) => {
    if (!bot) {
        logger.error('Cannot send Telegram message: Bot not initialized');
        throw new Error('Telegram bot not initialized');
    }

    try {
        const defaultOptions = {
            parse_mode: 'Markdown',
            disable_web_page_preview: true
        };

        const messageOptions = { ...defaultOptions, ...options };
        const result = await bot.telegram.sendMessage(chatId, message, messageOptions);
        logger.info(`Telegram message sent to ${chatId}`);
        return result;
    } catch (error) {
        logger.error(`Error sending Telegram message to ${chatId}: ${error.message}`);
        throw error;
    }
};

/**
 * Send alert notification for overfilled bins to specified users
 * @param {Object} bin - Waste bin data
 * @param {Array} userIds - List of user IDs to notify (null for all eligible users)
 * @returns {Promise<Array>} - Array of notification results
 */
const sendAlertNotification = async (bin, userIds = null) => {
    try {
        // Prepare query to find users to notify
        const query = {
            'telegram.active': true,
            'telegram.chatId': { $ne: null },
            'notificationPreferences.receiveAlerts': true,
            active: true
        };

        // If specific user IDs are provided, add them to query
        if (userIds && userIds.length > 0) {
            query._id = { $in: userIds };
        }

        // Find users to notify
        const users = await User.find(query);

        if (users.length === 0) {
            logger.warn('No users available to receive Telegram alert notification');
            return [];
        }

        // Create alert message
        const message = `
*⚠️ ALERT: Waste Bin ${bin.binId} is ${bin.fullness}% full*

Waste bin in *${bin.department}* has reached *${bin.fullness}%* capacity.
This exceeds the alert threshold of ${bin.alertThreshold}%.

*Bin Details:*
• *Waste Type:* ${bin.wasteType}
• *Location:* Floor ${bin.location.floor || '1'}, Room ${bin.location.room || 'Unknown'}
• *Last Update:* ${new Date(bin.lastUpdate).toLocaleString()}

Please schedule collection as soon as possible.
`;

        // Send message to each user
        const results = [];
        for (const user of users) {
            try {
                const result = await sendTelegramMessage(user.telegram.chatId, message);
                results.push({
                    userId: user._id,
                    username: user.username,
                    success: true,
                    messageId: result.message_id
                });
            } catch (error) {
                logger.error(`Failed to send Telegram alert to user ${user.username}: ${error.message}`);
                results.push({
                    userId: user._id,
                    username: user.username,
                    success: false,
                    error: error.message
                });
            }
        }

        return results;
    } catch (error) {
        logger.error(`Error in sendAlertNotification: ${error.message}`);
        throw error;
    }
};

module.exports = {
    bot,
    initializeBot,
    sendTelegramMessage,
    sendAlertNotification
};