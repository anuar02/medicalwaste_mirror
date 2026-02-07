const WasteBin = require('../models/WasteBin');
const Route = require('../models/Route');

function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

function haversineDistanceKm(a, b) {
    const earthRadiusKm = 6371;
    const dLat = toRadians(b.lat - a.lat);
    const dLng = toRadians(b.lng - a.lng);

    const aa = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));

    return earthRadiusKm * c;
}

async function getContainersNeedingCollection(companyId = null) {
    const query = {
        status: 'active',
        company: companyId || { $ne: null }
    };

    const bins = await WasteBin.find(query).select(
        '_id binId company fullness alertThreshold location'
    );

    return bins.filter((bin) => {
        const threshold = Number.isFinite(bin.alertThreshold) ? bin.alertThreshold : 80;
        const hasLocation = Array.isArray(bin.location?.coordinates) && bin.location.coordinates.length === 2;
        return hasLocation && (bin.fullness || 0) >= threshold;
    });
}

function clusterByProximity(containers, radiusKm = 5) {
    const clusters = [];
    const visited = new Set();

    for (let i = 0; i < containers.length; i += 1) {
        if (visited.has(String(containers[i]._id))) continue;

        const cluster = [containers[i]];
        visited.add(String(containers[i]._id));

        let expanded = true;
        while (expanded) {
            expanded = false;

            for (let j = 0; j < containers.length; j += 1) {
                const candidate = containers[j];
                const candidateId = String(candidate._id);
                if (visited.has(candidateId)) continue;

                const candidatePoint = {
                    lng: candidate.location.coordinates[0],
                    lat: candidate.location.coordinates[1]
                };

                const closeToAny = cluster.some((member) => {
                    const memberPoint = {
                        lng: member.location.coordinates[0],
                        lat: member.location.coordinates[1]
                    };
                    return haversineDistanceKm(memberPoint, candidatePoint) <= radiusKm;
                });

                if (closeToAny) {
                    cluster.push(candidate);
                    visited.add(candidateId);
                    expanded = true;
                }
            }
        }

        clusters.push(cluster);
    }

    return clusters;
}

function buildRouteStopsFromCluster(cluster) {
    return cluster.map((container, index) => ({
        containers: [container._id],
        order: index + 1,
        estimatedDuration: 10,
        notes: `Auto-suggested from IoT level ${container.fullness}%`,
        location: {
            type: 'Point',
            coordinates: container.location.coordinates
        }
    }));
}

async function findDuplicateSuggestion(companyId, clusterContainerIds) {
    const suggestions = await Route.find({
        company: companyId,
        status: 'suggested',
        createdAt: { $gte: new Date(Date.now() - 6 * 60 * 60 * 1000) }
    }).select('_id stops.containers');

    const target = [...clusterContainerIds].map(String).sort().join(',');
    return suggestions.find((route) => {
        const routeContainerIds = route.stops
            .flatMap((stop) => stop.containers || [])
            .map(String)
            .sort()
            .join(',');
        return routeContainerIds === target;
    });
}

async function generateSuggestedRoute(cluster, companyId) {
    if (!Array.isArray(cluster) || cluster.length === 0) return null;

    const containerIds = cluster.map((c) => c._id);
    const duplicate = await findDuplicateSuggestion(companyId, containerIds);
    if (duplicate) return null;

    const route = await Route.create({
        name: `Suggested route (${cluster.length} containers)`,
        company: companyId,
        status: 'suggested',
        stops: buildRouteStopsFromCluster(cluster),
        schedule: {
            type: 'custom',
            timezone: 'Asia/Almaty',
            time: '08:00',
            customDates: [new Date()]
        }
    });

    return route;
}

async function generateSuggestionsForCompany(companyId, radiusKm = 5) {
    const containers = await getContainersNeedingCollection(companyId);
    if (!containers.length) return [];

    const clusters = clusterByProximity(containers, radiusKm);
    const created = [];

    for (const cluster of clusters) {
        const route = await generateSuggestedRoute(cluster, companyId);
        if (route) created.push(route);
    }

    return created;
}

module.exports = {
    getContainersNeedingCollection,
    clusterByProximity,
    generateSuggestedRoute,
    generateSuggestionsForCompany,
    haversineDistanceKm
};
