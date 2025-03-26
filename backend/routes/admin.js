// routes/admin.js
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { auth } = require('../middleware/auth');
const ApiKey = require('../models/apiKey'); // You'll need to create this model

// Create a new API key
router.post('/api-keys', auth, async (req, res) => {
    try {
        const { deviceId, description } = req.body;

        if (!deviceId) {
            return res.status(400).json({ error: 'Device ID is required' });
        }

        // Generate a random API key
        const key = crypto.randomBytes(32).toString('hex');

        const apiKey = new ApiKey({
            key,
            deviceId,
            description: description || `API key for ${deviceId}`
        });

        await apiKey.save();

        res.status(201).json({
            message: 'API key created successfully',
            key // Only show the key once at creation
        });
    } catch (error) {
        console.error('Error creating API key:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get all API keys (without the actual keys)
router.get('/api-keys', auth, async (req, res) => {
    try {
        const keys = await ApiKey.find().select('-key');
        res.json(keys);
    } catch (error) {
        console.error('Error fetching API keys:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Deactivate an API key
router.put('/api-keys/:id/deactivate', auth, async (req, res) => {
    try {
        const key = await ApiKey.findByIdAndUpdate(
            req.params.id,
            { active: false },
            { new: true }
        ).select('-key');

        if (!key) {
            return res.status(404).json({ error: 'API key not found' });
        }

        res.json(key);
    } catch (error) {
        console.error('Error deactivating API key:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;