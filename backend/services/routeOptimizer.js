const EARTH_RADIUS_KM = 6371;

function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

function haversineDistanceKm(a, b) {
    const dLat = toRadians(b.lat - a.lat);
    const dLng = toRadians(b.lng - a.lng);

    const aa = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
    return EARTH_RADIUS_KM * c;
}

function calculateDistanceMatrix(stops) {
    const n = stops.length;
    const matrix = Array.from({ length: n }, () => Array(n).fill(0));

    for (let i = 0; i < n; i += 1) {
        for (let j = i + 1; j < n; j += 1) {
            const distance = haversineDistanceKm(stops[i], stops[j]);
            matrix[i][j] = distance;
            matrix[j][i] = distance;
        }
    }

    return matrix;
}

function nearestNeighborTSP(distanceMatrix, startIndex = 0) {
    const n = distanceMatrix.length;
    if (n === 0) return [];
    if (startIndex < 0 || startIndex >= n) startIndex = 0;

    const visited = new Array(n).fill(false);
    const order = [startIndex];
    visited[startIndex] = true;

    while (order.length < n) {
        const current = order[order.length - 1];
        let nearest = -1;
        let bestDistance = Number.POSITIVE_INFINITY;

        for (let i = 0; i < n; i += 1) {
            if (!visited[i] && distanceMatrix[current][i] < bestDistance) {
                nearest = i;
                bestDistance = distanceMatrix[current][i];
            }
        }

        if (nearest === -1) break;
        visited[nearest] = true;
        order.push(nearest);
    }

    return order;
}

function routeDistance(order, distanceMatrix) {
    if (!Array.isArray(order) || order.length < 2) return 0;

    let total = 0;
    for (let i = 0; i < order.length - 1; i += 1) {
        total += distanceMatrix[order[i]][order[i + 1]];
    }
    return total;
}

function twoOptImprove(order, distanceMatrix) {
    if (!Array.isArray(order) || order.length < 4) {
        return [...order];
    }

    let improved = true;
    let bestOrder = [...order];

    while (improved) {
        improved = false;

        for (let i = 1; i < bestOrder.length - 2; i += 1) {
            for (let k = i + 1; k < bestOrder.length - 1; k += 1) {
                const candidate = [
                    ...bestOrder.slice(0, i),
                    ...bestOrder.slice(i, k + 1).reverse(),
                    ...bestOrder.slice(k + 1)
                ];

                if (routeDistance(candidate, distanceMatrix) < routeDistance(bestOrder, distanceMatrix)) {
                    bestOrder = candidate;
                    improved = true;
                }
            }
        }
    }

    return bestOrder;
}

function optimizeRoute(stops, startIndex = 0) {
    if (!Array.isArray(stops) || stops.length === 0) {
        return { order: [], distance: 0 };
    }

    if (stops.length === 1) {
        return { order: [0], distance: 0 };
    }

    const distanceMatrix = calculateDistanceMatrix(stops);
    const initialOrder = nearestNeighborTSP(distanceMatrix, startIndex);
    const order = twoOptImprove(initialOrder, distanceMatrix);
    const distance = routeDistance(order, distanceMatrix);

    return {
        order,
        distance: Number(distance.toFixed(2))
    };
}

module.exports = {
    haversineDistanceKm,
    calculateDistanceMatrix,
    nearestNeighborTSP,
    twoOptImprove,
    optimizeRoute,
    routeDistance
};
