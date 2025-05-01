const { sendBinAlertMessage } = require('../utils/telegram');
const Bin = require('../models/WasteBin'); // Assuming you have a bin model
const User = require('../models/User'); // Assuming you have a user model
const { logger } = require('../middleware/loggers');

/**
 * Check bin fullness and send alerts if needed
 * @param {string} binId - ID of the bin to check
 * @returns {Promise<boolean>} - True if alert was sent, false otherwise
 */
exports.checkBinAndSendAlerts = async (binId) => {
    try {
        // Find the bin
        const bin = await Bin.findById(binId);

        if (!bin) {
            logger.error(`Bin with ID ${binId} not found`);
            return false;
        }

        // Check if bin fullness exceeds alert threshold
        if (bin.fullness >= bin.alertThreshold) {
            // Get all users who should receive notifications for this bin's department
            const users = await User.find({
                role: { $in: ['admin', 'manager', 'waste_handler'] },
                departments: bin.department,
                telegramChatId: { $exists: true, $ne: '' }
            });

            if (users.length === 0) {
                logger.warn(`No users with Telegram chat IDs found for department ${bin.department}`);
                return false;
            }

            // Extract Telegram chat IDs
            const chatIds = users.map(user => user.telegramChatId);

            // Send alerts
            await sendBinAlertMessage(bin, chatIds);

            // Update bin with lastAlertSent timestamp
            bin.lastAlertSent = Date.now();
            await bin.save();

            logger.info(`Alert sent for bin ${binId} at ${bin.fullness}% fullness`);
            return true;
        }

        return false;
    } catch (error) {
        logger.error(`Error in checkBinAndSendAlerts: ${error.message}`);
        throw error;
    }
};

/**
 * API endpoint to manually trigger bin alerts
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.triggerBinAlert = async (req, res) => {
    try {
        const { binId } = req.params;

        const alertSent = await this.checkBinAndSendAlerts(binId);

        if (alertSent) {
            res.status(200).json({
                status: 'success',
                message: 'Bin alert triggered successfully'
            });
        } else {
            res.status(200).json({
                status: 'success',
                message: 'Bin alert not needed (threshold not exceeded)'
            });
        }
    } catch (error) {
        logger.error(`Error in triggerBinAlert: ${error.message}`);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

/**
 * API endpoint to test Telegram notification for a specific user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.sendTestNotification = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId);

        if (!user || !user.telegramChatId) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found or Telegram chat ID not set'
            });
        }

        // Create a test bin object
        const testBin = {
            binId: 'TEST-123',
            department: 'Test Department',
            fullness: 95,
            alertThreshold: 80,
            wasteType: 'Test Waste',
            location: {
                floor: '1',
                room: 'Test Room'
            },
            lastUpdate: new Date()
        };

        // Send test message
        await sendBinAlertMessage(testBin, [user.telegramChatId]);

        res.status(200).json({
            status: 'success',
            message: 'Test notification sent successfully'
        });
    } catch (error) {
        logger.error(`Error in sendTestNotification: ${error.message}`);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};