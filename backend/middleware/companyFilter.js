// middleware/companyFilter.js
// NEW MIDDLEWARE FOR MULTI-TENANT FILTERING

const { AppError } = require('../utils/appError');

/**
 * Middleware to filter queries by company for supervisors and drivers
 * Admin can see everything
 */
const filterByCompany = (model) => {
    return async (req, res, next) => {
        const user = req.user;

        // Admin sees everything - no filtering
        if (user.role === 'admin') {
            return next();
        }

        // Supervisor and Driver - filter by their company
        if (user.role === 'supervisor' || user.role === 'driver') {
            if (!user.company) {
                return next(new AppError('User is not assigned to a company', 403));
            }

            // Add company filter to query
            // This will be used in controller queries
            req.companyFilter = { company: user.company };
            req.userCompany = user.company;
        }

        next();
    };
};

/**
 * Middleware to check if user can access a resource based on company
 */
const checkCompanyAccess = (resourceCompanyField = 'company') => {
    return async (req, res, next) => {
        const user = req.user;

        // Admin can access everything
        if (user.role === 'admin') {
            return next();
        }

        // Get resource company from request body or params
        const resourceCompany = req.body[resourceCompanyField] ||
            req.params[resourceCompanyField] ||
            req.query[resourceCompanyField];

        // If no company specified in resource, use user's company
        if (!resourceCompany) {
            if (user.role === 'supervisor' || user.role === 'driver') {
                req.body[resourceCompanyField] = user.company;
            }
            return next();
        }

        // Check if user's company matches resource company
        if (user.role === 'supervisor' || user.role === 'driver') {
            if (!user.company) {
                return next(new AppError('User is not assigned to a company', 403));
            }

            if (resourceCompany.toString() !== user.company.toString()) {
                return next(new AppError('You do not have access to this resource', 403));
            }
        }

        next();
    };
};

/**
 * Middleware to ensure resource belongs to user's company
 */
const ensureCompanyOwnership = (Model, resourceIdParam = 'id') => {
    return async (req, res, next) => {
        const user = req.user;

        // Admin can access everything
        if (user.role === 'admin') {
            return next();
        }

        const resourceId = req.params[resourceIdParam];

        if (!resourceId) {
            return next(new AppError('Resource ID is required', 400));
        }

        // Find the resource
        const resource = await Model.findById(resourceId);

        if (!resource) {
            return next(new AppError('Resource not found', 404));
        }

        // Check if resource belongs to user's company
        if (user.role === 'supervisor' || user.role === 'driver') {
            if (!user.company) {
                return next(new AppError('User is not assigned to a company', 403));
            }

            if (!resource.company || resource.company.toString() !== user.company.toString()) {
                return next(new AppError('You do not have access to this resource', 403));
            }
        }

        // Attach resource to request for use in controller
        req.resource = resource;

        next();
    };
};

/**
 * Add company filter to MongoDB query object
 */
const addCompanyToQuery = (query, user) => {
    if (user.role === 'admin') {
        return query;
    }

    if (user.role === 'supervisor' || user.role === 'driver') {
        if (user.company) {
            query.company = user.company;
        }
    }

    return query;
};

module.exports = {
    filterByCompany,
    checkCompanyAccess,
    ensureCompanyOwnership,
    addCompanyToQuery
};