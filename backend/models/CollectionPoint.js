const mongoose = require('mongoose');

const collectionPointSchema = new mongoose.Schema({
    deviceId: {
        type: String,
        required: [true, 'Device ID is required'],
        trim: true,
        index: true
    },
    driverId: {
        type: String,
        required: [true, 'Driver ID is required'],
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
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },
    binIds: {
        type: [String],
        default: []
    },
    binCount: {
        type: Number,
        default: 0
    },
    notes: {
        type: String,
        trim: true
    },
    photos: {
        type: [String], // URLs to photos of collection
        default: []
    }
}, {
    timestamps: true
});

// Add geospatial index
collectionPointSchema.index({ location: '2dsphere' });

// Add compound index for efficient queries
collectionPointSchema.index({ driverId: 1, timestamp: -1 });

const CollectionPoint = mongoose.model('CollectionPoint', collectionPointSchema);

module.exports = CollectionPoint;