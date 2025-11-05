// models/DriverLocation.js
const mongoose = require('mongoose');

const driverLocationSchema = new mongoose.Schema({
    driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Driver is required'],
        index: true
    },
    session: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CollectionSession',
        required: [true, 'Session is required'],
        index: true
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true,
            validate: {
                validator: function(v) {
                    return v.length === 2 &&
                        v[0] >= -180 && v[0] <= 180 &&
                        v[1] >= -90 && v[1] <= 90;
                },
                message: 'Invalid coordinates'
            }
        }
    },
    accuracy: {
        type: Number, // Accuracy in meters
        default: 0
    },
    altitude: {
        type: Number, // Altitude in meters
        default: 0
    },
    altitudeAccuracy: {
        type: Number,
        default: 0
    },
    heading: {
        type: Number, // Direction in degrees (0-359)
        min: 0,
        max: 359
    },
    speed: {
        type: Number, // Speed in meters/second
        default: 0,
        min: 0
    },
    timestamp: {
        type: Date,
        required: true,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true
});

// Compound indexes for efficient queries
driverLocationSchema.index({ driver: 1, timestamp: -1 });
driverLocationSchema.index({ session: 1, timestamp: 1 });
driverLocationSchema.index({ location: '2dsphere' });

// Static method to get recent locations for driver
driverLocationSchema.statics.getRecentLocations = function(driverId, limit = 100) {
    return this.find({ driver: driverId })
        .sort({ timestamp: -1 })
        .limit(limit);
};

// Static method to get locations for session
driverLocationSchema.statics.getSessionLocations = function(sessionId) {
    return this.find({ session: sessionId })
        .sort({ timestamp: 1 });
};

// Static method to get last location for driver
driverLocationSchema.statics.getLastLocation = function(driverId) {
    return this.findOne({ driver: driverId })
        .sort({ timestamp: -1 });
};

const DriverLocation = mongoose.model('DriverLocation', driverLocationSchema);

module.exports = DriverLocation;