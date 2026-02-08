// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const crypto = require('crypto');

// Define schema options
const schemaOptions = {
    timestamps: true,
    toJSON: {
        transform: (doc, ret) => {
            delete ret.password;
            delete ret.resetPasswordToken;
            delete ret.resetPasswordExpires;
            delete ret.__v;
            return ret;
        }
    }
};

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters long'],
        maxlength: [30, 'Username cannot exceed 30 characters'],
        validate: {
            validator: function(v) {
                return /^[a-zA-Z0-9_-]+$/.test(v);
            },
            message: 'Username can only contain alphanumeric characters, underscores and hyphens'
        }
    },
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        validate: {
            validator: validator.isEmail,
            message: 'Please provide a valid email'
        }
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters long'],
        select: false // Don't return password in queries by default
    },
    role: {
        type: String,
        enum: {
            values: ['user', 'admin', 'supervisor', 'driver'],
            message: 'Role must be either: user, admin, supervisor, or driver'
        },
        default: 'user'
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MedicalCompany',
        default: null
    },
    // Driver-specific fields
    vehicleInfo: {
        plateNumber: {
            type: String,
            trim: true,
            uppercase: true
        },
        vehicleType: {
            type: String,
            trim: true
        },
        model: {
            type: String,
            trim: true
        },
        year: {
            type: Number
        }
    },
    driverLicense: {
        number: {
            type: String,
            trim: true
        },
        expiryDate: {
            type: Date
        }
    },
    phoneNumber: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true,
        validate: {
            validator: function(v) {
                return /^\+[1-9]\d{6,14}$/.test(v);
            },
            message: 'Phone number must be in E.164 format, e.g. +77051234567'
        }
    },
    phoneNumberVerified: {
        type: Boolean,
        default: false
    },
    telegram: {
        active: {
            type: Boolean,
            default: false
        },
        chatId: {
            type: String,
            default: null
        }
    },
    notificationPreferences: {
        receiveAlerts: {
            type: Boolean,
            default: true
        }
    },
    verificationStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: function() {
            return this.role === 'driver' ? 'pending' : 'approved';
        }
    },
    department: {
        type: String,
        trim: true,
        enum: {
            values: [
                'Хирургическое Отделение',
                'Терапевтическое Отделение',
                'Педиатрическое Отделение',
                'Акушерское Отделение',
                'Инфекционное Отделение',
                'Лаборатория',
                'Реанимация',
                '' // Allow empty value
            ],
            message: 'Invalid department selection'
        },
        default: ''
    },
    active: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date
    },
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockedUntil: {
        type: Date
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    passwordChangedAt: Date
}, schemaOptions);

// Index for efficient queries
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ company: 1 });
userSchema.index({ verificationStatus: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
    // Only hash the password if it's modified or new
    if (!this.isModified('password')) return next();

    try {
        // Generate salt with higher work factor for better security
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Check if password is correct
userSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw new Error('Password comparison failed');
    }
};

// Track login attempts
userSchema.methods.incrementLoginAttempts = async function() {
    // Reset attempts if lock has expired
    if (this.lockedUntil && this.lockedUntil < Date.now()) {
        this.loginAttempts = 1;
        this.lockedUntil = undefined;
    } else {
        // Increment attempts counter
        this.loginAttempts += 1;

        // Lock account if too many attempts
        if (this.loginAttempts >= 5) {
            // Lock for 30 minutes
            this.lockedUntil = Date.now() + 30 * 60 * 1000;
        }
    }

    return this.save();
};

// Reset login attempts
userSchema.methods.resetLoginAttempts = function() {
    this.loginAttempts = 0;
    this.lockedUntil = undefined;
    this.lastLogin = Date.now();
    return this.save();
};

// Generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
    // Generate random token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hash token and store in database
    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    // Set expiration (1 hour)
    this.resetPasswordExpires = Date.now() + 60 * 60 * 1000;

    return resetToken;
};

// Virtual for driver approval check
userSchema.virtual('isApproved').get(function() {
    if (this.role !== 'driver') return true;
    return this.verificationStatus === 'approved';
});

const User = mongoose.model('User', userSchema);

module.exports = User;
