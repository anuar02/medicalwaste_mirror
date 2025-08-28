// models/History.js - Updated to handle dynamic fullness calculation
const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
    binId: {
        type: String,
        required: [true, 'Bin ID is required'],
        trim: true,
        index: true
    },
    // Store the raw sensor data
    distance: {
        type: Number,
        required: [true, 'Distance is required'],
        min: [0, 'Distance cannot be negative']
    },
    // Store container height at the time of measurement
    containerHeight: {
        type: Number,
        required: [true, 'Container height is required'],
        min: [10, 'Container height must be at least 10cm'],
        max: [200, 'Container height cannot exceed 200cm']
    },
    // Keep calculated fullness for quick access and historical accuracy
    fullness: {
        type: Number,
        required: [true, 'Fullness is required'],
        min: [0, 'Fullness cannot be less than 0%'],
        max: [100, 'Fullness cannot exceed 100%']
    },
    weight: {
        type: Number,
        default: 0
    },
    temperature: {
        type: Number,
        default: 22.0
    },
    time: {
        type: String
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true
});

// Compound index for efficient queries
historySchema.index({ binId: 1, timestamp: -1 });

// TTL index to automatically delete old records after 30 days
historySchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// Method to calculate fullness (in case we need to recalculate)
historySchema.methods.calculateFullness = function() {
    if (!this.distance || !this.containerHeight) return 0;

    const fullnessPercentage = Math.max(0, Math.min(100,
        ((this.containerHeight - this.distance) / this.containerHeight) * 100
    ));

    return Math.round(fullnessPercentage);
};

// Static method to create history record with calculated fullness
historySchema.statics.createRecord = async function(data) {
    const { binId, distance, containerHeight, weight, temperature } = data;

    // Calculate fullness
    const fullness = Math.max(0, Math.min(100,
        Math.round(((containerHeight - distance) / containerHeight) * 100)
    ));

    return this.create({
        binId,
        distance,
        containerHeight,
        fullness,
        weight: weight || 0,
        temperature: temperature || 22.0,
        time: new Date().toISOString()
    });
};

// Static method to get history for a specific bin
historySchema.statics.getHistoryForBin = async function(binId, limit = 24) {
    return this.find({ binId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .select('binId distance containerHeight fullness weight temperature timestamp time');
};

// Static method to get history for multiple bins
historySchema.statics.getHistoryForBins = async function(binIds, limit = 24) {
    return this.find({ binId: { $in: binIds } })
        .sort({ timestamp: -1 })
        .limit(limit * binIds.length)
        .select('binId distance containerHeight fullness weight temperature timestamp time');
};

// Static method to get aggregated history (e.g. hourly averages)
historySchema.statics.getAggregatedHistory = async function(binId, timeFrame = 'hour') {
    let groupByTimeFormat;

    switch(timeFrame) {
        case 'hour':
            groupByTimeFormat = { $dateToString: { format: '%Y-%m-%d %H:00', date: '$timestamp' } };
            break;
        case 'day':
            groupByTimeFormat = { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } };
            break;
        case 'week':
            // Group by week (using ISO week date)
            groupByTimeFormat = {
                $concat: [
                    { $dateToString: { format: '%Y', date: '$timestamp' } },
                    '-W',
                    { $toString: { $isoWeek: '$timestamp' } }
                ]
            };
            break;
        default:
            groupByTimeFormat = { $dateToString: { format: '%Y-%m-%d %H:00', date: '$timestamp' } };
    }

    return this.aggregate([
        { $match: { binId } },
        {
            $group: {
                _id: groupByTimeFormat,
                avgFullness: { $avg: '$fullness' },
                avgDistance: { $avg: '$distance' },
                avgWeight: { $avg: '$weight' },
                avgTemperature: { $avg: '$temperature' },
                avgContainerHeight: { $avg: '$containerHeight' },
                count: { $sum: 1 },
                firstTimestamp: { $min: '$timestamp' },
                lastTimestamp: { $max: '$timestamp' }
            }
        },
        { $sort: { firstTimestamp: 1 } }
    ]);
};

// Static method to recalculate fullness for existing records (migration helper)
historySchema.statics.recalculateFullness = async function(binId) {
    const records = await this.find({ binId });

    const updates = records.map(record => {
        const newFullness = Math.max(0, Math.min(100,
            Math.round(((record.containerHeight - record.distance) / record.containerHeight) * 100)
        ));

        return {
            updateOne: {
                filter: { _id: record._id },
                update: { fullness: newFullness }
            }
        };
    });

    if (updates.length > 0) {
        return this.bulkWrite(updates);
    }

    return { modifiedCount: 0 };
};

const History = mongoose.model('History', historySchema);

module.exports = History;