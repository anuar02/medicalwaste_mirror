// models/WasteBin.js
const mongoose = require('mongoose');

/** Универсальный расчёт заполненности */
function computeFullness(distance, height) {
    if (!Number.isFinite(height) || height <= 0) return 0;
    if (!Number.isFinite(distance) || distance < 0) distance = 0;

    // ограничим distance в рамках [0, height]
    const d = Math.max(0, Math.min(distance, height));
    const pct = Math.round(((height - d) / height) * 100);
    return Math.max(0, Math.min(100, pct));
}

const wasteBinSchema = new mongoose.Schema(
    {
        binId: {
            type: String,
            required: [true, 'Bin ID is required'],
            unique: true,
            trim: true,
            validate: {
                validator(v) {
                    return /^[A-Z]+-\d{3,}$/.test(v);
                },
                message: 'Bin ID must be in format DEPT-123',
            },
        },

        company: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'MedicalCompany',
            default: null, // не назначен
        },

        department: {
            type: String,
            required: [true, 'Department is required'],
            trim: true,
        },

        wasteType: {
            type: String,
            required: [true, 'Waste type is required'],
            enum: {
                values: [
                    'Острые Медицинские Отходы',
                    'Инфекционные Отходы',
                    'Патологические Отходы',
                    'Фармацевтические Отходы',
                    'Химические Отходы',
                    'Радиоактивные Отходы',
                    'Общие Медицинские Отходы',
                ],
                message: 'Please provide a valid waste type',
            },
        },

        // ПАРАМЕТРЫ ЗАПОЛНЕННОСТИ
        containerHeight: {
            type: Number,
            default: 50, // см
            min: [10, 'Высота контейнера должна быть ≥ 10 см'],
            max: [300, 'Высота контейнера должна быть ≤ 300 см'],
        },

        distance: {
            type: Number,
            default: 0, // текущая дистанция датчика до мусора (см)
            min: [0, 'Distance cannot be negative'],
        },

        fullness: {
            type: Number,
            default: 0, // %
            min: [0, 'Fullness cannot be less than 0%'],
            max: [100, 'Fullness cannot exceed 100%'],
        },

        weight: {
            type: Number,
            default: 0,
            min: [0, 'Weight cannot be negative'],
        },

        temperature: {
            type: Number,
            default: 22.0,
        },

        deviceInfo: {
            macAddress: String,
            batteryVoltage: Number,
            lastSeen: Date,
            status: {
                type: String,
                enum: ['active', 'offline', 'maintenance'],
                default: 'active',
            },
            deviceType: String,
            registeredAt: Date,
        },

        location: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point',
            },
            coordinates: {
                type: [Number], // [lng, lat]
                default: [0, 0],
                validate: {
                    validator(v) {
                        return (
                            Array.isArray(v) &&
                            v.length === 2 &&
                            v[0] >= -180 &&
                            v[0] <= 180 &&
                            v[1] >= -90 &&
                            v[1] <= 90
                        );
                    },
                    message: 'Invalid coordinates',
                },
            },
        },

        address: {
            type: String,
            trim: true,
        },

        capacity: {
            type: Number,
            default: 50,
            min: [1, 'Capacity must be at least 1 liter'],
        },

        alertThreshold: {
            type: Number,
            default: 80,
            min: [50, 'Alert threshold must be at least 50%'],
            max: [95, 'Alert threshold cannot exceed 95%'],
        },

        status: {
            type: String,
            enum: ['active', 'maintenance', 'offline', 'decommissioned'],
            default: 'active',
        },

        lastUpdate: {
            type: Date,
            default: Date.now,
        },

        lastCollection: {
            type: Date,
        },

        collectionHistory: [
            {
                collectedAt: { type: Date, required: true },
                fullnessAtCollection: { type: Number, default: 0 },
                weightAtCollection: { type: Number, default: 0 },
            },
        ],

        notes: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Индексы
wasteBinSchema.index({ binId: 1 });
wasteBinSchema.index({ company: 1 });
wasteBinSchema.index({ status: 1 });
wasteBinSchema.index({ fullness: 1 });
wasteBinSchema.index({ location: '2dsphere' });
wasteBinSchema.index({ 'deviceInfo.macAddress': 1 });

// Виртуалка "нужен вывоз?"
wasteBinSchema.virtual('needsCollection').get(function () {
    return this.fullness >= this.alertThreshold;
});

/** Применение данных от датчика + пересчёт fullness по containerHeight */
wasteBinSchema.methods.updateWithSensorData = async function (data) {
    const prevFullness = this.fullness;
    const prevWeight = this.weight;

    if (data.distance !== undefined) {
        this.distance = data.distance;
        this.fullness = computeFullness(this.distance, this.containerHeight);
    }

    if (data.weight !== undefined) this.weight = data.weight;
    if (data.temperature !== undefined) this.temperature = data.temperature;

    if (data.latitude !== undefined && data.longitude !== undefined) {
        this.location.coordinates = [data.longitude, data.latitude];
    }

    this.lastUpdate = new Date();

    // Пример фиксации события "вывоза"
    if (prevFullness > 70 && this.fullness < 20) {
        this.collectionHistory.push({
            collectedAt: new Date(),
            fullnessAtCollection: prevFullness,
            weightAtCollection: prevWeight || 0,
        });
        this.lastCollection = new Date();
    }

    return this.save();
};

// Экспорт и вспомогательную функцию тоже экспортнём
const WasteBin = mongoose.model('WasteBin', wasteBinSchema);

module.exports = WasteBin;
