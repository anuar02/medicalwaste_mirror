// models/CollectionSession.js
const mongoose = require('mongoose');

const collectionSessionSchema = new mongoose.Schema({
    driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Driver is required'],
        index: true
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MedicalCompany',
        index: true
    },
    sessionId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'cancelled'],
        default: 'active',
        index: true
    },
    selectedContainers: [{
        container: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'WasteBin'
        },
        selected: {
            type: Boolean,
            default: false
        },
        visited: {
            type: Boolean,
            default: false
        },
        visitedAt: {
            type: Date
        },
        collectedWeight: {
            type: Number
        }
    }],
    startTime: {
        type: Date,
        required: true,
        default: Date.now
    },
    endTime: {
        type: Date
    },
    startLocation: {
        type: {
            type: String,
            enum: ['Point']
        },
        coordinates: {
            type: [Number] // [longitude, latitude]
        }
        // Not required - optional location data
    },
    endLocation: {
        type: {
            type: String,
            enum: ['Point']
        },
        coordinates: {
            type: [Number]
        }
        // Not required - optional location data
    },
    route: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DriverLocation'
    }],
    totalDistance: {
        type: Number,
        default: 0 // in kilometers
    },
    totalDuration: {
        type: Number,
        default: 0 // in minutes
    },
    containersCollected: {
        type: Number,
        default: 0
    },
    totalWeightCollected: {
        type: Number,
        default: 0 // in kg
    },
    notes: {
        type: String,
        trim: true
    },
    photos: [{
        type: String // URLs to photos
    }]
}, {
    timestamps: true
});

// Indexes for performance
collectionSessionSchema.index({ driver: 1, startTime: -1 });
collectionSessionSchema.index({ company: 1, startTime: -1 });
collectionSessionSchema.index({ status: 1, startTime: -1 });
collectionSessionSchema.index({ 'startLocation.coordinates': '2dsphere' });
collectionSessionSchema.index({ 'endLocation.coordinates': '2dsphere' });

// Method to complete session
collectionSessionSchema.methods.complete = async function(endLocation) {
    this.status = 'completed';
    this.endTime = new Date();
    if (endLocation && endLocation.coordinates && endLocation.coordinates.length === 2) {
        this.endLocation = {
            type: 'Point',
            coordinates: endLocation.coordinates
        };
    }

    // Calculate duration in minutes
    const duration = (this.endTime - this.startTime) / (1000 * 60);
    this.totalDuration = Math.round(duration);

    // Count collected containers
    this.containersCollected = this.selectedContainers.filter(c => c.visited).length;

    // Calculate total weight
    this.totalWeightCollected = this.selectedContainers.reduce((sum, c) => {
        return sum + (c.collectedWeight || 0);
    }, 0);

    return this.save();
};

// Method to add container to session
collectionSessionSchema.methods.addContainer = function(containerId) {
    const exists = this.selectedContainers.some(
        c => c.container.toString() === containerId.toString()
    );

    if (!exists) {
        this.selectedContainers.push({
            container: containerId,
            selected: true,
            visited: false
        });
    }

    return this.save();
};

// Method to mark container as visited
collectionSessionSchema.methods.markContainerVisited = function(containerId, weight) {
    const container = this.selectedContainers.find(
        c => c.container.toString() === containerId.toString()
    );

    if (container) {
        container.visited = true;
        container.visitedAt = new Date();
        if (weight) {
            container.collectedWeight = weight;
        }
    }

    return this.save();
};

// Static method to get active session for driver
collectionSessionSchema.statics.getActiveSessionForDriver = function(driverId) {
    return this.findOne({
        driver: driverId,
        status: 'active'
    }).populate('selectedContainers.container');
};

const CollectionSession = mongoose.model('CollectionSession', collectionSessionSchema);

module.exports = CollectionSession;
