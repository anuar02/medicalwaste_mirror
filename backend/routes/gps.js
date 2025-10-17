const express = require('express');
const router = express.Router();
const GpsData = require('../models/gpsData');
const { logger } = require('../middleware/loggers');

// POST - Receive GPS data from ESP32
router.post('/data', async (req, res) => {
    try {
        const gpsData = new GpsData({
            latitude: parseFloat(req.body.latitude),
            longitude: parseFloat(req.body.longitude),
            altitude: req.body.altitude ? parseFloat(req.body.altitude) : null,
            gpsTime: req.body.gpsTime ? new Date(req.body.gpsTime) : new Date(),
            speed: req.body.speed ? parseFloat(req.body.speed) : null,
            course: req.body.course ? parseFloat(req.body.course) : null,
            satellites: {
                visible: req.body.satellites?.visible ? parseInt(req.body.satellites.visible) : null,
                used: req.body.satellites?.used ? parseInt(req.body.satellites.used) : null,
                snr: req.body.satellites?.snr || []
            },
            fixQuality: req.body.fixQuality ? parseInt(req.body.fixQuality) : null,
            hdop: req.body.hdop ? parseFloat(req.body.hdop) : null,
            vdop: req.body.vdop ? parseFloat(req.body.vdop) : null,
            pdop: req.body.pdop ? parseFloat(req.body.pdop) : null,
            deviceInfo: {
                chipId: req.body.deviceInfo?.chipId || null,
                firmware: req.body.deviceInfo?.firmware || null,
                batteryLevel: req.body.deviceInfo?.batteryLevel ? parseFloat(req.body.deviceInfo.batteryLevel) : null,
                signalStrength: req.body.deviceInfo?.signalStrength ? parseInt(req.body.deviceInfo.signalStrength) : null
            },
            rawNmea: req.body.rawNmea || null
        });

        // Validate required fields
        if (!gpsData.latitude || !gpsData.longitude) {
            return res.status(400).json({
                success: false,
                error: 'Latitude and longitude are required'
            });
        }

        // Save to database
        const savedData = await gpsData.save();

        logger.info(`GPS data received: ${savedData.latitude}, ${savedData.longitude} from ${savedData.deviceInfo.chipId || 'unknown'}`);

        res.status(201).json({
            success: true,
            message: 'GPS data saved successfully',
            id: savedData._id,
            isValidFix: savedData.isValidFix()
        });

    } catch (error) {
        logger.error(`Error saving GPS data: ${error.message}`);
        res.status(500).json({
            success: false,
            error: 'Failed to save GPS data',
            details: error.message
        });
    }
});

// GET - Retrieve GPS data with pagination and filtering
router.get('/data', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            chipId,
            startDate,
            endDate,
            validOnly = false,
            minSatellites
        } = req.query;

        // Build filter query
        const filter = {};

        if (chipId) {
            filter['deviceInfo.chipId'] = chipId;
        }

        if (startDate || endDate) {
            filter.gpsTime = {};
            if (startDate) filter.gpsTime.$gte = new Date(startDate);
            if (endDate) filter.gpsTime.$lte = new Date(endDate);
        }

        if (validOnly === 'true') {
            filter.fixQuality = { $gt: 0 };
            filter.latitude = { $ne: 0 };
            filter.longitude = { $ne: 0 };
        }

        if (minSatellites) {
            filter['satellites.used'] = { $gte: parseInt(minSatellites) };
        }

        // Execute query with pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [data, total] = await Promise.all([
            GpsData.find(filter)
                .sort({ gpsTime: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .select('-rawNmea'), // Exclude raw NMEA to reduce payload size
            GpsData.countDocuments(filter)
        ]);

        res.json({
            success: true,
            data,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit)),
                limit: parseInt(limit)
            }
        });

    } catch (error) {
        logger.error(`Error retrieving GPS data: ${error.message}`);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve GPS data',
            details: error.message
        });
    }
});

// GET - Get latest GPS position for a specific device
router.get('/latest/:chipId?', async (req, res) => {
    try {
        const { chipId } = req.params;
        const filter = chipId ? { 'deviceInfo.chipId': chipId } : {};

        const latestData = await GpsData.findOne(filter)
            .sort({ gpsTime: -1 })
            .select('-rawNmea');

        if (!latestData) {
            return res.status(404).json({
                success: false,
                error: 'No GPS data found'
            });
        }

        res.json({
            success: true,
            data: latestData,
            isValidFix: latestData.isValidFix()
        });

    } catch (error) {
        logger.error(`Error retrieving latest GPS data: ${error.message}`);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve latest GPS data',
            details: error.message
        });
    }
});

// GET - Get GPS track/route for a device within time range
router.get('/track/:chipId', async (req, res) => {
    try {
        const { chipId } = req.params;
        const { startDate, endDate, validOnly = true } = req.query;

        const filter = { 'deviceInfo.chipId': chipId };

        if (startDate || endDate) {
            filter.gpsTime = {};
            if (startDate) filter.gpsTime.$gte = new Date(startDate);
            if (endDate) filter.gpsTime.$lte = new Date(endDate);
        }

        if (validOnly === 'true') {
            filter.fixQuality = { $gt: 0 };
        }

        const track = await GpsData.find(filter)
            .sort({ gpsTime: 1 })
            .select('latitude longitude altitude gpsTime speed course satellites.used')
            .lean();

        // Convert to GeoJSON LineString format
        const geoJsonTrack = {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: track.map(point => [point.longitude, point.latitude, point.altitude || 0])
            },
            properties: {
                chipId,
                startTime: track[0]?.gpsTime,
                endTime: track[track.length - 1]?.gpsTime,
                totalPoints: track.length
            }
        };

        res.json({
            success: true,
            data: geoJsonTrack,
            rawPoints: track
        });

    } catch (error) {
        logger.error(`Error retrieving GPS track: ${error.message}`);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve GPS track',
            details: error.message
        });
    }
});

// GET - Get statistics
router.get('/stats', async (req, res) => {
    try {
        const { chipId, hours = 24 } = req.query;

        const timeFilter = {
            gpsTime: { $gte: new Date(Date.now() - parseInt(hours) * 60 * 60 * 1000) }
        };

        if (chipId) {
            timeFilter['deviceInfo.chipId'] = chipId;
        }

        const [totalPoints, validPoints, deviceCount, avgSatellites] = await Promise.all([
            GpsData.countDocuments(timeFilter),
            GpsData.countDocuments({ ...timeFilter, fixQuality: { $gt: 0 } }),
            GpsData.distinct('deviceInfo.chipId', timeFilter).then(devices => devices.length),
            GpsData.aggregate([
                { $match: timeFilter },
                { $group: { _id: null, avgSats: { $avg: '$satellites.used' } } }
            ])
        ]);

        res.json({
            success: true,
            stats: {
                totalPoints,
                validPoints,
                activeDevices: deviceCount,
                averageSatellites: avgSatellites[0]?.avgSats || 0,
                timeRange: `${hours} hours`
            }
        });

    } catch (error) {
        logger.error(`Error retrieving GPS stats: ${error.message}`);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve GPS statistics',
            details: error.message
        });
    }
});

// DELETE - Clear old GPS data (maintenance endpoint)
router.delete('/cleanup', async (req, res) => {
    try {
        const { olderThan = 30 } = req.query; // days
        const cutoffDate = new Date(Date.now() - parseInt(olderThan) * 24 * 60 * 60 * 1000);

        const result = await GpsData.deleteMany({
            gpsTime: { $lt: cutoffDate }
        });

        res.json({
            success: true,
            message: `Deleted ${result.deletedCount} GPS records older than ${olderThan} days`
        });

    } catch (error) {
        logger.error(`Error cleaning up GPS data: ${error.message}`);
        res.status(500).json({
            success: false,
            error: 'Failed to cleanup GPS data',
            details: error.message
        });
    }
});

module.exports = router;
