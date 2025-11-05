// controllers/companyController.js
const mongoose = require('mongoose');
const MedicalCompany = require('../models/MedicalCompany');
const User = require('../models/User');
const WasteBin = require('../models/WasteBin');
const AppError = require('../utils/appError');
const { asyncHandler } = require('../utils/asyncHandler');

/**
 * Get all companies (admin only)
 */
const getAllCompanies = asyncHandler(async (req, res) => {
    const companies = await MedicalCompany.find()
        .select('name licenseNumber address contactInfo isActive certificationExpiry wasteTypes')
        .sort({ name: 1 });

    res.status(200).json({
        status: 'success',
        results: companies.length,
        data: {
            companies
        }
    });
});

/**
 * Get active companies (for dropdowns)
 */
const getActiveCompanies = asyncHandler(async (req, res) => {
    const companies = await MedicalCompany.getActiveCompanies();

    res.status(200).json({
        status: 'success',
        results: companies.length,
        data: {
            companies
        }
    });
});

/**
 * Get single company
 */
const getCompany = asyncHandler(async (req, res, next) => {
    const company = await MedicalCompany.findById(req.params.id);

    if (!company) {
        return next(new AppError('Company not found', 404));
    }

    res.status(200).json({
        status: 'success',
        data: {
            company
        }
    });
});

/**
 * Create new company (admin only)
 */
const createCompany = asyncHandler(async (req, res) => {
    const company = await MedicalCompany.create(req.body);

    res.status(201).json({
        status: 'success',
        data: {
            company
        }
    });
});

/**
 * Update company (admin only)
 */
const updateCompany = asyncHandler(async (req, res, next) => {
    const company = await MedicalCompany.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
            new: true,
            runValidators: true
        }
    );

    if (!company) {
        return next(new AppError('Company not found', 404));
    }

    res.status(200).json({
        status: 'success',
        data: {
            company
        }
    });
});

/**
 * Delete company (admin only)
 */
const deleteCompany = asyncHandler(async (req, res, next) => {
    const company = await MedicalCompany.findById(req.params.id);

    if (!company) {
        return next(new AppError('Company not found', 404));
    }

    // Check if company has users
    const usersCount = await User.countDocuments({ company: req.params.id });
    if (usersCount > 0) {
        return next(new AppError('Cannot delete company with existing users', 400));
    }

    // Check if company has bins
    const binsCount = await WasteBin.countDocuments({ company: req.params.id });
    if (binsCount > 0) {
        return next(new AppError('Cannot delete company with existing bins', 400));
    }

    await company.deleteOne();

    res.status(204).json({
        status: 'success',
        data: null
    });
});

/**
 * Get company statistics
 */
const getCompanyStats = asyncHandler(async (req, res, next) => {
    const companyId = req.params.id;

    const company = await MedicalCompany.findById(companyId);
    if (!company) {
        return next(new AppError('Company not found', 404));
    }

    // Get statistics
    const [usersCount, binsCount, driverCount] = await Promise.all([
        User.countDocuments({ company: companyId }),
        WasteBin.countDocuments({ company: companyId }),
        User.countDocuments({ company: companyId, role: 'driver', verificationStatus: 'approved' })
    ]);

    // Get bin statistics
    const binStats = await WasteBin.aggregate([
        { $match: { company: new mongoose.Types.ObjectId(companyId) } },
        {
            $group: {
                _id: null,
                totalBins: { $sum: 1 },
                avgFullness: { $avg: '$fullness' },
                fullBins: {
                    $sum: { $cond: [{ $gte: ['$fullness', '$alertThreshold'] }, 1, 0] }
                }
            }
        }
    ]);

    res.status(200).json({
        status: 'success',
        data: {
            company,
            statistics: {
                users: usersCount,
                bins: binsCount,
                drivers: driverCount,
                binStats: binStats[0] || { totalBins: 0, avgFullness: 0, fullBins: 0 }
            }
        }
    });
});

/**
 * Assign bins to company (admin only)
 */
const assignBinsToCompany = asyncHandler(async (req, res, next) => {
    const { companyId, binIds } = req.body;

    if (!companyId || !binIds || !Array.isArray(binIds)) {
        return next(new AppError('Company ID and bin IDs are required', 400));
    }

    const company = await MedicalCompany.findById(companyId);
    if (!company) {
        return next(new AppError('Company not found', 404));
    }

    // Update bins
    const result = await WasteBin.updateMany(
        { binId: { $in: binIds } },
        { company: companyId }
    );

    res.status(200).json({
        status: 'success',
        message: `${result.modifiedCount} bins assigned to ${company.name}`,
        data: {
            modifiedCount: result.modifiedCount
        }
    });
});

module.exports = {
    getAllCompanies,
    getActiveCompanies,
    getCompany,
    createCompany,
    updateCompany,
    deleteCompany,
    getCompanyStats,
    assignBinsToCompany
};