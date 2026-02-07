const mongoose = require('mongoose');

const operatorSchema = new mongoose.Schema(
    {
        name: String,
        phone: {
            type: String,
            trim: true
        },
        shift: {
            type: String,
            enum: ['day', 'night', 'any'],
            default: 'any'
        },
        active: {
            type: Boolean,
            default: true
        }
    },
    { _id: false }
);

const incinerationPlantSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true
        },
        address: {
            type: String,
            trim: true
        },
        license: {
            number: String,
            issuedBy: String,
            validUntil: Date
        },
        operators: [operatorSchema],
        acceptedWasteClasses: [String],
        capacity: {
            dailyLimit: Number,
            currentLoad: {
                type: Number,
                default: 0
            }
        },
        active: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

incinerationPlantSchema.index({ active: 1 });

module.exports = mongoose.model('IncinerationPlant', incinerationPlantSchema);
