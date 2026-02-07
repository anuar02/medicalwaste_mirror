const User = require('../models/User');
const { logger } = require('../middleware/loggers');
const { sendWhatsAppMessage } = require('../services/whatsappService');

const buildAlertMessage = (bin) => (
    `ALERT: Waste Bin ${bin.binId} is ${bin.fullness}% full.\n` +
    `Department: ${bin.department || 'Unknown'}.\n` +
    `This exceeds the alert threshold of ${bin.alertThreshold}%.\n` +
    `Waste Type: ${bin.wasteType || 'Unknown'}.\n` +
    `Location: Floor ${bin.location?.floor || '1'}, Room ${bin.location?.room || 'Unknown'}.\n` +
    `Last Update: ${new Date(bin.lastUpdate).toLocaleString()}.\n` +
    'Please schedule collection as soon as possible.'
);

const sendWhatsAppAlertNotification = async (bin, userIds = null) => {
    try {
        const query = {
            phoneNumber: { $nin: [null, ''] },
            'notificationPreferences.receiveAlerts': true,
            active: true
        };

        if (userIds && userIds.length > 0) {
            query._id = { $in: userIds };
        }

        const users = await User.find(query);

        if (users.length === 0) {
            logger.warn('No users available to receive WhatsApp alert notification');
            return [];
        }

        const message = buildAlertMessage(bin);
        const results = [];

        for (const user of users) {
            try {
                const result = await sendWhatsAppMessage(user.phoneNumber, message);
                results.push({
                    userId: user._id,
                    username: user.username,
                    success: result.success,
                    messageId: result.messageId || null,
                    error: result.error || null
                });
            } catch (error) {
                logger.error(`Failed to send WhatsApp alert to user ${user.username}: ${error.message}`);
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
        logger.error(`Error in sendWhatsAppAlertNotification: ${error.message}`);
        throw error;
    }
};

module.exports = {
    sendWhatsAppAlertNotification
};
