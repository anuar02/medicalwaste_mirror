const express = require('express');
const router = express.Router();
const { apiKeyAuth } = require('../middleware/auth');

// Simple in-memory log storage (or use your database)
const deviceLogs = [];

// Store device logs (only API key required)
router.post('/device-logs', apiKeyAuth, async (req, res) => {
    try {
        const log = {
            ...req.body,
            timestamp: new Date(),
            deviceId: req.deviceId
        };

        deviceLogs.push(log);

        // Keep only last 1000 logs
        if (deviceLogs.length > 1000) {
            deviceLogs.shift();
        }

        console.log('Device log received:', log);

        res.status(201).json({
            status: 'success',
            data: { log }
        });
    } catch (error) {
        console.error('Device log error:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// Get device logs
router.get('/device-logs/:binId', async (req, res) => {
    try {
        const { binId } = req.params;
        const logs = deviceLogs
            .filter(log => log.binId === binId)
            .slice(-100); // Last 100 logs

        res.status(200).json({
            status: 'success',
            results: logs.length,
            data: { logs }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

module.exports = router;