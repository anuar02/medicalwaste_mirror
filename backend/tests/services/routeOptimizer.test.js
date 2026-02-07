const {
    calculateDistanceMatrix,
    nearestNeighborTSP,
    twoOptImprove,
    optimizeRoute,
    routeDistance
} = require('../../services/routeOptimizer');

function makeLinearStops(count) {
    return Array.from({ length: count }, (_, i) => ({
        lat: 43.23 + i * 0.001,
        lng: 76.89 + i * 0.001
    }));
}

describe('routeOptimizer', () => {
    test('calculateDistanceMatrix returns symmetric NxN matrix', () => {
        const stops = makeLinearStops(5);
        const matrix = calculateDistanceMatrix(stops);

        expect(matrix).toHaveLength(5);
        expect(matrix[0]).toHaveLength(5);
        expect(matrix[2][3]).toBeCloseTo(matrix[3][2], 8);
        expect(matrix[1][1]).toBe(0);
    });

    test('nearestNeighborTSP returns full order for 10 stops', () => {
        const stops = makeLinearStops(10);
        const matrix = calculateDistanceMatrix(stops);
        const order = nearestNeighborTSP(matrix, 0);

        expect(order).toHaveLength(10);
        expect(new Set(order).size).toBe(10);
        expect(order[0]).toBe(0);
    });

    test('twoOptImprove does not worsen route distance for 20 stops', () => {
        const stops = makeLinearStops(20);
        const matrix = calculateDistanceMatrix(stops);
        const initial = nearestNeighborTSP(matrix, 0);
        const initialDistance = routeDistance(initial, matrix);

        const improved = twoOptImprove(initial, matrix);
        const improvedDistance = routeDistance(improved, matrix);

        expect(improved).toHaveLength(20);
        expect(new Set(improved).size).toBe(20);
        expect(improvedDistance).toBeLessThanOrEqual(initialDistance + 1e-9);
    });

    test('optimizeRoute handles 5 stops and returns numeric distance', () => {
        const stops = makeLinearStops(5);
        const result = optimizeRoute(stops, 0);

        expect(result.order).toHaveLength(5);
        expect(new Set(result.order).size).toBe(5);
        expect(typeof result.distance).toBe('number');
        expect(result.distance).toBeGreaterThanOrEqual(0);
    });
});
