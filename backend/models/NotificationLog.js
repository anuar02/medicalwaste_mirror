const mongoose = require('mongoose');

const notificationLogSchema = new mongoose.Schema(
    {
        handoff: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Handoff',
            required: true,
            index: true
        },
        recipient: {
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                default: null
            },
            phone: String,
            name: String
        },
        channel: {
            type: String,
            enum: ['sms', 'whatsapp', 'telegram', 'push', 'email'],
            default: 'sms'
        },
        status: {
            type: String,
            enum: ['sent', 'delivered', 'failed', 'read'],
            default: 'sent'
        },
        messageId: String,
        content: String,
        sentAt: Date,
        deliveredAt: Date,
        failureReason: String,
        retryCount: {
            type: Number,
            default: 0
        }
    },
    { timestamps: true }
);

notificationLogSchema.index({ handoff: 1, createdAt: -1 });

module.exports = mongoose.model('NotificationLog', notificationLogSchema);
