// controllers/trackingController.js - Simplified version without DeviceCommand dependency
const TrackingData = require('../models/TrackingData');
const WasteBin = require('../models/WasteBin');
const Device = require('../models/Device'); // Use your existing Device model
const AppError = require('../utils/appError');
const { asyncHandler } = require('../utils/asyncHandler');

// Simple in-memory command queue for testing (will be lost on server restart)
// In production, you would use a database
const pendingCommands = {};

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

    // Update device lastSeen timestamp if device exists
    try {
        await Device.findOneAndUpdate(
            { 'deviceInfo.macAddress': deviceId },
            {
                'deviceInfo.lastSeen': new Date(),
                'deviceInfo.batteryVoltage': battery
            }
        );
    } catch (error) {
        console.log('Device update error (non-critical):', error.message);
    }

    // Process if this is a collection checkpoint
    if (isCheckpoint) {
        console.log(`Collection checkpoint recorded for device ${deviceId}`);

        // Find nearby bins if this is a collection checkpoint
        try {
            const nearbyBins = await WasteBin.find({
                location: {
                    $near: {
                        $geometry: {
                            type: 'Point',
                            coordinates: [longitude, latitude]
                        },
                        $maxDistance: 50 // Within 50 meters
                    }
                }
            });

            // Update bins as collected
            if (nearbyBins && nearbyBins.length > 0) {
                for (const bin of nearbyBins) {
                    bin.fullness = 0; // Reset fullness when collected
                    bin.lastCollection = new Date();
                    bin.collectionHistory.push({
                        collectedAt: new Date(),
                        collectedBy: deviceId,
                        fullnessAtCollection: bin.fullness,
                        weightAtCollection: bin.weight || 0
                    });
                    await bin.save();
                }

                console.log(`Updated ${nearbyBins.length} bins as collected by ${deviceId}`);
            }
        } catch (error) {
            console.log('Error updating bins:', error.message);
        }
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

    console.log(`Command check from device: ${deviceId}`);

    // Testing mode - Send test command based on query params
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

    // Check in-memory queue for pending commands
    if (pendingCommands[deviceId] && pendingCommands[deviceId].length > 0) {
        const command = pendingCommands[deviceId].shift();

        return res.status(200).json({
            status: 'success',
            command: command.type,
            commandId: command.id,
            data: command.data
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

    console.log(`Command confirmation received: ${commandId} for ${deviceId} - Status: ${status || 'executed'}`);

    res.status(200).json({
        status: 'success',
        message: 'Command confirmation received'
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

    // Initialize queue for this device if needed
    if (!pendingCommands[deviceId]) {
        pendingCommands[deviceId] = [];
    }

    // Create command ID
    const commandId = `cmd-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Add command to queue
    pendingCommands[deviceId].push({
        id: commandId,
        type: command,
        data: data || {},
        created: new Date()
    });

    console.log(`Command queued for ${deviceId}: ${command}`);

    res.status(201).json({
        status: 'success',
        data: {
            commandId,
            deviceId,
            command,
            data: data || {}
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
 * Get collection points (simplified)
 */
const getCollectionPoints = asyncHandler(async (req, res) => {
    // Get checkpoints by finding tracking data marked as checkpoints
    // This is a simplified version since we don't have a dedicated collections table
    const { driverId, from, to } = req.query;

    // Build query
    const query = { isCheckpoint: true };

    if (driverId) {
        query.deviceId = driverId;
    }

    // Add date range if provided
    if (from || to) {
        query.timestamp = {};
        if (from) query.timestamp.$gte = new Date(from);
        if (to) query.timestamp.$lte = new Date(to);
    }

    // Get tracking points marked as checkpoints
    const checkpoints = await TrackingData.find(query)
        .sort({ timestamp: -1 })
        .limit(100);

    // Format as collection points
    const collectionPoints = checkpoints.map(point => ({
        _id: point._id,
        driverId: point.deviceId,
        location: point.location,
        timestamp: point.timestamp,
        binIds: [], // We don't have this info in this simplified version
        binCount: 0  // We don't have this info in this simplified version
    }));

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

    // Build query for all tracking data
    const query = { deviceId: driverId };

    // Add date range if provided
    if (from || to) {
        query.timestamp = {};
        if (from) query.timestamp.$gte = new Date(from);
        if (to) query.timestamp.$lte = new Date(to);
    }

    // Get tracking data
    const trackingData = await TrackingData.find(query).sort({ timestamp: 1 });

    // Count collection points
    const collectionPoints = await TrackingData.countDocuments({
        ...query,
        isCheckpoint: true
    });

    // Calculate distance (simplified estimate)
    let totalDistance = 0;
    let activeTime = 0;

    for (let i = 1; i < trackingData.length; i++) {
        const prevPoint = trackingData[i-1];
        const currentPoint = trackingData[i];

        if (prevPoint.location && currentPoint.location) {
            // Calculate distance between points
            const [prevLng, prevLat] = prevPoint.location.coordinates;
            const [currLng, currLat] = currentPoint.location.coordinates;

            // Simple distance calculation (approximation)
            const distance = calculateDistance(prevLat, prevLng, currLat, currLng);
            totalDistance += distance;

            // Calculate active time
            if (prevPoint.isCollecting || currentPoint.isCollecting) {
                const timeDiff = new Date(currentPoint.timestamp) - new Date(prevPoint.timestamp);
                if (timeDiff > 0 && timeDiff < 3600000) { // Less than 1 hour gap
                    activeTime += timeDiff;
                }
            }
        }
    }

    res.status(200).json({
        status: 'success',
        data: {
            driver: driverId,
            statistics: {
                collections: {
                    totalCollections: collectionPoints,
                    totalBinsCollected: 0 // We don't track this in the simplified version
                },
                distance: {
                    totalKilometers: parseFloat(totalDistance.toFixed(2)),
                    unit: "kilometers"
                },
                activity: {
                    activeTimeMillis: activeTime,
                    activeTimeHours: parseFloat((activeTime / 3600000).toFixed(2)),
                    lastActive: trackingData.length > 0 ?
                        trackingData[trackingData.length - 1].timestamp : null
                }
            }
        }
    });
});

// Helper function to calculate distance between coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);

    const a =
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon/2) * Math.sin(dLon/2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in km

    return distance;
}

function deg2rad(deg) {
    return deg * (Math.PI/180);
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