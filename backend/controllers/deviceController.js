// controllers/deviceController.js
const Device = require('../models/Device');
const WasteBin = require('../models/WasteBin');
const AppError = require('../utils/appError');
const { asyncHandler } = require('../utils/asyncHandler');

// Get pending devices
const getPendingDevices = asyncHandler(async (req, res) => {
    const devices = await Device.find({ status: 'pending' })
        .sort({ createdAt: -1 });

    res.status(200).json({
        status: 'success',
        results: devices.length,
        data: { devices }
    });
});

// Configure device and create waste bin
const configureDevice = asyncHandler(async (req, res, next) => {
    const { deviceId } = req.params;
    const { binId, department, wasteType, alertThreshold, capacity } = req.body;

    // Find device
    const device = await Device.findById(deviceId);

    if (!device) {
        return next(new AppError('Device not found', 404));
    }

    if (device.status !== 'pending') {
        return next(new AppError('Device is already configured', 400));
    }

    // Validate bin ID format
    if (!/^[A-Z]+-\d+$/.test(binId)) {
        return next(new AppError('Bin ID must be in format DEPT-123', 400));
    }

    // Check if bin ID is already in use
    const existingBin = await WasteBin.findOne({ binId });
    if (existingBin) {
        return next(new AppError('Bin ID is already in use', 400));
    }

    // Create the waste bin
    const bin = await WasteBin.create({
        binId,
        department,
        wasteType,
        alertThreshold: alertThreshold || 80,
        capacity: capacity || 50,
        status: 'active',
        location: device.location
    });

    // Update device status
    device.binId = binId;
    device.status = 'configured';
    await device.save();

    res.status(201).json({
        status: 'success',
        message: 'Device configured and waste bin created',
        data: { device, bin }
    });
});

// Update device data (for ESP32 data reporting)
const updateDeviceData = asyncHandler(async (req, res, next) => {
    const { macAddress, deviceId, latitude, longitude } = req.body;

    if (!macAddress && !deviceId) {
        return next(new AppError('Device identifier is required', 400));
    }

    // Find device by MAC address or device ID
    let device;
    if (deviceId) {
        device = await Device.findById(deviceId);
    } else {
        device = await Device.findOne({ macAddress });
    }

    if (!device) {
        if (macAddress) {
            // Auto-register if device not found
            device = await Device.create({
                macAddress,
                deviceType: req.body.deviceType || 'ESP32',
                status: 'pending',
                lastSeen: new Date(),
                // Store location if provided
                ...(latitude && longitude ? {
                    location: {
                        type: 'Point',
                        coordinates: [parseFloat(longitude), parseFloat(latitude)]
                    }
                } : {})
            });

            return res.status(201).json({
                status: 'success',
                message: 'New device registered',
                data: { deviceId: device._id }
            });
        } else {
            return next(new AppError('Device not found', 404));
        }
    }

    // Update device data
    device.lastSeen = new Date();

    // Update location if provided - ensure coordinates format is consistent
    if (latitude !== undefined && longitude !== undefined) {
        device.location = {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
        };

        console.log(`Updated device location: [${longitude}, ${latitude}]`);
    }

    await device.save();

    // If device is configured, update the waste bin data
    if (device.status === 'configured' && device.binId) {
        const bin = await WasteBin.findOne({ binId: device.binId });

        if (bin) {
            // Handle updating bin data with reported sensor values
            const { distance, fullness, temperature, weight } = req.body;

            if (typeof distance === 'number') {
                bin.distance = distance;
            }

            if (typeof fullness === 'number') {
                bin.fullness = fullness;
            } else if (typeof distance === 'number') {
                // Calculate fullness from distance if direct value not provided
                bin.fullness = Math.max(0, Math.min(100, 100 - (distance / bin.capacity * 100)));
            }

            if (typeof temperature === 'number') {
                bin.temperature = temperature;
            }

            if (typeof weight === 'number') {
                bin.weight = weight;
            }

            // Update bin location from device location if available
            if (device.location && device.location.coordinates) {
                bin.location = {
                    type: 'Point',
                    coordinates: device.location.coordinates
                };
                console.log(`Updated bin location from device: [${device.location.coordinates}]`);
            }

            bin.lastUpdate = new Date();
            await bin.save();
        }
    }

    res.status(200).json({
        status: 'success',
        data: {
            deviceId: device._id,
            status: device.status,
            binId: device.binId
        }
    });
});

module.exports = {
    getPendingDevices,
    configureDevice,
    updateDeviceData
};