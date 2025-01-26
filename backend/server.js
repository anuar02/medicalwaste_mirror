require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();

// CORS Configuration
app.use(cors({
    origin: ['https://narutouzumaki.kz', 'http://localhost:3001'], // Update with your frontend domains
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// JSON Parsing
app.use(express.json());

app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
});

// MongoDB Connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 15000,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 15000,
            writeConcern: {w: 1, j: false},
        });
        console.log('Connected to MongoDB successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1); // Exit process if DB connection fails
    }
};
connectDB();

// Schemas and Models
const userSchema = new mongoose.Schema({
    username: {type: String, required: true, unique: true},
    password: {type: String, required: true},
    role: {type: String, enum: ['admin', 'user'], default: 'user'}
});

const wasteBinSchema = new mongoose.Schema({
    binId: {type: String, default: 'MED-001'},
    department: {type: String, default: 'Хирургическое Отделение'},
    wasteType: {type: String, default: 'Острые MEDицинские Отходы'},
    fullness: {type: Number, default: 0},
    distance: {type: Number, default: 0},
    weight: {type: Number, default: 0},
    temperature: {type: Number, default: 22.7},
    latitude: {type: Number, default: 43.2364},
    longitude: {type: Number, default: 76.9457},
    lastCollection: {type: Date, default: Date.now},
    lastUpdate: {type: Date, default: Date.now}
});

const historySchema = new mongoose.Schema({
    binId: String,
    time: String,
    fullness: Number,
    timestamp: {type: Date, default: Date.now}
});

const User = mongoose.model('User', userSchema);
const WasteBin = mongoose.model('WasteBin', wasteBinSchema);
const History = mongoose.model('History', historySchema);

// Middleware: Auth
const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) throw new Error();

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret_key');
        const user = await User.findById(decoded.userId);
        if (!user) throw new Error();

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({message: 'Authentication required'});
    }
};

// Middleware: Admin Auth
const adminAuth = async (req, res, next) => {
    try {
        await auth(req, res, () => {
            if (req.user.role !== 'admin') throw new Error();
            next();
        });
    } catch (error) {
        res.status(403).json({message: 'Admin access required'});
    }
};

// Routes: Auth
app.post('/api/auth/register', async (req, res) => {
    try {
        const {username, password, role} = req.body;

        const existingUser = await User.findOne({username});
        if (existingUser) return res.status(400).json({message: 'Username already exists'});

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({username, password: hashedPassword, role: role || 'user'});
        await user.save();

        const token = jwt.sign(
            {userId: user._id},
            process.env.JWT_SECRET || 'default_secret_key',
            {expiresIn: '24h'}
        );

        res.status(201).json({token, username: user.username, role: user.role});
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({message: error.message});
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const {username, password} = req.body;

        const user = await User.findOne({username});
        if (!user) return res.status(401).json({message: 'Invalid credentials'});

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({message: 'Invalid credentials'});

        const token = jwt.sign(
            {userId: user._id},
            process.env.JWT_SECRET || 'default_secret_key',
            {expiresIn: '24h'}
        );

        res.json({token, username: user.username, role: user.role});
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({message: error.message});
    }
});

// Protected Routes
app.use('/api/waste-bins', auth);
app.get('/api/waste-bins', async (req, res) => {
    try {
        const bins = await WasteBin.find();
        res.json(bins);
    } catch (error) {
        res.status(500).json({message: 'Error fetching waste bins'});
    }
});

app.post('/api/waste-level', async (req, res) => {
    try {
        const { binId, distance } = req.body;
        const fullness = Math.max(0, Math.min(100, (1 - distance/100) * 100));

        await WasteBin.findOneAndUpdate(
            { binId },
            {
                $set: {
                    distance,
                    fullness,
                    latitude: req.body.latitude,
                    longitude: req.body.longitude,
                    lastUpdate: new Date()
                }
            },
            { upsert: true }
        );

        await History.create({
            binId,
            fullness,
            time: new Date().toLocaleTimeString()
        });

        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/auth/verify', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.json({valid: false});
        }
        res.json({valid: true});
    } catch (error) {
        res.status(500).json({valid: false});
    }
});

app.get('/api/waste-bins/:id', async (req, res) => {
    try {
        const bin = await WasteBin.findOne({ binId: req.params.id });
        if (!bin) return res.status(404).json({ message: 'Bin not found' });
        res.set('Cache-Control', 'no-store');
        res.json(bin);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching waste bin' });
    }
});

app.get('/api/waste-bins/:id/history', async (req, res) => {
    try {
        const history = await History.find({ binId: req.params.id })
            .sort({ timestamp: -1 })
            .limit(24);
        res.set('Cache-Control', 'no-store');
        res.json(history);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching history' });
    }
});

app.delete('/api/waste-bins/:id', auth, async (req, res) => {
    try {
        const result = await WasteBin.deleteOne({binId: req.params.id});
        if (result.deletedCount === 0) {
            return res.status(404).json({message: 'Bin not found'});
        }
        res.status(204).send();
    } catch (error) {
        res.status(500).json({message: 'Error deleting waste bin'});
    }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
