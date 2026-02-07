const Route = require('../models/Route');
const User = require('../models/User');
const WasteBin = require('../models/WasteBin');
const CollectionSession = require('../models/CollectionSession');
const DriverLocation = require('../models/DriverLocation');
const AppError = require('../utils/appError');
const { asyncHandler } = require('../utils/asyncHandler');
const { optimizeRoute: optimizeRouteService } = require('../services/routeOptimizer');
const { generateSuggestionsForCompany } = require('../services/smartScheduler');
const mongoose = require('mongoose');

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function applyScopeFilter(req, base = {}) {
    if (req.user.role === 'admin') return { ...base };

    if (!req.user.company) {
        throw new AppError('User is not assigned to a company', 403);
    }

    return {
        ...base,
        company: req.user.company
    };
}

function isRouteScheduledForToday(route, now = new Date()) {
    const scheduleType = route?.schedule?.type || 'daily';
    const weekday = WEEKDAY_KEYS[now.getDay()];

    if (scheduleType === 'daily') return true;

    if (scheduleType === 'weekly') {
        return Array.isArray(route.schedule.days) && route.schedule.days.includes(weekday);
    }

    if (scheduleType === 'custom') {
        const todayIso = now.toISOString().slice(0, 10);
        return Array.isArray(route.schedule.customDates) &&
            route.schedule.customDates.some((date) => (
                new Date(date).toISOString().slice(0, 10) === todayIso
            ));
    }

    return false;
}

async function validateAssignedDriver(assignedDriver, companyId) {
    if (!assignedDriver) return;

    const driver = await User.findById(assignedDriver).select('role company');
    if (!driver) {
        throw new AppError('Assigned driver not found', 404);
    }
    if (driver.role !== 'driver') {
        throw new AppError('Assigned user must have driver role', 400);
    }
    if (companyId && String(driver.company || '') !== String(companyId)) {
        throw new AppError('Driver must belong to the same company', 400);
    }
}

const createRoute = asyncHandler(async (req, res, next) => {
    const payload = { ...req.body };

    if (req.user.role !== 'admin') {
        payload.company = req.user.company;
    }

    if (!payload.company) {
        return next(new AppError('Company is required to create route', 400));
    }

    await validateAssignedDriver(payload.assignedDriver, payload.company);

    const route = await Route.create(payload);

    res.status(201).json({
        status: 'success',
        data: { route }
    });
});

const getRoutes = asyncHandler(async (req, res) => {
    const query = applyScopeFilter(req, {});

    if (req.query.status) query.status = req.query.status;
    if (req.query.assignedDriver) query.assignedDriver = req.query.assignedDriver;

    const routes = await Route.find(query)
        .populate('assignedDriver', 'username email phoneNumber')
        .sort({ createdAt: -1 });

    const filtered = req.query.day
        ? routes.filter((route) => {
            if (route.schedule?.type !== 'weekly') return false;
            return (route.schedule?.days || []).includes(req.query.day);
        })
        : routes;

    res.status(200).json({
        status: 'success',
        results: filtered.length,
        data: { routes: filtered }
    });
});

const getRouteById = asyncHandler(async (req, res, next) => {
    const query = applyScopeFilter(req, { _id: req.params.id });

    // Driver can only view their own assigned route.
    if (req.user.role === 'driver') {
        query.assignedDriver = req.user.id;
    }

    const route = await Route.findOne(query)
        .populate('assignedDriver', 'username email phoneNumber');

    if (!route) {
        return next(new AppError('Route not found', 404));
    }

    res.status(200).json({
        status: 'success',
        data: { route }
    });
});

const updateRoute = asyncHandler(async (req, res, next) => {
    const query = applyScopeFilter(req, { _id: req.params.id });
    const current = await Route.findOne(query);

    if (!current) {
        return next(new AppError('Route not found', 404));
    }

    const payload = { ...req.body };
    if (req.user.role !== 'admin') {
        payload.company = current.company;
    }

    await validateAssignedDriver(payload.assignedDriver, payload.company || current.company);

    const route = await Route.findByIdAndUpdate(
        req.params.id,
        payload,
        { new: true, runValidators: true }
    );

    res.status(200).json({
        status: 'success',
        data: { route }
    });
});

const deleteRoute = asyncHandler(async (req, res, next) => {
    const query = applyScopeFilter(req, { _id: req.params.id });
    const route = await Route.findOneAndDelete(query);

    if (!route) {
        return next(new AppError('Route not found', 404));
    }

    res.status(204).json({
        status: 'success',
        data: null
    });
});

const getTodayRoutes = asyncHandler(async (req, res) => {
    const query = applyScopeFilter(req, { status: { $in: ['active', 'suggested'] } });

    if (req.user.role === 'driver') {
        query.assignedDriver = req.user.id;
    }

    const routes = await Route.find(query)
        .populate('assignedDriver', 'username phoneNumber')
        .sort({ createdAt: -1 });

    const todayRoutes = routes.filter((route) => isRouteScheduledForToday(route, new Date()));

    res.status(200).json({
        status: 'success',
        results: todayRoutes.length,
        data: { routes: todayRoutes }
    });
});

const getRouteStats = asyncHandler(async (req, res, next) => {
    const query = applyScopeFilter(req, { _id: req.params.id });
    const route = await Route.findOne(query);

    if (!route) {
        return next(new AppError('Route not found', 404));
    }

    const sessions = await CollectionSession.find({ plannedRoute: route._id }).select(
        'status totalDuration startTime endTime'
    );

    const completed = sessions.filter((s) => s.status === 'completed');
    const completionRate = sessions.length
        ? Number(((completed.length / sessions.length) * 100).toFixed(1))
        : 0;
    const averageCompletionTime = completed.length
        ? Math.round(completed.reduce((sum, s) => sum + (s.totalDuration || 0), 0) / completed.length)
        : 0;

    res.status(200).json({
        status: 'success',
        data: {
            routeId: route._id,
            totalSessions: sessions.length,
            completedSessions: completed.length,
            completionRate,
            averageCompletionTime,
            lastCompletedAt: completed.length ? completed[completed.length - 1].endTime : null
        }
    });
});

const getRouteSuggestions = asyncHandler(async (req, res) => {
    const query = applyScopeFilter(req, { status: 'suggested' });
    const suggestions = await Route.find(query)
        .populate('assignedDriver', 'username phoneNumber')
        .sort({ createdAt: -1 });

    res.status(200).json({
        status: 'success',
        results: suggestions.length,
        data: { routes: suggestions }
    });
});

const approveSuggestedRoute = asyncHandler(async (req, res, next) => {
    const query = applyScopeFilter(req, { _id: req.params.id, status: 'suggested' });
    const route = await Route.findOne(query);

    if (!route) {
        return next(new AppError('Suggested route not found', 404));
    }

    const { assignedDriver, assignedVehicle, schedule, regenerateIfEmpty } = req.body;

    if (assignedDriver) {
        await validateAssignedDriver(assignedDriver, route.company);
        route.assignedDriver = assignedDriver;
    }
    if (typeof assignedVehicle === 'string') {
        route.assignedVehicle = assignedVehicle.trim();
    }
    if (schedule && typeof schedule === 'object') {
        route.schedule = { ...route.schedule.toObject(), ...schedule };
    }

    route.status = 'active';
    await route.save();

    // Optional helper: if there are no suggestions left, generate new ones for this company.
    if (regenerateIfEmpty) {
        const stillSuggested = await Route.countDocuments({
            company: route.company,
            status: 'suggested'
        });
        if (stillSuggested === 0) {
            await generateSuggestionsForCompany(route.company, 5);
        }
    }

    res.status(200).json({
        status: 'success',
        data: { route }
    });
});

const optimizeRoute = asyncHandler(async (req, res, next) => {
    const query = applyScopeFilter(req, { _id: req.params.id });
    const route = await Route.findOne(query);

    if (!route) {
        return next(new AppError('Route not found', 404));
    }

    if (!Array.isArray(route.stops) || route.stops.length < 2) {
        return next(new AppError('Route must have at least 2 stops to optimize', 400));
    }

    const points = [];
    for (const stop of route.stops) {
        let coordinates = stop?.location?.coordinates;

        if ((!coordinates || coordinates.length !== 2) && Array.isArray(stop.containers) && stop.containers.length > 0) {
            const bin = await WasteBin.findById(stop.containers[0]).select('location');
            coordinates = bin?.location?.coordinates;
        }

        if (!coordinates || coordinates.length !== 2) {
            return next(new AppError('Each stop must have location coordinates or a container with coordinates', 400));
        }

        points.push({
            lng: coordinates[0],
            lat: coordinates[1]
        });
    }

    const { order, distance } = optimizeRouteService(points, 0);

    // Persist optimization results and update stop order.
    route.optimizedOrder = order;
    route.estimatedDistance = distance;
    route.stops = order.map((idx, i) => ({
        ...route.stops[idx].toObject(),
        order: i + 1
    }));
    route.estimatedDuration = route.stops.reduce((sum, stop) => sum + (stop.estimatedDuration || 10), 0);

    await route.save();

    res.status(200).json({
        status: 'success',
        data: {
            route,
            optimization: { order, distance }
        }
    });
});

const getRouteComparison = asyncHandler(async (req, res, next) => {
    const routeQuery = applyScopeFilter(req, { _id: req.params.id });
    const route = await Route.findOne(routeQuery);

    if (!route) {
        return next(new AppError('Route not found', 404));
    }

    const { sessionId } = req.params;
    const isObjectId = mongoose.isValidObjectId(sessionId);
    const session = isObjectId
        ? await CollectionSession.findById(sessionId)
        : await CollectionSession.findOne({ sessionId });

    if (!session) {
        return next(new AppError('Collection session not found', 404));
    }

    if (!session.plannedRoute || String(session.plannedRoute) !== String(route._id)) {
        return next(new AppError('Session is not linked to this route', 400));
    }

    if (req.user.role === 'driver' && String(session.driver) !== String(req.user.id)) {
        return next(new AppError('You do not have permission to view this session', 403));
    }

    if (req.user.role === 'supervisor' && session.company &&
        String(session.company) !== String(req.user.company || '')) {
        return next(new AppError('Session belongs to another company', 403));
    }

    const orderedStops = Array.isArray(route.stops)
        ? [...route.stops].sort((a, b) => (a.order || 0) - (b.order || 0))
        : [];

    const containerIds = orderedStops
        .flatMap((stop) => stop.containers || [])
        .map(String);

    const containersForLookup = orderedStops
        .filter((stop) => !Array.isArray(stop.location?.coordinates) && (stop.containers || []).length > 0)
        .flatMap((stop) => stop.containers || [])
        .map(String);

    const bins = containersForLookup.length
        ? await WasteBin.find({ _id: { $in: containersForLookup } }).select('location')
        : [];
    const binLocationMap = new Map(bins.map((bin) => [String(bin._id), bin.location]));

    const plannedStops = orderedStops.map((stop, index) => {
        let coords = stop.location?.coordinates;
        if ((!coords || coords.length !== 2) && (stop.containers || []).length > 0) {
            const fallback = binLocationMap.get(String(stop.containers[0]));
            coords = fallback?.coordinates;
        }

        return {
            order: stop.order || index + 1,
            containers: stop.containers || [],
            hasLocation: Array.isArray(coords) && coords.length === 2,
            location: Array.isArray(coords) && coords.length === 2
                ? { lng: coords[0], lat: coords[1] }
                : null
        };
    });

    const plannedPath = plannedStops
        .filter((stop) => stop.hasLocation)
        .map((stop) => stop.location);

    const selectedContainers = session.selectedContainers || [];
    const visitedContainers = selectedContainers
        .filter((item) => item.visited)
        .map((item) => String(item.container));

    const plannedSet = new Set(containerIds);
    const visitedSet = new Set(visitedContainers);

    const missingContainers = [...plannedSet].filter((id) => !visitedSet.has(id));
    const extraContainers = [...visitedSet].filter((id) => !plannedSet.has(id));

    const actualLocations = await DriverLocation.find({ session: session._id })
        .sort({ timestamp: 1 })
        .select('location timestamp');

    const actualPath = actualLocations
        .map((entry) => {
            const coords = entry.location?.coordinates;
            if (!Array.isArray(coords) || coords.length !== 2) return null;
            return {
                lng: coords[0],
                lat: coords[1],
                timestamp: entry.timestamp
            };
        })
        .filter(Boolean);

    const plannedDuration = route.estimatedDuration || 0;
    const actualDuration = session.totalDuration || 0;

    res.status(200).json({
        status: 'success',
        data: {
            routeId: route._id,
            sessionId: session._id,
            plannedStops,
            plannedPath,
            actualPath,
            comparison: {
                plannedContainers: containerIds,
                visitedContainers,
                missingContainers,
                extraContainers,
                plannedDuration,
                actualDuration,
                durationDelta: actualDuration - plannedDuration
            }
        }
    });
});

module.exports = {
    createRoute,
    getRoutes,
    getRouteById,
    updateRoute,
    deleteRoute,
    getTodayRoutes,
    getRouteStats,
    getRouteSuggestions,
    approveSuggestedRoute,
    optimizeRoute,
    getRouteComparison
};
