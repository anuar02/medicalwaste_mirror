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
    const { binId, distance, fullness, temperature, weight, batteryVoltage, macAddress } = req.body;

    if (!binId) {
        return res.status(400).json({
            status: 'fail',
            message: 'Bin ID is required'
        });
    }

    // Find the bin
    let bin = await WasteBin.findOne({ binId });

    // If bin not found but we have a MAC address, try finding by MAC
    if (!bin && macAddress) {
        bin = await WasteBin.findOne({ 'deviceInfo.macAddress': macAddress });
    }

    if (!bin) {
        return res.status(404).json({
            status: 'fail',
            message: 'Bin not found'
        });
    }

    // Update bin with sensor data
    bin.fullness = fullness !== undefined ? fullness : (distance ? 100 - distance : bin.fullness);
    bin.distance = distance !== undefined ? distance : bin.distance;

    if (temperature !== undefined) bin.temperature = temperature;
    if (weight !== undefined) bin.weight = weight || 0;

    // Update device info if available
    if (bin.deviceInfo) {
        if (batteryVoltage !== undefined) bin.deviceInfo.batteryVoltage = batteryVoltage;
        bin.deviceInfo.lastSeen = new Date();
    }

    bin.lastUpdate = new Date();
    await bin.save();

    // Create history record
    await History.create({
        binId: bin.binId,
        fullness: bin.fullness,
        temperature: bin.temperature,
        weight: bin.weight,
        distance: distance,
        time: new Date().toLocaleTimeString(),
        timestamp: new Date()
    });

    res.status(200).json({
        status: 'success',
        data: { binId: bin.binId }
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
// In wasteBinController.js - getStatistics function
const getStatistics = asyncHandler(async (req, res) => {
    // Get aggregate stats with defaults if empty
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
    ]) || [{
        totalBins: 0,
        avgFullness: 0,
        maxFullness: 0,
        minFullness: 0,
        totalWeight: 0
    }];

    // Default stats object if none found
    const overview = stats.length > 0 ? stats[0] : {
        totalBins: 0,
        avgFullness: 0,
        maxFullness: 0,
        minFullness: 0,
        totalWeight: 0
    };

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
    ]) || [];

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
    ]) || [];

    // Count bins that need attention
    const alertCount = await WasteBin.countDocuments({
        $expr: { $gte: ['$fullness', '$alertThreshold'] }
    }) || 0;

    res.status(200).json({
        status: 'success',
        data: {
            overview,
            alertCount,
            departmentStats,
            wasteTypeStats
        }
    });
});

const checkDeviceRegistration = asyncHandler(async (req, res) => {
    const { binId, mac } = req.query;

    if (!binId && !mac) {
        return res.status(400).json({
            status: 'fail',
            message: 'Either binId or mac address is required'
        });
    }

    // Build the query - check by both binId and mac if available
    const query = {};
    if (binId) query.binId = binId;
    if (mac) query['deviceInfo.macAddress'] = mac;

    // Check if bin exists
    const bin = await WasteBin.findOne(query);

    res.status(200).json({
        status: 'success',
        exists: !!bin,
        data: bin ? { binId: bin.binId } : null
    });
});


const registerDevice = asyncHandler(async (req, res) => {
    const { macAddress, tempBinId, deviceType } = req.body;

    if (!macAddress) {
        return res.status(400).json({
            status: 'fail',
            message: 'MAC address is required'
        });
    }

    try {
        let existingBin = await WasteBin.findOne({ 'deviceInfo.macAddress': macAddress });

        if (existingBin) {
            return res.status(200).json({
                status: 'success',
                message: 'Device already registered',
                data: {
                    binId: existingBin.binId,
                    registered: true
                }
            });
        }

        // Generate a unique bin ID
        const basePrefix = "MED";
        const count = await WasteBin.countDocuments({ binId: { $regex: `^${basePrefix}` } });
        const binId = `${basePrefix}-${(count + 1).toString().padStart(3, '0')}`;

        // Create new bin
        const newBin = await WasteBin.create({
            binId,
            department: 'Auto Registered',
            wasteType: 'Острые Медицинские Отходы',
            status: 'active',
            fullness: 0,
            capacity: 50,
            alertThreshold: 80,
            deviceInfo: {
                macAddress,
                deviceType: deviceType || 'ESP32',
                status: 'active',
                registeredAt: new Date()
            },
            lastUpdate: new Date()
        });

        // Return the new bin ID
        res.status(201).json({
            status: 'success',
            message: 'Device registered successfully',
            data: {
                binId,
                registered: true
            }
        });
    } catch (error) {
        console.error("Error registering device:", error);
        res.status(500).json({
            status: 'error',
            message: error.message || 'Error registering device'
        });
    }
});

module.exports = {
    getAllBins,
    getBin,
    createBin,
    updateBin,
    deleteBin,
    registerDevice,
    getBinHistory,
    updateBinLevel,
    getNearbyBins,
    getOverfilledBins,
    getStatistics,
    checkDeviceRegistration
};