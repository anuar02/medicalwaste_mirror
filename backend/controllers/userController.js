// controllers/userController.js
const User = require('../models/User');
const AppError = require('../utils/appError');
const { asyncHandler } = require('../utils/asyncHandler');
const { startPhoneVerification, checkPhoneVerification } = require('../services/twilioVerifyService');

/**
 * Get current user profile
 */

const getProfile = async (req, res, next) => {
    try {
        // req.user is set by the auth middleware
        const userId = req.user.id || req.user._id;

        // Fetch the full user document with populated fields
        const user = await User.findById(userId)
            .select('-password -passwordResetToken -passwordResetExpires') // Exclude sensitive fields
            .populate('company', 'name licenseNumber contactInfo address') // Populate company if referenced
            .lean(); // Convert to plain JavaScript object

        if (!user) {
            return res.status(404).json({
                status: 'fail',
                message: 'User not found'
            });
        }

    res.status(200).json({
        status: 'success',
        data: {
            user: {
                _id: user._id,
                id: user._id, // Include both for compatibility
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                department: user.department || '',
                company: user.company,
                verificationStatus: user.verificationStatus, // IMPORTANT: Include this
                vehicleInfo: user.vehicleInfo, // For drivers
                phoneNumber: user.phoneNumber || null,
                phoneNumberVerified: user.phoneNumberVerified || false,
                active: user.active,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
                lastLogin: user.lastLogin,
                loginAttempts: user.loginAttempts
            }
        }
    });
    } catch (error) {
        console.error('Get profile error:', error);
        next(error);
    }
};

const assignCompany = asyncHandler(async (req, res, next) => {
    const { userId, companyId } = req.body;

    const user = await User.findById(userId);
    if (!user) {
        return next(new AppError('User not found', 404));
    }

    const company = await MedicalCompany.findById(companyId);
    if (!company) {
        return next(new AppError('Company not found', 404));
    }

    user.company = companyId;
    await user.save();

    res.status(200).json({
        status: 'success',
        data: {
            user
        }
    });
});

/**
 * Update current user profile
 */
const updateProfile = asyncHandler(async (req, res, next) => {
    const { username, email, department, phoneNumber, vehicleInfo } = req.body;

    // Check if another user already has this username or email
    if (username) {
        const existingUser = await User.findOne({
            username,
            _id: { $ne: req.user._id }
        });

        if (existingUser) {
            return next(new AppError('Username already in use', 400));
        }
    }

    if (email) {
        const existingUser = await User.findOne({
            email,
            _id: { $ne: req.user._id }
        });

        if (existingUser) {
            return next(new AppError('Email already in use', 400));
        }
    }

    // Update user data
    const updatedFields = {};
    if (username) updatedFields.username = username;
    if (email) updatedFields.email = email;
    if (department) updatedFields.department = department;
    if (phoneNumber !== undefined) updatedFields.phoneNumber = phoneNumber;
    if (vehicleInfo) {
        const existing = await User.findById(req.user._id).select('vehicleInfo');
        updatedFields.vehicleInfo = { ...existing?.vehicleInfo?.toObject?.(), ...vehicleInfo };
    }

    // Find and update user
    const user = await User.findByIdAndUpdate(
        req.user._id,
        updatedFields,
        {
            new: true,
            runValidators: true
        }
    )
        .select('-password -resetPasswordToken -resetPasswordExpires')
        .populate('company', 'name contactInfo');

    if (!user) {
        return next(new AppError('User not found', 404));
    }

    res.status(200).json({
        status: 'success',
        data: { user }
    });
});

const updatePhoneNumber = asyncHandler(async (req, res, next) => {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
        return next(new AppError('Phone number is required', 400));
    }

    const existingUser = await User.findById(req.user._id);
    if (!existingUser) {
        return next(new AppError('User not found', 404));
    }

    if (existingUser.phoneNumber === phoneNumber) {
        return res.status(200).json({
            status: 'success',
            data: {
                user: {
                    id: existingUser._id,
                    phoneNumber: existingUser.phoneNumber,
                    phoneNumberVerified: existingUser.phoneNumberVerified
                }
            }
        });
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        { phoneNumber, phoneNumberVerified: false },
        { new: true, runValidators: true }
    );

    if (!user) {
        return next(new AppError('User not found', 404));
    }

    res.status(200).json({
        status: 'success',
        data: {
            user: {
                id: user._id,
                phoneNumber: user.phoneNumber,
                phoneNumberVerified: user.phoneNumberVerified
            }
        }
    });
});

const startPhoneVerificationFlow = asyncHandler(async (req, res, next) => {
    const { phoneNumber } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
        return next(new AppError('User not found', 404));
    }

    const targetNumber = phoneNumber || user.phoneNumber;
    if (!targetNumber) {
        return next(new AppError('Phone number is required', 400));
    }

    if (phoneNumber && phoneNumber !== user.phoneNumber) {
        user.phoneNumber = phoneNumber;
        user.phoneNumberVerified = false;
        await user.save();
    }

    const result = await startPhoneVerification(targetNumber);
    if (!result.success) {
        return next(new AppError(result.error || 'Failed to start verification', 400));
    }

    res.status(200).json({
        status: 'success',
        data: {
            status: result.status
        }
    });
});

const checkPhoneVerificationFlow = asyncHandler(async (req, res, next) => {
    const { phoneNumber, code } = req.body;
    if (!code) {
        return next(new AppError('Phone number and code are required', 400));
    }

    const user = await User.findById(req.user._id);
    if (!user) {
        return next(new AppError('User not found', 404));
    }

    const targetNumber = phoneNumber || user.phoneNumber;
    if (!targetNumber) {
        return next(new AppError('Phone number and code are required', 400));
    }

    const result = await checkPhoneVerification(targetNumber, code);
    if (!result.success) {
        return next(new AppError(result.error || 'Failed to verify code', 400));
    }

    if (result.status !== 'approved') {
        return next(new AppError('Verification code is invalid', 400));
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        { phoneNumber: targetNumber, phoneNumberVerified: true },
        { new: true }
    );

    if (!updatedUser) {
        return next(new AppError('User not found', 404));
    }

    res.status(200).json({
        status: 'success',
        data: {
            user: {
                id: updatedUser._id,
                phoneNumber: updatedUser.phoneNumber,
                phoneNumberVerified: updatedUser.phoneNumberVerified
            }
        }
    });
});

const updateDriverDetails = asyncHandler(async (req, res, next) => {
    const { driverId } = req.params;
    const { vehicleInfo, driverLicense, phoneNumber } = req.body;

    const driver = await User.findById(driverId);

    if (!driver) {
        return next(new AppError('Driver not found', 404));
    }

    if (driver.role !== 'driver') {
        return next(new AppError('User is not a driver', 400));
    }

    // Check permissions
    if (req.user.role === 'driver' && driver._id.toString() !== req.user.id) {
        return next(new AppError('You can only update your own details', 403));
    }

    if (req.user.role === 'supervisor' && driver.company.toString() !== req.user.company.toString()) {
        return next(new AppError('You can only update drivers from your company', 403));
    }

    // Update fields
    if (vehicleInfo) driver.vehicleInfo = { ...driver.vehicleInfo, ...vehicleInfo };
    if (driverLicense) driver.driverLicense = { ...driver.driverLicense, ...driverLicense };
    if (phoneNumber) driver.phoneNumber = phoneNumber;

    await driver.save();

    res.status(200).json({
        status: 'success',
        data: {
            driver
        }
    });
});

const getDriverDetails = asyncHandler(async (req, res, next) => {
    const { driverId } = req.params;

    const driver = await User.findById(driverId)
        .populate('company', 'name licenseNumber address contactInfo');

    if (!driver) {
        return next(new AppError('Driver not found', 404));
    }

    if (driver.role !== 'driver') {
        return next(new AppError('User is not a driver', 400));
    }

    // Check permissions
    if (req.user.role === 'driver' && driver._id.toString() !== req.user.id) {
        return next(new AppError('You can only view your own details', 403));
    }

    if (req.user.role === 'supervisor' && driver.company.toString() !== req.user.company.toString()) {
        return next(new AppError('You can only view drivers from your company', 403));
    }

    res.status(200).json({
        status: 'success',
        data: {
            driver
        }
    });
});

/**
 * Get all available departments (for dropdown)
 */
const getDepartments = asyncHandler(async (req, res) => {
    // This could come from a database, but for now it's hardcoded
    const departments = [
        'Хирургическое Отделение',
        'Терапевтическое Отделение',
        'Педиатрическое Отделение',
        'Акушерское Отделение',
        'Инфекционное Отделение',
        'Лаборатория',
        'Реанимация'
    ];

    res.status(200).json({
        status: 'success',
        data: {
            departments
        }
    });
});

/**
 * Update user role (admin only)
 */
const updateUserRole = asyncHandler(async (req, res, next) => {
    // 1. Get userId from params, role from body
    const { userId } = req.params;
    const { role } = req.body;

    // 2. Security check: Prevent an admin from demoting themselves (optional but recommended)
    if (userId === req.user.id && role !== 'admin') {
        return next(new AppError('You cannot change your own admin role', 400));
    }

    // 3. Update the user
    const user = await User.findByIdAndUpdate(
        userId,
        { role },
        {
            new: true,
            runValidators: true
        }
    );

    if (!user) {
        return next(new AppError('User not found', 404));
    }

    res.status(200).json({
        status: 'success',
        data: {
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        }
    });
});

/**
 * Get all users (admin only)
 */
const getAllUsers = asyncHandler(async (req, res) => {
    const users = await User.find()
        .select('firstName lastName phoneNumber username email role department lastLogin active');

    res.status(200).json({
        status: 'success',
        results: users.length,
        data: {
            users
        }
    });
});

const getAllDrivers = asyncHandler(async (req, res) => {
    const query = { role: 'driver' };

    // If supervisor, filter by company
    if (req.user.role === 'supervisor') {
        query.company = req.user.company;
    }

    const drivers = await User.find(query)
        .populate('company', 'name licenseNumber')
        .select('firstName lastName username email phoneNumber vehicleInfo driverLicense verificationStatus active lastLogin')
        .sort({ createdAt: -1 });

    res.status(200).json({
        status: 'success',
        results: drivers.length,
        data: {
            drivers
        }
    });
});


const verifyDriver = asyncHandler(async (req, res, next) => {
    const { driverId, status, notes } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
        return next(new AppError('Status must be either approved or rejected', 400));
    }

    const driver = await User.findById(driverId);

    if (!driver) {
        return next(new AppError('Driver not found', 404));
    }

    if (driver.role !== 'driver') {
        return next(new AppError('User is not a driver', 400));
    }

    // Supervisors can only verify drivers from their company
    if (req.user.role === 'supervisor') {
        if (!driver.company || driver.company.toString() !== req.user.company.toString()) {
            return next(new AppError('You can only verify drivers from your company', 403));
        }
    }

    driver.verificationStatus = status;
    if (notes) {
        driver.notes = notes;
    }
    await driver.save();

    res.status(200).json({
        status: 'success',
        data: {
            driver
        }
    });
});

const getPendingDrivers = asyncHandler(async (req, res) => {
    const query = {
        role: 'driver',
        verificationStatus: 'pending'
    };

    // If supervisor, filter by company
    if (req.user.role === 'supervisor') {
        query.company = req.user.company;
    }

    const drivers = await User.find(query)
        .populate('company', 'name licenseNumber')
        .select('username email phoneNumber vehicleInfo driverLicense verificationStatus createdAt')
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
 * Deactivate user (admin only)
 */
const deactivateUser = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;

    // Prevent deactivating own account
    if (userId === req.user.id) {
        return next(new AppError('You cannot deactivate your own account', 400));
    }

    const user = await User.findByIdAndUpdate(
        userId,
        { active: false },
        { new: true }
    );

    if (!user) {
        return next(new AppError('User not found', 404));
    }

    res.status(200).json({
        status: 'success',
        data: null
    });
});

/**
 * Delete user (admin only)
 */
const deleteUser = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;

    // Prevent deleting yourself
    if (req.user.id.toString() === userId) {
        return next(new AppError('You cannot delete your own account', 403));
    }

    // Find the user and make sure they exist
    const user = await User.findById(userId);
    if (!user) {
        return next(new AppError('User not found', 404));
    }

    // Make sure we don't delete the last admin
    if (user.role === 'admin') {
        const adminCount = await User.countDocuments({ role: 'admin' });
        if (adminCount <= 1) {
            return next(new AppError('Cannot delete the last admin user', 400));
        }
    }

    // Delete the user
    await User.findByIdAndDelete(userId);

    res.status(200).json({
        status: 'success',
        message: 'User deleted successfully'
    });
});

/**
 * Activate user (admin only)
 */
const activateUser = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;

    const user = await User.findByIdAndUpdate(
        userId,
        { active: true },
        { new: true }
    );

    if (!user) {
        return next(new AppError('User not found', 404));
    }

    res.status(200).json({
        status: 'success',
        data: null
    });
});

module.exports = {
    getProfile,
    updateProfile,
    updatePhoneNumber,
    startPhoneVerificationFlow,
    checkPhoneVerificationFlow,
    getDepartments,
    updateUserRole,
    getAllUsers,
    deactivateUser,
    deleteUser,
    getPendingDrivers,
    verifyDriver,
    getAllDrivers,
    getDriverDetails,
    updateDriverDetails,
    assignCompany,
    activateUser
};
