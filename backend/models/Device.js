const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
    deviceInfo: {
        macAddress: {
            type: String,
            trim: true
        },
        deviceType: {
            type: String,
            default: 'ESP32'
        },
        status: {
            type: String,
            enum: ['active', 'offline', 'maintenance'],
            default: 'active'
        },
        batteryVoltage: {
            type: Number
        },
        registeredAt: {
            type: Date,
            default: Date.now
        },
        lastSeen: {
            type: Date,
            default: Date.now
        }
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

deviceSchema.index({ macAddress: 1 });
deviceSchema.index({ status: 1 });
deviceSchema.index({ 'location.coordinates': '2dsphere' });

const Device = mongoose.model('Device', deviceSchema);

module.exports = Device;