// controllers/trackingController.js - Updated version
const TrackingData = require('../models/TrackingData');
const AppError = require('../utils/appError');
const { asyncHandler } = require('../utils/asyncHandler');

/**
 * Record device location data
 */
const recordLocation = asyncHandler(async (req, res) => {
    const {
        deviceId,
        latitude,
        longitude,
        altitude,
        speed,
        course,
        battery,
        isCollecting,
        isCheckpoint,
        checkpointType,
        timestamp
    } = req.body;

    if (!deviceId) {
        return res.status(400).json({
            status: 'fail',
            message: 'Device ID is required'
        });
    }

    if (!latitude || !longitude) {
        return res.status(400).json({
            status: 'fail',
            message: 'Location coordinates are required'
        });
    }

    // Create tracking record
    const trackingData = await TrackingData.create({
        deviceId,
        location: {
            type: 'Point',
            coordinates: [longitude, latitude]
        },
        altitude: altitude || 0,
        speed: speed || 0,
        course: course || 0,
        battery: battery || 100,
        isCollecting: !!isCollecting,
        isCheckpoint: !!isCheckpoint,
        checkpointType: checkpointType || null,
        timestamp: timestamp ? new Date(timestamp) : new Date()
    });

    res.status(201).json({
        status: 'success',
        data: {
            trackingData
        }
    });
});

/**
 * Get device location history
 */
const getDeviceHistory = asyncHandler(async (req, res) => {
    const { deviceId } = req.params;
    const { limit = 100, from, to, checkpointsOnly = false } = req.query;

    // Build query
    const query = { deviceId };

    // Add date range if provided
    if (from || to) {
        query.timestamp = {};
        if (from) query.timestamp.$gte = new Date(from);
        if (to) query.timestamp.$lte = new Date(to);
    }

    // Add checkpoint filter if requested
    if (checkpointsOnly === 'true') {
        query.isCheckpoint = true;
    }

    // Get tracking data with pagination
    const trackingData = await TrackingData.find(query)
        .sort({ timestamp: -1 })
        .limit(parseInt(limit));

    res.status(200).json({
        status: 'success',
        results: trackingData.length,
        data: { trackingData }
    });
});

/**
 * Get last known location for a device
 */
const getLastLocation = asyncHandler(async (req, res) => {
    const { deviceId } = req.params;

    // Get last location record
    const lastLocation = await TrackingData.findOne({ deviceId })
        .sort({ timestamp: -1 });

    if (!lastLocation) {
        return res.status(404).json({
            status: 'fail',
            message: 'No location data found for this device'
        });
    }

    res.status(200).json({
        status: 'success',
        data: { lastLocation }
    });
});

/**
 * Get all active devices with their last locations
 */
const getAllDevicesLocations = asyncHandler(async (req, res) => {
    // Aggregate to get the most recent location for each device
    const devicesLocations = await TrackingData.aggregate([
        {
            $sort: { timestamp: -1 }
        },
        {
            $group: {
                _id: '$deviceId',
                deviceId: { $first: '$deviceId' },
                location: { $first: '$location' },
                altitude: { $first: '$altitude' },
                speed: { $first: '$speed' },
                course: { $first: '$course' },
                battery: { $first: '$battery' },
                isCollecting: { $first: '$isCollecting' },
                isCheckpoint: { $first: '$isCheckpoint' },
                checkpointType: { $first: '$checkpointType' },
                timestamp: { $first: '$timestamp' }
            }
        }
    ]);

    res.status(200).json({
        status: 'success',
        results: devicesLocations.length,
        data: { devicesLocations }
    });
});

/**
 * Get all checkpoints for a specific device
 */
const getDeviceCheckpoints = asyncHandler(async (req, res) => {
    const { deviceId } = req.params;
    const { limit = 100, from, to } = req.query;

    // Build query for checkpoints only
    const query = {
        deviceId,
        isCheckpoint: true
    };

    // Add date range if provided
    if (from || to) {
        query.timestamp = {};
        if (from) query.timestamp.$gte = new Date(from);
        if (to) query.timestamp.$lte = new Date(to);
    }

    // Get checkpoint data
    const checkpoints = await TrackingData.find(query)
        .sort({ timestamp: -1 })
        .limit(parseInt(limit));

    res.status(200).json({
        status: 'success',
        results: checkpoints.length,
        data: { checkpoints }
    });
});

module.exports = {
    recordLocation,
    getDeviceHistory,
    getLastLocation,
    getAllDevicesLocations,
    getDeviceCheckpoints
};