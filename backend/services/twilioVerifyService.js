const twilio = require('twilio');

const getVerifyClient = () => {
    const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
        return null;
    }
    return twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
};

const getVerifyServiceSid = () => process.env.TWILIO_VERIFY_SERVICE_SID || null;

const ensureVerifyReady = () => {
    const client = getVerifyClient();
    const serviceSid = getVerifyServiceSid();
    if (!client || !serviceSid) {
        return { client: null, serviceSid: null };
    }
    return { client, serviceSid };
};

async function startPhoneVerification(phoneNumber) {
    if (!phoneNumber) {
        return { success: false, error: 'Phone number is required' };
    }

    const { client, serviceSid } = ensureVerifyReady();
    if (!client || !serviceSid) {
        return { success: false, error: 'Twilio Verify is not configured' };
    }

    try {
        const result = await client.verify.v2
            .services(serviceSid)
            .verifications
            .create({ to: phoneNumber, channel: 'sms' });

        return { success: true, status: result.status, sid: result.sid };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function checkPhoneVerification(phoneNumber, code) {
    if (!phoneNumber || !code) {
        return { success: false, error: 'Phone number and code are required' };
    }

    const { client, serviceSid } = ensureVerifyReady();
    if (!client || !serviceSid) {
        return { success: false, error: 'Twilio Verify is not configured' };
    }

    try {
        const result = await client.verify.v2
            .services(serviceSid)
            .verificationChecks
            .create({ to: phoneNumber, code });

        return { success: true, status: result.status };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

module.exports = {
    startPhoneVerification,
    checkPhoneVerification
};
