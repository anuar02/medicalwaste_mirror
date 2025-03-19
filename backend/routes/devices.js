const express = require('express');
const router = express.Router();
const { auth, restrictTo } = require('../middleware/auth');
const { getPendingDevices, configureDevice, updateDeviceData } = require('../controllers/deviceController');

// Public endpoint for device data reporting
router.post('/report', updateDeviceData);

// Protected routes - admin only
router.use(auth);
router.use(restrictTo('admin'));

router.get('/pending', getPendingDevices);
router.post('/:deviceId/configure', configureDevice);

module.exports = router;