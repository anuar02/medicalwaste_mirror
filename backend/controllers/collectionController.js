// controllers/collectionController.js
const CollectionSession = require('../models/CollectionSession');
const Driver = require('../models/Driver');
const DriverLocation = require('../models/DriverLocation');
const WasteBin = require('../models/WasteBin');
const User = require('../models/User');
const Route = require('../models/Route');
const Handoff = require('../models/Handoff');
const { STATUSES: HANDOFF_STATUS } = require('../services/handoffStateMachine');
const AppError = require('../utils/appError');
const { asyncHandler } = require('../utils/asyncHandler');
const mongoose = require('mongoose');
const { sendToAllClients, broadcastSessionEvent, broadcastHandoffEvent } = require('../utils/gpsWebSocket');

const OPEN_FACILITY_HANDOFF_STATUSES = [
    HANDOFF_STATUS.CREATED,
    HANDOFF_STATUS.PENDING,
    HANDOFF_STATUS.CONFIRMED_BY_SENDER
];
const VISIT_PROXIMITY_THRESHOLD_METERS = 75;

function toRadians(value) {
    return (value * Math.PI) / 180;
}

function getDistanceMeters(fromLat, fromLng, toLat, toLng) {
    const earthRadius = 6371000;
    const dLat = toRadians(toLat - fromLat);
    const dLng = toRadians(toLng - fromLng);
    const a = Math.sin(dLat / 2) ** 2
        + Math.cos(toRadians(fromLat))
        * Math.cos(toRadians(toLat))
        * Math.sin(dLng / 2) ** 2;
    return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseQrToken(value) {
    if (!value || typeof value !== 'string') return '';
    const trimmed = value.trim();
    if (!trimmed) return '';

    try {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed === 'string') return parsed.trim();
        if (parsed && typeof parsed === 'object') {
            return String(parsed.binId || parsed.containerId || parsed.id || '').trim();
        }
    } catch (error) {
        // Plain-text QR payloads are valid too.
    }

    return trimmed;
}

/**
 * Start a new collection session
 */
const startCollection = asyncHandler(async (req, res, next) => {
    const { startLocation, routeId } = req.body;
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

    // 3️⃣ Require an open facility_to_driver handoff assigned to this driver.
    // Handoffs are the single source of truth for what a driver picks up.
    const openHandoffs = await Handoff.find({
        type: 'facility_to_driver',
        'receiver.user': driverId,
        status: { $in: OPEN_FACILITY_HANDOFF_STATUSES },
        session: null
    }).select('_id containers company');

    if (openHandoffs.length === 0) {
        return next(new AppError('No open handoff assigned. Ask supervisor to create one.', 400));
    }

    // Containers come from the handoff(s) — driver cannot pick ad-hoc.
    const containerIdSet = new Set();
    for (const h of openHandoffs) {
        for (const c of h.containers || []) {
            if (c.container) containerIdSet.add(String(c.container));
        }
    }

    const selected = Array.from(containerIdSet).map((id) => ({
        container: new mongoose.Types.ObjectId(id),
        selected: true,
        visited: false
    }));
    const skippedNotFound = [];

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
        const startLocationRecord = await DriverLocation.create({
            driver: driverId,
            session: session._id,
            location: startLocation,
            timestamp: new Date()
        });
        session.route.push(startLocationRecord._id);
        await session.save();
    }

    // 7️⃣ Link open handoffs to the new session
    const handoffIds = openHandoffs.map((h) => h._id);
    await Handoff.updateMany(
        { _id: { $in: handoffIds } },
        { $set: { session: session._id } }
    );
    session.handoffs = [...(session.handoffs || []), ...handoffIds];
    await session.save();

    // 8️⃣ Populate session containers
    await session.populate('selectedContainers.container');
    await session.populate('company', 'name allowedIncinerationPlants defaultIncinerationPlant');

    // Broadcast session + linked handoffs so clients update without polling
    broadcastSessionEvent('session_updated', session);
    for (const h of openHandoffs) {
        const updated = await Handoff.findById(h._id);
        if (updated) broadcastHandoffEvent('handoff_updated', updated);
    }

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
    const sessionQuery = {
        sessionId,
        status: 'active'
    };

    if (req.user.role !== 'admin') {
        sessionQuery.driver = driverId;
    }

    const session = await CollectionSession.findOne(sessionQuery);

    if (!session) {
        return next(new AppError('Active session not found', 404));
    }

    // Complete the session
    await session.complete(endLocation);

    // Record final location if provided
    if (endLocation && endLocation.coordinates) {
        const endLocationRecord = await DriverLocation.create({
            driver: session.driver,
            session: session._id,
            location: endLocation,
            timestamp: new Date()
        });
        session.route.push(endLocationRecord._id);
        await session.save();
    }

    // Populate data for response
    await session.populate('selectedContainers.container');
    await session.populate('company', 'name allowedIncinerationPlants defaultIncinerationPlant');

    broadcastSessionEvent('session_updated', session);

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

    if (latitude == null || longitude == null) {
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

    session.route.push(location._id);
    await session.save();

    sendToAllClients({
        type: 'collection_location_update',
        data: {
            sessionId: session.sessionId,
            sessionMongoId: String(session._id),
            driverId: String(driverId),
            location: {
                _id: String(location._id),
                location: location.location,
                timestamp: location.timestamp,
            }
        }
    });

    res.status(201).json({
        status: 'success',
        data: {
            location,
            routePointsCount: session.route.length
        }
    });
});

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

    // 2️⃣ Find container, scoped to driver's company
    const containerQuery = { _id: containerId };
    if (req.user.company) {
        containerQuery.company = req.user.company;
    }
    const container = await WasteBin.findOne(containerQuery).select('_id binId');
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
        .populate('selectedContainers.container')
        .populate('company', 'name allowedIncinerationPlants defaultIncinerationPlant');

    res.status(200).json({
        status: 'success',
        data: { session: updatedSession }
    });
});

/**
 * Manually mark container as visited
 */
const markContainerVisited = asyncHandler(async (req, res, next) => {
    const { sessionId, containerId, collectedWeight, qrCode, driverLocation } = req.body;
    const driverId = req.user.id;

    const session = await CollectionSession.findOne({
        driver: driverId,
        sessionId,
        status: 'active'
    }).populate('selectedContainers.container');

    if (!session) {
        return next(new AppError('No active session found', 404));
    }

    const containerEntry = session.selectedContainers.find(
        (item) => String(item.container?._id || item.container) === String(containerId)
    );

    if (!containerEntry) {
        return next(new AppError('Container not found in session', 404));
    }

    if (req.user.role === 'driver') {
        const qrToken = parseQrToken(qrCode);
        if (!qrToken) {
            return next(new AppError('QR code is required to verify the container visit', 400));
        }

        const matchedIdentifiers = new Set([
            String(containerEntry.container?._id || containerEntry.container),
            String(containerEntry.container?.binId || '')
        ]);

        if (!matchedIdentifiers.has(qrToken)) {
            return next(new AppError('Scanned QR code does not match this container', 400));
        }

        const coordinates = containerEntry.container?.location?.coordinates;
        const hasContainerCoords = Array.isArray(coordinates) && coordinates.length === 2;
        if (!hasContainerCoords) {
            return next(new AppError('Container location is missing. Cannot verify proximity.', 400));
        }

        if (
            !driverLocation
            || typeof driverLocation.latitude !== 'number'
            || typeof driverLocation.longitude !== 'number'
        ) {
            return next(new AppError('Current driver location is required to verify proximity', 400));
        }

        const [containerLng, containerLat] = coordinates;
        const distanceMeters = getDistanceMeters(
            driverLocation.latitude,
            driverLocation.longitude,
            containerLat,
            containerLng
        );

        if (distanceMeters > VISIT_PROXIMITY_THRESHOLD_METERS) {
            return next(new AppError(
                `Driver is too far from the container to verify pickup (${Math.round(distanceMeters)}m)`,
                403
            ));
        }
    }

    await session.markContainerVisited(containerId, collectedWeight);

    const updatedSession = await CollectionSession.findById(session._id)
        .populate('selectedContainers.container')
        .populate('company', 'name allowedIncinerationPlants defaultIncinerationPlant');

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
    })
        .populate('selectedContainers.container')
        .populate('company', 'name allowedIncinerationPlants defaultIncinerationPlant');

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

    const sessions = await CollectionSession.find(query)
        .populate('selectedContainers.container')
        .populate('company', 'name allowedIncinerationPlants defaultIncinerationPlant')
        .populate('driver', 'username email phoneNumber')
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

    const sessions = await CollectionSession.find(query)
        .populate('driver', 'username email phoneNumber vehicleInfo')
        .populate('selectedContainers.container')
        .sort({ startTime: -1 });

    // Get last location for each driver
    const driversWithLocations = await Promise.all(sessions.map(async (session) => {
        const driverProfile = await Driver.findOne({ user: session.driver?._id || session.driver })
            .populate('user', 'username email lastLogin')
            .populate('medicalCompany', 'name licenseNumber');
        const lastLocation = await DriverLocation.findOne({ session: session._id })
            .sort({ timestamp: -1 });

        return {
            session,
            driverProfile,
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
        ? await CollectionSession.findById(sessionId)
            .populate('selectedContainers.container')
            .populate('company', 'name allowedIncinerationPlants defaultIncinerationPlant')
        : await CollectionSession.findOne({ sessionId })
            .populate('selectedContainers.container')
            .populate('company', 'name allowedIncinerationPlants defaultIncinerationPlant');

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

    // Also expose the route inside the session payload for frontend consumers.
    session.route = locations;

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
    markContainerVisited,
    getActiveSession,
    getCollectionHistory,
    getActiveDrivers,
    getSessionRoute
};
