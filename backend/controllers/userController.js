// controllers/userController.js
const User = require('../models/User');
const AppError = require('../utils/appError');
const { asyncHandler } = require('../utils/asyncHandler');

/**
 * Get current user profile
 */
const getProfile = asyncHandler(async (req, res, next) => {
    // Get user from authenticated request
    const user = await User.findById(req.user._id);

    if (!user) {
        return next(new AppError('User not found', 404));
    }

    // Send user data
    res.status(200).json({
        status: 'success',
        data: {
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                department: user.department
            }
        }
    });
});

/**
 * Update current user profile
 */
const updateProfile = asyncHandler(async (req, res, next) => {
    const { username, email, department } = req.body;

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

    // Find and update user
    const user = await User.findByIdAndUpdate(
        req.user._id,
        updatedFields,
        {
            new: true, // Return updated user
            runValidators: true // Run validators on updated fields
        }
    );

    if (!user) {
        return next(new AppError('User not found', 404));
    }

    // Send updated user data
    res.status(200).json({
        status: 'success',
        data: {
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                department: user.department
            }
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
    const { userId, role } = req.body;

    // Check if valid role
    if (!['user', 'admin', 'supervisor'].includes(role)) {
        return next(new AppError('Invalid role', 400));
    }

    // Find and update user
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
        .select('username email role department lastLogin active');

    res.status(200).json({
        status: 'success',
        results: users.length,
        data: {
            users
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
    getDepartments,
    updateUserRole,
    getAllUsers,
    deactivateUser,
    deleteUser,
    activateUser
};