// controllers/collectionController.js
const CollectionSession = require('../models/CollectionSession');
const DriverLocation = require('../models/DriverLocation');
const WasteBin = require('../models/WasteBin');
const User = require('../models/User');
const Route = require('../models/Route');
const AppError = require('../utils/appError');
const { asyncHandler } = require('../utils/asyncHandler');
const mongoose = require('mongoose');

/**
 * Start a new collection session
 */
const startCollection = asyncHandler(async (req, res, next) => {
    const { containerIds = [], startLocation, routeId } = req.body;
    const driverId = req.user.id;

    // 1️⃣ Validate driver role and status
    if (req.user.role !== 'driver') {
        return next(new AppError('Only drivers can start collection sessions', 403));
    }

    if (req.user.verificationStatus !== 'approved') {
        return next(new AppError('Driver must be approved to start collections', 403));
    }

    // 2️⃣ Check for existing active session
    const activeSession = await CollectionSession.findOne({ driver: driverId, status: 'active' });
    if (activeSession) {
        return next(new AppError('You already have an active collection session', 400));
    }

    // 3️⃣ Find containers by _id (no company restriction)
    let selected = [];
    let skippedNotFound = [];

    if (Array.isArray(containerIds) && containerIds.length > 0) {
        const containers = await WasteBin.find({ _id: { $in: containerIds } }).select('_id binId');
        const foundIds = new Set(containers.map(c => String(c._id)));

        skippedNotFound = containerIds.filter(id => !foundIds.has(String(id)));

        selected = containers.map(c => ({
            container: c._id,
            selected: true,
            visited: false
        }));
    }

    // 4️⃣ Validate planned route if provided
    let plannedRoute = null;
    if (routeId) {
        const route = await Route.findById(routeId).select('company assignedDriver status');
        if (!route) {
            return next(new AppError('Route not found', 404));
        }
        if (route.status !== 'active') {
            return next(new AppError('Only active routes can be used for collection session', 400));
        }

        if (
            route.assignedDriver &&
            String(route.assignedDriver) !== String(driverId)
        ) {
            return next(new AppError('This route is assigned to another driver', 403));
        }

        if (
            route.company &&
            req.user.company &&
            String(route.company) !== String(req.user.company)
        ) {
            return next(new AppError('Route belongs to another company', 403));
        }

        plannedRoute = route._id;
    }

    // 5️⃣ Create session
    const sessionId = `SESSION-${driverId}-${Date.now()}`;

    const session = await CollectionSession.create({
        driver: driverId,
        company: req.user.company || null,
        sessionId,
        status: 'active',
        selectedContainers: selected,
        startTime: new Date(),
        startLocation: startLocation || null,
        plannedRoute
    });

    // 6️⃣ Log start location if provided
    if (startLocation?.coordinates) {
        await DriverLocation.create({
            driver: driverId,
            session: session._id,
            location: startLocation,
            timestamp: new Date()
        });
    }

    // 7️⃣ Populate session containers
    await session.populate('selectedContainers.container');

    // 8️⃣ Return response
    res.status(201).json({
        status: 'success',
        data: { session },
        meta: {
            skippedNotFound
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

    console.log('📍 Received location from driver:', {
        driverId,
        latitude,
        longitude,
        accuracy,
        timestamp
    });

    if (!latitude || !longitude) {
        return next(new AppError('Location coordinates are required', 400));
    }

    // Get active session
    const session = await CollectionSession.findOne({
        driver: driverId,
        status: 'active'
    });

    if (!session) {
        console.warn('⚠️ No active session found for driver:', driverId);
        return next(new AppError('No active collection session', 404));
    }

    console.log('✅ Found active session:', session.sessionId);

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

    console.log('✅ Location saved:', location._id);

    // ИСПРАВЛЕНИЕ: Всегда добавляем новую локацию в маршрут
    session.route.push(location._id);
    await session.save();

    console.log('✅ Location added to route. Total points:', session.route.length);

    // Check if driver is near any selected containers
    await checkProximityToContainers(session, latitude, longitude);

    res.status(201).json({
        status: 'success',
        data: {
            location,
            routePointsCount: session.route.length
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
    const { sessionId, containerId } = req.body;
    const driverId = req.user.id;

    // 1️⃣ Find active session for driver
    const session = await CollectionSession.findOne({
        driver: driverId,
        sessionId,
        status: 'active'
    });

    if (!session) {
        return next(new AppError('No active session found', 404));
    }

    // 2️⃣ Find container (no company restriction)
    const container = await WasteBin.findById(containerId).select('_id binId');
    if (!container) {
        return next(new AppError('Container not found', 404));
    }

    // 3️⃣ Add container to session
    await CollectionSession.updateOne(
        { _id: session._id },
        {
            $addToSet: {
                selectedContainers: {
                    container: container._id,
                    selected: true,
                    visited: false
                }
            }
        }
    );

    // 4️⃣ Reload session with populated containers
    const updatedSession = await CollectionSession.findById(session._id)
        .populate('selectedContainers.container');

    res.status(200).json({
        status: 'success',
        data: { session: updatedSession }
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
const getCollectionHistory = asyncHandler(async (req, res, next) => {
    const { from, to, limit = 50, page = 1, status } = req.query;
    let driverId = req.params.driverId || req.user.id;

    // Build base query
    // ИСПРАВЛЕНИЕ: По умолчанию только завершенные, если не указан status
    const query = {
        status: status ? status : { $in: ['completed', 'cancelled'] }
    };

    // If the user is admin → see all sessions
    if (req.user.role === 'admin') {
        // no driver filter
    } else if (req.user.role === 'supervisor') {
        // supervisors can see sessions only from their company
        query.company = req.user.company;
    } else {
        // driver sees only their own sessions
        query.driver = driverId;
    }

    if (from || to) {
        query.startTime = {};
        if (from) query.startTime.$gte = new Date(from);
        if (to) query.startTime.$lte = new Date(to);
    }

    console.log('🔍 History query:', query);

    const sessions = await CollectionSession.find(query)
        .populate('selectedContainers.container')
        .populate('driver', 'username email phoneNumber')
        .sort({ startTime: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await CollectionSession.countDocuments(query);

    console.log('✅ Found sessions:', sessions.length);

    res.status(200).json({
        status: 'success',
        results: sessions.length,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        data: { sessions }
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

    console.log('🔍 Looking for active drivers with query:', query);

    const sessions = await CollectionSession.find(query)
        .populate('driver', 'username email phoneNumber vehicleInfo')
        .populate('selectedContainers.container')
        .sort({ startTime: -1 });

    console.log('✅ Found active sessions:', sessions.length);

    // Get last location for each driver
    const driversWithLocations = await Promise.all(sessions.map(async (session) => {
        const lastLocation = await DriverLocation.findOne({ session: session._id })
            .sort({ timestamp: -1 });

        console.log(`📍 Session ${session.sessionId} last location:`, lastLocation ? 'found' : 'not found');

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

    // Определяем, что передали: ObjectId или строковый sessionId
    const isObjectId = mongoose.isValidObjectId(sessionId);

    const session = isObjectId
        ? await CollectionSession.findById(sessionId).populate('selectedContainers.container')
        : await CollectionSession.findOne({ sessionId }).populate('selectedContainers.container');

    if (!session) {
        return next(new AppError('Session not found', 404));
    }

    // ACL: владелец сессии или админ/супервизор
    if (
        session.driver.toString() !== req.user.id &&
        !['admin', 'supervisor'].includes(req.user.role)
    ) {
        return next(new AppError('You do not have permission to view this session', 403));
    }

    // ИСПРАВЛЕНИЕ: Получаем все локации по session._id
    const locations = await DriverLocation.find({ session: session._id })
        .sort({ timestamp: 1 });

    console.log(`📊 Session ${session.sessionId} route points:`, {
        routeArrayLength: session.route.length,
        locationsFound: locations.length,
        sessionId: session._id
    });

    return res.status(200).json({
        status: 'success',
        results: locations.length,
        data: {
            session,
            route: locations,
        },
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
