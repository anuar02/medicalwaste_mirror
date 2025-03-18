// models/WasteBin.js
const mongoose = require('mongoose');
const validator = require('validator');

const wasteBinSchema = new mongoose.Schema({
    binId: {
        type: String,
        required: [true, 'Bin ID is required'],
        unique: true,
        trim: true,
        validate: {
            validator: function(v) {
                return /^[A-Z]+-\d{3,}$/.test(v);
            },
            message: 'Bin ID must be in format DEPT-123'
        }
    },
    department: {
        type: String,
        required: [true, 'Department is required'],
        trim: true
    },
    wasteType: {
        type: String,
        required: [true, 'Waste type is required'],
        enum: {
            values: [
                'Острые Медицинские Отходы',
                'Инфекционные Отходы',
                'Патологические Отходы',
                'Фармацевтические Отходы',
                'Химические Отходы',
                'Радиоактивные Отходы',
                'Общие Медицинские Отходы'
            ],
            message: 'Please provide a valid waste type'
        }
    },
    fullness: {
        type: Number,
        default: 0,
        min: [0, 'Fullness cannot be less than 0%'],
        max: [100, 'Fullness cannot exceed 100%']
    },
    distance: {
        type: Number,
        default: 0,
        min: [0, 'Distance cannot be negative']
    },
    weight: {
        type: Number,
        default: 0,
        min: [0, 'Weight cannot be negative']
    },
    temperature: {
        type: Number,
        default: 22.0
    },
    capacity: {
        type: Number,
        default: 50, // Default capacity in liters
        min: [0, 'Capacity cannot be negative']
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
            default: [0, 0]
        },
        floor: {
            type: Number,
            default: 1
        },
        room: {
            type: String,
            trim: true
        }
    },
    status: {
        type: String,
        enum: ['active', 'maintenance', 'offline', 'decommissioned'],
        default: 'active'
    },
    alertThreshold: {
        type: Number,
        default: 80, // Alert when bin is 80% full
        min: [50, 'Alert threshold must be at least 50%'],
        max: [95, 'Alert threshold cannot exceed 95%']
    },
    collectionHistory: [{
        collectedAt: {
            type: Date,
            required: true
        },
        collectedBy: {
            type: String,
            trim: true
        },
        fullnessAtCollection: {
            type: Number
        },
        weightAtCollection: {
            type: Number
        }
    }],
    maintenanceHistory: [{
        maintainedAt: {
            type: Date,
            required: true
        },
        maintainedBy: {
            type: String,
            trim: true
        },
        maintenanceType: {
            type: String,
            enum: ['cleaning', 'repair', 'calibration', 'other']
        },
        notes: String
    }],
    lastCollection: {
        type: Date,
        default: Date.now
    },
    nextScheduledCollection: {
        type: Date
    },
    lastUpdate: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Add index for efficient queries
wasteBinSchema.index({ binId: 1 });
wasteBinSchema.index({ department: 1 });
wasteBinSchema.index({ 'location.coordinates': '2dsphere' }); // Add geospatial index

// Virtual for estimated fill time
wasteBinSchema.virtual('estimatedFillTime').get(function() {
    // Simple prediction based on last update and current fullness
    if (!this.fillRate || this.fillRate <= 0) return null;

    const remainingCapacity = 100 - this.fullness;
    const estimatedTimeInHours = remainingCapacity / this.fillRate;

    if (estimatedTimeInHours <= 0) return 'Collection required';

    const estimatedDate = new Date();
    estimatedDate.setHours(estimatedDate.getHours() + estimatedTimeInHours);

    return estimatedDate;
});

// Virtual for fill rate calculation (% per hour)
wasteBinSchema.virtual('fillRate').get(function() {
    if (!this._fillRate) {
        // Calculate from history - to be implemented
        this._fillRate = 5; // Default 5% per hour if no history
    }
    return this._fillRate;
});

// Check if bin needs collection
wasteBinSchema.methods.needsCollection = function() {
    return this.fullness >= this.alertThreshold;
};

// Add new data point and recalculate
wasteBinSchema.methods.updateWithSensorData = async function(data) {
    // Update basic fields
    if (data.distance !== undefined) {
        this.distance = data.distance;
        // Calculate fullness based on distance
        // Assuming max distance = 100cm (empty), min distance = 0cm (full)
        this.fullness = Math.max(0, Math.min(100, (1 - data.distance/100) * 100));
    }

    // Update weight if provided
    if (data.weight !== undefined) {
        this.weight = data.weight;
    }

    // Update temperature if provided
    if (data.temperature !== undefined) {
        this.temperature = data.temperature;
    }

    // Update location if provided
    if (data.latitude !== undefined && data.longitude !== undefined) {
        this.location.coordinates = [data.longitude, data.latitude];
    }

    // Update timestamps
    this.lastUpdate = new Date();

    // If bin was emptied (fullness decreased significantly), record as collection
    if (this.fullness < 20 && this._previousFullness && this._previousFullness > 70) {
        this.collectionHistory.push({
            collectedAt: new Date(),
            fullnessAtCollection: this._previousFullness,
            weightAtCollection: this._previousWeight || 0
        });
        this.lastCollection = new Date();
    }

    // Store previous values for next comparison
    this._previousFullness = this.fullness;
    this._previousWeight = this.weight;

    return this.save();
};

const WasteBin = mongoose.model('WasteBin', wasteBinSchema);

module.exports = WasteBin;