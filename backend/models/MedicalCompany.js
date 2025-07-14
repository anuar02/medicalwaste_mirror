const mongoose = require('mongoose');
const validator = require('validator');

const medicalCompanySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Company name is required'],
        unique: true,
        trim: true,
        maxlength: [100, 'Company name cannot exceed 100 characters']
    },
    licenseNumber: {
        type: String,
        required: [true, 'License number is required'],
        unique: true,
        trim: true,
        maxlength: [30, 'License number cannot exceed 30 characters']
    },
    address: {
        street: {
            type: String,
            maxlength: [200, 'Street address cannot exceed 200 characters']
        },
        city: {
            type: String,
            maxlength: [50, 'City name cannot exceed 50 characters']
        },
        region: {
            type: String,
            maxlength: [50, 'Region name cannot exceed 50 characters']
        },
        postalCode: {
            type: String,
            maxlength: [20, 'Postal code cannot exceed 20 characters']
        }
    },
    contactInfo: {
        phone: {
            type: String,
            validate: {
                validator: function(v) {
                    return !v || /^\+?[\d\s\-\(\)]{10,20}$/.test(v);
                },
                message: 'Please provide a valid phone number'
            }
        },
        email: {
            type: String,
            required: [true, 'Company email is required'],
            lowercase: true,
            validate: [validator.isEmail, 'Please provide a valid email']
        },
        website: {
            type: String,
            validate: {
                validator: function(v) {
                    return !v || validator.isURL(v);
                },
                message: 'Please provide a valid website URL'
            }
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    certificationExpiry: {
        type: Date,
        required: [true, 'Certification expiry date is required'],
        validate: {
            validator: function(v) {
                return v > new Date();
            },
            message: 'Certification expiry date must be in the future'
        }
    },
    wasteTypes: [{
        type: String,
        enum: {
            values: ['infectious', 'pathological', 'pharmaceutical', 'sharps', 'chemical'],
            message: 'Invalid waste type'
        }
    }],
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
medicalCompanySchema.index({ isActive: 1 });
medicalCompanySchema.index({ certificationExpiry: 1 });
medicalCompanySchema.index({ name: 'text', licenseNumber: 'text' });

// Pre-save middleware
medicalCompanySchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Instance method to check if certification is expiring soon
medicalCompanySchema.methods.isExpiringWarningSoon = function() {
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    return this.certificationExpiry <= threeMonthsFromNow;
};

// Static method to get active companies
medicalCompanySchema.statics.getActiveCompanies = function() {
    return this.find({
        isActive: true,
        certificationExpiry: { $gte: new Date() }
    }).select('name licenseNumber address contactInfo wasteTypes');
};

const MedicalCompany = mongoose.model('MedicalCompany', medicalCompanySchema);

module.exports = MedicalCompany;