const IncinerationPlant = require('../models/IncinerationPlant');
const MedicalCompany = require('../models/MedicalCompany');
const AppError = require('../utils/appError');
const { asyncHandler } = require('../utils/asyncHandler');

const getIncinerationPlants = asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.active === 'true') filter.active = true;
    if (req.query.active === 'false') filter.active = false;

    let plants;
    if (req.query.companyId) {
        const company = await MedicalCompany.findById(req.query.companyId)
            .select('allowedIncinerationPlants defaultIncinerationPlant')
            .populate('allowedIncinerationPlants');

        if (!company) {
            return next(new AppError('Medical company not found', 404));
        }

        const allowedIds = company.allowedIncinerationPlants.map((plant) => String(plant._id || plant));
        if (company.defaultIncinerationPlant) {
            allowedIds.push(String(company.defaultIncinerationPlant));
        }

        plants = await IncinerationPlant.find({
            ...filter,
            _id: { $in: Array.from(new Set(allowedIds)) }
        }).sort({ createdAt: -1 });
    } else {
        plants = await IncinerationPlant.find(filter).sort({ createdAt: -1 });
    }

    res.status(200).json({
        status: 'success',
        results: plants.length,
        data: { plants }
    });
});

const getIncinerationPlant = asyncHandler(async (req, res, next) => {
    const plant = await IncinerationPlant.findById(req.params.id);
    if (!plant) {
        return next(new AppError('Incineration plant not found', 404));
    }

    res.status(200).json({
        status: 'success',
        data: { plant }
    });
});

const createIncinerationPlant = asyncHandler(async (req, res) => {
    const plant = await IncinerationPlant.create(req.body);

    res.status(201).json({
        status: 'success',
        data: { plant }
    });
});

const updateIncinerationPlant = asyncHandler(async (req, res, next) => {
    const plant = await IncinerationPlant.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    );

    if (!plant) {
        return next(new AppError('Incineration plant not found', 404));
    }

    res.status(200).json({
        status: 'success',
        data: { plant }
    });
});

const deleteIncinerationPlant = asyncHandler(async (req, res, next) => {
    const plant = await IncinerationPlant.findByIdAndDelete(req.params.id);

    if (!plant) {
        return next(new AppError('Incineration plant not found', 404));
    }

    res.status(204).json({
        status: 'success',
        data: null
    });
});

module.exports = {
    getIncinerationPlants,
    getIncinerationPlant,
    createIncinerationPlant,
    updateIncinerationPlant,
    deleteIncinerationPlant
};
