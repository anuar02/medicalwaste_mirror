const mongoose = require('mongoose');

const deviceLogSchema = new mongoose.Schema({
    binId: {
        type: String,
        required: true,
        index: true
    },
    macAddress: {
        type: String,
        required: true
    },
    distance: Number,
    temperature: Number,
    fillLevel: Number,
    latitude: Number,
    longitude: Number,
    wifiStrength: Number,
    batteryLevel: Number,
    logMessage: String,
    logLevel: {
        type: String,
        enum: ['debug', 'info', 'warn', 'error'],
        default: 'info'
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true
});

// Index for efficient querying
deviceLogSchema.index({ binId: 1, timestamp: -1 });
deviceLogSchema.index({ timestamp: -1 });

// TTL index - automatically delete logs older than 7 days
deviceLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 604800 });

module.exports = mongoose.model('DeviceLog', deviceLogSchema);