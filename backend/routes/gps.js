const express = require('express');
const router = express.Router();
const GpsData = require('../models/gpsData');
const { logger } = require('../middleware/loggers');
const { auth, adminAuth, apiKeyAuth } = require('../middleware/auth');

const MAX_LIMIT = 200;

// Sanitize a string to prevent NoSQL operator injection
const sanitizeString = (value) => {
    if (typeof value !== 'string') return null;
    // Strip anything that isn't alphanumeric, underscore, hyphen or dot
    return value.replace(/[^a-zA-Z0-9_.\-]/g, '').slice(0, 64) || null;
};

// POST - Receive GPS data from ESP32 (IoT device, requires API key)
router.post('/data', apiKeyAuth, async (req, res) => {
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
                message: 'Latitude and longitude are required'
            });
        }

        const savedData = await gpsData.save();

        logger.info(`GPS data received: ${savedData.latitude}, ${savedData.longitude} from ${savedData.deviceInfo.chipId || 'unknown'}`);

        res.status(201).json({
            success: true,
            message: 'GPS data saved successfully',
            data: { id: savedData._id, isValidFix: savedData.isValidFix() }
        });

    } catch (error) {
        logger.error(`Error saving GPS data: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Failed to save GPS data'
        });
    }
});

// GET - Retrieve GPS data with pagination and filtering (authenticated users)
router.get('/data', auth, async (req, res) => {
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

        const safeLimit = Math.min(parseInt(limit) || 50, MAX_LIMIT);
        const safePage = Math.max(parseInt(page) || 1, 1);

        // Build filter query — sanitize all user-supplied string inputs
        const filter = {};

        if (chipId) {
            const safeChipId = sanitizeString(chipId);
            if (safeChipId) filter['deviceInfo.chipId'] = safeChipId;
        }

        if (startDate || endDate) {
            filter.gpsTime = {};
            if (startDate) {
                const d = new Date(startDate);
                if (!isNaN(d)) filter.gpsTime.$gte = d;
            }
            if (endDate) {
                const d = new Date(endDate);
                if (!isNaN(d)) filter.gpsTime.$lte = d;
            }
            if (Object.keys(filter.gpsTime).length === 0) delete filter.gpsTime;
        }

        if (validOnly === 'true') {
            filter.fixQuality = { $gt: 0 };
            filter.latitude = { $ne: 0 };
            filter.longitude = { $ne: 0 };
        }

        if (minSatellites) {
            const minSats = parseInt(minSatellites);
            if (!isNaN(minSats)) filter['satellites.used'] = { $gte: minSats };
        }

        const skip = (safePage - 1) * safeLimit;
        const [data, total] = await Promise.all([
            GpsData.find(filter)
                .sort({ gpsTime: -1 })
                .skip(skip)
                .limit(safeLimit)
                .select('-rawNmea'),
            GpsData.countDocuments(filter)
        ]);

        res.json({
            success: true,
            data,
            pagination: {
                total,
                page: safePage,
                pages: Math.ceil(total / safeLimit),
                limit: safeLimit
            }
        });

    } catch (error) {
        logger.error(`Error retrieving GPS data: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve GPS data'
        });
    }
});

// GET - Get latest GPS position for a specific device
router.get('/latest/:chipId?', auth, async (req, res) => {
    try {
        const { chipId } = req.params;
        const safeChipId = chipId ? sanitizeString(chipId) : null;
        const filter = safeChipId ? { 'deviceInfo.chipId': safeChipId } : {};

        const latestData = await GpsData.findOne(filter)
            .sort({ gpsTime: -1 })
            .select('-rawNmea');

        if (!latestData) {
            return res.status(404).json({
                success: false,
                message: 'No GPS data found'
            });
        }

        res.json({
            success: true,
            data: { ...latestData.toObject(), isValidFix: latestData.isValidFix() }
        });

    } catch (error) {
        logger.error(`Error retrieving latest GPS data: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve latest GPS data'
        });
    }
});

// GET - Get GPS track/route for a device within time range
router.get('/track/:chipId', auth, async (req, res) => {
    try {
        const { chipId } = req.params;
        const { startDate, endDate, validOnly = true } = req.query;

        const safeChipId = sanitizeString(chipId);
        if (!safeChipId) {
            return res.status(400).json({ success: false, message: 'Invalid chipId' });
        }

        const filter = { 'deviceInfo.chipId': safeChipId };

        if (startDate || endDate) {
            filter.gpsTime = {};
            if (startDate) {
                const d = new Date(startDate);
                if (!isNaN(d)) filter.gpsTime.$gte = d;
            }
            if (endDate) {
                const d = new Date(endDate);
                if (!isNaN(d)) filter.gpsTime.$lte = d;
            }
            if (Object.keys(filter.gpsTime).length === 0) delete filter.gpsTime;
        }

        if (validOnly === 'true') {
            filter.fixQuality = { $gt: 0 };
        }

        const track = await GpsData.find(filter)
            .sort({ gpsTime: 1 })
            .select('latitude longitude altitude gpsTime speed course satellites.used')
            .lean();

        const geoJsonTrack = {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: track.map(point => [point.longitude, point.latitude, point.altitude || 0])
            },
            properties: {
                chipId: safeChipId,
                startTime: track[0]?.gpsTime,
                endTime: track[track.length - 1]?.gpsTime,
                totalPoints: track.length
            }
        };

        res.json({
            success: true,
            data: { geoJson: geoJsonTrack, rawPoints: track }
        });

    } catch (error) {
        logger.error(`Error retrieving GPS track: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve GPS track'
        });
    }
});

// GET - Get statistics
router.get('/stats', auth, async (req, res) => {
    try {
        const { chipId, hours = 24 } = req.query;

        const safeHours = Math.min(parseInt(hours) || 24, 720); // cap at 30 days
        const timeFilter = {
            gpsTime: { $gte: new Date(Date.now() - safeHours * 60 * 60 * 1000) }
        };

        if (chipId) {
            const safeChipId = sanitizeString(chipId);
            if (safeChipId) timeFilter['deviceInfo.chipId'] = safeChipId;
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
            data: {
                totalPoints,
                validPoints,
                activeDevices: deviceCount,
                averageSatellites: avgSatellites[0]?.avgSats || 0,
                timeRange: `${safeHours} hours`
            }
        });

    } catch (error) {
        logger.error(`Error retrieving GPS stats: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve GPS statistics'
        });
    }
});

// DELETE - Clear old GPS data (admin only)
router.delete('/cleanup', adminAuth, async (req, res) => {
    try {
        const olderThan = Math.min(parseInt(req.query.olderThan) || 30, 365); // cap at 1 year
        const cutoffDate = new Date(Date.now() - olderThan * 24 * 60 * 60 * 1000);

        const result = await GpsData.deleteMany({
            gpsTime: { $lt: cutoffDate }
        });

        res.json({
            success: true,
            message: `Deleted ${result.deletedCount} GPS records older than ${olderThan} days`,
            data: { deletedCount: result.deletedCount }
        });

    } catch (error) {
        logger.error(`Error cleaning up GPS data: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Failed to cleanup GPS data'
        });
    }
});

module.exports = router;
