// controllers/wasteBinController.js
const WasteBin = require('../models/WasteBin');
const History = require('../models/History');
const AppError = require('../utils/appError');
const { asyncHandler } = require('../utils/asyncHandler');

/**
 * Get all waste bins with optional filtering
 */
const getAllBins = asyncHandler(async (req, res) => {
    // Build filter object from query params
    const filter = {};

    if (req.query.department) {
        filter.department = req.query.department;
    }

    if (req.query.wasteType) {
        filter.wasteType = req.query.wasteType;
    }

    if (req.query.status) {
        filter.status = req.query.status;
    }

    // Additional filtering options
    if (req.query.fullnessMin) {
        filter.fullness = { $gte: parseInt(req.query.fullnessMin) };
    }

    if (req.query.fullnessMax) {
        if (filter.fullness) {
            filter.fullness.$lte = parseInt(req.query.fullnessMax);
        } else {
            filter.fullness = { $lte: parseInt(req.query.fullnessMax) };
        }
    }

    // Find bins with filter
    const bins = await WasteBin.find(filter).sort({ lastUpdate: -1 });

    // Send response
    res.status(200).json({
        status: 'success',
        results: bins.length,
        data: { bins }
    });
});

/**
 * Get a specific waste bin by ID
 */
const getBin = asyncHandler(async (req, res, next) => {
    const bin = await WasteBin.findOne({ binId: req.params.id });

    if (!bin) {
        return next(new AppError('No waste bin found with that ID', 404));
    }

    res.status(200).json({
        status: 'success',
        data: { bin }
    });
});

/**
 * Create a new waste bin
 */
const createBin = asyncHandler(async (req, res, next) => {
    const {
        binId,
        department,
        wasteType,
        capacity,
        alertThreshold,
        latitude,
        longitude,
        floor,
        room
    } = req.body;

    // Check if bin with ID already exists
    const existingBin = await WasteBin.findOne({ binId });
    if (existingBin) {
        return next(new AppError('A waste bin with this ID already exists', 400));
    }

    // Create location object
    const location = {
        coordinates: [longitude || 0, latitude || 0]
    };

    if (floor) location.floor = floor;
    if (room) location.room = room;

    // Create bin
    const bin = await WasteBin.create({
        binId,
        department,
        wasteType,
        capacity: capacity || 50,
        alertThreshold: alertThreshold || 80,
        location,
        lastCollection: new Date(),
        lastUpdate: new Date()
    });

    // Create initial history entry
    await History.create({
        binId,
        fullness: 0,
        time: new Date().toLocaleTimeString(),
        timestamp: new Date()
    });

    res.status(201).json({
        status: 'success',
        data: { bin }
    });
});

/**
 * Update a waste bin
 */
const updateBin = asyncHandler(async (req, res, next) => {
    const {
        department,
        wasteType,
        status,
        alertThreshold,
        capacity,
        latitude,
        longitude,
        floor,
        room
    } = req.body;

    // Find bin
    const bin = await WasteBin.findOne({ binId: req.params.id });
    if (!bin) {
        return next(new AppError('No waste bin found with that ID', 404));
    }

    // Update fields if provided
    if (department) bin.department = department;
    if (wasteType) bin.wasteType = wasteType;
    if (status) bin.status = status;
    if (alertThreshold) bin.alertThreshold = alertThreshold;
    if (capacity) bin.capacity = capacity;

    // Update location if coordinates provided
    if (latitude || longitude || floor || room) {
        if (latitude) bin.location.coordinates[1] = latitude;
        if (longitude) bin.location.coordinates[0] = longitude;
        if (floor) bin.location.floor = floor;
        if (room) bin.location.room = room;
    }

    // Save bin
    await bin.save();

    res.status(200).json({
        status: 'success',
        data: { bin }
    });
});

/**
 * Delete a waste bin
 */
const deleteBin = asyncHandler(async (req, res, next) => {
    const result = await WasteBin.deleteOne({ binId: req.params.id });

    if (result.deletedCount === 0) {
        return next(new AppError('No waste bin found with that ID', 404));
    }

    // Delete associated history
    await History.deleteMany({ binId: req.params.id });

    res.status(204).json({
        status: 'success',
        data: null
    });
});

/**
 * Get history for a specific bin
 */
const getBinHistory = asyncHandler(async (req, res, next) => {
    // Check if bin exists
    const bin = await WasteBin.findOne({ binId: req.params.id });
    if (!bin) {
        return next(new AppError('No waste bin found with that ID', 404));
    }

    // Get history
    const history = await History.find({ binId: req.params.id })
        .sort({ timestamp: -1 })
        .limit(parseInt(req.query.limit) || 24);

    res.status(200).json({
        status: 'success',
        results: history.length,
        data: { history }
    });
});

/**
 * Update waste bin level from sensor data
 */
const updateBinLevel = asyncHandler(async (req, res) => {
    const { binId, distance, weight, temperature, latitude, longitude } = req.body;

    // Calculate fullness based on distance
    // Assuming max distance = 100cm (empty), min distance = 0cm (full)
    const fullness = Math.max(0, Math.min(100, (1 - distance/100) * 100));

    // Find and update bin
    const bin = await WasteBin.findOne({ binId });

    if (!bin) {
        // If bin doesn't exist, create it with default values
        await WasteBin.create({
            binId,
            fullness,
            distance,
            weight: weight || 0,
            temperature: temperature || 22,
            location: {
                coordinates: [longitude || 0, latitude || 0]
            },
            lastUpdate: new Date()
        });
    } else {
        // Update existing bin with sensor data
        await bin.updateWithSensorData({
            distance,
            weight,
            temperature,
            latitude,
            longitude
        });
    }

    // Create history entry
    await History.create({
        binId,
        fullness,
        time: new Date().toLocaleTimeString(),
        timestamp: new Date()
    });

    res.status(200).json({
        status: 'success',
        data: {
            binId,
            fullness,
            timestamp: new Date()
        }
    });
});

/**
 * Get nearby waste bins based on location
 */
const getNearbyBins = asyncHandler(async (req, res) => {
    const { latitude, longitude, maxDistance = 1000 } = req.query; // maxDistance in meters

    if (!latitude || !longitude) {
        return res.status(400).json({
            status: 'fail',
            message: 'Please provide latitude and longitude'
        });
    }

    // Find bins within specified distance
    const bins = await WasteBin.find({
        location: {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates: [parseFloat(longitude), parseFloat(latitude)]
                },
                $maxDistance: parseInt(maxDistance)
            }
        }
    });

    res.status(200).json({
        status: 'success',
        results: bins.length,
        data: { bins }
    });
});

/**
 * Get bins that exceed alert threshold
 */
const getOverfilledBins = asyncHandler(async (req, res) => {
    const bins = await WasteBin.find({
        $expr: { $gte: ['$fullness', '$alertThreshold'] }
    }).sort({ fullness: -1 });

    res.status(200).json({
        status: 'success',
        results: bins.length,
        data: { bins }
    });
});

/**
 * Get waste collection statistics
 */
const getStatistics = asyncHandler(async (req, res) => {
    // Get aggregate stats
    const stats = await WasteBin.aggregate([
        {
            $group: {
                _id: null,
                totalBins: { $sum: 1 },
                avgFullness: { $avg: '$fullness' },
                maxFullness: { $max: '$fullness' },
                minFullness: { $min: '$fullness' },
                totalWeight: { $sum: '$weight' }
            }
        }
    ]);

    // Get stats by department
    const departmentStats = await WasteBin.aggregate([
        {
            $group: {
                _id: '$department',
                binCount: { $sum: 1 },
                avgFullness: { $avg: '$fullness' },
                totalWeight: { $sum: '$weight' }
            }
        },
        { $sort: { binCount: -1 } }
    ]);

    // Get stats by waste type
    const wasteTypeStats = await WasteBin.aggregate([
        {
            $group: {
                _id: '$wasteType',
                binCount: { $sum: 1 },
                avgFullness: { $avg: '$fullness' },
                totalWeight: { $sum: '$weight' }
            }
        },
        { $sort: { binCount: -1 } }
    ]);

    // Count bins that need attention
    const alertCount = await WasteBin.countDocuments({
        $expr: { $gte: ['$fullness', '$alertThreshold'] }
    });

    res.status(200).json({
        status: 'success',
        data: {
            overview: stats[0] || {},
            alertCount,
            departmentStats,
            wasteTypeStats
        }
    });
});

module.exports = {
    getAllBins,
    getBin,
    createBin,
    updateBin,
    deleteBin,
    getBinHistory,
    updateBinLevel,
    getNearbyBins,
    getOverfilledBins,
    getStatistics
};