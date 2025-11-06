// models/HealthCheck.js
const mongoose = require('mongoose');

const healthCheckSchema = new mongoose.Schema({
    binId: {
        type: String,
        required: [true, 'Bin ID is required'],
        trim: true,
        index: true
    },
    macAddress: {
        type: String,
        required: [true, 'MAC address is required'],
        trim: true,
        index: true
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },
    healthCheckNumber: {
        type: Number,
        default: 0
    },
    
    // System Status
    systemStatus: {
        wifiConnected: {
            type: Boolean,
            required: true
        },
        wifiSignalStrength: {
            type: Number,
            default: 0
        },
        serverReachable: {
            type: Boolean,
            required: true
        },
        registrationValid: {
            type: Boolean,
            required: true
        }
    },
    
    // Sensor Status
    sensorStatus: {
        ultrasonicSensorWorking: {
            type: Boolean,
            required: true
        },
        temperatureSensorWorking: {
            type: Boolean,
            required: true
        }
    },
    
    // System Resources
    systemResources: {
        freeHeap: {
            type: Number,
            default: 0
        },
        uptime: {
            type: Number,
            default: 0
        }
    },
    
    // Current Readings
    currentReadings: {
        distance: {
            type: Number,
            default: 0
        },
        temperature: {
            type: Number,
            default: 22.0
        }
    },
    
    // Location
    location: {
        type: {
            type: String,
            default: 'Point',
            enum: ['Point']
        },
        coordinates: {
            type: [Number],
            default: [0, 0]
        }
    },
    
    // Errors and Status
    errors: {
        type: String,
        default: ''
    },
    overallStatus: {
        type: String,
        enum: ['healthy', 'unhealthy', 'warning'],
        required: true,
        index: true
    }
}, {
    timestamps: true
});

// Compound indexes for efficient queries
healthCheckSchema.index({ binId: 1, timestamp: -1 });
healthCheckSchema.index({ macAddress: 1, timestamp: -1 });
healthCheckSchema.index({ overallStatus: 1, timestamp: -1 });

// Geospatial index for location queries
healthCheckSchema.index({ location: '2dsphere' });

// TTL index to automatically delete old health check records after 30 days
healthCheckSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// Static method to get latest health check for a bin
healthCheckSchema.statics.getLatestForBin = async function(binId) {
    return this.findOne({ binId })
        .sort({ timestamp: -1 });
};

// Static method to get health check history for a bin
healthCheckSchema.statics.getHistoryForBin = async function(binId, limit = 24) {
    return this.find({ binId })
        .sort({ timestamp: -1 })
        .limit(limit);
};

// Static method to get all unhealthy devices
healthCheckSchema.statics.getUnhealthyDevices = async function() {
    // Get the latest health check for each unique binId
    const latestHealthChecks = await this.aggregate([
        {
            $sort: { timestamp: -1 }
        },
        {
            $group: {
                _id: '$binId',
                latestCheck: { $first: '$$ROOT' }
            }
        },
        {
            $replaceRoot: { newRoot: '$latestCheck' }
        },
        {
            $match: {
                overallStatus: { $in: ['unhealthy', 'warning'] }
            }
        }
    ]);
    
    return latestHealthChecks;
};

// Instance method to determine overall health
healthCheckSchema.methods.calculateOverallHealth = function() {
    const { systemStatus, sensorStatus } = this;
    
    // Critical issues make device unhealthy
    if (!systemStatus.wifiConnected || 
        !systemStatus.serverReachable || 
        !sensorStatus.ultrasonicSensorWorking) {
        return 'unhealthy';
    }
    
    // Warning conditions
    if (systemStatus.wifiSignalStrength < -80 || 
        !sensorStatus.temperatureSensorWorking ||
        this.systemResources.freeHeap < 50000) {
        return 'warning';
    }
    
    return 'healthy';
};

const HealthCheck = mongoose.model('HealthCheck', healthCheckSchema);

module.exports = HealthCheck;
