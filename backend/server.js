// After existing schemas (wasteBinSchema and historySchema)
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// User Schema
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['admin', 'user'],
        default: 'user'
    }
});

const User = mongoose.model('User', userSchema);

// Auth middleware
const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            throw new Error();
        }

        const decoded = jwt.verify(token, 'medical_waste_monitoring_system_2025_secure_key_8x4f9v2p');
        const user = await User.findById(decoded.userId);

        if (!user) {
            throw new Error();
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Please authenticate' });
    }
};

// Admin middleware
const adminAuth = async (req, res, next) => {
    try {
        await auth(req, res, () => {
            if (req.user.role !== 'admin') {
                throw new Error();
            }
            next();
        });
    } catch (error) {
        res.status(403).json({ message: 'Admin access required' });
    }
};

// Auth routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password, role } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const user = new User({
            username,
            password: hashedPassword,
            role: role || 'user'
        });

        await user.save();

        // Generate token
        const token = jwt.sign(
            { userId: user._id },
            'medical_waste_monitoring_system_2025_secure_key_8x4f9v2p',
            { expiresIn: '24h' }
        );

        res.status(201).json({
            token,
            username: user.username,
            role: user.role
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Find user
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate token
        const token = jwt.sign(
            { userId: user._id },
            'medical_waste_monitoring_system_2025_secure_key_8x4f9v2p',
            { expiresIn: '24h' }
        );

        res.json({
            token,
            username: user.username,
            role: user.role
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Protect routes - add this before your waste bin routes
app.use('/api/waste-bins', auth);