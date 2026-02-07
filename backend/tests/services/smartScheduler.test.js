const { clusterByProximity, haversineDistanceKm } = require('../../services/smartScheduler');

function bin(id, lng, lat) {
    return {
        _id: id,
        location: {
            coordinates: [lng, lat]
        }
    };
}

describe('smartScheduler helpers', () => {
    test('haversineDistanceKm returns near-zero for same point', () => {
        const d = haversineDistanceKm({ lng: 76.89, lat: 43.23 }, { lng: 76.89, lat: 43.23 });
        expect(d).toBeCloseTo(0, 8);
    });

    test('clusterByProximity groups nearby bins and separates far bins', () => {
        const bins = [
            bin('a', 76.89, 43.23),
            bin('b', 76.891, 43.231), // near a
            bin('c', 76.95, 43.28),   // far
            bin('d', 76.951, 43.281)  // near c
        ];

        const clusters = clusterByProximity(bins, 1.5);

        expect(clusters).toHaveLength(2);
        expect(clusters[0].length + clusters[1].length).toBe(4);
    });
});
