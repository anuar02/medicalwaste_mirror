require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const moment = require('moment');

const app = express();
app.use(cors());
app.use(express.json());


mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 15000,
    writeConcern: {
        w: 1,
        j: false
    }
}).then(() => {
    console.log('Connected to MongoDB successfully');
}).catch((error) => {
    console.error('MongoDB connection error:', error);
});

// Schemas
const wasteBinSchema = new mongoose.Schema({
    binId: { type: String, default: 'MED-001' },
    department: { type: String, default: 'Хирургическое Отделение' },
    wasteType: { type: String, default: 'Острые MEDицинские Отходы' },
    fullness: { type: Number, default: 0 },
    distance: { type: Number, default: 0 },
    weight: { type: Number, default: 0 },
    temperature: { type: Number, default: 22.7 },
    latitude: { type: Number, default: 43.2364 },
    longitude: { type: Number, default: 76.9457 },
    lastCollection: { type: Date, default: Date.now },
    lastUpdate: { type: Date, default: Date.now }
});

const historySchema = new mongoose.Schema({
    binId: String,
    time: String,
    fullness: Number,
    timestamp: { type: Date, default: Date.now }
});

const WasteBin = mongoose.model('WasteBin', wasteBinSchema);
const History = mongoose.model('History', historySchema);

// Mock data generator
const generateMockData = () => {
    const now = moment();
    const baseFullness = 20 + Math.random() * 30; // Random fullness between 20-50%

    return {
        distance: Math.floor(Math.random() * 50),
        fullness: baseFullness,
        weight: (baseFullness/100 * 5).toFixed(1),
        temperature: (22 + Math.random() * 2).toFixed(1),
        latitude: 43.2364 + (Math.random() - 0.5) * 0.001,
        longitude: 76.9457 + (Math.random() - 0.5) * 0.001,
        timestamp: now.format()
    };
};

// Generate mock history data
const generateMockHistory = () => {
    const history = [];
    const now = moment();
    let baseFullness = 20;

    for (let i = 23; i >= 0; i--) {
        baseFullness += (Math.random() - 0.3) * 5;
        baseFullness = Math.max(0, Math.min(100, baseFullness));

        history.push({
            binId: 'MED-001',
            time: moment(now).subtract(i, 'hours').format('HH:mm'),
            fullness: Math.round(baseFullness),
            timestamp: moment(now).subtract(i, 'hours').toDate()
        });
    }
    return history;
};

// Initialize mock data with timeout
const initializeMockData = async () => {
    try {
        const existingBin = await WasteBin.findOne({ binId: 'MED-001' }).maxTimeMS(5000);
        if (!existingBin) {
            const mockData = generateMockData();
            await WasteBin.create({
                binId: 'MED-001',
                ...mockData
            });

            const mockHistory = generateMockHistory();
            await History.insertMany(mockHistory, { timeout: 5000 });
        }
    } catch (error) {
        console.error('Error initializing mock data:', error);
    }
};

initializeMockData();

// Update mock data periodically with timeout
setInterval(async () => {
    try {
        const mockData = generateMockData();
        await WasteBin.findOneAndUpdate(
            { binId: 'MED-001' },
            {
                ...mockData,
                lastUpdate: new Date()
            },
            {
                maxTimeMS: 8000
            }
        );

        await History.create({
            binId: 'MED-001',
            time: moment().format('HH:mm'),
            fullness: mockData.fullness,
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Error updating mock data:', error);
    }
}, 5 * 60 * 1000);

// Routes with improved error handling and timeouts
app.get('/api/waste-bins/:binId', async (req, res) => {
    try {
        const bin = await WasteBin.findOne({ binId: req.params.binId }).maxTimeMS(8000);
        if (!bin) {
            return res.status(404).json({ message: 'Bin not found' });
        }

        const response = {
            ...bin._doc,
            lastCollection: moment(bin.lastCollection).format('DD.MM.YYYY HH:mm'),
            estimatedFillTime: moment(bin.lastCollection).add(2, 'days').format('DD.MM.YYYY HH:mm')
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching bin:', error);
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/waste-bins/:binId/history', async (req, res) => {
    try {
        const history = await History.find({ binId: req.params.binId })
            .sort('-timestamp')
            .limit(24)
            .maxTimeMS(8000);

        const formattedHistory = history.map(h => ({
            time: moment(h.timestamp).format('HH:mm'),
            fullness: h.fullness
        }));

        res.json(formattedHistory);
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/waste-bins', async (req, res) => {
    try {
        const bins = await WasteBin.find({}).maxTimeMS(8000);
        const formattedBins = bins.map(bin => ({
            ...bin._doc,
            lastCollection: moment(bin.lastCollection).format('DD.MM.YYYY HH:mm'),
            estimatedFillTime: moment(bin.lastCollection).add(2, 'days').format('DD.MM.YYYY HH:mm')
        }));
        res.json(formattedBins);
    } catch (error) {
        console.error('Error fetching bins:', error);
        res.status(500).json({ message: error.message });
    }
});

// Create new container
app.post('/api/waste-bins', async (req, res) => {
    try {
        const {
            binId,
            department,
            wasteType,
            latitude,
            longitude
        } = req.body;

        const existingBin = await WasteBin.findOne({ binId }).maxTimeMS(5000);
        if (existingBin) {
            return res.status(400).json({ message: 'Container with this ID already exists' });
        }

        const newBin = await WasteBin.create({
            binId,
            department,
            wasteType,
            latitude: latitude || 43.2364,
            longitude: longitude || 76.9457,
            fullness: 0,
            distance: 0,
            weight: 0,
            temperature: 22.7,
            lastCollection: new Date(),
            lastUpdate: new Date()
        });

        res.status(201).json(newBin);
    } catch (error) {
        console.error('Error creating bin:', error);
        res.status(500).json({ message: error.message });
    }
});

// Delete container
app.delete('/api/waste-bins/:binId', async (req, res) => {
    try {
        const bin = await WasteBin.findOneAndDelete({ binId: req.params.binId }).maxTimeMS(5000);
        if (!bin) {
            return res.status(404).json({ message: 'Container not found' });
        }
        await History.deleteMany({ binId: req.params.binId }).maxTimeMS(5000);
        res.json({ message: 'Container deleted successfully' });
    } catch (error) {
        console.error('Error deleting bin:', error);
        res.status(500).json({ message: error.message });
    }
});

// Update waste level from ESP32
app.post('/api/waste-level', async (req, res) => {
    try {
        const { binId, distance, latitude, longitude } = req.body;

        if (!binId) {
            return res.status(400).json({ message: 'Bin ID is required' });
        }

        // Calculate fullness (inverted from distance)
        // Assuming max distance is 100cm
        const fullness = Math.max(0, Math.min(100, (1 - distance/100) * 100));

        // Calculate approximate weight based on fullness
        const weight = (fullness/100 * 5).toFixed(1); // max weight 5kg

        const bin = await WasteBin.findOneAndUpdate(
            { binId },  // Use the provided binId
            {
                distance,
                fullness,
                weight,
                latitude: latitude || 43.2364,
                longitude: longitude || 76.9457,
                lastUpdate: new Date()
            },
            {
                upsert: true,  // Create if doesn't exist
                new: true,
                maxTimeMS: 8000
            }
        );

        await History.create({
            binId,
            time: moment().format('HH:mm'),
            fullness,
            timestamp: new Date()
        });

        const response = {
            ...bin._doc,
            lastCollection: moment(bin.lastCollection).format('DD.MM.YYYY HH:mm'),
            estimatedFillTime: moment(bin.lastCollection).add(2, 'days').format('DD.MM.YYYY HH:mm')
        };

        res.json(response);
    } catch (error) {
        console.error('Error updating waste level:', error);
        res.status(500).json({ message: error.message });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        message: 'Internal server error',
        error: error.message
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});