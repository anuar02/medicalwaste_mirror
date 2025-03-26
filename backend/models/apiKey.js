const mongoose = require('mongoose');

const apiKeySchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true
    },
    deviceId: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    active: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastUsed: {
        type: Date
    }
});

module.exports = mongoose.model('ApiKey', apiKeySchema);