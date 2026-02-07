async function sendSMS(phone, message) {
    if (!phone) {
        return { success: false, error: 'Phone is required' };
    }

    if (!process.env.MOBIZON_API_KEY) {
        return { success: false, error: 'SMS provider not configured' };
    }

    // TODO: Integrate provider SDK or HTTP API here.
    // Return a stub response for now.
    return {
        success: true,
        messageId: `sms_${Date.now()}`
    };
}

module.exports = {
    sendSMS
};
