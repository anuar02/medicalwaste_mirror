const mongoose = require('mongoose');

const gpsDataSchema = new mongoose.Schema({
    // Basic location data
    latitude: {
        type: Number,
        required: true,
        min: -90,
        max: 90
    },
    longitude: {
        type: Number,
        required: true,
        min: -180,
        max: 180
    },
    altitude: {
        type: Number,
        default: null // meters above sea level
    },

    // Time information
    gpsTime: {
        type: Date,
        required: true
    },
    systemTime: {
        type: Date,
        default: Date.now
    },

    // Movement data
    speed: {
        type: Number,
        default: null // km/h or knots
    },
    course: {
        type: Number,
        default: null, // degrees (0-360)
        min: 0,
        max: 360
    },

    // Satellite information
    satellites: {
        visible: {
            type: Number,
            default: null
        },
        used: {
            type: Number,
            default: null
        },
        snr: [{
            id: Number,
            snr: Number // Signal-to-noise ratio
        }]
    },

    // Quality indicators
    fixQuality: {
        type: Number,
        default: null, // 0=invalid, 1=GPS fix, 2=DGPS fix
        min: 0,
        max: 2
    },
    hdop: {
        type: Number,
        default: null // Horizontal dilution of precision
    },
    vdop: {
        type: Number,
        default: null // Vertical dilution of precision
    },
    pdop: {
        type: Number,
        default: null // Position dilution of precision
    },

    // Additional data
    deviceInfo: {
        chipId: String,
        firmware: String,
        batteryLevel: Number,
        signalStrength: Number
    },

    // Raw NMEA data (optional, for debugging)
    rawNmea: {
        type: String,
        default: null
    }
}, {
    timestamps: true,
    collection: 'gpsdata'
});

// Indexes for better query performance
gpsDataSchema.index({ gpsTime: -1 });
gpsDataSchema.index({ systemTime: -1 });
gpsDataSchema.index({ latitude: 1, longitude: 1 });
gpsDataSchema.index({ 'deviceInfo.chipId': 1, gpsTime: -1 });

// Virtual for getting location as GeoJSON point
gpsDataSchema.virtual('location').get(function() {
    return {
        type: 'Point',
        coordinates: [this.longitude, this.latitude]
    };
});

// Method to check if GPS fix is valid
gpsDataSchema.methods.isValidFix = function() {
    return this.fixQuality > 0 &&
        this.latitude !== 0 &&
        this.longitude !== 0 &&
        this.satellites.used > 3;
};

module.exports = mongoose.model('GpsData', gpsDataSchema);
