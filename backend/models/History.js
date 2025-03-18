// models/History.js
const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
    binId: {
        type: String,
        required: [true, 'Bin ID is required'],
        trim: true,
        index: true
    },
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
    distance: {
        type: Number
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

// Static method to get history for a specific bin
historySchema.statics.getHistoryForBin = async function(binId, limit = 24) {
    return this.find({ binId })
        .sort({ timestamp: -1 })
        .limit(limit);
};

// Static method to get history for multiple bins
historySchema.statics.getHistoryForBins = async function(binIds, limit = 24) {
    return this.find({ binId: { $in: binIds } })
        .sort({ timestamp: -1 })
        .limit(limit * binIds.length);
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
                avgWeight: { $avg: '$weight' },
                avgTemperature: { $avg: '$temperature' },
                count: { $sum: 1 },
                firstTimestamp: { $min: '$timestamp' },
                lastTimestamp: { $max: '$timestamp' }
            }
        },
        { $sort: { firstTimestamp: 1 } }
    ]);
};

const History = mongoose.model('History', historySchema);

module.exports = History;