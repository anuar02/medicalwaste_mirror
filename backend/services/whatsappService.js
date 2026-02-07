const twilio = require('twilio');

const formatWhatsAppRecipient = (phone) => {
    if (!phone) return null;
    return phone.startsWith('whatsapp:') ? phone : `whatsapp:${phone}`;
};

const getTwilioClient = () => {
    const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
        return null;
    }
    return twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
};

async function sendWhatsAppMessage(phone, message) {
    if (!phone) {
        return { success: false, error: 'Phone is required' };
    }

    const client = getTwilioClient();
    if (!client || !process.env.TWILIO_WHATSAPP_FROM) {
        return { success: false, error: 'Twilio WhatsApp is not configured' };
    }

    try {
        const result = await client.messages.create({
            from: formatWhatsAppRecipient(process.env.TWILIO_WHATSAPP_FROM),
            to: formatWhatsAppRecipient(phone),
            body: message
        });

        return { success: true, messageId: result.sid };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

module.exports = {
    sendWhatsAppMessage
};
