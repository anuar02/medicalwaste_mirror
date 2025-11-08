// models/History.js
'use strict';

const mongoose = require('mongoose');

const historySchema = new mongoose.Schema(
    {
        binId: {
            type: String,
            required: [true, 'Bin ID is required'],
            trim: true,
            index: true,
        },

        // Raw sensor distance (cm) at the moment of measurement
        distance: {
            type: Number,
            required: [true, 'Distance is required'],
            min: [0, 'Distance cannot be negative'],
        },

        // Container height (cm) at the moment of measurement
        containerHeight: {
            type: Number,
            required: [true, 'Container height is required'],
            min: [10, 'Container height must be at least 10cm'],
            max: [200, 'Container height cannot exceed 200cm'],
        },

        // Calculated fullness (%) at the moment of measurement (0..100)
        fullness: {
            type: Number,
            required: [true, 'Fullness is required'],
            min: [0, 'Fullness cannot be less than 0%'],
            max: [100, 'Fullness cannot exceed 100%'],
        },

        weight: {
            type: Number,
            default: 0,
        },

        temperature: {
            type: Number,
            default: 22.0,
        },

        // Explicit measurement time (server/local formatting is up to producer)
        time: {
            type: String,
        },

        // Canonical timestamp (used for TTL, ordering, aggregations)
        timestamp: {
            type: Date,
            default: Date.now,
            index: true,
        },
    },
    {
        timestamps: true, // createdAt / updatedAt
    }
);

// --- Collection name is fixed to ensure $lookup('histories') always matches
historySchema.set('collection', 'histories');

// --- Indexes ---
historySchema.index({ binId: 1, timestamp: -1 });
// Optional uniqueness by (binId, timestamp) to avoid duplicates from the same tick.
// Comment out if duplicates are acceptable.
// historySchema.index({ binId: 1, timestamp: 1 }, { unique: true });

// TTL index: auto-delete records after 30 days
historySchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// ---------- Helpers ----------
function clamp(n, min, max) {
    return Math.max(min, Math.min(n, max));
}

// ---------- Instance methods ----------
/**
 * Recalculate fullness safely from this.distance / this.containerHeight.
 * Returns integer 0..100.
 */
historySchema.methods.calculateFullness = function () {
    const h = this.containerHeight;
    const d = this.distance;

    if (h == null || d == null || h <= 0) return 0;

    const dClamped = clamp(d, 0, h);
    return Math.round(((h - dClamped) / h) * 100);
};

// ---------- Hooks ----------
/**
 * Auto-calculate fullness if missing before validation.
 * Keeps historical records consistent even when producer forgets to send fullness.
 */
historySchema.pre('validate', function (next) {
    if (this.fullness == null) {
        this.fullness = this.calculateFullness();
    }
    // Ensure fullness is in [0..100]
    this.fullness = clamp(Math.round(this.fullness || 0), 0, 100);
    next();
});

// ---------- Statics ----------
/**
 * Create a history record calculating fullness server-side (safe clamps included).
 */
historySchema.statics.createRecord = async function (data) {
    const {
        binId,
        distance,
        containerHeight,
        weight,
        temperature,
        time,
        timestamp, // optional external ts
    } = data;

    const h = Number(containerHeight);
    const d = Number(distance);
    const safeHeight = Number.isFinite(h) && h > 0 ? h : 0;
    const safeDistance = Number.isFinite(d) ? clamp(d, 0, safeHeight || 0) : 0;

    const fullness =
        safeHeight === 0
            ? 0
            : clamp(Math.round(((safeHeight - safeDistance) / safeHeight) * 100), 0, 100);

    return this.create({
        binId,
        distance: safeDistance,
        containerHeight: safeHeight,
        fullness,
        weight: Number.isFinite(weight) ? weight : 0,
        temperature: Number.isFinite(temperature) ? temperature : 22.0,
        time: time || new Date().toISOString(),
        timestamp: timestamp || Date.now(),
    });
};

/**
 * Get last N records for one bin (newest first).
 */
historySchema.statics.getHistoryForBin = function (binId, limit = 24) {
    return this.find({ binId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .select('binId distance containerHeight fullness weight temperature timestamp time');
};

/**
 * Get last N records for multiple bins (flat list; use getLastByBinIds for 1-per-bin).
 */
historySchema.statics.getHistoryForBins = function (binIds, limit = 24) {
    return this.find({ binId: { $in: binIds } })
        .sort({ timestamp: -1 })
        .limit(limit * binIds.length)
        .select('binId distance containerHeight fullness weight temperature timestamp time');
};

/**
 * Get the latest record per each binId from the provided list.
 * Returns one document per binId (if exists).
 */
historySchema.statics.getLastByBinIds = function (binIds) {
    const pipeline = [
        { $match: { binId: { $in: binIds } } },
        { $sort: { timestamp: -1 } },
        {
            $group: {
                _id: '$binId',
                binId: { $first: '$binId' },
                timestamp: { $first: '$timestamp' },
                distance: { $first: '$distance' },
                containerHeight: { $first: '$containerHeight' },
                fullness: { $first: '$fullness' },
                weight: { $first: '$weight' },
                temperature: { $first: '$temperature' },
                time: { $first: '$time' },
            },
        },
        { $project: { _id: 0 } },
    ];
    return this.aggregate(pipeline);
};

/**
 * Aggregated history grouped by timeframe.
 * timeFrame: 'hour' | 'day' | 'week'
 * Uses $last to reflect the final state within each bucket.
 */
historySchema.statics.getAggregatedHistory = function (binId, timeFrame = 'hour') {
    let groupKey;

    switch (timeFrame) {
        case 'day':
            groupKey = { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } };
            break;
        case 'week':
            groupKey = {
                $concat: [
                    { $dateToString: { format: '%Y', date: '$timestamp' } },
                    '-W',
                    { $toString: { $isoWeek: '$timestamp' } },
                ],
            };
            break;
        case 'hour':
        default:
            groupKey = { $dateToString: { format: '%Y-%m-%d %H:00', date: '$timestamp' } };
            break;
    }

    return this.aggregate([
        { $match: { binId } },
        { $sort: { timestamp: 1 } }, // critical: $last now equals last in bucket
        {
            $group: {
                _id: groupKey,
                fullness: { $last: '$fullness' },
                distance: { $last: '$distance' },
                weight: { $last: '$weight' },
                temperature: { $last: '$temperature' },
                containerHeight: { $last: '$containerHeight' },
                count: { $sum: 1 },
                firstTimestamp: { $min: '$timestamp' },
                lastTimestamp: { $max: '$timestamp' },
            },
        },
        { $sort: { firstTimestamp: 1 } },
    ]);
};

/**
 * Recalculate fullness for all records of a bin (migration/helper).
 */
historySchema.statics.recalculateFullness = async function (binId) {
    const cursor = this.find({ binId }).cursor();
    const ops = [];
    for await (const record of cursor) {
        const h = record.containerHeight;
        const d = record.distance;
        const safe =
            h && h > 0
                ? clamp(Math.round(((h - clamp(d, 0, h)) / h) * 100), 0, 100)
                : 0;

        if (safe !== record.fullness) {
            ops.push({
                updateOne: {
                    filter: { _id: record._id },
                    update: { fullness: safe },
                },
            });
        }
        if (ops.length && ops.length % 1000 === 0) {
            await this.bulkWrite(ops.splice(0, ops.length));
        }
    }
    if (ops.length) {
        await this.bulkWrite(ops);
        return { modifiedCount: ops.length };
    }
    return { modifiedCount: 0 };
};

const History = mongoose.model('History', historySchema);
module.exports = History;
