const mongoose = require('mongoose');

const handoffContainerSchema = new mongoose.Schema(
    {
        container: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'WasteBin'
        },
        binId: String,
        wasteClass: String,
        wasteType: String,
        fillLevel: Number,
        declaredWeight: Number,
        confirmedWeight: Number,
        bagCount: Number,
        notes: String
    },
    { _id: false }
);

const handoffPartySchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        role: String,
        name: String,
        phone: String,
        confirmedAt: Date,
        pin: String,
        location: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point'
            },
            coordinates: {
                type: [Number]
            }
        }
    },
    { _id: false }
);

const handoffSchema = new mongoose.Schema(
    {
        handoffId: {
            type: String,
            unique: true,
            index: true
        },
        chainId: {
            type: String,
            index: true,
            default: null
        },
        type: {
            type: String,
            enum: ['facility_to_driver', 'driver_to_incinerator'],
            required: true,
            index: true
        },
        sequence: {
            type: Number,
            enum: [1, 2],
            default: null
        },
        session: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'CollectionSession',
            default: null,
            index: true
        },
        company: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'MedicalCompany',
            required: true,
            index: true
        },
        facility: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'MedicalCompany',
            default: null,
            index: true
        },
        incinerationPlant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'IncinerationPlant',
            default: null
        },
        sender: handoffPartySchema,
        receiver: handoffPartySchema,
        containers: [handoffContainerSchema],
        totalContainers: {
            type: Number,
            default: 0
        },
        totalDeclaredWeight: {
            type: Number,
            default: 0
        },
        totalConfirmedWeight: {
            type: Number,
            default: 0
        },
        status: {
            type: String,
            enum: [
                'created',
                'pending',
                'confirmed_by_sender',
                'confirmed_by_receiver',
                'completed',
                'disputed',
                'resolving',
                'resolved',
                'expired'
            ],
            default: 'created',
            index: true
        },
        autoConfirmed: {
            type: Boolean,
            default: false
        },
        confirmationToken: {
            type: String,
            default: undefined
        },
        tokenExpiresAt: {
            type: Date,
            default: undefined
        },
        dispute: {
            raisedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                default: null
            },
            role: String,
            reason: String,
            description: String,
            photos: [String],
            resolvedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                default: null
            },
            resolution: String,
            resolvedAt: Date
        },
        photos: [
            {
                url: String,
                uploadedBy: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User'
                },
                caption: String,
                uploadedAt: Date
            }
        ],
        completedAt: Date,
        expiresAt: Date
    },
    { timestamps: true }
);

handoffSchema.index({ type: 1, status: 1, createdAt: -1 });
handoffSchema.index({ confirmationToken: 1 }, { unique: true, sparse: true });

handoffSchema.pre('validate', function onValidate(next) {
    if (!Array.isArray(this.containers)) {
        this.containers = [];
    }

    this.totalContainers = this.containers.length;
    this.totalDeclaredWeight = this.containers.reduce(
        (sum, item) => sum + (item.declaredWeight || 0),
        0
    );
    this.totalConfirmedWeight = this.containers.reduce(
        (sum, item) => sum + (item.confirmedWeight || 0),
        0
    );

    next();
});

module.exports = mongoose.model('Handoff', handoffSchema);
