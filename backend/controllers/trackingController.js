// controllers/trackingController.js - Enhanced with collection functionality
const TrackingData = require('../models/TrackingData');
const WasteBin = require('../models/WasteBin');
const CollectionPoint = require('../models/CollectionPoint');
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
        isCollecting: isCollecting || false,
        timestamp: timestamp ? new Date(timestamp) : new Date()
    });

    // If this is a collection checkpoint, record it separately
    if (isCheckpoint && checkpointType === 'waste_collection') {
        // Find waste bins near this location (within 50 meters)
        const nearbyBins = await WasteBin.find({
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [longitude, latitude]
                    },
                    $maxDistance: 50 // 50 meters
                }
            }
        });

        // Create a collection point record
        const collectionPoint = await CollectionPoint.create({
            deviceId,
            driverId: deviceId, // Using deviceId as driver ID for now
            location: {
                type: 'Point',
                coordinates: [longitude, latitude]
            },
            timestamp: new Date(),
            binIds: nearbyBins.map(bin => bin.binId),
            binCount: nearbyBins.length
        });

        // Update the lastCollection field for each nearby bin
        if (nearbyBins.length > 0) {
            const updatePromises = nearbyBins.map(bin => {
                // Reset bin fullness to 0 since it was just collected
                return WasteBin.findByIdAndUpdate(bin._id, {
                    fullness: 0,
                    lastCollection: new Date(),
                    $push: {
                        collectionHistory: {
                            collectedAt: new Date(),
                            collectedBy: deviceId,
                            fullnessAtCollection: bin.fullness,
                            weightAtCollection: bin.weight || 0
                        }
                    }
                });
            });

            await Promise.all(updatePromises);
        }

        return res.status(201).json({
            status: 'success',
            data: {
                trackingData,
                collectionPoint,
                binsCollected: nearbyBins.length
            }
        });
    }

    res.status(201).json({
        status: 'success',
        data: {
            trackingData
        }
    });
});

/**
 * Check for commands for a specific device
 */
const checkCommands = asyncHandler(async (req, res) => {
    const { deviceId } = req.query;

    if (!deviceId) {
        return res.status(400).json({
            status: 'fail',
            message: 'Device ID is required'
        });
    }

    // Log the command check in development mode
    if (process.env.NODE_ENV === 'development') {
        console.log(`Command check from device: ${deviceId}`);
    }

    // Check if there are any pending commands for this device
    const pendingCommand = await DeviceCommand.findOne({
        deviceId,
        status: 'pending'
    }).sort({ createdAt: -1 });

    if (pendingCommand) {
        // Convert command data to string if it's an object
        let commandData = pendingCommand.data;
        if (typeof commandData === 'object') {
            commandData = JSON.stringify(commandData);
        }

        return res.status(200).json({
            status: 'success',
            command: pendingCommand.command,
            commandId: pendingCommand._id,
            data: commandData
        });
    }

    // For testing: Automatically send a command to toggle collection mode
    // This is for testing only and should be removed in production
    if (req.query.test === 'true') {
        const testCommandId = "test-command-" + Date.now();
        const isCurrentlyCollecting = req.query.isCollecting === 'true';

        return res.status(200).json({
            status: 'success',
            command: 'setCollectingMode',
            commandId: testCommandId,
            data: { isCollecting: !isCurrentlyCollecting }
        });
    }

    // No commands
    return res.status(200).json({
        status: 'success',
        message: 'No pending commands'
    });
});

/**
 * Confirm command execution
 */
const confirmCommand = asyncHandler(async (req, res) => {
    const { deviceId, commandId, status } = req.body;

    if (!deviceId || !commandId) {
        return res.status(400).json({
            status: 'fail',
            message: 'Device ID and Command ID are required'
        });
    }

    // Update command status
    await DeviceCommand.findByIdAndUpdate(commandId, {
        status: status || 'executed',
        executedAt: new Date()
    });

    res.status(200).json({
        status: 'success',
        message: 'Command status updated'
    });
});

/**
 * Send command to device
 */
const sendCommand = asyncHandler(async (req, res) => {
    const { deviceId, command, data } = req.body;

    if (!deviceId || !command) {
        return res.status(400).json({
            status: 'fail',
            message: 'Device ID and command are required'
        });
    }

    // Create new command
    const newCommand = await DeviceCommand.create({
        deviceId,
        command,
        data: data || {},
        status: 'pending',
        createdAt: new Date()
    });

    res.status(201).json({
        status: 'success',
        data: {
            command: newCommand
        }
    });
});

/**
 * Get device location history
 */
const getDeviceHistory = asyncHandler(async (req, res) => {
    const { deviceId } = req.params;
    const { limit = 100, from, to } = req.query;

    // Build query
    const query = { deviceId };

    // Add date range if provided
    if (from || to) {
        query.timestamp = {};
        if (from) query.timestamp.$gte = new Date(from);
        if (to) query.timestamp.$lte = new Date(to);
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
 * Get collection points history
 */
const getCollectionPoints = asyncHandler(async (req, res) => {
    const { limit = 100, from, to } = req.query;

    // Build query
    const query = {};

    // Add date range if provided
    if (from || to) {
        query.timestamp = {};
        if (from) query.timestamp.$gte = new Date(from);
        if (to) query.timestamp.$lte = new Date(to);
    }

    // Get collection points with pagination
    const collectionPoints = await CollectionPoint.find(query)
        .sort({ timestamp: -1 })
        .limit(parseInt(limit));

    res.status(200).json({
        status: 'success',
        results: collectionPoints.length,
        data: { collectionPoints }
    });
});

/**
 * Get driver statistics
 */
const getDriverStats = asyncHandler(async (req, res) => {
    const { driverId } = req.params;
    const { from, to } = req.query;

    // Build date range
    const dateRange = {};
    if (from) dateRange.$gte = new Date(from);
    if (to) dateRange.$lte = new Date(to);

    // Query parameters
    const matchStage = { driverId };
    if (Object.keys(dateRange).length > 0) {
        matchStage.timestamp = dateRange;
    }

    // Get collection statistics
    const collectionStats = await CollectionPoint.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: "$driverId",
                totalCollections: { $sum: 1 },
                totalBinsCollected: { $sum: "$binCount" },
                firstCollection: { $min: "$timestamp" },
                lastCollection: { $max: "$timestamp" }
            }
        }
    ]);

    // Get distance traveled
    const trackingQuery = { deviceId: driverId };
    if (Object.keys(dateRange).length > 0) {
        trackingQuery.timestamp = dateRange;
    }

    const trackingData = await TrackingData.find(trackingQuery)
        .sort({ timestamp: 1 });

    // Calculate distance using Haversine formula
    let totalDistance = 0;
    let activeTime = 0;
    let lastActiveTimestamp = null;

    for (let i = 1; i < trackingData.length; i++) {
        const prevPoint = trackingData[i-1];
        const currentPoint = trackingData[i];

        // Calculate distance between consecutive points
        if (prevPoint.location && currentPoint.location) {
            const [prevLng, prevLat] = prevPoint.location.coordinates;
            const [currLng, currLat] = currentPoint.location.coordinates;

            const distance = calculateHaversineDistance(
                prevLat, prevLng,
                currLat, currLng
            );

            totalDistance += distance;
        }

        // Calculate active time when in collecting mode
        if (currentPoint.isCollecting) {
            const timeDiff = new Date(currentPoint.timestamp) - new Date(prevPoint.timestamp);
            if (timeDiff > 0 && timeDiff < 3600000) { // Less than 1 hour gap
                activeTime += timeDiff;
            }
            lastActiveTimestamp = currentPoint.timestamp;
        }
    }

    res.status(200).json({
        status: 'success',
        data: {
            driver: driverId,
            statistics: {
                collections: collectionStats.length > 0 ? collectionStats[0] : { totalCollections: 0, totalBinsCollected: 0 },
                distance: {
                    totalKilometers: totalDistance,
                    unit: "kilometers"
                },
                activity: {
                    activeTimeMillis: activeTime,
                    activeTimeHours: activeTime / 3600000,
                    lastActive: lastActiveTimestamp
                }
            }
        }
    });
});

// Helper function to calculate distance using Haversine formula
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in kilometers

    return distance;
}

module.exports = {
    recordLocation,
    checkCommands,
    confirmCommand,
    sendCommand,
    getDeviceHistory,
    getLastLocation,
    getAllDevicesLocations,
    getCollectionPoints,
    getDriverStats
};