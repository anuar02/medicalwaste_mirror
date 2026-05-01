const https = require('https');
const { URLSearchParams } = require('url');
const { logger } = require('../middleware/loggers');

const MOBIZON_API_URL = process.env.MOBIZON_API_URL
    || 'https://api.mobizon.kz/service/message/sendsmsmessage';

const normalizeRecipient = (phone) => String(phone || '').replace(/[^\d]/g, '');

const postForm = (url, params) => new Promise((resolve, reject) => {
    const body = params.toString();
    const request = https.request(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(body)
        },
        timeout: Number(process.env.MOBIZON_TIMEOUT_MS || 10000)
    }, (response) => {
        let raw = '';

        response.setEncoding('utf8');
        response.on('data', (chunk) => {
            raw += chunk;
        });
        response.on('end', () => {
            let parsed = null;
            try {
                parsed = raw ? JSON.parse(raw) : null;
            } catch (error) {
                parsed = null;
            }

            resolve({
                statusCode: response.statusCode,
                raw,
                body: parsed
            });
        });
    });

    request.on('timeout', () => {
        request.destroy(new Error('Mobizon request timed out'));
    });
    request.on('error', reject);
    request.write(body);
    request.end();
});

async function sendSMS(phone, message) {
    const recipient = normalizeRecipient(phone);
    if (!recipient) {
        return { success: false, error: 'Phone is required' };
    }

    if (!process.env.MOBIZON_API_KEY) {
        return { success: false, error: 'SMS provider not configured' };
    }

    const url = `${MOBIZON_API_URL}?${new URLSearchParams({
        apiKey: process.env.MOBIZON_API_KEY,
        output: 'json',
        api: 'v1'
    }).toString()}`;

    const params = new URLSearchParams({
        recipient,
        text: message
    });

    if (process.env.MOBIZON_SENDER && process.env.MOBIZON_SENDER_REGISTERED === 'true') {
        params.set('from', process.env.MOBIZON_SENDER);
    }

    try {
        const response = await postForm(url, params);
        const { statusCode, body, raw } = response;

        if (statusCode < 200 || statusCode >= 300) {
            logger.warn(`Mobizon SMS failed with HTTP ${statusCode}: ${raw}`);
            return { success: false, error: 'SMS provider request failed' };
        }

        if (body && typeof body.code !== 'undefined' && Number(body.code) !== 0) {
            logger.warn(`Mobizon SMS failed with code ${body.code}: ${body.message || raw}`);
            return { success: false, error: body.message || 'SMS provider rejected the message' };
        }

        return {
            success: true,
            messageId: body?.data?.messageId || body?.data?.id || body?.messageId || null,
            providerResponse: body || raw
        };
    } catch (error) {
        logger.error(`Mobizon SMS error: ${error.message}`);
        return { success: false, error: 'Failed to send SMS' };
    }
}

module.exports = {
    sendSMS
};
