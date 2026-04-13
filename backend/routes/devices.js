const express = require('express');
const router = express.Router();
const { auth, restrictTo, apiKeyAuth } = require('../middleware/auth');
const { getPendingDevices, configureDevice, updateDeviceData } = require('../controllers/deviceController');

// Device data reporting — requires valid API key from IoT device
router.post('/report', apiKeyAuth, updateDeviceData);

// Protected routes - admin only
router.use(auth);
router.use(restrictTo('admin'));

router.get('/pending', getPendingDevices);
router.post('/:deviceId/configure', configureDevice);

module.exports = router;