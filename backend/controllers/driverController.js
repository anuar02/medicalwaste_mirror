const Driver = require('../models/Driver');
const MedicalCompany = require('../models/MedicalCompany');
const User = require('../models/User');
const AppError = require('../utils/appError');
const {asyncHandler} = require("../utils/asyncHandler");

/**
 * Register as driver (for users with driver role)
 */
const registerDriver = asyncHandler(async (req, res, next) => {
    const {
        licenseNumber,
        licenseExpiry,
        medicalCompanyId,
        vehicleInfo,
        certifications,
        emergencyContact
    } = req.body;

    // Check if user already has a driver profile
    const existingDriver = await Driver.findOne({ user: req.user.id });
    if (existingDriver) {
        return next(new AppError('Driver profile already exists', 400));
    }

    // Verify medical company exists and is active
    const medicalCompany = await MedicalCompany.findById(medicalCompanyId);
    if (!medicalCompany || !medicalCompany.isActive) {
        return next(new AppError('Invalid or inactive medical company', 400));
    }

    // Check if license number is unique
    const existingLicense = await Driver.findOne({ licenseNumber });
    if (existingLicense) {
        return next(new AppError('License number already registered', 400));
    }

    // Check if vehicle plate is unique
    if (vehicleInfo?.plateNumber) {
        const existingVehicle = await Driver.findOne({
            'vehicleInfo.plateNumber': vehicleInfo.plateNumber
        });
        if (existingVehicle) {
            return next(new AppError('Vehicle plate number already registered', 400));
        }
    }

    // Create driver profile
    const driver = await Driver.create({
        user: req.user.id,
        licenseNumber,
        licenseExpiry,
        medicalCompany: medicalCompanyId,
        vehicleInfo,
        certifications,
        emergencyContact
    });

    // Update user role and company for consistent scoping
    await User.findByIdAndUpdate(req.user.id, {
        role: 'driver',
        company: medicalCompanyId,
        verificationStatus: 'pending'
    });

    await driver.populate('medicalCompany', 'name licenseNumber contactInfo');

    res.status(201).json({
        status: 'success',
        message: 'Driver registration submitted successfully. Awaiting admin verification.',
        data: {
            driver
        }
    });
});

/**
 * Get all pending driver verifications (admin only)
 */
const getPendingVerifications = asyncHandler(async (req, res) => {
    const pendingDrivers = await Driver.find({
        isVerified: false
    })
        .populate('user', 'username email createdAt')
        .populate('medicalCompany', 'name licenseNumber contactInfo')
        .sort({ createdAt: -1 });

    res.status(200).json({
        status: 'success',
        results: pendingDrivers.length,
        data: {
            drivers: pendingDrivers
        }
    });
});

/**
 * Verify driver (admin only)
 */
const verifyDriver = asyncHandler(async (req, res, next) => {
    const { driverId } = req.params;
    const { approved, notes } = req.body;

    const driver = await Driver.findById(driverId)
        .populate('user', 'username email')
        .populate('medicalCompany', 'name');

    if (!driver) {
        return next(new AppError('Driver not found', 404));
    }

    if (driver.isVerified) {
        return next(new AppError('Driver already verified', 400));
    }

    if (approved) {
        driver.isVerified = true;
        driver.isActive = true;
        driver.verifiedBy = req.user.id;
        driver.verificationDate = new Date();
        driver.verificationNotes = notes || 'Approved by admin';

        await driver.save();

        await User.findByIdAndUpdate(driver.user, {
            verificationStatus: 'approved',
            company: driver.medicalCompany
        });

        // Send notification email to driver (optional)
        // await sendDriverApprovalEmail(driver.user.email, driver);

        res.status(200).json({
            status: 'success',
            message: 'Driver verified and activated successfully',
            data: { driver }
        });
    } else {
        // Reject the driver application
        driver.verificationNotes = notes || 'Rejected by admin';
        await driver.save();

        await User.findByIdAndUpdate(driver.user, {
            verificationStatus: 'rejected'
        });

        // Optionally, you might want to remove the driver record or keep it for audit
        // await Driver.findByIdAndDelete(driverId);

        res.status(200).json({
            status: 'success',
            message: 'Driver application rejected',
            data: { driver }
        });
    }
});

/**
 * Get all verified drivers
 */
const getAllDrivers = asyncHandler(async (req, res) => {
    const { status, company } = req.query;

    const filter = {};
    if (status === 'verified') filter.isVerified = true;
    if (status === 'pending') filter.isVerified = false;
    if (status === 'active') {
        filter.isVerified = true;
        filter.isActive = true;
    }
    if (company) filter.medicalCompany = company;

    const drivers = await Driver.find(filter)
        .populate('user', 'username email lastLogin')
        .populate('medicalCompany', 'name licenseNumber')
        .populate('verifiedBy', 'username')
        .sort({ createdAt: -1 });

    res.status(200).json({
        status: 'success',
        results: drivers.length,
        data: {
            drivers
        }
    });
});

/**
 * Get driver profile
 */
const getDriverProfile = asyncHandler(async (req, res, next) => {
    const driver = await Driver.findOne({ user: req.user.id })
        .populate('medicalCompany', 'name licenseNumber contactInfo address')
        .populate('verifiedBy', 'username');

    if (!driver) {
        return next(new AppError('Driver profile not found', 404));
    }

    if (driver.medicalCompany && !req.user.company) {
        await User.findByIdAndUpdate(req.user.id, {
            company: driver.medicalCompany,
            verificationStatus: driver.isVerified ? 'approved' : req.user.verificationStatus
        });
    }

    res.status(200).json({
        status: 'success',
        data: {
            driver
        }
    });
});

/**
 * Update driver profile
 */
const updateDriverProfile = asyncHandler(async (req, res, next) => {
    const allowedFields = [
        'emergencyContact',
        'certifications'
    ];

    const updates = {};
    Object.keys(req.body).forEach(key => {
        if (allowedFields.includes(key)) {
            updates[key] = req.body[key];
        }
    });

    const driver = await Driver.findOneAndUpdate(
        { user: req.user.id },
        updates,
        { new: true, runValidators: true }
    ).populate('medicalCompany', 'name licenseNumber contactInfo');

    if (!driver) {
        return next(new AppError('Driver profile not found', 404));
    }

    res.status(200).json({
        status: 'success',
        data: {
            driver
        }
    });
});

// controllers/medicalCompanyController.js

/**
 * Get all active medical companies (for registration dropdown)
 */
const getMedicalCompanies = asyncHandler(async (req, res) => {
    const companies = await MedicalCompany.find({
        isActive: true,
        certificationExpiry: { $gte: new Date() } // Only companies with valid certifications
    }).select('name licenseNumber address contactInfo wasteTypes certificationExpiry isActive');

    res.status(200).json({
        status: 'success',
        results: companies.length,
        data: {
            companies
        }
    });
});

/**
 * Create medical company (admin only)
 */
const createMedicalCompany = asyncHandler(async (req, res, next) => {
    const company = await MedicalCompany.create(req.body);

    res.status(201).json({
        status: 'success',
        data: {
            company
        }
    });
});

/**
 * Update medical company (admin only)
 */
const updateMedicalCompany = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    const company = await MedicalCompany.findByIdAndUpdate(
        id,
        req.body,
        { new: true, runValidators: true }
    );

    if (!company) {
        return next(new AppError('Medical company not found', 404));
    }

    res.status(200).json({
        status: 'success',
        data: {
            company
        }
    });
});

/**
 * Delete medical company (admin only)
 */
const deleteMedicalCompany = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    // Check if any drivers are associated with this company
    const driversCount = await Driver.countDocuments({ medicalCompany: id });
    if (driversCount > 0) {
        return next(new AppError('Cannot delete company with associated drivers', 400));
    }

    const company = await MedicalCompany.findByIdAndDelete(id);

    if (!company) {
        return next(new AppError('Medical company not found', 404));
    }

    res.status(204).json({
        status: 'success',
        data: null
    });
});

module.exports = {
    // Driver functions
    registerDriver,
    getPendingVerifications,
    verifyDriver,
    getAllDrivers,
    getDriverProfile,
    updateDriverProfile,

    // Medical company functions
    getMedicalCompanies,
    createMedicalCompany,
    updateMedicalCompany,
    deleteMedicalCompany
};
