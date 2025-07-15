// models/Driver.js
const mongoose = require('mongoose');
const validator = require('validator');

const driverSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User reference is required'],
        unique: true
    },
    licenseNumber: {
        type: String,
        required: [true, 'Driver license number is required'],
        unique: true,
        trim: true,
        minlength: [8, 'License number must be at least 8 characters'],
        maxlength: [20, 'License number cannot exceed 20 characters']
    },
    licenseExpiry: {
        type: Date,
        required: [true, 'License expiry date is required'],
        validate: {
            validator: function(v) {
                return v > new Date();
            },
            message: 'License expiry date must be in the future'
        }
    },
    medicalCompany: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MedicalCompany',
        required: [true, 'Medical company is required']
    },
    vehicleInfo: {
        plateNumber: {
            type: String,
            required: [true, 'Vehicle plate number is required'],
            unique: true,
            trim: true,
            uppercase: true,
            minlength: [6, 'Plate number must be at least 6 characters'],
            maxlength: [10, 'Plate number cannot exceed 10 characters']
        },
        model: {
            type: String,
            maxlength: [50, 'Vehicle model cannot exceed 50 characters']
        },
        year: {
            type: Number,
            min: [1990, 'Vehicle year must be 1990 or later'],
            max: [new Date().getFullYear() + 1, 'Vehicle year cannot be in the future']
        },
        capacity: {
            type: Number,
            min: [100, 'Vehicle capacity must be at least 100 kg'],
            max: [50000, 'Vehicle capacity cannot exceed 50,000 kg']
        }
    },
    certifications: [{
        name: {
            type: String,
            required: true,
            maxlength: [100, 'Certification name cannot exceed 100 characters']
        },
        issuer: {
            type: String,
            maxlength: [100, 'Issuer name cannot exceed 100 characters']
        },
        issueDate: {
            type: Date,
            required: true
        },
        expiryDate: {
            type: Date,
            required: true,
            validate: {
                validator: function(v) {
                    return v > this.issueDate;
                },
                message: 'Expiry date must be after issue date'
            }
        },
        certificateNumber: {
            type: String,
            maxlength: [50, 'Certificate number cannot exceed 50 characters']
        }
    }],
    emergencyContact: {
        name: {
            type: String,
            maxlength: [100, 'Emergency contact name cannot exceed 100 characters']
        },
        phone: {
            type: String,
            validate: {
                validator: function(v) {
                    return !v || /^\+?[\d\s\-\(\)]{10,20}$/.test(v);
                },
                message: 'Please provide a valid phone number'
            }
        },
        relationship: {
            type: String,
            maxlength: [50, 'Relationship cannot exceed 50 characters']
        }
    },
    isVerified: {
        type: Boolean,
        default: false,
        index: true
    },
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    verificationDate: {
        type: Date
    },
    verificationNotes: {
        type: String,
        maxlength: [500, 'Verification notes cannot exceed 500 characters']
    },
    isActive: {
        type: Boolean,
        default: false, // Will be activated after verification
        index: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes for performance
driverSchema.index({ user: 1 });
driverSchema.index({ medicalCompany: 1 });
driverSchema.index({ isVerified: 1, isActive: 1 });
driverSchema.index({ licenseNumber: 1 });
driverSchema.index({ 'vehicleInfo.plateNumber': 1 });

// Pre-save middleware
driverSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Instance method to check if license is expiring soon
driverSchema.methods.isLicenseExpiringSoon = function() {
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
    return this.licenseExpiry <= oneMonthFromNow;
};

// Instance method to get expired certifications
driverSchema.methods.getExpiredCertifications = function() {
    const now = new Date();
    return this.certifications.filter(cert => cert.expiryDate <= now);
};

// Static method to get pending verifications
driverSchema.statics.getPendingVerifications = function() {
    return this.find({ isVerified: false })
        .populate('user', 'username email createdAt')
        .populate('medicalCompany', 'name licenseNumber contactInfo')
        .sort({ createdAt: -1 });
};

// Static method to get active drivers
driverSchema.statics.getActiveDrivers = function() {
    return this.find({ isVerified: true, isActive: true })
        .populate('user', 'username email lastLogin')
        .populate('medicalCompany', 'name licenseNumber')
        .populate('verifiedBy', 'username');
};

const Driver = mongoose.model('Driver', driverSchema);

module.exports = Driver;