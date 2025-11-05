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
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MedicalCompany',
        default: null // Unassigned bins have null company
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
    deviceInfo: {
        macAddress: String,
        batteryVoltage: Number,
        lastSeen: Date,
        status: {
            type: String,
            enum: ['active', 'offline', 'maintenance'],
            default: 'active'
        },
        deviceType: String,
        registeredAt: Date
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number],
            default: [0, 0],
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
    address: {
        type: String,
        trim: true
    },
    capacity: {
        type: Number,
        default: 50,
        min: [1, 'Capacity must be at least 1 liter']
    },
    alertThreshold: {
        type: Number,
        default: 80,
        min: [50, 'Alert threshold must be at least 50%'],
        max: [95, 'Alert threshold cannot exceed 95%']
    },
    status: {
        type: String,
        enum: ['active', 'maintenance', 'offline', 'decommissioned'],
        default: 'active'
    },
    lastUpdate: {
        type: Date,
        default: Date.now
    },
    lastCollection: {
        type: Date
    },
    collectionHistory: [{
        collectedAt: {
            type: Date,
            required: true
        },
        fullnessAtCollection: {
            type: Number,
            default: 0
        },
        weightAtCollection: {
            type: Number,
            default: 0
        }
    }],
    notes: {
        type: String,
        trim: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
wasteBinSchema.index({ binId: 1 });
wasteBinSchema.index({ company: 1 });
wasteBinSchema.index({ status: 1 });
wasteBinSchema.index({ fullness: 1 });
wasteBinSchema.index({ location: '2dsphere' });
wasteBinSchema.index({ 'deviceInfo.macAddress': 1 });

// Virtual for checking if bin needs collection
wasteBinSchema.virtual('needsCollection').get(function() {
    return this.fullness >= this.alertThreshold;
});

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
