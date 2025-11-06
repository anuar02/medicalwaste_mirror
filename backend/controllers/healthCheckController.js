// controllers/healthCheckController.js
const HealthCheck = require('../models/HealthCheck');
const WasteBin = require('../models/WasteBin');
const AppError = require('../utils/appError');
const { asyncHandler } = require('../utils/asyncHandler');

/**
 * Receive health check data from device
 */
const receiveHealthCheck = asyncHandler(async (req, res) => {
    const {
        binId,
        macAddress,
        timestamp,
        healthCheckNumber,
        wifiConnected,
        wifiSignalStrength,
        serverReachable,
        registrationValid,
        ultrasonicSensorWorking,
        temperatureSensorWorking,
        freeHeap,
        uptime,
        currentDistance,
        currentTemperature,
        latitude,
        longitude,
        errors,
        overallStatus
    } = req.body;

    // Validate required fields
    if (!binId || !macAddress) {
        return res.status(400).json({
            status: 'fail',
            message: 'Bin ID and MAC address are required'
        });
    }

    // Create location object if coordinates provided
    const location = (latitude && longitude) ? {
        type: 'Point',
        coordinates: [longitude, latitude]
    } : undefined;

    // Create health check record
    const healthCheck = await HealthCheck.create({
        binId,
        macAddress,
        timestamp: timestamp || Date.now(),
        healthCheckNumber: healthCheckNumber || 0,
        systemStatus: {
            wifiConnected: wifiConnected ?? true,
            wifiSignalStrength: wifiSignalStrength || 0,
            serverReachable: serverReachable ?? true,
            registrationValid: registrationValid ?? true
        },
        sensorStatus: {
            ultrasonicSensorWorking: ultrasonicSensorWorking ?? true,
            temperatureSensorWorking: temperatureSensorWorking ?? true
        },
        systemResources: {
            freeHeap: freeHeap || 0,
            uptime: uptime || 0
        },
        currentReadings: {
            distance: currentDistance || 0,
            temperature: currentTemperature || 22.0
        },
        location,
        errors: errors || '',
        overallStatus: overallStatus || 'healthy'
    });

    // Update waste bin's device info
    if (binId) {
        await WasteBin.findOneAndUpdate(
            { binId },
            {
                'deviceInfo.lastSeen': new Date(),
                'deviceInfo.status': overallStatus === 'healthy' ? 'online' : 'warning'
            }
        );
    }

    res.status(201).json({
        status: 'success',
        message: 'Health check data received successfully',
        data: {
            healthCheck: {
                id: healthCheck._id,
                binId: healthCheck.binId,
                overallStatus: healthCheck.overallStatus,
                timestamp: healthCheck.timestamp
            }
        }
    });
});

/**
 * Get latest health check for a specific bin
 */
const getLatestHealthCheck = asyncHandler(async (req, res, next) => {
    const { binId } = req.params;

    const healthCheck = await HealthCheck.getLatestForBin(binId);

    if (!healthCheck) {
        return next(new AppError('No health check data found for this bin', 404));
    }

    res.status(200).json({
        status: 'success',
        data: { healthCheck }
    });
});

/**
 * Get health check history for a specific bin
 */
const getHealthCheckHistory = asyncHandler(async (req, res, next) => {
    const { binId } = req.params;
    const { limit = 24 } = req.query;

    // Verify bin exists
    const bin = await WasteBin.findOne({ binId });
    if (!bin) {
        return next(new AppError('No waste bin found with that ID', 404));
    }

    const history = await HealthCheck.getHistoryForBin(binId, parseInt(limit));

    res.status(200).json({
        status: 'success',
        results: history.length,
        data: { history }
    });
});

/**
 * Get all devices with their latest health status
 */
const getAllDevicesHealth = asyncHandler(async (req, res) => {
    // Get all bins with device info
    const bins = await WasteBin.find().select('binId department deviceInfo');

    // Get latest health check for each bin
    const healthData = await Promise.all(
        bins.map(async (bin) => {
            const latestHealthCheck = await HealthCheck.getLatestForBin(bin.binId);
            return {
                binId: bin.binId,
                department: bin.department,
                deviceInfo: bin.deviceInfo,
                latestHealthCheck: latestHealthCheck || null,
                hasHealthData: !!latestHealthCheck
            };
        })
    );

    // Calculate statistics
    const stats = {
        totalDevices: healthData.length,
        devicesWithHealthData: healthData.filter(d => d.hasHealthData).length,
        healthyDevices: healthData.filter(d => d.latestHealthCheck?.overallStatus === 'healthy').length,
        warningDevices: healthData.filter(d => d.latestHealthCheck?.overallStatus === 'warning').length,
        unhealthyDevices: healthData.filter(d => d.latestHealthCheck?.overallStatus === 'unhealthy').length,
        devicesWithoutData: healthData.filter(d => !d.hasHealthData).length
    };

    res.status(200).json({
        status: 'success',
        data: {
            stats,
            devices: healthData
        }
    });
});

/**
 * Get all unhealthy devices
 */
const getUnhealthyDevices = asyncHandler(async (req, res) => {
    const unhealthyChecks = await HealthCheck.getUnhealthyDevices();

    // Enrich with bin information
    const devicesWithInfo = await Promise.all(
        unhealthyChecks.map(async (check) => {
            const bin = await WasteBin.findOne({ binId: check.binId })
                .select('binId department wasteType location');
            
            return {
                ...check,
                binInfo: bin
            };
        })
    );

    res.status(200).json({
        status: 'success',
        results: devicesWithInfo.length,
        data: {
            devices: devicesWithInfo
        }
    });
});

/**
 * Get health statistics
 */
const getHealthStatistics = asyncHandler(async (req, res) => {
    const { from, to } = req.query;

    // Build query
    const query = {};
    if (from || to) {
        query.timestamp = {};
        if (from) query.timestamp.$gte = new Date(from);
        if (to) query.timestamp.$lte = new Date(to);
    }

    // Get all health checks in range
    const allChecks = await HealthCheck.find(query);

    // Calculate statistics
    const stats = {
        totalChecks: allChecks.length,
        healthyChecks: allChecks.filter(c => c.overallStatus === 'healthy').length,
        warningChecks: allChecks.filter(c => c.overallStatus === 'warning').length,
        unhealthyChecks: allChecks.filter(c => c.overallStatus === 'unhealthy').length,
        
        // Sensor statistics
        ultrasonicFailures: allChecks.filter(c => !c.sensorStatus.ultrasonicSensorWorking).length,
        temperatureFailures: allChecks.filter(c => !c.sensorStatus.temperatureSensorWorking).length,
        
        // Network statistics
        wifiDisconnections: allChecks.filter(c => !c.systemStatus.wifiConnected).length,
        serverUnreachable: allChecks.filter(c => !c.systemStatus.serverReachable).length,
        
        // Average metrics
        avgWifiSignal: allChecks.reduce((sum, c) => sum + (c.systemStatus.wifiSignalStrength || 0), 0) / allChecks.length || 0,
        avgFreeHeap: allChecks.reduce((sum, c) => sum + (c.systemResources.freeHeap || 0), 0) / allChecks.length || 0,
        avgUptime: allChecks.reduce((sum, c) => sum + (c.systemResources.uptime || 0), 0) / allChecks.length || 0
    };

    // Get health over time (grouped by day)
    const healthOverTime = await HealthCheck.aggregate([
        { $match: query },
        {
            $group: {
                _id: {
                    year: { $year: '$timestamp' },
                    month: { $month: '$timestamp' },
                    day: { $dayOfMonth: '$timestamp' }
                },
                healthy: {
                    $sum: { $cond: [{ $eq: ['$overallStatus', 'healthy'] }, 1, 0] }
                },
                warning: {
                    $sum: { $cond: [{ $eq: ['$overallStatus', 'warning'] }, 1, 0] }
                },
                unhealthy: {
                    $sum: { $cond: [{ $eq: ['$overallStatus', 'unhealthy'] }, 1, 0] }
                },
                count: { $sum: 1 }
            }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    res.status(200).json({
        status: 'success',
        data: {
            stats,
            healthOverTime
        }
    });
});

/**
 * Delete old health check data
 */
const deleteOldHealthChecks = asyncHandler(async (req, res) => {
    const { days = 30 } = req.query;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    const result = await HealthCheck.deleteMany({
        timestamp: { $lt: cutoffDate }
    });

    res.status(200).json({
        status: 'success',
        message: `Deleted ${result.deletedCount} old health check records`,
        data: {
            deletedCount: result.deletedCount,
            cutoffDate
        }
    });
});

module.exports = {
    receiveHealthCheck,
    getLatestHealthCheck,
    getHealthCheckHistory,
    getAllDevicesHealth,
    getUnhealthyDevices,
    getHealthStatistics,
    deleteOldHealthChecks
};
