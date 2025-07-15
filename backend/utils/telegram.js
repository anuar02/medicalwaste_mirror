// utils/telegram.js - Improved version with singleton pattern and better error handling
const { Telegraf } = require('telegraf');
const { logger } = require('../middleware/loggers');
const User = require('../models/User');

// Singleton pattern to prevent multiple instances
let botInstance = null;
let isInitialized = false;

/**
 * Create bot instance with proper error handling
 */
const createBot = () => {
    if (!process.env.TELEGRAM_BOT_TOKEN) {
        logger.warn('TELEGRAM_BOT_TOKEN not set. Telegram notifications will not work.');
        return null;
    }

    try {
        return new Telegraf(process.env.TELEGRAM_BOT_TOKEN, {
            // Add polling options to prevent conflicts
            telegram: {
                webhookReply: false
            }
        });
    } catch (error) {
        logger.error(`Failed to create Telegram bot: ${error.message}`);
        return null;
    }
};

/**
 * Initialize the Telegram bot with commands and handlers
 * @returns {Promise<Object|null>} - Bot instance or null if failed
 */
const initializeBot = async () => {
    // Prevent multiple initializations
    if (isInitialized && botInstance) {
        logger.info('Telegram bot already initialized, returning existing instance');
        return botInstance;
    }

    // Stop any existing instance first
    if (botInstance) {
        try {
            await botInstance.stop();
            logger.info('Stopped existing Telegram bot instance');
        } catch (error) {
            logger.warn(`Error stopping existing bot: ${error.message}`);
        }
    }

    botInstance = createBot();

    if (!botInstance) {
        logger.error('Cannot initialize Telegram bot: Bot creation failed');
        return null;
    }

    try {
        // Set bot commands
        await botInstance.telegram.setMyCommands([
            { command: 'start', description: 'Start the bot and register your account' },
            { command: 'help', description: 'Get help information' },
            { command: 'status', description: 'Check your notification status' },
            { command: 'stop', description: 'Stop receiving notifications' }
        ]);

        // Handle /start command - user registration
        botInstance.command('start', async (ctx) => {
            const telegramUsername = ctx.from.username || 'User';
            const chatId = ctx.chat.id.toString();
            const firstName = ctx.from.first_name || '';

            const welcomeMessage = `
🏥 *Welcome to Medical Waste Management System!*

Hello ${firstName}! 

*Your Chat ID:* \`${chatId}\`

*To connect your account:*
1️⃣ Log into the web dashboard
2️⃣ Go to Profile → Telegram Settings
3️⃣ Enter your Chat ID: \`${chatId}\`
4️⃣ Click "Connect Telegram"

Once connected, you'll receive important alerts about waste bins that need attention.

Use /help to see all available commands.
            `;

            await ctx.reply(welcomeMessage, { parse_mode: 'Markdown' });
            logger.info(`Telegram user @${telegramUsername} (${chatId}) started the bot`);
        });

        // Handle /help command
        botInstance.command('help', async (ctx) => {
            const chatId = ctx.chat.id.toString();

            const helpMessage = `
🤖 *Medical Waste Management System - Help*

*Your Chat ID:* \`${chatId}\`

*Available commands:*
• /start - Register your Telegram account
• /status - Check your notification status  
• /stop - Stop receiving notifications
• /help - Show this help message

*Setup Instructions:*
1. Copy your Chat ID above
2. Log into the web dashboard
3. Go to Profile → Telegram Settings
4. Paste your Chat ID and connect

*Need Help?*
Contact your system administrator for assistance.
            `;

            await ctx.reply(helpMessage, { parse_mode: 'Markdown' });
        });

        // Handle /status command
        botInstance.command('status', async (ctx) => {
            const chatId = ctx.chat.id.toString();

            try {
                const user = await User.findOne({ 'telegram.chatId': chatId });

                if (!user) {
                    const statusMessage = `
❌ *Account Not Connected*

Your Telegram account is not connected to any user in the system.

*To connect:*
1. Use your Chat ID: \`${chatId}\`
2. Log into the web dashboard
3. Go to Profile → Telegram Settings
4. Enter your Chat ID and connect

Use /start for detailed instructions.
                    `;

                    return ctx.reply(statusMessage, { parse_mode: 'Markdown' });
                }

                const notificationsEnabled = user.telegram.active &&
                    user.notificationPreferences?.receiveAlerts !== false;
                const status = notificationsEnabled ? '✅ Active' : '❌ Inactive';

                const statusMessage = `
📊 *Your Notification Status*

*User:* ${user.username}
*Email:* ${user.email}
*Department:* ${user.department || 'Not specified'}
*Role:* ${user.role}
*Notifications:* ${status}

*Connected:* ${user.telegram.connectedAt ?
                    new Date(user.telegram.connectedAt).toLocaleDateString() : 'Unknown'}

To change settings, visit your profile in the web application.
                `;

                await ctx.reply(statusMessage, { parse_mode: 'Markdown' });
            } catch (error) {
                logger.error(`Error in Telegram status command: ${error.message}`);
                await ctx.reply('❌ An error occurred while checking your status. Please try again later.');
            }
        });

        // Handle /stop command
        botInstance.command('stop', async (ctx) => {
            const chatId = ctx.chat.id.toString();

            try {
                const user = await User.findOne({ 'telegram.chatId': chatId });

                if (!user) {
                    return ctx.reply(`
❌ *Account Not Found*

Your Telegram account is not connected to any user in the system.

Use /start to connect your account.
                    `, { parse_mode: 'Markdown' });
                }

                // Update notification preferences
                if (!user.notificationPreferences) {
                    user.notificationPreferences = {};
                }
                user.notificationPreferences.receiveAlerts = false;
                await user.save();

                await ctx.reply(`
✅ *Notifications Stopped*

You will no longer receive alert notifications.

*To re-enable:*
- Visit your profile in the web application
- Toggle notifications back on

*Note:* Your Telegram account remains connected.
                `, { parse_mode: 'Markdown' });

                logger.info(`User ${user.username} stopped Telegram notifications via bot`);
            } catch (error) {
                logger.error(`Error in Telegram stop command: ${error.message}`);
                await ctx.reply('❌ An error occurred while processing your request. Please try again later.');
            }
        });

        // Handle unknown commands
        botInstance.on('text', async (ctx) => {
            const text = ctx.message.text;

            // Skip if it's a command (starts with /)
            if (text.startsWith('/')) {
                return ctx.reply(`
❓ Unknown command: ${text}

Use /help to see available commands.
                `);
            }

            // Handle regular messages
            const chatId = ctx.chat.id.toString();
            await ctx.reply(`
👋 Hello! I'm the Medical Waste Management bot.

*Your Chat ID:* \`${chatId}\`

Use /help to see what I can do, or /start if you haven't connected your account yet.
            `, { parse_mode: 'Markdown' });
        });

        // Global error handling
        botInstance.catch((err, ctx) => {
            logger.error(`Telegram bot error for user ${ctx.from?.id}: ${err.message}`);

            // Try to send error message to user
            try {
                ctx.reply('❌ An unexpected error occurred. Please try again later or contact support.');
            } catch (replyError) {
                logger.error(`Failed to send error message to user: ${replyError.message}`);
            }
        });

        // Start the bot with error handling
        await botInstance.launch({
            dropPendingUpdates: true // This helps prevent conflicts
        });

        isInitialized = true;
        logger.info('Telegram bot initialized and started successfully');

        // Setup graceful shutdown handlers
        const gracefulStop = async (signal) => {
            logger.info(`Received ${signal}, stopping Telegram bot gracefully...`);
            try {
                await botInstance.stop(signal);
                isInitialized = false;
                botInstance = null;
                logger.info('Telegram bot stopped successfully');
            } catch (error) {
                logger.error(`Error stopping Telegram bot: ${error.message}`);
            }
        };

        // Remove existing listeners to prevent duplicates
        process.removeAllListeners('SIGINT');
        process.removeAllListeners('SIGTERM');

        // Add new listeners
        process.once('SIGINT', () => gracefulStop('SIGINT'));
        process.once('SIGTERM', () => gracefulStop('SIGTERM'));

        return botInstance;

    } catch (error) {
        logger.error(`Failed to initialize Telegram bot: ${error.message}`);
        isInitialized = false;
        botInstance = null;
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
    if (!botInstance || !isInitialized) {
        logger.error('Cannot send Telegram message: Bot not initialized');
        throw new Error('Telegram bot not initialized');
    }

    try {
        const defaultOptions = {
            parse_mode: 'Markdown',
            disable_web_page_preview: true
        };

        const messageOptions = { ...defaultOptions, ...options };
        const result = await botInstance.telegram.sendMessage(chatId, message, messageOptions);
        logger.info(`Telegram message sent to ${chatId}`);
        return result;
    } catch (error) {
        // Handle specific Telegram errors
        if (error.code === 403) {
            logger.warn(`User ${chatId} has blocked the bot or chat not found`);
        } else if (error.code === 400) {
            logger.warn(`Invalid chat ID or message format for ${chatId}: ${error.message}`);
        } else {
            logger.error(`Error sending Telegram message to ${chatId}: ${error.message}`);
        }
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
    if (!botInstance || !isInitialized) {
        logger.warn('Cannot send alert notifications: Telegram bot not initialized');
        return [];
    }

    try {
        // Prepare query to find users to notify
        const query = {
            'telegram.active': true,
            'telegram.chatId': { $ne: null, $exists: true },
            'notificationPreferences.receiveAlerts': { $ne: false },
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

        // Create alert message with better formatting
        const urgencyLevel = bin.fullness >= 95 ? 'CRITICAL' : bin.fullness >= 90 ? 'HIGH' : 'MEDIUM';
        const urgencyEmoji = bin.fullness >= 95 ? '🚨' : bin.fullness >= 90 ? '⚠️' : '📊';

        const message = `
${urgencyEmoji} *${urgencyLevel} ALERT: Waste Bin ${bin.binId}*

*Fill Level:* ${bin.fullness}% (Threshold: ${bin.alertThreshold}%)
*Department:* ${bin.department}
*Waste Type:* ${bin.wasteType}

*Location Details:*
• Floor: ${bin.location?.floor || 'Unknown'}
• Room: ${bin.location?.room || 'Unknown'}

*Last Update:* ${new Date(bin.lastUpdate).toLocaleString()}

${bin.fullness >= 95 ?
            '🔴 *IMMEDIATE ACTION REQUIRED*' :
            '🟡 Please schedule collection soon'
        }

_Automated alert from Medical Waste Management System_
        `;

        // Send message to each user with rate limiting
        const results = [];
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        for (let i = 0; i < users.length; i++) {
            const user = users[i];

            try {
                // Add small delay between messages to avoid rate limits
                if (i > 0) {
                    await delay(100);
                }

                const result = await sendTelegramMessage(user.telegram.chatId, message);
                results.push({
                    userId: user._id,
                    username: user.username,
                    chatId: user.telegram.chatId,
                    success: true,
                    messageId: result.message_id
                });

                logger.info(`Alert sent to ${user.username} (${user.telegram.chatId}) for bin ${bin.binId}`);
            } catch (error) {
                logger.error(`Failed to send Telegram alert to user ${user.username}: ${error.message}`);
                results.push({
                    userId: user._id,
                    username: user.username,
                    chatId: user.telegram.chatId,
                    success: false,
                    error: error.message
                });
            }
        }

        logger.info(`Telegram alert batch completed for bin ${bin.binId}: ${results.filter(r => r.success).length}/${results.length} successful`);
        return results;
    } catch (error) {
        logger.error(`Error in sendAlertNotification: ${error.message}`);
        throw error;
    }
};

/**
 * Get bot status and info
 */
const getBotStatus = () => {
    return {
        initialized: isInitialized,
        hasInstance: !!botInstance,
        tokenConfigured: !!process.env.TELEGRAM_BOT_TOKEN
    };
};

/**
 * Shutdown bot gracefully
 */
const shutdownBot = async () => {
    if (botInstance && isInitialized) {
        try {
            await botInstance.stop();
            isInitialized = false;
            botInstance = null;
            logger.info('Telegram bot shut down successfully');
        } catch (error) {
            logger.error(`Error shutting down Telegram bot: ${error.message}`);
        }
    }
};

module.exports = {
    bot: botInstance, // For backward compatibility
    initializeBot,
    sendTelegramMessage,
    sendAlertNotification,
    getBotStatus,
    shutdownBot
};