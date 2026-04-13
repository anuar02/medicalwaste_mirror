const { logger } = require('../middleware/loggers');
const NotificationLog = require('../models/NotificationLog');
const Handoff = require('../models/Handoff');
const User = require('../models/User');
const { sendTelegramMessage } = require('../utils/telegram');
const { sendWhatsAppMessage } = require('./whatsappService');
const { sendSMS } = require('./smsService');

// Provider registry. Each provider takes (recipient, message) and returns
// { success, messageId?, error? }. Adding a new provider (e.g. Meta WhatsApp,
// Mobizon SMS) is a single entry here plus a driver file — controllers never
// change.
const PROVIDERS = {
    telegram: async (recipient, message) => {
        if (!recipient.telegramChatId) {
            return { success: false, error: 'No telegram chatId' };
        }
        try {
            const res = await sendTelegramMessage(recipient.telegramChatId, message);
            return { success: true, messageId: res?.message_id ? String(res.message_id) : null };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    whatsapp: async (recipient, message) => {
        if (!recipient.phone) {
            return { success: false, error: 'No phone' };
        }
        return sendWhatsAppMessage(recipient.phone, message);
    },
    sms: async (recipient, message) => {
        if (!recipient.phone) {
            return { success: false, error: 'No phone' };
        }
        return sendSMS(recipient.phone, message);
    }
};

async function writeHandoffLog({ handoff, recipient, channel, message, result }) {
    if (!handoff?._id) return;
    try {
        await NotificationLog.create({
            handoff: handoff._id,
            recipient: {
                user: recipient.user || null,
                phone: recipient.phone || null,
                name: recipient.name || ''
            },
            channel,
            status: result.success ? 'sent' : 'failed',
            messageId: result.messageId || null,
            content: message,
            sentAt: new Date(),
            failureReason: result.success ? null : result.error || null
        });
    } catch (logError) {
        logger.error(`Failed to persist ${channel} NotificationLog: ${logError.message}`);
    }
}

/**
 * Send a message to one recipient through a prioritized list of channels.
 *
 * @param {Object}   params
 * @param {Object}   params.recipient           - { user?, phone?, telegramChatId?, name? }
 * @param {string}   params.message             - message text
 * @param {string[]} params.channels            - ordered channel list, e.g. ['whatsapp', 'sms']
 * @param {boolean}  [params.fallback=true]     - stop on first successful channel
 * @param {Object}   [params.handoff=null]      - optional Handoff doc; if set, each attempt is persisted to NotificationLog
 * @returns {Promise<{ success: boolean, attempts: Array<{ channel, success, messageId?, error? }> }>}
 */
async function notify({ recipient, message, channels, fallback = true, handoff = null }) {
    if (!recipient) {
        return { success: false, attempts: [{ error: 'Recipient required' }] };
    }
    if (!Array.isArray(channels) || channels.length === 0) {
        return { success: false, attempts: [{ error: 'No channels specified' }] };
    }

    const attempts = [];
    let overallSuccess = false;

    for (const channel of channels) {
        const provider = PROVIDERS[channel];
        if (!provider) {
            attempts.push({ channel, success: false, error: 'Unknown channel' });
            continue;
        }

        let result;
        try {
            result = await provider(recipient, message);
        } catch (error) {
            result = { success: false, error: error.message };
        }

        attempts.push({ channel, ...result });
        await writeHandoffLog({ handoff, recipient, channel, message, result });

        if (result.success) {
            overallSuccess = true;
            if (fallback) break;
        } else {
            logger.warn(`Notification channel '${channel}' failed for ${recipient.phone || recipient.telegramChatId || 'unknown'}: ${result.error}`);
        }
    }

    if (handoff?._id) {
        const lastAttempt = attempts[attempts.length - 1] || {};
        try {
            await Handoff.updateOne(
                { _id: handoff._id },
                {
                    $set: {
                        lastNotification: {
                            success: overallSuccess,
                            channel: lastAttempt.channel || null,
                            at: new Date(),
                            error: overallSuccess ? null : (lastAttempt.error || 'All channels failed')
                        }
                    }
                }
            );
        } catch (err) {
            logger.error(`Failed to persist lastNotification on handoff ${handoff._id}: ${err.message}`);
        }
    }

    return { success: overallSuccess, attempts };
}

function buildBinAlertMessage(bin) {
    return (
        `*⚠️ ALERT: Waste Bin ${bin.binId} is ${bin.fullness}% full*\n\n`
        + `Department: ${bin.department || 'Unknown'}\n`
        + `Waste Type: ${bin.wasteType || 'Unknown'}\n`
        + `Threshold: ${bin.alertThreshold}%\n`
        + `Location: Floor ${bin.location?.floor || '1'}, Room ${bin.location?.room || 'Unknown'}\n`
        + `Last Update: ${new Date(bin.lastUpdate).toLocaleString()}\n\n`
        + 'Please schedule collection as soon as possible.'
    );
}

/**
 * Fan out a bin fullness alert to eligible users.
 * Per-user channel priority: Telegram → WhatsApp → SMS. Telegram first because
 * it is free and covers the internal-user case; WhatsApp/SMS are fallback for
 * users who never connected Telegram.
 *
 * @param {Object}   bin            - { binId, department, wasteType, fullness, alertThreshold, location, lastUpdate }
 * @param {string[]} [userIds=null] - narrow to these user ids; null = all eligible
 * @returns {Promise<{ totalUsers, successCount, results }>}
 */
async function notifyBinAlert(bin, userIds = null) {
    const query = {
        active: true,
        'notificationPreferences.receiveAlerts': true,
        $or: [
            { 'telegram.active': true, 'telegram.chatId': { $nin: [null, ''] } },
            { phoneNumber: { $nin: [null, ''] } }
        ]
    };
    if (Array.isArray(userIds) && userIds.length > 0) {
        query._id = { $in: userIds };
    }

    const users = await User.find(query);
    if (users.length === 0) {
        logger.warn('notifyBinAlert: no eligible users');
        return { totalUsers: 0, successCount: 0, results: [] };
    }

    const message = buildBinAlertMessage(bin);
    const results = [];

    for (const user of users) {
        const recipient = {
            user: user._id,
            phone: user.phoneNumber || null,
            telegramChatId: user.telegram?.chatId || null,
            name: user.username
        };
        const res = await notify({
            recipient,
            message,
            channels: ['telegram', 'whatsapp', 'sms'],
            fallback: true
        });
        results.push({
            userId: user._id,
            username: user.username,
            success: res.success,
            attempts: res.attempts
        });
    }

    return {
        totalUsers: users.length,
        successCount: results.filter(r => r.success).length,
        results
    };
}

module.exports = {
    notify,
    notifyBinAlert
};
