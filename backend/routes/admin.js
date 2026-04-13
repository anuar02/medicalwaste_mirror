// routes/admin.js
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { adminAuth } = require('../middleware/auth');
const { asyncHandler } = require('../utils/asyncHandler');
const ApiKey = require('../models/apiKey');

// All admin routes require admin role
router.use(adminAuth);

// Create a new API key
router.post('/api-keys', asyncHandler(async (req, res) => {
    const { deviceId, description } = req.body;

    if (!deviceId) {
        return res.status(400).json({
            success: false,
            message: 'Device ID is required'
        });
    }

    const key = crypto.randomBytes(32).toString('hex');

    const apiKey = new ApiKey({
        key,
        deviceId,
        description: description || `API key for ${deviceId}`
    });

    await apiKey.save();

    res.status(201).json({
        success: true,
        message: 'API key created successfully',
        data: { key } // Only returned once at creation
    });
}));

// Get all API keys (without the actual key values)
router.get('/api-keys', asyncHandler(async (req, res) => {
    const keys = await ApiKey.find().select('-key');
    res.json({
        success: true,
        data: keys,
        message: `Found ${keys.length} API key(s)`
    });
}));

// Deactivate an API key
router.put('/api-keys/:id/deactivate', asyncHandler(async (req, res) => {
    const key = await ApiKey.findByIdAndUpdate(
        req.params.id,
        { active: false },
        { new: true }
    ).select('-key');

    if (!key) {
        return res.status(404).json({
            success: false,
            message: 'API key not found'
        });
    }

    res.json({
        success: true,
        message: 'API key deactivated successfully',
        data: key
    });
}));

module.exports = router;
