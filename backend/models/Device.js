const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
    macAddress: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    tempBinId: {
        type: String,
        trim: true
    },
    deviceType: {
        type: String,
        trim: true
    },
    binId: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['pending', 'configured', 'active', 'inactive'],
        default: 'pending'
    },
    lastSeen: {
        type: Date,
        default: Date.now
    },
    sensors: [String],
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number],
            default: [0, 0]
        }
    }
}, {
    timestamps: true
});

deviceSchema.index({ macAddress: 1 });
deviceSchema.index({ status: 1 });
deviceSchema.index({ 'location.coordinates': '2dsphere' });

const Device = mongoose.model('Device', deviceSchema);

module.exports = Device;