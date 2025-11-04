require('dotenv').config();
const mongoose = require('mongoose');
const ApiKey = require('../models/apiKey');

const createApiKey = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const apiKey = await ApiKey.create({
            key: '61e22b5ce396dc63971206c55f406c4643fba0f2bb5abaaf96aa788df7574931',
            deviceId: 'esp32-waste-bin',
            description: 'ESP32 Waste Bin Sensors',
            active: true
        });

        console.log('API Key created:', apiKey);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

createApiKey();