// controllers/authController.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const AppError = require('../utils/appError');
const { sendEmail } = require('../utils/email');
const { asyncHandler } = require('../utils/asyncHandler');

/**
 * Generate JWT token
 * @param {string} userId - User ID to encode in the token
 * @returns {string} JWT token
 */
const generateToken = (userId) => {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
};

/**
 * Generate refresh token
 * @param {string} userId - User ID to encode in the token
 * @returns {string} Refresh token
 */
const generateRefreshToken = (userId) => {
    return jwt.sign(
        { userId },
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );
};

/**
 * Set tokens in cookies and return them in response
 * @param {Object} user - User object
 * @param {number} statusCode - HTTP status code
 * @param {Object} res - Express response object
 */
const createAndSendTokens = (user, statusCode, res) => {
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Set secure cookie options
    const cookieOptions = {
        expires: new Date(
            Date.now() + (process.env.JWT_COOKIE_EXPIRES_IN || 24) * 60 * 60 * 1000
        ),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
    };

    // Send cookies
    res.cookie('jwt', token, cookieOptions);
    res.cookie('refreshToken', refreshToken, {
        ...cookieOptions,
        expires: new Date(
            Date.now() + (process.env.JWT_REFRESH_COOKIE_EXPIRES_IN || 7) * 24 * 60 * 60 * 1000
        )
    });

    // Send response
    res.status(statusCode).json({
        status: 'success',
        token,
        refreshToken,
        data: {
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        }
    });
};

/**
 * Register a new user
 */
const register = asyncHandler(async (req, res, next) => {
    const { username, email, password, passwordConfirm, role } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({
        $or: [{ email }, { username }]
    });

    if (existingUser) {
        if (existingUser.email === email) {
            return next(new AppError('Email already in use', 400));
        } else {
            return next(new AppError('Username already in use', 400));
        }
    }

    // Create new user - role will be set to 'user' by default unless explicitly set
    // and the request is from an admin
    const user = await User.create({
        username,
        email,
        password,
        role: req.user && req.user.role === 'admin' ? role : 'user'
    });

    // Generate and send tokens
    createAndSendTokens(user, 201, res);
});

/**
 * Login a user
 */
const login = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    // Find user by email with password included
    const user = await User.findOne({ email }).select('+password');

    // Check if user exists and password is correct
    if (!user || !(await user.comparePassword(password))) {
        // If user exists, increment login attempts
        if (user) {
            await user.incrementLoginAttempts();

            // Check if account is now locked
            if (user.lockedUntil && user.lockedUntil > Date.now()) {
                const minutesLeft = Math.ceil((user.lockedUntil - Date.now()) / (60 * 1000));
                return next(
                    new AppError(
                        `Too many failed login attempts. Account is locked for ${minutesLeft} minutes.`,
                        403
                    )
                );
            }
        }

        return next(new AppError('Incorrect email or password', 401));
    }

    // Check if account is active
    if (!user.active) {
        return next(new AppError('Your account has been deactivated. Please contact an administrator.', 401));
    }

    // Reset login attempts and update last login
    await user.resetLoginAttempts();

    // Generate and send tokens
    createAndSendTokens(user, 200, res);
});

/**
 * Logout a user
 */
const logout = asyncHandler(async (req, res) => {
    // Clear cookies
    res.cookie('jwt', 'logged-out', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    });

    res.cookie('refreshToken', 'logged-out', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    });

    res.status(200).json({ status: 'success' });
});

/**
 * Refresh access token using refresh token
 */
const refreshToken = asyncHandler(async (req, res, next) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return next(new AppError('Please provide refresh token', 400));
    }

    try {
        // Verify refresh token
        const decoded = jwt.verify(
            refreshToken,
            process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
        );

        // Check if user still exists
        const user = await User.findById(decoded.userId);
        if (!user) {
            return next(new AppError('The user belonging to this token no longer exists', 401));
        }

        // Generate new access token
        const newToken = generateToken(user._id);

        // Send new access token
        res.status(200).json({
            status: 'success',
            token: newToken
        });
    } catch (error) {
        return next(new AppError('Invalid or expired refresh token', 401));
    }
});

/**
 * Send password reset email
 */
const forgotPassword = asyncHandler(async (req, res, next) => {
    // Get user based on email
    const user = await User.findOne({ email: req.body.email });

    // Don't reveal if user exists for security reasons
    if (!user) {
        return res.status(200).json({
            status: 'success',
            message: 'Если указанный email зарегистрирован в системе, инструкции по сбросу пароля будут отправлены'
        });
    }

    // Generate reset token
    const resetToken = user.generatePasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // Create reset URL - Use frontend URL instead of API URL
    const resetURL = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;

    // Create plain text email content
    const message = `
    Сброс пароля
    
    Вы запросили сброс пароля для доступа к Medical Waste System. Для продолжения перейдите по ссылке ниже:
    
    ${resetURL}
    
    Ссылка действительна в течение 1 часа.
    
    Если вы не запрашивали сброс пароля, проигнорируйте это сообщение.
    `;

    // Create HTML email content
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 5px;">
      <h2 style="color: #2b9eb3;">Сброс пароля</h2>
      <p>Вы запросили сброс пароля для доступа к Medical Waste System.</p>
      <p>Для продолжения нажмите на кнопку ниже:</p>
      
      <div style="text-align: center; margin: 25px 0;">
        <a href="${resetURL}" style="background-color: #2b9eb3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Сбросить пароль</a>
      </div>
      
      <p>Или скопируйте эту ссылку в браузер:</p>
      <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 14px;">${resetURL}</p>
      
      <p><strong>Ссылка действительна в течение 1 часа.</strong></p>
      
      <p style="color: #777; font-size: 13px; margin-top: 30px; border-top: 1px solid #e1e1e1; padding-top: 15px;">
        Если вы не запрашивали сброс пароля, проигнорируйте это сообщение.
      </p>
      
      <p style="font-size: 12px; color: #777; margin-top: 20px;">
        Medical Waste System
      </p>
    </div>
    `;

    try {
        // Send email using the existing sendEmail utility
        await sendEmail({
            email: user.email,
            subject: 'Сброс пароля для Medical Waste System',
            message,
            html
        });

        // Return success response
        res.status(200).json({
            status: 'success',
            message: 'Инструкции по сбросу пароля отправлены на ваш email'
        });
    } catch (error) {
        // Reset token and expires if email fails
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save({ validateBeforeSave: false });

        return next(new AppError('Произошла ошибка при отправке email. Попробуйте позже.', 500));
    }
});

/**
 * Reset password using token
 */
const resetPassword = asyncHandler(async (req, res, next) => {
    // Get token from params
    const { token } = req.params;
    const { password, passwordConfirm } = req.body;

    // Hash token to compare with stored hash
    const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

    // Find user with token and check if token has expired
    const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
        return next(new AppError('Token is invalid or has expired', 400));
    }

    // Update password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.passwordChangedAt = Date.now() - 1000; // Subtract 1 second to ensure token issued after password change
    await user.save();

    // Log user in
    createAndSendTokens(user, 200, res);
});

/**
 * Change password while logged in
 */
const changePassword = asyncHandler(async (req, res, next) => {
    const { currentPassword, password, passwordConfirm } = req.body;

    // Validate passwords match
    if (password !== passwordConfirm) {
        return next(new AppError('Пароли не совпадают', 400));
    }

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
        return next(new AppError('Пользователь не найден', 404));
    }

    // Check if current password is correct
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
        return next(new AppError('Текущий пароль указан неверно', 401));
    }

    // Update password
    user.password = password;
    user.passwordChangedAt = Date.now() - 1000; // Subtract 1 second to ensure token issued after password change
    await user.save();

    // Generate new token
    const token = generateToken(user._id);

    // Send response with new token
    res.status(200).json({
        status: 'success',
        message: 'Пароль успешно изменен',
        token,
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
 * Verify token and return user info
 */
const verifyToken = asyncHandler(async (req, res) => {
    res.status(200).json({
        status: 'success',
        valid: true,
        data: {
            user: {
                id: req.user._id,
                username: req.user.username,
                email: req.user.email,
                role: req.user.role
            }
        }
    });
});

module.exports = {
    register,
    login,
    logout,
    refreshToken,
    forgotPassword,
    resetPassword,
    changePassword,
    verifyToken
};