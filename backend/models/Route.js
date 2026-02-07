const mongoose = require('mongoose');

const routeStopSchema = new mongoose.Schema(
    {
        facility: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Facility',
            default: null
        },
        containers: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'WasteBin'
            }
        ],
        order: {
            type: Number,
            min: 1
        },
        estimatedArrival: {
            type: String,
            trim: true
        },
        estimatedDuration: {
            type: Number,
            min: 0,
            default: 10
        },
        notes: {
            type: String,
            trim: true
        },
        // Temporary direct coordinates support while Facility model is pending.
        location: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point'
            },
            coordinates: {
                type: [Number], // [lng, lat]
                validate: {
                    validator(value) {
                        if (!value || value.length === 0) return true;
                        return (
                            Array.isArray(value) &&
                            value.length === 2 &&
                            value[0] >= -180 &&
                            value[0] <= 180 &&
                            value[1] >= -90 &&
                            value[1] <= 90
                        );
                    },
                    message: 'Invalid stop coordinates'
                }
            }
        }
    },
    { _id: true }
);

const routeSchema = new mongoose.Schema(
    {
        routeId: {
            type: String,
            trim: true,
            unique: true,
            index: true
        },
        name: {
            type: String,
            required: [true, 'Route name is required'],
            trim: true
        },
        company: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'MedicalCompany',
            required: [true, 'Company is required'],
            index: true
        },
        assignedDriver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
            index: true
        },
        assignedVehicle: {
            type: String,
            trim: true,
            default: ''
        },
        stops: [routeStopSchema],
        schedule: {
            type: {
                type: String,
                enum: ['daily', 'weekly', 'custom'],
                default: 'daily'
            },
            days: [
                {
                    type: String,
                    enum: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
                }
            ],
            time: {
                type: String,
                trim: true,
                default: '08:00'
            },
            timezone: {
                type: String,
                trim: true,
                default: 'Asia/Almaty'
            },
            customDates: [
                {
                    type: Date
                }
            ]
        },
        totalStops: {
            type: Number,
            default: 0
        },
        totalContainers: {
            type: Number,
            default: 0
        },
        estimatedDistance: {
            type: Number,
            default: 0
        },
        estimatedDuration: {
            type: Number,
            default: 0
        },
        optimizedOrder: [
            {
                type: Number
            }
        ],
        status: {
            type: String,
            enum: ['suggested', 'active', 'paused', 'archived'],
            default: 'active',
            index: true
        },
        lastCompletedAt: {
            type: Date
        },
        averageCompletionTime: {
            type: Number,
            default: 0
        },
        completionRate: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        }
    },
    {
        timestamps: true
    }
);

routeSchema.index({ company: 1, status: 1, createdAt: -1 });
routeSchema.index({ company: 1, assignedDriver: 1, status: 1 });
routeSchema.index({ 'schedule.type': 1, 'schedule.days': 1, status: 1 });

routeSchema.pre('validate', function onValidate(next) {
    if (!this.routeId) {
        const short = String(Date.now()).slice(-6);
        this.routeId = `RT-${short}`;
    }

    this.totalStops = Array.isArray(this.stops) ? this.stops.length : 0;
    this.totalContainers = Array.isArray(this.stops)
        ? this.stops.reduce((sum, stop) => sum + ((stop.containers || []).length || 0), 0)
        : 0;

    if (!this.estimatedDuration || this.estimatedDuration <= 0) {
        this.estimatedDuration = (this.stops || []).reduce(
            (sum, stop) => sum + (stop.estimatedDuration || 10),
            0
        );
    }

    next();
});

module.exports = mongoose.model('Route', routeSchema);
