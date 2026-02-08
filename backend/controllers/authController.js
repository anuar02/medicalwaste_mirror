// controllers/authController.js
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const AppError = require('../utils/appError');
const { sendEmail } = require('../utils/email');
const { asyncHandler } = require('../utils/asyncHandler');
const { startPhoneVerification, checkPhoneVerification } = require('../services/twilioVerifyService');

const normalizePhone = (value) => {
    if (!value) return '';
    return String(value).replace(/[^\d+]/g, '');
};

const generatePlaceholderPhone = () => {
    const suffix = String(Math.floor(Math.random() * 1e9)).padStart(9, '0');
    return `+7${suffix}`;
};

const splitName = (rawName) => {
    const parts = String(rawName || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    if (parts.length >= 2) {
        return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
    }
    if (parts.length === 1) {
        return { firstName: parts[0], lastName: 'User' };
    }
    return { firstName: 'User', lastName: 'User' };
};

const toSlug = (value) => String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const buildUniqueUsername = async ({ username, firstName, lastName, email }) => {
    if (username) return username;
    const base = toSlug(`${firstName || ''} ${lastName || ''}`) || toSlug(email?.split('@')[0]) || 'user';
    let candidate = base;
    let counter = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const exists = await User.findOne({ username: candidate }).select('_id');
        if (!exists) return candidate;
        counter += 1;
        candidate = `${base}_${counter}`;
    }
};

const ensureSingleUserByPhone = async (phoneNumber) => {
    const users = await User.find({ phoneNumber }).select('_id role verificationStatus active');
    if (users.length === 0) {
        throw new AppError('User not found', 404);
    }
    if (users.length > 1) {
        throw new AppError('Multiple accounts use this phone number. Contact support.', 409);
    }
    return users[0];
};

/**
 * Generate JWT token
 * @param {string} userId - User ID to encode in the token
 * @returns {string} JWT token
 */
const generateToken = (userId) => {
    return jwt.sign(
        { id: userId },  // Changed
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
};

const generateRefreshToken = (userId) => {
    return jwt.sign(
        { id: userId },  // Changed
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );
};

// Also update the refreshToken function (around line 348)
const refreshToken = asyncHandler(async (req, res, next) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return next(new AppError('Please provide refresh token', 400));
    }

    try {
        const decoded = jwt.verify(
            refreshToken,
            process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
        );

        // Change from decoded.userId to decoded.id
        const user = await User.findById(decoded.id);  // Changed
        if (!user) {
            return next(new AppError('The user belonging to this token no longer exists', 401));
        }

        const newToken = generateToken(user._id);

        res.status(200).json({
            status: 'success',
            token: newToken
        });
    } catch (error) {
        return next(new AppError('Invalid or expired refresh token', 401));
    }
});

const googleClient = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

/**
 * Set tokens in cookies and return them in response
 * @param {Object} user - User object
 * @param {number} statusCode - HTTP status code
 * @param {Object} res - Express response object
 */
const createAndSendTokens = async (user, statusCode, res) => {
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

    // Fetch full user with populated company
    const fullUser = await User.findById(user._id)
        .select('-password -resetPasswordToken -resetPasswordExpires')
        .populate('company', 'name contactInfo')
        .lean();

    // Send response
    res.status(statusCode).json({
        status: 'success',
        token,
        refreshToken,
        data: {
            user: fullUser
        }
    });
};

/**
 * Register a new user
 */
const register = asyncHandler(async (req, res, next) => {
    const {
        firstName,
        lastName,
        username,
        email,
        password,
        passwordConfirm,
        role,
        company,
        // Driver-specific fields
        vehicleInfo,
        driverLicense,
        phoneNumber
    } = req.body;

    // Validate password confirmation
    if (password !== passwordConfirm) {
        return next(new AppError('Passwords do not match', 400));
    }

    // Validate company if provided
    if (company) {
        const companyExists = await MedicalCompany.findById(company);
        if (!companyExists) {
            return next(new AppError('Company not found', 404));
        }
        if (!companyExists.isActive) {
            return next(new AppError('Company is not active', 400));
        }
    }

    const normalizedPhoneNumber = normalizePhone(phoneNumber);
    const resolvedUsername = await buildUniqueUsername({ username, firstName, lastName, email });

    // Build user data
    const userData = {
        firstName,
        lastName,
        username: resolvedUsername,
        email,
        password,
        role: role || 'user',
        phoneNumber: normalizedPhoneNumber
    };

    // Add company if provided
    if (company) {
        userData.company = company;
    }

    // Add driver-specific fields if role is driver
    if (role === 'driver') {
        if (!company) {
            return next(new AppError('Company is required for drivers', 400));
        }
        if (!vehicleInfo || !vehicleInfo.plateNumber) {
            return next(new AppError('Vehicle plate number is required for drivers', 400));
        }
        userData.vehicleInfo = vehicleInfo;
        userData.driverLicense = driverLicense;
        userData.verificationStatus = 'pending'; // Drivers need approval
    }

    // Create user
    const user = await User.create(userData);

    // Generate token
    const token = signToken(user._id);

    // Remove password from output
    user.password = undefined;

    res.status(201).json({
        status: 'success',
        token,
        data: {
            user
        }
    });
});

/**
 * Generate Google OAuth authorization URL
 */
const getGoogleAuthURL = asyncHandler(async (req, res) => {
    const scopes = [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email'
    ];

    const authUrl = googleClient.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent'
    });

    res.status(200).json({
        status: 'success',
        data: {
            authUrl
        }
    });
});

/**
 * Handle Google OAuth callback
 */
const googleCallback = asyncHandler(async (req, res, next) => {
    const { code } = req.body;

    console.log('Received Google OAuth code:', code);

    if (!code) {
        return next(new AppError('Authorization code is required', 400));
    }

    try {
        // Initialize OAuth client with correct credentials
        const googleClient = new OAuth2Client(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            // Make sure this matches what you set in Google Cloud Console
            process.env.GOOGLE_REDIRECT_URI || `${process.env.FRONTEND_URL}/login`
        );

        // Exchange code for tokens
        console.log('Exchanging code for tokens...');
        const { tokens } = await googleClient.getToken(code);
        googleClient.setCredentials(tokens);

        // Get user info
        console.log('Getting user info from Google...');
        const { data } = await googleClient.request({
            url: 'https://www.googleapis.com/oauth2/v3/userinfo'
        });
        console.log('Google user info received:', data.email);

        // Check if user exists
        let user = await User.findOne({ email: data.email });

        if (!user) {
            console.log('Creating new user from Google data...');
            // Create new user
            // Generate a random password for Google users (they'll login with Google)
            const randomPassword = crypto.randomBytes(16).toString('hex');
            const { firstName, lastName } = splitName(data.name || data.given_name || data.family_name);
            const phoneNumber = generatePlaceholderPhone();

            user = await User.create({
                username: data.name.replace(/\s+/g, '_').toLowerCase() + '_' + crypto.randomBytes(3).toString('hex'),
                firstName,
                lastName,
                email: data.email,
                password: randomPassword,
                phoneNumber,
                googleId: data.sub,
                googleProfile: data,
                active: true
            });
        } else if (!user.googleId) {
            console.log('Linking existing user to Google account...');
            // Link Google account to existing user
            user.googleId = data.sub;
            user.googleProfile = data;
            await user.save({ validateBeforeSave: false });
        }

        // Check if account is active
        if (!user.active) {
            return next(new AppError('Your account has been deactivated. Please contact an administrator.', 401));
        }

        // Update last login time
        user.lastLogin = Date.now();
        await user.save({ validateBeforeSave: false });

        // Generate tokens
        const token = generateToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        // Send response
        res.status(200).json({
            status: 'success',
            token,
            refreshToken,
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
    } catch (error) {
        console.error('Google OAuth error:', error);
        return next(new AppError('Failed to authenticate with Google: ' + error.message, 401));
    }
});

const signToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
};

/**
 * Login with Google ID token (for client-side Google Sign-In)
 */
const googleLogin = asyncHandler(async (req, res, next) => {
    const { idToken } = req.body;

    if (!idToken) {
        return next(new AppError('ID token is required', 400));
    }

    try {
        // Initialize Google OAuth client
        const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

        // Verify ID token
        console.log('Verifying Google ID token...');
        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const googleId = payload.sub;
        const email = payload.email;
        const name = payload.name || email.split('@')[0];

        console.log(`Google user verified: ${email}`);

        // Check if user exists
        let user = await User.findOne({
            $or: [
                { googleId },
                { email }
            ]
        });

        if (!user) {
            console.log(`Creating new user for ${email}`);
            // Create new user
            const randomPassword = crypto.randomBytes(16).toString('hex');
            const { firstName, lastName } = splitName(payload.name || name);
            const phoneNumber = generatePlaceholderPhone();

            user = await User.create({
                username: name.replace(/\s+/g, '_').toLowerCase() + '_' + crypto.randomBytes(3).toString('hex'),
                firstName,
                lastName,
                email,
                password: randomPassword,
                phoneNumber,
                googleId,
                googleProfile: payload,
                active: true
            });
        } else if (!user.googleId) {
            console.log(`Linking Google account to existing user: ${email}`);
            // Link Google account to existing user
            user.googleId = googleId;
            user.googleProfile = payload;
            await user.save({ validateBeforeSave: false });
        }

        // Check if account is active
        if (!user.active) {
            return next(new AppError('Your account has been deactivated. Please contact an administrator.', 401));
        }

        // Update last login
        user.lastLogin = Date.now();
        await user.save({ validateBeforeSave: false });

        // Generate tokens
        const token = generateToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        // Send response
        res.status(200).json({
            status: 'success',
            token,
            refreshToken,
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
    } catch (error) {
        console.error('Google login error:', error);
        return next(new AppError(`Failed to authenticate with Google: ${error.message}`, 401));
    }
});

/**
 * Login a user
 */
const login = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    // Check if email and password exist
    if (!email || !password) {
        return next(new AppError('Please provide email and password', 400));
    }

    // Get user with password
    const user = await User.findOne({ email }).select('+password').populate('company');

    // Check if user exists and password is correct
    if (!user || !(await user.comparePassword(password))) {
        // Increment login attempts
        if (user) {
            await user.incrementLoginAttempts();
        }
        return next(new AppError('Incorrect email or password', 401));
    }

    // Check if user is active
    if (!user.active) {
        return next(new AppError('Your account has been deactivated', 401));
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > Date.now()) {
        const minutesLeft = Math.ceil((user.lockedUntil - Date.now()) / 60000);
        return next(
            new AppError(
                `Account is locked due to too many failed login attempts. Please try again in ${minutesLeft} minutes.`,
                403
            )
        );
    }

    // Check driver verification status
    if (user.role === 'driver' && user.verificationStatus === 'rejected') {
        return next(new AppError('Your driver account has been rejected. Please contact administrator.', 403));
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

    // Generate token
    const token = signToken(user._id);

    // Remove password from output
    user.password = undefined;

    res.status(200).json({
        status: 'success',
        token,
        data: {
            user
        }
    });
});

const startPhoneLogin = asyncHandler(async (req, res, next) => {
    const { phoneNumber } = req.body;
    const normalizedPhone = normalizePhone(phoneNumber);
    if (!normalizedPhone) {
        return next(new AppError('Phone number is required', 400));
    }

    await ensureSingleUserByPhone(normalizedPhone);

    const result = await startPhoneVerification(normalizedPhone);
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

const verifyPhoneLogin = asyncHandler(async (req, res, next) => {
    const { phoneNumber, code } = req.body;
    const normalizedPhone = normalizePhone(phoneNumber);
    if (!normalizedPhone || !code) {
        return next(new AppError('Phone number and code are required', 400));
    }

    const check = await checkPhoneVerification(normalizedPhone, code);
    if (!check.success || check.status !== 'approved') {
        return next(new AppError(check.error || 'Invalid verification code', 401));
    }

    const user = await ensureSingleUserByPhone(normalizedPhone);

    if (!user.active) {
        return next(new AppError('Your account has been deactivated', 401));
    }

    if (user.role === 'driver' && user.verificationStatus === 'rejected') {
        return next(new AppError('Your driver account has been rejected. Please contact administrator.', 403));
    }

    await createAndSendTokens(user, 200, res);
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
    const user = await User.findById(req.user._id)
        .select('-password -resetPasswordToken -resetPasswordExpires')
        .populate('company', 'name contactInfo')
        .lean();

    res.status(200).json({
        status: 'success',
        valid: true,
        data: { user }
    });
});

module.exports = {
    register,
    login,
    startPhoneLogin,
    verifyPhoneLogin,
    logout,
    refreshToken,
    forgotPassword,
    resetPassword,
    changePassword,
    verifyToken,
    getGoogleAuthURL,
    googleCallback,
    googleLogin
};
