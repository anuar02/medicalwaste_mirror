// controllers/wasteBinController.js
const WasteBin = require('../models/WasteBin');
const History = require('../models/History');
const User = require('../models/User');
const AppError = require('../utils/appError');
const { asyncHandler } = require('../utils/asyncHandler');
const { sendAlertNotification } = require('../utils/telegram');
const { logger } = require('../middleware/loggers');

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
 * Bulk update multiple bins
 */
const bulkUpdateBins = asyncHandler(async (req, res, next) => {
    const { binIds, updates } = req.body;

    if (!binIds || !Array.isArray(binIds) || binIds.length === 0) {
        return next(new AppError('Please provide valid bin IDs array', 400));
    }

    try {
        const updateResult = await WasteBin.updateMany(
            { binId: { $in: binIds } },
            { $set: updates }
        );

        res.status(200).json({
            status: 'success',
            message: `Updated ${updateResult.modifiedCount} bins`,
            data: {
                matched: updateResult.matchedCount,
                modified: updateResult.modifiedCount
            }
        });
    } catch (error) {
        return next(new AppError('Failed to update bins', 500));
    }
});

/**
 * Export bin data in various formats
 */
const exportBinData = asyncHandler(async (req, res, next) => {
    const { format } = req.params;
    const { startDate, endDate, departments } = req.query;

    // Build filter
    const filter = {};
    if (startDate && endDate) {
        filter.lastUpdate = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    }
    if (departments) {
        filter.department = { $in: departments.split(',') };
    }

    const bins = await WasteBin.find(filter);

    if (format === 'csv') {
        // Simple CSV export
        const csvData = bins.map(bin => ({
            BinID: bin.binId,
            Department: bin.department,
            WasteType: bin.wasteType,
            Fullness: bin.fullness,
            Status: bin.status,
            LastUpdate: bin.lastUpdate
        }));

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=bins.csv');

        // Simple CSV conversion
        const csvString = [
            Object.keys(csvData[0]).join(','),
            ...csvData.map(row => Object.values(row).join(','))
        ].join('\n');

        return res.send(csvString);
    }

    res.status(200).json({
        status: 'success',
        data: { bins }
    });
});

/**
 * Get bin analytics
 */
const getBinAnalytics = asyncHandler(async (req, res) => {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    // Get analytics data
    const analytics = await History.aggregate([
        ...(Object.keys(dateFilter).length > 0 ? [{ $match: { timestamp: dateFilter } }] : []),
        {
            $group: {
                _id: {
                    $dateToString: {
                        format: groupBy === 'hour' ? '%Y-%m-%d %H:00' : '%Y-%m-%d',
                        date: '$timestamp'
                    }
                },
                avgFullness: { $avg: '$fullness' },
                maxFullness: { $max: '$fullness' },
                minFullness: { $min: '$fullness' },
                dataPoints: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
        status: 'success',
        data: { analytics }
    });
});

/**
 * Predict maintenance needs
 */
const predictMaintenance = asyncHandler(async (req, res, next) => {
    const bin = await WasteBin.findOne({ binId: req.params.id });

    if (!bin) {
        return next(new AppError('No waste bin found with that ID', 404));
    }

    // Simple prediction based on current fullness and historical data
    const recentHistory = await History.find({ binId: req.params.id })
        .sort({ timestamp: -1 })
        .limit(10);

    let prediction = {
        maintenanceNeeded: false,
        priority: 'low',
        estimatedDays: null,
        reasons: []
    };

    // Check if maintenance is due based on fullness
    if (bin.fullness >= bin.alertThreshold) {
        prediction.maintenanceNeeded = true;
        prediction.priority = 'high';
        prediction.reasons.push('Bin is at or above alert threshold');
    }

    // Check for rapid filling trend
    if (recentHistory.length >= 5) {
        const avgIncrease = recentHistory.slice(0, 5).reduce((sum, h, i) => {
            if (i === 0) return 0;
            return sum + (recentHistory[i-1].fullness - h.fullness);
        }, 0) / 4;

        if (avgIncrease > 5) {
            prediction.maintenanceNeeded = true;
            prediction.priority = 'medium';
            prediction.reasons.push('Rapid filling trend detected');
        }
    }

    res.status(200).json({
        status: 'success',
        data: { prediction }
    });
});

/**
 * Get bin alerts
 */
const getBinAlerts = asyncHandler(async (req, res, next) => {
    const bin = await WasteBin.findOne({ binId: req.params.id });

    if (!bin) {
        return next(new AppError('No waste bin found with that ID', 404));
    }

    // Generate alerts based on current bin status
    const alerts = [];

    if (bin.fullness >= bin.alertThreshold) {
        alerts.push({
            id: `alert-${bin.binId}-fullness`,
            type: 'overfull',
            priority: bin.fullness >= 95 ? 'critical' : 'high',
            message: `Bin is ${bin.fullness}% full`,
            timestamp: new Date(),
            status: 'active'
        });
    }

    if (bin.status === 'maintenance') {
        alerts.push({
            id: `alert-${bin.binId}-maintenance`,
            type: 'maintenance_due',
            priority: 'medium',
            message: 'Maintenance required',
            timestamp: new Date(),
            status: 'active'
        });
    }

    res.status(200).json({
        status: 'success',
        data: { alerts }
    });
});

/**
 * Dismiss an alert
 */
const dismissAlert = asyncHandler(async (req, res) => {
    const { alertId } = req.params;

    // In a real implementation, you'd update an alerts collection
    // For now, just return success
    res.status(200).json({
        status: 'success',
        message: 'Alert dismissed successfully',
        data: { alertId }
    });
});

/**
 * Schedule collection for a bin
 */
const scheduleCollection = asyncHandler(async (req, res, next) => {
    const { scheduledFor, priority, notes } = req.body;

    const bin = await WasteBin.findOne({ binId: req.params.id });

    if (!bin) {
        return next(new AppError('No waste bin found with that ID', 404));
    }

    // Update bin with collection schedule
    bin.nextCollection = new Date(scheduledFor);
    bin.collectionNotes = notes;
    await bin.save();

    res.status(200).json({
        status: 'success',
        message: 'Collection scheduled successfully',
        data: {
            binId: bin.binId,
            scheduledFor: bin.nextCollection,
            priority,
            notes
        }
    });
});

/**
 * Get collection routes
 */
const getCollectionRoutes = asyncHandler(async (req, res) => {
    const { date, optimize } = req.query;

    const targetDate = date ? new Date(date) : new Date();

    // Find bins scheduled for collection or overfull
    const bins = await WasteBin.find({
        $or: [
            { nextCollection: { $lte: targetDate } },
            { $expr: { $gte: ['$fullness', '$alertThreshold'] } }
        ]
    });

    const routes = [{
        id: 'route-1',
        date: targetDate,
        bins: bins.map(bin => ({
            binId: bin.binId,
            department: bin.department,
            location: bin.location,
            priority: bin.fullness >= 95 ? 'critical' : 'normal'
        })),
        estimatedTime: bins.length * 10, // 10 minutes per bin
        distance: bins.length * 0.5 // 0.5 km per bin
    }];

    res.status(200).json({
        status: 'success',
        data: { routes }
    });
});

/**
 * Optimize collection routes
 */
const optimizeRoutes = asyncHandler(async (req, res) => {
    const { date, vehicleCapacity, maxDistance } = req.body;

    // Simple optimization - group by department
    const bins = await WasteBin.find({
        $expr: { $gte: ['$fullness', '$alertThreshold'] }
    });

    const optimizedRoutes = bins.reduce((routes, bin) => {
        const existingRoute = routes.find(r => r.department === bin.department);
        if (existingRoute) {
            existingRoute.bins.push(bin);
        } else {
            routes.push({
                department: bin.department,
                bins: [bin],
                estimatedTime: 30,
                distance: 2
            });
        }
        return routes;
    }, []);

    res.status(200).json({
        status: 'success',
        data: { optimizedRoutes }
    });
});

/**
 * Get bin metrics
 */
const getBinMetrics = asyncHandler(async (req, res) => {
    const metrics = await WasteBin.aggregate([
        {
            $group: {
                _id: null,
                totalBins: { $sum: 1 },
                activeBins: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
                avgFullness: { $avg: '$fullness' },
                alertBins: { $sum: { $cond: [{ $gte: ['$fullness', '$alertThreshold'] }, 1, 0] } }
            }
        }
    ]);

    res.status(200).json({
        status: 'success',
        data: { metrics: metrics[0] || {} }
    });
});

/**
 * Set collecting mode for a bin
 */
const setCollectingMode = asyncHandler(async (req, res, next) => {
    const { isCollecting } = req.body;

    const bin = await WasteBin.findOne({ binId: req.params.id });

    if (!bin) {
        return next(new AppError('No waste bin found with that ID', 404));
    }

    bin.isCollecting = isCollecting;
    bin.collectionStarted = isCollecting ? new Date() : null;
    await bin.save();

    res.status(200).json({
        status: 'success',
        message: `Collecting mode ${isCollecting ? 'enabled' : 'disabled'}`,
        data: { bin }
    });
});

/**
 * Send device command
 */
const sendDeviceCommand = asyncHandler(async (req, res) => {
    const { deviceId, command, params, priority } = req.body;

    // In a real implementation, you'd queue this command for the device
    res.status(200).json({
        status: 'success',
        message: 'Command sent to device',
        data: {
            commandId: `cmd-${Date.now()}`,
            deviceId,
            command,
            params,
            priority,
            status: 'pending'
        }
    });
});

/**
 * Get device commands
 */
const getDeviceCommands = asyncHandler(async (req, res) => {
    const { deviceId } = req.params;

    // Return empty commands array for now
    res.status(200).json({
        status: 'success',
        data: { commands: [] }
    });
});

/**
 * Mark command as executed
 */
const markCommandExecuted = asyncHandler(async (req, res) => {
    const { commandId } = req.params;

    res.status(200).json({
        status: 'success',
        message: 'Command marked as executed',
        data: { commandId }
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
    const { binId, distance, fullness, temperature, weight, batteryVoltage, macAddress, latitude, longitude } = req.body;

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

    // Store previous fullness for threshold comparison
    const previousFullness = bin.fullness;

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

    // Update location if provided
    if (latitude || longitude) {
        if (latitude) bin.location.coordinates[1] = latitude;
        if (longitude) bin.location.coordinates[0] = longitude;
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

    // Check if bin has exceeded alert threshold and send Telegram notification
    let alertSent = false;
    if (bin.fullness >= bin.alertThreshold && previousFullness < bin.alertThreshold) {
        try {
            // Get users from the bin's department for targeted notifications
            const departmentUsers = bin.department
                ? await User.find({ department: bin.department }).select('_id')
                : null;

            const userIds = departmentUsers ? departmentUsers.map(user => user._id) : null;

            // Format bin data for the notification
            const binData = {
                binId: bin.binId,
                department: bin.department,
                wasteType: bin.wasteType,
                fullness: bin.fullness,
                alertThreshold: bin.alertThreshold,
                location: {
                    floor: bin.location?.floor || '1',
                    room: bin.location?.room || 'Unknown'
                },
                lastUpdate: bin.lastUpdate
            };

            // Send alert notification
            const notificationResults = await sendAlertNotification(binData, userIds);

            logger.info(`Alert notifications sent for bin ${binId}. Results: ${JSON.stringify(notificationResults)}`);
            alertSent = notificationResults && notificationResults.some(result => result.success);
        } catch (error) {
            logger.error(`Failed to send alert notifications for bin ${binId}: ${error.message}`);
            // Continue even if notifications fail
        }
    }

    res.status(200).json({
        status: 'success',
        data: {
            bin,
            alertSent
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
 * Send manual alert for an overfilled bin
 */
const sendManualAlert = asyncHandler(async (req, res, next) => {
    const { binId } = req.params;

    // Find the bin
    const bin = await WasteBin.findOne({ binId });

    if (!bin) {
        return next(new AppError('No waste bin found with that ID', 404));
    }

    try {
        // Get users from the bin's department for targeted notifications
        const departmentUsers = bin.department
            ? await User.find({ department: bin.department }).select('_id')
            : null;

        const userIds = departmentUsers ? departmentUsers.map(user => user._id) : null;

        // Format bin data for the notification
        const binData = {
            binId: bin.binId,
            department: bin.department,
            wasteType: bin.wasteType,
            fullness: bin.fullness,
            alertThreshold: bin.alertThreshold,
            location: {
                floor: bin.location?.floor || '1',
                room: bin.location?.room || 'Unknown'
            },
            lastUpdate: bin.lastUpdate
        };

        // Send alert notification
        const notificationResults = await sendAlertNotification(binData, userIds);

        logger.info(`Manual alert notifications sent for bin ${binId}. Results: ${JSON.stringify(notificationResults)}`);

        res.status(200).json({
            status: 'success',
            message: 'Alert notification sent successfully',
            data: {
                notificationsSent: notificationResults?.length || 0,
                successCount: notificationResults?.filter(r => r.success)?.length || 0
            }
        });
    } catch (error) {
        logger.error(`Failed to send manual alert for bin ${binId}: ${error.message}`);
        return next(new AppError('Failed to send alert notification', 500));
    }
});

/**
 * Get waste collection statistics
 */
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
    getBinHistory,
    updateBinLevel,
    registerDevice,
    checkDeviceRegistration,
    getNearbyBins,
    getOverfilledBins,
    getStatistics,
    sendManualAlert,
    bulkUpdateBins,
    exportBinData,
    getBinAnalytics,
    predictMaintenance,
    getBinAlerts,
    dismissAlert,
    scheduleCollection,
    getCollectionRoutes,
    optimizeRoutes,
    getBinMetrics,
    setCollectingMode,
    sendDeviceCommand,
    getDeviceCommands,
    markCommandExecuted
};