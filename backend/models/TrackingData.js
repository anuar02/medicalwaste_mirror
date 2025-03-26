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
    isCollecting: {
        type: Boolean,
        default: false
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

// Static method to get history for a specific device
trackingDataSchema.statics.getHistoryForDevice = async function(deviceId, limit = 100) {
    return this.find({ deviceId })
        .sort({ timestamp: -1 })
        .limit(limit);
};

// Static method to get last known position of a device
trackingDataSchema.statics.getLastPosition = async function(deviceId) {
    return this.findOne({ deviceId })
        .sort({ timestamp: -1 });
};

// Method to calculate distance between two points
trackingDataSchema.statics.calculateDistanceBetween = function(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in km
    return distance;
};

const TrackingData = mongoose.model('TrackingData', trackingDataSchema);

module.exports = TrackingData;