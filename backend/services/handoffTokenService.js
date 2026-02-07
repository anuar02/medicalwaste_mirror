const crypto = require('crypto');

function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

function generateConfirmationToken(expiryHours = 24) {
    const rawToken = crypto.randomUUID();
    const hashedToken = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    return { rawToken, hashedToken, expiresAt };
}

module.exports = {
    generateConfirmationToken,
    hashToken
};
