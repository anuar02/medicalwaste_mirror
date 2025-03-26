// models/TrackingData.js
const mongoose = require('mongoose');

const trackingDataSchema = new mongoose.Schema({
    deviceId: {
        type: String,
        required: [true, 'Device ID is required'],
        trim: true,
        index: true
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number],
            validate: {
                validator: function(v) {
                    // Validate that coordinates are within valid range
                    return v.length === 2 &&
                        v[0] >= -180 && v[0] <= 180 &&
                        v[1] >= -90 && v[1] <= 90;
                },
                message: 'Invalid coordinates'
            },
            required: true
        }
    },
    altitude: {
        type: Number,
        default: 0
    },
    speed: {
        type: Number,
        default: 0
    },
    course: {
        type: Number,
        default: 0
    },
    battery: {
        type: Number,
        min: 0,
        max: 100,
        default: 100
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true
});

// Add index for geospatial queries
trackingDataSchema.index({ location: '2dsphere' });

// Compound index for efficient queries
trackingDataSchema.index({ deviceId: 1, timestamp: -1 });

// TTL index to automatically delete old data after 30 days
trackingDataSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

const TrackingData = mongoose.model('TrackingData', trackingDataSchema);

module.exports = TrackingData;