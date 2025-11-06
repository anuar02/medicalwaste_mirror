// controllers/collectionController.js
const CollectionSession = require('../models/CollectionSession');
const DriverLocation = require('../models/DriverLocation');
const WasteBin = require('../models/WasteBin');
const User = require('../models/User');
const AppError = require('../utils/appError');
const { asyncHandler } = require('../utils/asyncHandler');
const mongoose = require('mongoose');

/**
 * Start a new collection session
 */
const startCollection = asyncHandler(async (req, res, next) => {
    const { containerIds, startLocation } = req.body;
    const driverId = req.user.id;

    // Check if user is a driver
    if (req.user.role !== 'driver') {
        return next(new AppError('Only drivers can start collection sessions', 403));
    }

    // Check if driver is approved
    if (req.user.verificationStatus !== 'approved') {
        return next(new AppError('Driver must be approved to start collections', 403));
    }

    // Check if driver already has an active session
    const activeSession = await CollectionSession.findOne({
        driver: driverId,
        status: 'active'
    });

    if (activeSession) {
        return next(new AppError('You already have an active collection session', 400));
    }

    // Validate containers exist and belong to driver's company
    if (containerIds && containerIds.length > 0) {
        const containers = await WasteBin.find({
            _id: { $in: containerIds },
            company: req.user.company
        });

        if (containers.length !== containerIds.length) {
            return next(new AppError('Some containers not found or not accessible', 404));
        }
    }

    // Generate session ID
    const sessionId = `SESSION-${driverId}-${Date.now()}`;

    // Create session
    const session = await CollectionSession.create({
        driver: driverId,
        company: req.user.company,
        sessionId,
        status: 'active',
        selectedContainers: containerIds ? containerIds.map(id => ({
            container: id,
            selected: true,
            visited: false
        })) : [],
        startTime: new Date(),
        startLocation: startLocation || null
    });

    // Record initial location if provided
    if (startLocation && startLocation.coordinates) {
        await DriverLocation.create({
            driver: driverId,
            session: session._id,
            location: startLocation,
            timestamp: new Date()
        });
    }

    // Populate containers
    await session.populate('selectedContainers.container');

    res.status(201).json({
        status: 'success',
        data: {
            session
        }
    });
});

/**
 * Stop collection session
 */
const stopCollection = asyncHandler(async (req, res, next) => {
    const { sessionId, endLocation } = req.body;
    const driverId = req.user.id;

    const session = await CollectionSession.findOne({
        sessionId,
        driver: driverId,
        status: 'active'
    });

    if (!session) {
        return next(new AppError('Active session not found', 404));
    }

    // Complete the session
    await session.complete(endLocation);

    // Record final location if provided
    if (endLocation && endLocation.coordinates) {
        await DriverLocation.create({
            driver: driverId,
            session: session._id,
            location: endLocation,
            timestamp: new Date()
        });
    }

    // Populate data for response
    await session.populate('selectedContainers.container');

    res.status(200).json({
        status: 'success',
        data: {
            session
        }
    });
});

/**
 * Record driver location (called periodically from phone)
 */
const recordDriverLocation = asyncHandler(async (req, res, next) => {
    const {
        latitude,
        longitude,
        accuracy,
        altitude,
        altitudeAccuracy,
        heading,
        speed,
        timestamp
    } = req.body;

    const driverId = req.user.id;

    if (!latitude || !longitude) {
        return next(new AppError('Location coordinates are required', 400));
    }

    // Get active session
    const session = await CollectionSession.findOne({
        driver: driverId,
        status: 'active'
    });

    if (!session) {
        return next(new AppError('No active collection session', 404));
    }

    // Create location record
    const location = await DriverLocation.create({
        driver: driverId,
        session: session._id,
        location: {
            type: 'Point',
            coordinates: [longitude, latitude]
        },
        accuracy: accuracy || 0,
        altitude: altitude || 0,
        altitudeAccuracy: altitudeAccuracy || 0,
        heading: heading || 0,
        speed: speed || 0,
        timestamp: timestamp ? new Date(timestamp) : new Date()
    });

    // Add location to session route
    if (!session.route.includes(location._id)) {
        session.route.push(location._id);
        await session.save();
    }

    // Check if driver is near any selected containers
    await checkProximityToContainers(session, latitude, longitude);

    res.status(201).json({
        status: 'success',
        data: {
            location
        }
    });
});

/**
 * Check if driver is near selected containers and mark as visited
 */
async function checkProximityToContainers(session, latitude, longitude) {
    const PROXIMITY_THRESHOLD = 50; // meters

    for (const containerItem of session.selectedContainers) {
        if (!containerItem.visited && containerItem.selected) {
            const container = await WasteBin.findById(containerItem.container);

            if (container && container.location && container.location.coordinates) {
                const [containerLon, containerLat] = container.location.coordinates;
                const distance = calculateDistance(latitude, longitude, containerLat, containerLon);

                if (distance <= PROXIMITY_THRESHOLD) {
                    await session.markContainerVisited(container._id);
                }
            }
        }
    }
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Radius of Earth in meters
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
}

function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

/**
 * Add container to active session
 */
const addContainerToSession = asyncHandler(async (req, res, next) => {
    const { containerId } = req.body;
    const driverId = req.user.id;

    const session = await CollectionSession.findOne({
        driver: driverId,
        status: 'active'
    });

    if (!session) {
        return next(new AppError('No active collection session', 404));
    }

    // Verify container belongs to driver's company
    const container = await WasteBin.findOne({
        _id: containerId,
        company: req.user.company
    });

    if (!container) {
        return next(new AppError('Container not found or not accessible', 404));
    }

    await session.addContainer(containerId);
    await session.populate('selectedContainers.container');

    res.status(200).json({
        status: 'success',
        data: {
            session
        }
    });
});

/**
 * Get active session for current driver
 */
const getActiveSession = asyncHandler(async (req, res) => {
    const driverId = req.user.id;

    const session = await CollectionSession.findOne({
        driver: driverId,
        status: 'active'
    }).populate('selectedContainers.container');

    res.status(200).json({
        status: 'success',
        data: {
            session
        }
    });
});

/**
 * Get collection history for driver
 */
const getCollectionHistory = asyncHandler(async (req, res) => {
    const driverId = req.params.driverId || req.user.id;
    const { from, to, limit = 50, page = 1 } = req.query;

    // Check permissions
    if (driverId !== req.user.id && !['admin', 'supervisor'].includes(req.user.role)) {
        return next(new AppError('You can only view your own history', 403));
    }

    // Build query
    const query = {
        driver: driverId,
        status: { $in: ['completed', 'cancelled'] }
    };

    if (from || to) {
        query.startTime = {};
        if (from) query.startTime.$gte = new Date(from);
        if (to) query.startTime.$lte = new Date(to);
    }

    const sessions = await CollectionSession.find(query)
        .populate('selectedContainers.container')
        .sort({ startTime: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await CollectionSession.countDocuments(query);

    res.status(200).json({
        status: 'success',
        results: sessions.length,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        data: {
            sessions
        }
    });
});

/**
 * Get active drivers (for supervisor/admin map view)
 */
const getActiveDrivers = asyncHandler(async (req, res) => {
    const query = { status: 'active' };

    // If supervisor, filter by company
    if (req.user.role === 'supervisor') {
        query.company = req.user.company;
    }

    const sessions = await CollectionSession.find(query)
        .populate('driver', 'username email phoneNumber vehicleInfo')
        .populate('selectedContainers.container')
        .sort({ startTime: -1 });

    // Get last location for each driver
    const driversWithLocations = await Promise.all(sessions.map(async (session) => {
        const lastLocation = await DriverLocation.findOne({ session: session._id })
            .sort({ timestamp: -1 });

        return {
            session,
            lastLocation
        };
    }));

    res.status(200).json({
        status: 'success',
        results: driversWithLocations.length,
        data: {
            activeDrivers: driversWithLocations
        }
    });
});

/**
 * Get session route (all locations)
 */
const getSessionRoute = asyncHandler(async (req, res, next) => {
    const { sessionId } = req.params;

    const session = await CollectionSession.findOne({ sessionId });

    if (!session) {
        return next(new AppError('Session not found', 404));
    }

    // Check permissions
    if (session.driver.toString() !== req.user.id &&
        !['admin', 'supervisor'].includes(req.user.role)) {
        return next(new AppError('You do not have permission to view this session', 403));
    }

    const locations = await DriverLocation.find({ session: session._id })
        .sort({ timestamp: 1 });

    res.status(200).json({
        status: 'success',
        results: locations.length,
        data: {
            session,
            route: locations
        }
    });
});

module.exports = {
    startCollection,
    stopCollection,
    recordDriverLocation,
    addContainerToSession,
    getActiveSession,
    getCollectionHistory,
    getActiveDrivers,
    getSessionRoute
};