// controllers/historyController.js
const History = require('../models/History');
const WasteBin = require('../models/WasteBin');
const AppError = require('../utils/appError');
const { asyncHandler } = require('../utils/asyncHandler');
const { createObjectCsvStringifier } = require('csv-writer');

/**
 * Get history for a specific bin
 */
const getBinHistory = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const { limit = 24, from, to } = req.query;

    // Verify bin exists
    const bin = await WasteBin.findOne({ binId: id });
    if (!bin) {
        return next(new AppError('No waste bin found with that ID', 404));
    }

    // Build query
    const query = { binId: id };

    // Add date range if provided
    if (from || to) {
        query.timestamp = {};
        if (from) query.timestamp.$gte = new Date(from);
        if (to) query.timestamp.$lte = new Date(to);
    }

    // Get history with pagination
    const history = await History.find(query)
        .sort({ timestamp: -1 })
        .limit(parseInt(limit));

    res.status(200).json({
        status: 'success',
        results: history.length,
        data: { history }
    });
});

/**
 * Get history for multiple bins
 */
const getMultipleBinsHistory = asyncHandler(async (req, res, next) => {
    const { ids, limit = 24, from, to } = req.query;

    // Convert comma-separated IDs to array
    const binIds = ids.split(',').map(id => id.trim());

    if (binIds.length === 0) {
        return next(new AppError('No bin IDs provided', 400));
    }

    // Verify bins exist
    const bins = await WasteBin.find({ binId: { $in: binIds } });
    if (bins.length === 0) {
        return next(new AppError('No waste bins found with the provided IDs', 404));
    }

    const foundBinIds = bins.map(bin => bin.binId);
    const missingBinIds = binIds.filter(id => !foundBinIds.includes(id));

    // Build query
    const query = { binId: { $in: foundBinIds } };

    // Add date range if provided
    if (from || to) {
        query.timestamp = {};
        if (from) query.timestamp.$gte = new Date(from);
        if (to) query.timestamp.$lte = new Date(to);
    }

    // Get history
    const history = await History.find(query)
        .sort({ timestamp: -1 })
        .limit(parseInt(limit) * binIds.length);

    // Group by bin ID
    const groupedHistory = {};
    foundBinIds.forEach(binId => {
        groupedHistory[binId] = history.filter(record => record.binId === binId);
    });

    res.status(200).json({
        status: 'success',
        results: history.length,
        missing: missingBinIds.length > 0 ? missingBinIds : undefined,
        data: { history: groupedHistory }
    });
});

/**
 * Get aggregated history data
 */
const getAggregatedHistory = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const { timeFrame = 'hour', from, to } = req.query;

    // Verify bin exists
    const bin = await WasteBin.findOne({ binId: id });
    if (!bin) {
        return next(new AppError('No waste bin found with that ID', 404));
    }

    // Build date range
    const dateRange = {};
    if (from) dateRange.$gte = new Date(from);
    if (to) dateRange.$lte = new Date(to);

    // Get aggregated data
    let aggregatedData;

    if (Object.keys(dateRange).length > 0) {
        // Custom date range with additional match stage
        aggregatedData = await History.aggregate([
            { $match: { binId: id, timestamp: dateRange } },
            {
                $group: {
                    _id: getGroupByTime(timeFrame),
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
    } else {
        // Default to model's method
        aggregatedData = await History.getAggregatedHistory(id, timeFrame);
    }

    // Format the data
    const formattedData = aggregatedData.map(item => ({
        timeFrame: item._id,
        avgFullness: parseFloat(item.avgFullness.toFixed(2)),
        avgWeight: item.avgWeight ? parseFloat(item.avgWeight.toFixed(2)) : 0,
        avgTemperature: item.avgTemperature ? parseFloat(item.avgTemperature.toFixed(2)) : 0,
        count: item.count,
        firstTimestamp: item.firstTimestamp,
        lastTimestamp: item.lastTimestamp
    }));

    res.status(200).json({
        status: 'success',
        results: formattedData.length,
        data: {
            timeFrame,
            history: formattedData
        }
    });
});

/**
 * Export history data in CSV or JSON format
 */
const exportHistoryData = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const { format = 'csv', from, to } = req.query;

    // Verify bin exists
    const bin = await WasteBin.findOne({ binId: id });
    if (!bin) {
        return next(new AppError('No waste bin found with that ID', 404));
    }

    // Build query
    const query = { binId: id };

    // Add date range if provided
    if (from || to) {
        query.timestamp = {};
        if (from) query.timestamp.$gte = new Date(from);
        if (to) query.timestamp.$lte = new Date(to);
    }

    // Get history
    const history = await History.find(query).sort({ timestamp: 1 });

    if (history.length === 0) {
        return next(new AppError('No history data found for the specified time range', 404));
    }

    // Format data based on requested format
    if (format === 'json') {
        // Set content type and send JSON
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="history-${id}.json"`);

        return res.status(200).json({
            binId: id,
            department: bin.department,
            wasteType: bin.wasteType,
            exportDate: new Date(),
            data: history
        });
    } else if (format === 'csv') {
        // Format data for CSV
        const csvData = history.map(record => ({
            binId: record.binId,
            timestamp: record.timestamp.toISOString(),
            fullness: record.fullness,
            weight: record.weight || '',
            temperature: record.temperature || '',
            distance: record.distance || ''
        }));

        // Create CSV stringifier
        const csvStringifier = createObjectCsvStringifier({
            header: [
                { id: 'binId', title: 'Bin ID' },
                { id: 'timestamp', title: 'Timestamp' },
                { id: 'fullness', title: 'Fullness (%)' },
                { id: 'weight', title: 'Weight (kg)' },
                { id: 'temperature', title: 'Temperature (°C)' },
                { id: 'distance', title: 'Distance (cm)' }
            ]
        });

        // Generate CSV content
        const csvContent = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(csvData);

        // Set content type and send CSV
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="history-${id}.csv"`);

        return res.status(200).send(csvContent);
    }
});

/**
 * Delete history data for a specific bin
 */
const deleteHistoryData = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const { from, to, confirm } = req.query;

    if (confirm !== 'true') {
        return next(new AppError('Confirmation required for deletion', 400));
    }

    // Verify bin exists
    const bin = await WasteBin.findOne({ binId: id });
    if (!bin) {
        return next(new AppError('No waste bin found with that ID', 404));
    }

    // Build query
    const query = { binId: id };

    // Add date range if provided
    if (from || to) {
        query.timestamp = {};
        if (from) query.timestamp.$gte = new Date(from);
        if (to) query.timestamp.$lte = new Date(to);
    }

    // Delete history
    const result = await History.deleteMany(query);

    res.status(200).json({
        status: 'success',
        message: `${result.deletedCount} history records deleted`,
        data: {
            deletedCount: result.deletedCount
        }
    });
});

/**
 * Helper function to get the appropriate grouping expression based on timeFrame
 */
const getGroupByTime = (timeFrame) => {
    switch(timeFrame) {
        case 'hour':
            return {
                $dateToString: { format: '%Y-%m-%d %H:00', date: '$timestamp' }
            };
        case 'day':
            return {
                $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
            };
        case 'week':
            return {
                $concat: [
                    { $dateToString: { format: '%Y', date: '$timestamp' } },
                    '-W',
                    { $toString: { $isoWeek: '$timestamp' } }
                ]
            };
        default:
            return {
                $dateToString: { format: '%Y-%m-%d %H:00', date: '$timestamp' }
            };
    }
};

module.exports = {
    getBinHistory,
    getMultipleBinsHistory,
    getAggregatedHistory,
    exportHistoryData,
    deleteHistoryData
};