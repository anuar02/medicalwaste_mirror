const MedicalCompany = require('../models/MedicalCompany');
const { generateSuggestionsForCompany } = require('../services/smartScheduler');
const { logger } = require('../middleware/loggers');

function getIntervalMs() {
    const envValue = Number(process.env.SMART_SCHEDULER_INTERVAL_MINUTES || 60);
    const minutes = Number.isFinite(envValue) && envValue > 0 ? envValue : 60;
    return minutes * 60 * 1000;
}

async function runSmartSchedulerCycle() {
    const companies = await MedicalCompany.find({ isActive: true }).select('_id');
    let createdCount = 0;

    for (const company of companies) {
        const created = await generateSuggestionsForCompany(company._id, 5);
        createdCount += created.length;
    }

    logger.info(`[smartScheduler] cycle completed. Created suggestions: ${createdCount}`);
    return createdCount;
}

function startSmartSchedulerJob() {
    const enabled = process.env.SMART_SCHEDULER_ENABLED !== 'false';
    if (!enabled) {
        logger.info('[smartScheduler] disabled by SMART_SCHEDULER_ENABLED=false');
        return null;
    }

    // Run once at startup, then periodically.
    runSmartSchedulerCycle().catch((error) => {
        logger.error(`[smartScheduler] initial cycle failed: ${error.message}`);
    });

    const interval = setInterval(() => {
        runSmartSchedulerCycle().catch((error) => {
            logger.error(`[smartScheduler] cycle failed: ${error.message}`);
        });
    }, getIntervalMs());

    logger.info(`[smartScheduler] started. Interval=${getIntervalMs()}ms`);

    return () => clearInterval(interval);
}

module.exports = {
    startSmartSchedulerJob,
    runSmartSchedulerCycle
};
