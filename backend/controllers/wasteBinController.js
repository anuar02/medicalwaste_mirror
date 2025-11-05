// controllers/wasteBinController.js
const WasteBin = require('../models/WasteBin');
const History = require('../models/History');
const User = require('../models/User');
const AppError = require('../utils/appError');
const { asyncHandler } = require('../utils/asyncHandler');
const { sendAlertNotification } = require('../utils/telegram');
const { logger } = require('../middleware/loggers');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { addCompanyToQuery } = require('../middleware/companyFilter');
/**
 * Get all waste bins with optional filtering
 */
const getAllBins = asyncHandler(async (req, res) => {
    // Build filter object from query params
    const filter = {};

    if (req.query.department) {
        filter.department = req.query.department;
    }

    if (req.query.wasteType) {
        filter.wasteType = req.query.wasteType;
    }

    if (req.query.status) {
        filter.status = req.query.status;
    }

    // Additional filtering options
    if (req.query.fullnessMin) {
        filter.fullness = { $gte: parseInt(req.query.fullnessMin) };
    }

    if (req.query.fullnessMax) {
        if (filter.fullness) {
            filter.fullness.$lte = parseInt(req.query.fullnessMax);
        } else {
            filter.fullness = { $lte: parseInt(req.query.fullnessMax) };
        }
    }

    let query = { ...filter };  // Merge with existing filter
    query = addCompanyToQuery(query, req.user);

    // Send response
    res.status(200).json({
        status: 'success',
        results: bins.length,
        data: { bins }
    });
});

/**
 * Bulk update multiple bins
 */
const bulkUpdateBins = asyncHandler(async (req, res, next) => {
    const { binIds, updates } = req.body;

    if (!binIds || !Array.isArray(binIds) || binIds.length === 0) {
        return next(new AppError('Please provide valid bin IDs array', 400));
    }

    try {
        const updateResult = await WasteBin.updateMany(
            { binId: { $in: binIds } },
            { $set: updates }
        );

        res.status(200).json({
            status: 'success',
            message: `Updated ${updateResult.modifiedCount} bins`,
            data: {
                matched: updateResult.matchedCount,
                modified: updateResult.modifiedCount
            }
        });
    } catch (error) {
        return next(new AppError('Failed to update bins', 500));
    }
});

/**
 * Export bin data in various formats
 */
const exportBinData = asyncHandler(async (req, res, next) => {
    const { format } = req.params;
    const { startDate, endDate, departments } = req.query;

    // Build filter
    const filter = {};
    if (startDate && endDate) {
        filter.lastUpdate = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    }
    if (departments) {
        filter.department = { $in: departments.split(',') };
    }

    const bins = await WasteBin.find(filter);

    if (bins.length === 0) {
        return res.status(404).json({
            status: 'error',
            message: 'No data found for the specified criteria'
        });
    }

    // Prepare data for export
    const exportData = bins.map(bin => ({
        BinID: bin.binId,
        Department: bin.department,
        WasteType: bin.wasteType,
        Fullness: `${bin.fullness}%`,
        Capacity: `${bin.capacity}L`,
        Weight: `${bin.weight}kg`,
        Temperature: `${bin.temperature}°C`,
        Status: bin.status,
        AlertThreshold: `${bin.alertThreshold}%`,
        LastCollection: bin.lastCollection ? new Date(bin.lastCollection).toLocaleDateString() : 'Never',
        LastUpdate: new Date(bin.lastUpdate).toLocaleString()
    }));

    if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=waste_bins_report.csv');

        // Add BOM for proper UTF-8 encoding (important for Cyrillic text)
        const BOM = '\uFEFF';
        const headers = Object.keys(exportData[0]);
        const csvString = BOM + [
            headers.join(','),
            ...exportData.map(row =>
                headers.map(header => {
                    const value = row[header];
                    // Escape commas and quotes in CSV
                    return typeof value === 'string' && (value.includes(',') || value.includes('"'))
                        ? `"${value.replace(/"/g, '""')}"`
                        : value;
                }).join(',')
            )
        ].join('\n');

        return res.send(csvString);
    }

    if (format === 'xlsx') {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Waste Bins Report');

        // Add headers
        const headers = Object.keys(exportData[0]);
        worksheet.addRow(headers);

        // Style headers
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        // Add data
        exportData.forEach(row => {
            worksheet.addRow(Object.values(row));
        });

        // Auto-fit columns
        worksheet.columns.forEach(column => {
            column.width = Math.max(column.header?.length || 10, 15);
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=waste_bins_report.xlsx');

        return workbook.xlsx.write(res).then(() => {
            res.end();
        });
    }

    if (format === 'pdf') {
        // Transliteration function for Cyrillic text
        const transliterate = (text) => {
            const map = {
                'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'E', 'Ж': 'Zh',
                'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N', 'О': 'O',
                'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts',
                'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sch', 'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya',
                'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e', 'ж': 'zh',
                'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
                'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts',
                'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
            };
            return text.replace(/[А-Яа-яЁё]/g, char => map[char] || char);
        };

        // Prepare data with transliterated Cyrillic text
        const pdfData = exportData.map(row => ({
            ...row,
            Department: transliterate(row.Department || ''),
            WasteType: transliterate(row.WasteType || '')
        }));

        const doc = new PDFDocument({ margin: 50, size: 'A4', layout: 'landscape' });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=waste_bins_report.pdf');

        // Pipe PDF to response
        doc.pipe(res);

        // Title
        doc.fontSize(20)
            .text('Waste Bins Report', 50, 50);

        // Report details
        doc.fontSize(10)
            .text(`Generated: ${new Date().toLocaleString()}`, 50, 80)
            .text(`Total Bins: ${bins.length}`, 50, 95);

        if (startDate && endDate) {
            doc.text(`Date Range: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`, 50, 110);
        }

        if (departments) {
            doc.text(`Departments: ${departments}`, 50, 125);
        }

        // Table setup
        const tableTop = 150;
        const tableLeft = 50;
        let currentY = tableTop;

        // Table headers
        const headers = ['Bin ID', 'Department', 'Waste Type', 'Fullness', 'Status', 'Last Update'];
        const columnWidths = [80, 120, 120, 60, 60, 120];
        let currentX = tableLeft;

        // Draw header row
        doc.fontSize(9);

        headers.forEach((header, index) => {
            doc.rect(currentX, currentY, columnWidths[index], 20)
                .fillAndStroke('#f0f0f0', '#000000')
                .fillColor('#000000')
                .text(header, currentX + 5, currentY + 6, {
                    width: columnWidths[index] - 10,
                    align: 'center'
                });
            currentX += columnWidths[index];
        });

        currentY += 20;

        // Draw data rows
        doc.fontSize(8);

        pdfData.forEach((row, rowIndex) => {
            if (currentY > 500) { // New page if needed
                doc.addPage({ layout: 'landscape' });
                currentY = 50;
            }

            currentX = tableLeft;
            const rowData = [
                row.BinID,
                row.Department,
                row.WasteType,
                row.Fullness,
                row.Status,
                row.LastUpdate
            ];

            rowData.forEach((data, colIndex) => {
                const bgColor = rowIndex % 2 === 0 ? '#ffffff' : '#f9f9f9';
                doc.rect(currentX, currentY, columnWidths[colIndex], 18)
                    .fillAndStroke(bgColor, '#cccccc')
                    .fillColor('#000000')
                    .text(String(data), currentX + 3, currentY + 4, {
                        width: columnWidths[colIndex] - 6,
                        height: 10,
                        ellipsis: true
                    });
                currentX += columnWidths[colIndex];
            });

            currentY += 18;
        });

        // Finalize PDF
        doc.end();
        return;
    }

    // If format is not supported
    res.status(400).json({
        status: 'error',
        message: 'Unsupported format. Use csv, xlsx, or pdf.'
    });
});

/**
 * Get bin analytics
 */
const getBinAnalytics = asyncHandler(async (req, res) => {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    // Get analytics data
    const analytics = await History.aggregate([
        ...(Object.keys(dateFilter).length > 0 ? [{ $match: { timestamp: dateFilter } }] : []),
        {
            $group: {
                _id: {
                    $dateToString: {
                        format: groupBy === 'hour' ? '%Y-%m-%d %H:00' : '%Y-%m-%d',
                        date: '$timestamp'
                    }
                },
                avgFullness: { $avg: '$fullness' },
                maxFullness: { $max: '$fullness' },
                minFullness: { $min: '$fullness' },
                dataPoints: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
        status: 'success',
        data: { analytics }
    });
});

/**
 * Predict maintenance needs
 */
const predictMaintenance = asyncHandler(async (req, res, next) => {
    const bin = await WasteBin.findOne({ binId: req.params.id });

    if (!bin) {
        return next(new AppError('No waste bin found with that ID', 404));
    }

    // Simple prediction based on current fullness and historical data
    const recentHistory = await History.find({ binId: req.params.id })
        .sort({ timestamp: -1 })
        .limit(10);

    let prediction = {
        maintenanceNeeded: false,
        priority: 'low',
        estimatedDays: null,
        reasons: []
    };

    // Check if maintenance is due based on fullness
    if (bin.fullness >= bin.alertThreshold) {
        prediction.maintenanceNeeded = true;
        prediction.priority = 'high';
        prediction.reasons.push('Bin is at or above alert threshold');
    }

    // Check for rapid filling trend
    if (recentHistory.length >= 5) {
        const avgIncrease = recentHistory.slice(0, 5).reduce((sum, h, i) => {
            if (i === 0) return 0;
            return sum + (recentHistory[i-1].fullness - h.fullness);
        }, 0) / 4;

        if (avgIncrease > 5) {
            prediction.maintenanceNeeded = true;
            prediction.priority = 'medium';
            prediction.reasons.push('Rapid filling trend detected');
        }
    }

    res.status(200).json({
        status: 'success',
        data: { prediction }
    });
});

/**
 * Get bin alerts
 */
const getBinAlerts = asyncHandler(async (req, res, next) => {
    const bin = await WasteBin.findOne({ binId: req.params.id });

    if (!bin) {
        return next(new AppError('No waste bin found with that ID', 404));
    }

    // Generate alerts based on current bin status
    const alerts = [];

    if (bin.fullness >= bin.alertThreshold) {
        alerts.push({
            id: `alert-${bin.binId}-fullness`,
            type: 'overfull',
            priority: bin.fullness >= 95 ? 'critical' : 'high',
            message: `Bin is ${bin.fullness}% full`,
            timestamp: new Date(),
            status: 'active'
        });
    }

    if (bin.status === 'maintenance') {
        alerts.push({
            id: `alert-${bin.binId}-maintenance`,
            type: 'maintenance_due',
            priority: 'medium',
            message: 'Maintenance required',
            timestamp: new Date(),
            status: 'active'
        });
    }

    res.status(200).json({
        status: 'success',
        data: { alerts }
    });
});

/**
 * Dismiss an alert
 */
const dismissAlert = asyncHandler(async (req, res) => {
    const { alertId } = req.params;

    // In a real implementation, you'd update an alerts collection
    // For now, just return success
    res.status(200).json({
        status: 'success',
        message: 'Alert dismissed successfully',
        data: { alertId }
    });
});

/**
 * Schedule collection for a bin
 */
const scheduleCollection = asyncHandler(async (req, res, next) => {
    const { scheduledFor, priority, notes } = req.body;

    const bin = await WasteBin.findOne({ binId: req.params.id });

    if (!bin) {
        return next(new AppError('No waste bin found with that ID', 404));
    }

    // Update bin with collection schedule
    bin.nextCollection = new Date(scheduledFor);
    bin.collectionNotes = notes;
    await bin.save();

    res.status(200).json({
        status: 'success',
        message: 'Collection scheduled successfully',
        data: {
            binId: bin.binId,
            scheduledFor: bin.nextCollection,
            priority,
            notes
        }
    });
});

/**
 * Get collection routes
 */
const getCollectionRoutes = asyncHandler(async (req, res) => {
    const { date, optimize } = req.query;

    const targetDate = date ? new Date(date) : new Date();

    // Find bins scheduled for collection or overfull
    const bins = await WasteBin.find({
        $or: [
            { nextCollection: { $lte: targetDate } },
            { $expr: { $gte: ['$fullness', '$alertThreshold'] } }
        ]
    });

    const routes = [{
        id: 'route-1',
        date: targetDate,
        bins: bins.map(bin => ({
            binId: bin.binId,
            department: bin.department,
            location: bin.location,
            priority: bin.fullness >= 95 ? 'critical' : 'normal'
        })),
        estimatedTime: bins.length * 10, // 10 minutes per bin
        distance: bins.length * 0.5 // 0.5 km per bin
    }];

    res.status(200).json({
        status: 'success',
        data: { routes }
    });
});

/**
 * Optimize collection routes
 */
const optimizeRoutes = asyncHandler(async (req, res) => {
    const { date, vehicleCapacity, maxDistance } = req.body;

    // Simple optimization - group by department
    const bins = await WasteBin.find({
        $expr: { $gte: ['$fullness', '$alertThreshold'] }
    });

    const optimizedRoutes = bins.reduce((routes, bin) => {
        const existingRoute = routes.find(r => r.department === bin.department);
        if (existingRoute) {
            existingRoute.bins.push(bin);
        } else {
            routes.push({
                department: bin.department,
                bins: [bin],
                estimatedTime: 30,
                distance: 2
            });
        }
        return routes;
    }, []);

    res.status(200).json({
        status: 'success',
        data: { optimizedRoutes }
    });
});

/**
 * Get bin metrics
 */
const getBinMetrics = asyncHandler(async (req, res) => {
    const metrics = await WasteBin.aggregate([
        {
            $group: {
                _id: null,
                totalBins: { $sum: 1 },
                activeBins: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
                avgFullness: { $avg: '$fullness' },
                alertBins: { $sum: { $cond: [{ $gte: ['$fullness', '$alertThreshold'] }, 1, 0] } }
            }
        }
    ]);

    res.status(200).json({
        status: 'success',
        data: { metrics: metrics[0] || {} }
    });
});

/**
 * Set collecting mode for a bin
 */
const setCollectingMode = asyncHandler(async (req, res, next) => {
    const { isCollecting } = req.body;

    const bin = await WasteBin.findOne({ binId: req.params.id });

    if (!bin) {
        return next(new AppError('No waste bin found with that ID', 404));
    }

    bin.isCollecting = isCollecting;
    bin.collectionStarted = isCollecting ? new Date() : null;
    await bin.save();

    res.status(200).json({
        status: 'success',
        message: `Collecting mode ${isCollecting ? 'enabled' : 'disabled'}`,
        data: { bin }
    });
});

/**
 * Send device command
 */
const sendDeviceCommand = asyncHandler(async (req, res) => {
    const { deviceId, command, params, priority } = req.body;

    // In a real implementation, you'd queue this command for the device
    res.status(200).json({
        status: 'success',
        message: 'Command sent to device',
        data: {
            commandId: `cmd-${Date.now()}`,
            deviceId,
            command,
            params,
            priority,
            status: 'pending'
        }
    });
});

/**
 * Get device commands
 */
const getDeviceCommands = asyncHandler(async (req, res) => {
    const { deviceId } = req.params;

    // Return empty commands array for now
    res.status(200).json({
        status: 'success',
        data: { commands: [] }
    });
});

/**
 * Mark command as executed
 */
const markCommandExecuted = asyncHandler(async (req, res) => {
    const { commandId } = req.params;

    res.status(200).json({
        status: 'success',
        message: 'Command marked as executed',
        data: { commandId }
    });
});

/**
 * Get a specific waste bin by ID
 */
const getBin = asyncHandler(async (req, res, next) => {
    let query = { binId: req.params.id };
    query = addCompanyToQuery(query, req.user);

    const bin = await WasteBin.findOne(query).populate('company', 'name');

    if (!bin) {
        return next(new AppError('No waste bin found with that ID', 404));
    }

    // Ensure containerHeight exists (for backward compatibility)
    if (!bin.containerHeight) {
        bin.containerHeight = 50; // Default value
        await bin.save();
    }

    // Convert to JSON to include virtual fields (like calculated fullness)
    const binData = bin.toJSON();

    // Log for debugging
    console.log('Bin data:', {
        binId: binData.binId,
        distance: binData.distance,
        containerHeight: binData.containerHeight,
        calculatedFullness: binData.fullness
    });

    res.status(200).json({
        status: 'success',
        data: { bin: binData }
    });
});

/**
 * Create a new waste bin
 */
const createBin = asyncHandler(async (req, res, next) => {
    const {
        binId,
        department,
        wasteType,
        capacity,
        alertThreshold,
        latitude,
        longitude,
        floor,
        room,
        company
    } = req.body;

    // Check if bin with ID already exists
    const existingBin = await WasteBin.findOne({ binId });
    if (existingBin) {
        return next(new AppError('A waste bin with this ID already exists', 400));
    }

    // Determine which company to assign the bin to
    let binCompany = company; // Use company from request if provided

    // If no company provided and user is supervisor, use their company
    if (!binCompany && req.user.role === 'supervisor') {
        binCompany = req.user.company;
    }

    // If still no company and user is driver, use their company
    if (!binCompany && req.user.role === 'driver') {
        binCompany = req.user.company;
    }

    // Create location object
    const location = {
        coordinates: [longitude || 0, latitude || 0]
    };

    if (floor) location.floor = floor;
    if (room) location.room = room;

    // Create bin
    const bin = await WasteBin.create({
        binId,
        company: binCompany,  // Assign company (can be null for admin)
        department,
        wasteType,
        capacity: capacity || 50,
        alertThreshold: alertThreshold || 80,
        location,
        lastCollection: new Date(),
        lastUpdate: new Date()
    });

    // Create initial history entry
    await History.create({
        binId,
        fullness: 0,
        time: new Date().toLocaleTimeString(),
        timestamp: new Date()
    });

    res.status(201).json({
        status: 'success',
        data: { bin }
    });
});

/**
 * Update a waste bin
 */
const updateBin = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const updateData = req.body;

    // Find the bin first
    let query = { binId: id };
    query = addCompanyToQuery(query, req.user);
    let bin = await WasteBin.findOne(query);

    if (!bin) {
        return next(new AppError('No waste bin found with that ID', 404));
    }

    // Check if containerHeight is being updated
    const isContainerHeightChanging = updateData.containerHeight !== undefined &&
        updateData.containerHeight !== bin.containerHeight;

    // List of allowed fields to update
    const allowedFields = [
        'department',
        'wasteType',
        'status',
        'alertThreshold',
        'capacity',
        'containerHeight'
    ];

    // Filter update data to only include allowed fields
    const filteredData = {};
    allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
            filteredData[field] = updateData[field];
        }
    });

    // Validate containerHeight if provided
    if (filteredData.containerHeight !== undefined) {
        const height = parseInt(filteredData.containerHeight);
        if (isNaN(height) || height < 10 || height > 200) {
            return next(new AppError('Container height must be between 10 and 200 cm', 400));
        }
        filteredData.containerHeight = height;
    }

    // Validate alertThreshold if provided
    if (filteredData.alertThreshold !== undefined) {
        const threshold = parseInt(filteredData.alertThreshold);
        if (isNaN(threshold) || threshold < 50 || threshold > 95) {
            return next(new AppError('Alert threshold must be between 50 and 95 percent', 400));
        }
        filteredData.alertThreshold = threshold;
    }

    // Update the bin
    const updatedBin = await WasteBin.findOneAndUpdate(
        { binId: id },
        {
            ...filteredData,
            lastUpdate: new Date()
        },
        {
            new: true,           // Return updated document
            runValidators: true  // Run schema validators
        }
    );

    // If containerHeight changed, optionally update recent history records
    if (isContainerHeightChanging) {
        try {
            // Update recent history records (last 24 hours) with new container height
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

            const recentHistory = await History.find({
                binId: id,
                timestamp: { $gte: oneDayAgo }
            });

            if (recentHistory.length > 0) {
                const bulkUpdates = recentHistory.map(record => {
                    const newFullness = Math.max(0, Math.min(100,
                        Math.round(((updatedBin.containerHeight - record.distance) / updatedBin.containerHeight) * 100)
                    ));

                    return {
                        updateOne: {
                            filter: { _id: record._id },
                            update: {
                                containerHeight: updatedBin.containerHeight,
                                fullness: newFullness
                            }
                        }
                    };
                });

                await History.bulkWrite(bulkUpdates);
                console.log(`Updated ${bulkUpdates.length} recent history records for bin ${id}`);
            }
        } catch (historyUpdateError) {
            console.error('Failed to update history records:', historyUpdateError);
            // Don't fail the main operation
        }
    }

    // Convert to JSON to ensure virtual fields are included
    const binData = updatedBin.toJSON();

    // Log the update for debugging
    console.log('Bin update:', {
        binId: binData.binId,
        updatedFields: Object.keys(filteredData),
        containerHeight: binData.containerHeight,
        distance: binData.distance,
        calculatedFullness: binData.fullness
    });

    res.status(200).json({
        status: 'success',
        data: { bin: binData }
    });
});

/**
 * Delete a waste bin
 */
const deleteBin = asyncHandler(async (req, res, next) => {
    let query = { binId: req.params.id };
    query = addCompanyToQuery(query, req.user);
    const result = await WasteBin.deleteOne(query);

    if (result.deletedCount === 0) {
        return next(new AppError('No waste bin found with that ID', 404));
    }

    // Delete associated history
    await History.deleteMany({ binId: req.params.id });

    res.status(204).json({
        status: 'success',
        data: null
    });
});

/**
 * Get history for a specific bin
 */
const getBinHistory = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const {
        period = '24h',
        interval = 'auto',
        page = 1,
        limit = 100,
        aggregation = 'avg'
    } = req.query;

    // Validate bin exists
    const bin = await WasteBin.findOne({ binId: id });
    if (!bin) {
        return next(new AppError('Waste bin not found', 404));
    }

    let startDate = new Date();
    let endDate = new Date();
    let timeFrame = 'hour';
    let shouldAggregate = true;
    let groupFormat;

    // Calculate date range and determine aggregation strategy based on period
    switch (period) {
        case '1h':
            startDate = new Date(Date.now() - 60 * 60 * 1000);
            shouldAggregate = false; // Return raw data for 1h
            timeFrame = 'raw';
            break;
        case '6h':
            startDate = new Date(Date.now() - 6 * 60 * 60 * 1000);
            timeFrame = '15min'; // 15-minute intervals for 6h
            groupFormat = "%Y-%m-%d %H:%M";
            break;
        case '24h':
            startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
            timeFrame = 'hour';
            groupFormat = "%Y-%m-%d %H:00";
            break;
        case '7d':
            startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            timeFrame = 'hour'; // Still hourly for 7 days
            groupFormat = "%Y-%m-%d %H:00";
            break;
        case '30d':
            startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            timeFrame = 'day';
            groupFormat = "%Y-%m-%d 00:00";
            break;
        default:
            startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
            timeFrame = 'hour';
            groupFormat = "%Y-%m-%d %H:00";
    }

    // Override with custom interval if provided
    if (interval !== 'auto') {
        switch (interval) {
            case '5min':
                timeFrame = '5min';
                groupFormat = "%Y-%m-%d %H:%M";
                shouldAggregate = true;
                break;
            case '15min':
                timeFrame = '15min';
                groupFormat = "%Y-%m-%d %H:%M";
                shouldAggregate = true;
                break;
            case '30min':
                timeFrame = '30min';
                groupFormat = "%Y-%m-%d %H:%M";
                shouldAggregate = true;
                break;
            case '1h':
                timeFrame = 'hour';
                groupFormat = "%Y-%m-%d %H:00";
                shouldAggregate = true;
                break;
            case '6h':
                timeFrame = '6hour';
                groupFormat = "%Y-%m-%d %H:00";
                shouldAggregate = true;
                break;
            case '1d':
                timeFrame = 'day';
                groupFormat = "%Y-%m-%d 00:00";
                shouldAggregate = true;
                break;
        }
    }

    try {
        let historyData;

        if (!shouldAggregate || aggregation === 'raw') {
            // Get raw history data without aggregation
            historyData = await History.find({
                binId: id,
                timestamp: {
                    $gte: startDate,
                    $lte: endDate
                }
            })
                .sort({ timestamp: 1 })
                .limit(parseInt(limit))
                .select('distance containerHeight fullness weight temperature timestamp')
                .lean();

            // Format for consistency with aggregated data
            historyData = historyData.map(item => ({
                _id: item.timestamp.toISOString(),
                fullness: item.fullness || calculateFullness(item.distance, item.containerHeight),
                distance: item.distance,
                weight: item.weight || 0,
                temperature: item.temperature,
                containerHeight: item.containerHeight,
                count: 1,
                firstTimestamp: item.timestamp,
                lastTimestamp: item.timestamp
            }));

        } else {
            // Get aggregated data based on interval
            let pipeline = [
                {
                    $match: {
                        binId: id,
                        timestamp: {
                            $gte: startDate,
                            $lte: endDate
                        }
                    }
                }
            ];

            // Add grouping based on timeFrame
            if (timeFrame === '5min' || timeFrame === '15min' || timeFrame === '30min') {
                const minutes = parseInt(timeFrame);

                pipeline.push({
                    $group: {
                        _id: {
                            $dateToString: {
                                format: "%Y-%m-%d %H:%M",
                                date: {
                                    $dateFromParts: {
                                        year: { $year: "$timestamp" },
                                        month: { $month: "$timestamp" },
                                        day: { $dayOfMonth: "$timestamp" },
                                        hour: { $hour: "$timestamp" },
                                        minute: {
                                            $multiply: [
                                                { $floor: { $divide: [{ $minute: "$timestamp" }, minutes] } },
                                                minutes
                                            ]
                                        }
                                    }
                                }
                            }
                        },
                        fullness: aggregation === 'max' ? { $max: "$fullness" } :
                            aggregation === 'min' ? { $min: "$fullness" } :
                                aggregation === 'last' ? { $last: "$fullness" } :
                                    aggregation === 'first' ? { $first: "$fullness" } :
                                        { $avg: "$fullness" },
                        distance: { $avg: "$distance" },
                        weight: { $avg: "$weight" },
                        temperature: { $avg: "$temperature" },
                        containerHeight: { $avg: "$containerHeight" },
                        count: { $sum: 1 },
                        firstTimestamp: { $min: "$timestamp" },
                        lastTimestamp: { $max: "$timestamp" }
                    }
                });
            } else {
                // Hour or day based aggregation
                pipeline.push({
                    $group: {
                        _id: {
                            $dateToString: {
                                format: groupFormat,
                                date: "$timestamp"
                            }
                        },
                        fullness: aggregation === 'max' ? { $max: "$fullness" } :
                            aggregation === 'min' ? { $min: "$fullness" } :
                                aggregation === 'last' ? { $last: "$fullness" } :
                                    aggregation === 'first' ? { $first: "$fullness" } :
                                        { $avg: "$fullness" },
                        distance: { $avg: "$distance" },
                        weight: { $avg: "$weight" },
                        temperature: { $avg: "$temperature" },
                        containerHeight: { $avg: "$containerHeight" },
                        count: { $sum: 1 },
                        firstTimestamp: { $min: "$timestamp" },
                        lastTimestamp: { $max: "$timestamp" }
                    }
                });
            }

            pipeline.push({ $sort: { _id: 1 } });
            pipeline.push({ $limit: parseInt(limit) });

            historyData = await History.aggregate(pipeline);

            // Round the values for cleaner output
            historyData = historyData.map(item => ({
                _id: item._id,
                fullness: Math.round(item.fullness || 0),
                distance: Math.round(item.distance || 0),
                weight: Math.round(item.weight || 0),
                temperature: item.temperature ? Math.round(item.temperature * 10) / 10 : null,
                containerHeight: Math.round(item.containerHeight || 0),
                count: item.count,
                firstTimestamp: item.firstTimestamp,
                lastTimestamp: item.lastTimestamp
            }));
        }

        res.status(200).json({
            status: 'success',
            results: historyData.length,
            data: {
                binId: id,
                period,
                interval: interval === 'auto' ? timeFrame : interval,
                aggregation: shouldAggregate ? aggregation : 'raw',
                startDate,
                endDate,
                history: historyData
            }
        });

    } catch (error) {
        console.error('History query error:', error);
        return next(new AppError('Failed to retrieve bin history', 500));
    }
});

function calculateFullness(distance, containerHeight) {
    if (!distance || !containerHeight || containerHeight === 0) return 0;
    const fullness = ((containerHeight - distance) / containerHeight) * 100;
    return Math.max(0, Math.min(100, Math.round(fullness)));
}

/**
 * Update waste bin level from sensor data
 */
const updateBinLevel = asyncHandler(async (req, res, next) => {
    const { binId, distance, latitude, longitude, macAddress, weight, temperature } = req.body;

    // Validate required fields
    if (!binId || distance === undefined) {
        logger.warn(`Bin level update failed: Missing required fields. binId: ${binId}, distance: ${distance}`);
        return next(new AppError('binId and distance are required', 400));
    }

    logger.info(`Updating bin level for binId: ${binId}, distance: ${distance}cm`);

    // Find the bin
    let bin = await WasteBin.findOne({ binId });

    if (!bin) {
        logger.error(`Bin level update failed: Bin ${binId} not found`);
        return next(new AppError('Waste bin not found', 404));
    }

    // Ensure containerHeight exists (fallback to 50cm)
    if (!bin.containerHeight) {
        bin.containerHeight = 50;
        logger.warn(`Bin ${binId}: containerHeight was missing, set to default 50cm`);
    }

    // Clamp distance to valid range
    const clampedDistance = Math.max(0, Math.min(bin.containerHeight, distance));

    if (clampedDistance !== distance) {
        logger.warn(`Bin ${binId}: Distance clamped from ${distance}cm to ${clampedDistance}cm (containerHeight: ${bin.containerHeight}cm)`);
    }

    // Update sensor data using the model method
    try {
        await bin.updateWithSensorData({
            distance: clampedDistance,
            weight,
            temperature,
            latitude,
            longitude,
            macAddress
        });

        logger.info(`Bin ${binId}: Sensor data updated successfully. Distance: ${clampedDistance}cm, Weight: ${weight || 'N/A'}kg, Temp: ${temperature || 'N/A'}°C`);
    } catch (updateError) {
        logger.error(`Failed to update sensor data for bin ${binId}: ${updateError.message}`);
        return next(new AppError('Failed to update bin sensor data', 500));
    }

    // Create history record with calculated fullness
    try {
        await History.createRecord({
            binId: bin.binId,
            distance: clampedDistance,
            containerHeight: bin.containerHeight,
            weight: weight || 0,
            temperature: temperature || 22.0
        });

        logger.info(`Bin ${binId}: History record created successfully`);
    } catch (historyError) {
        logger.error(`Failed to create history record for bin ${binId}: ${historyError.message}`);
        // Don't fail the main operation if history fails
    }

    // Calculate current fullness for response
    const calculatedFullness = Math.max(0, Math.min(100,
        Math.round(((bin.containerHeight - clampedDistance) / bin.containerHeight) * 100)
    ));

    logger.info(`Bin ${binId}: Level update completed. Fullness: ${calculatedFullness}%, Container: ${bin.containerHeight}cm, Distance: ${clampedDistance}cm`);

    res.status(200).json({
        status: 'success',
        message: 'Waste level updated successfully',
        data: {
            binId: bin.binId,
            distance: clampedDistance,
            containerHeight: bin.containerHeight,
            fullness: calculatedFullness,
            lastUpdate: bin.lastUpdate
        }
    });
});

/**
 * Get nearby waste bins based on location
 */
const getNearbyBins = asyncHandler(async (req, res) => {
    const { latitude, longitude, maxDistance = 1000 } = req.query; // maxDistance in meters

    if (!latitude || !longitude) {
        return res.status(400).json({
            status: 'fail',
            message: 'Please provide latitude and longitude'
        });
    }

    // Find bins within specified distance
    const bins = await WasteBin.find({
        location: {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates: [parseFloat(longitude), parseFloat(latitude)]
                },
                $maxDistance: parseInt(maxDistance)
            }
        }
    });

    res.status(200).json({
        status: 'success',
        results: bins.length,
        data: { bins }
    });
});

/**
 * Get bins that exceed alert threshold
 */
const getOverfilledBins = asyncHandler(async (req, res) => {
    const bins = await WasteBin.find({
        $expr: { $gte: ['$fullness', '$alertThreshold'] }
    }).sort({ fullness: -1 });

    res.status(200).json({
        status: 'success',
        results: bins.length,
        data: { bins }
    });
});

/**
 * Send manual alert for an overfilled bin
 */
const sendManualAlert = asyncHandler(async (req, res, next) => {
    const { binId } = req.params;

    // Find the bin
    const bin = await WasteBin.findOne({ binId });

    if (!bin) {
        return next(new AppError('No waste bin found with that ID', 404));
    }

    try {
        // Get users from the bin's department for targeted notifications
        const departmentUsers = bin.department
            ? await User.find({ department: bin.department }).select('_id')
            : null;

        const userIds = departmentUsers ? departmentUsers.map(user => user._id) : null;

        // Format bin data for the notification
        const binData = {
            binId: bin.binId,
            department: bin.department,
            wasteType: bin.wasteType,
            fullness: bin.fullness,
            alertThreshold: bin.alertThreshold,
            location: {
                floor: bin.location?.floor || '1',
                room: bin.location?.room || 'Unknown'
            },
            lastUpdate: bin.lastUpdate
        };

        // Send alert notification
        const notificationResults = await sendAlertNotification(binData, userIds);

        logger.info(`Manual alert notifications sent for bin ${binId}. Results: ${JSON.stringify(notificationResults)}`);

        res.status(200).json({
            status: 'success',
            message: 'Alert notification sent successfully',
            data: {
                notificationsSent: notificationResults?.length || 0,
                successCount: notificationResults?.filter(r => r.success)?.length || 0
            }
        });
    } catch (error) {
        logger.error(`Failed to send manual alert for bin ${binId}: ${error.message}`);
        return next(new AppError('Failed to send alert notification', 500));
    }
});

/**
 * Get waste collection statistics
 */
const getStatistics = asyncHandler(async (req, res) => {
    let query = {};
    query = addCompanyToQuery(query, req.user);

    // Get aggregate stats with defaults if empty
    const stats = await WasteBin.aggregate([
        { $match: query },
        {
            $group: {
                _id: null,
                totalBins: { $sum: 1 },
                avgFullness: { $avg: '$fullness' },
                maxFullness: { $max: '$fullness' },
                minFullness: { $min: '$fullness' },
                totalWeight: { $sum: '$weight' }
            }
        }
    ]) || [{
        totalBins: 0,
        avgFullness: 0,
        maxFullness: 0,
        minFullness: 0,
        totalWeight: 0
    }];

    // Default stats object if none found
    const overview = stats.length > 0 ? stats[0] : {
        totalBins: 0,
        avgFullness: 0,
        maxFullness: 0,
        minFullness: 0,
        totalWeight: 0
    };

    // Get stats by department
    const departmentStats = await WasteBin.aggregate([
        {
            $group: {
                _id: '$department',
                binCount: { $sum: 1 },
                avgFullness: { $avg: '$fullness' },
                totalWeight: { $sum: '$weight' }
            }
        },
        { $sort: { binCount: -1 } }
    ]) || [];

    // Get stats by waste type
    const wasteTypeStats = await WasteBin.aggregate([
        {
            $group: {
                _id: '$wasteType',
                binCount: { $sum: 1 },
                avgFullness: { $avg: '$fullness' },
                totalWeight: { $sum: '$weight' }
            }
        },
        { $sort: { binCount: -1 } }
    ]) || [];

    // Count bins that need attention
    const alertCount = await WasteBin.countDocuments({
        $expr: { $gte: ['$fullness', '$alertThreshold'] }
    }) || 0;

    res.status(200).json({
        status: 'success',
        data: {
            overview,
            alertCount,
            departmentStats,
            wasteTypeStats
        }
    });
});

const checkDeviceRegistration = asyncHandler(async (req, res) => {
    const { binId, mac } = req.query;

    if (!binId && !mac) {
        return res.status(400).json({
            status: 'fail',
            message: 'Either binId or mac address is required'
        });
    }

    // Build the query - check by both binId and mac if available
    const query = {};
    if (binId) query.binId = binId;
    if (mac) query['deviceInfo.macAddress'] = mac;

    // Check if bin exists
    const bin = await WasteBin.findOne(query);

    res.status(200).json({
        status: 'success',
        exists: !!bin,
        data: bin ? { binId: bin.binId } : null
    });
});

const registerDevice = asyncHandler(async (req, res) => {
    const { macAddress, tempBinId, deviceType } = req.body;

    if (!macAddress) {
        return res.status(400).json({
            status: 'fail',
            message: 'MAC address is required'
        });
    }

    try {
        let existingBin = await WasteBin.findOne({ 'deviceInfo.macAddress': macAddress });

        if (existingBin) {
            return res.status(200).json({
                status: 'success',
                message: 'Device already registered',
                data: {
                    binId: existingBin.binId,
                    registered: true
                }
            });
        }

        // Generate a unique bin ID
        const basePrefix = "MED";
        const count = await WasteBin.countDocuments({ binId: { $regex: `^${basePrefix}` } });
        const binId = `${basePrefix}-${(count + 1).toString().padStart(3, '0')}`;

        // Create new bin
        const newBin = await WasteBin.create({
            binId,
            department: 'Auto Registered',
            wasteType: 'Острые Медицинские Отходы',
            status: 'active',
            fullness: 0,
            capacity: 50,
            alertThreshold: 80,
            deviceInfo: {
                macAddress,
                deviceType: deviceType || 'ESP32',
                status: 'active',
                registeredAt: new Date()
            },
            lastUpdate: new Date()
        });

        // Return the new bin ID
        res.status(201).json({
            status: 'success',
            message: 'Device registered successfully',
            data: {
                binId,
                registered: true
            }
        });
    } catch (error) {
        console.error("Error registering device:", error);
        res.status(500).json({
            status: 'error',
            message: error.message || 'Error registering device'
        });
    }
});

module.exports = {
    getAllBins,
    getBin,
    createBin,
    updateBin,
    deleteBin,
    getBinHistory,
    updateBinLevel,
    registerDevice,
    checkDeviceRegistration,
    getNearbyBins,
    getOverfilledBins,
    getStatistics,
    sendManualAlert,
    bulkUpdateBins,
    exportBinData,
    getBinAnalytics,
    predictMaintenance,
    getBinAlerts,
    dismissAlert,
    scheduleCollection,
    getCollectionRoutes,
    optimizeRoutes,
    getBinMetrics,
    setCollectingMode,
    sendDeviceCommand,
    getDeviceCommands,
    markCommandExecuted
};