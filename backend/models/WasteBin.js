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
    // Container physical dimensions
    containerHeight: {
        type: Number,
        default: 50, // Default 50cm height
        min: [10, 'Container height must be at least 10cm'],
        max: [200, 'Container height cannot exceed 200cm'],
        required: true
    },
    capacity: {
        type: Number,
        default: 50, // Default capacity in liters
        min: [0, 'Capacity cannot be negative']
    },
    // Sensor readings
    distance: {
        type: Number,
        default: 50, // Default to containerHeight (empty)
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
    deviceInfo: {
        macAddress: String,
        batteryVoltage: Number,
        lastSeen: Date,
        status: {
            type: String,
            enum: ['active', 'offline', 'maintenance'],
            default: 'active'
        }
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

// Virtual for calculated fullness percentage based on distance and container height
wasteBinSchema.virtual('fullness').get(function() {
    if (!this.distance || !this.containerHeight) return 0;

    // Calculate fullness: distance from sensor to waste surface
    // If distance >= containerHeight, bin is empty (0%)
    // If distance = 0, bin is full (100%)
    const fullnessPercentage = Math.max(0, Math.min(100,
        ((this.containerHeight - this.distance) / this.containerHeight) * 100
    ));

    return Math.round(fullnessPercentage);
});

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
    // Update distance reading (primary sensor data)
    if (data.distance !== undefined) {
        this.distance = Math.max(0, Math.min(this.containerHeight, data.distance));
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

    // Update device info
    if (data.macAddress) {
        this.deviceInfo.macAddress = data.macAddress;
        this.deviceInfo.lastSeen = new Date();
        this.deviceInfo.status = 'active';
    }

    // Update timestamps
    this.lastUpdate = new Date();

    // Store current fullness for comparison
    const currentFullness = this.fullness;

    // If bin was emptied (fullness decreased significantly), record as collection
    if (currentFullness < 20 && this._previousFullness && this._previousFullness > 70) {
        this.collectionHistory.push({
            collectedAt: new Date(),
            fullnessAtCollection: this._previousFullness,
            weightAtCollection: this._previousWeight || 0
        });
        this.lastCollection = new Date();
    }

    // Store previous values for next comparison
    this._previousFullness = currentFullness;
    this._previousWeight = this.weight;

    return this.save();
};

// Method to update container configuration
wasteBinSchema.methods.updateConfiguration = async function(config) {
    if (config.containerHeight !== undefined) {
        this.containerHeight = Math.max(10, Math.min(200, config.containerHeight));
    }

    if (config.alertThreshold !== undefined) {
        this.alertThreshold = Math.max(50, Math.min(95, config.alertThreshold));
    }

    if (config.capacity !== undefined) {
        this.capacity = Math.max(0, config.capacity);
    }

    this.lastUpdate = new Date();
    return this.save();
};

const WasteBin = mongoose.model('WasteBin', wasteBinSchema);

module.exports = WasteBin;