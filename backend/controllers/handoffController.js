const mongoose = require('mongoose');
const Handoff = require('../models/Handoff');
const CollectionSession = require('../models/CollectionSession');
const WasteBin = require('../models/WasteBin');
const NotificationLog = require('../models/NotificationLog');
const Driver = require('../models/Driver');
const User = require('../models/User');
const IncinerationPlant = require('../models/IncinerationPlant');
const AppError = require('../utils/appError');
const { asyncHandler } = require('../utils/asyncHandler');
const { generateConfirmationToken, hashToken } = require('../services/handoffTokenService');
const { sendSMS } = require('../services/smsService');
const { sendWhatsAppMessage } = require('../services/whatsappService');

const CONFIRMATION_BASE_URL = process.env.PUBLIC_CONFIRM_BASE_URL || 'https://medicalwaste.kz/confirm';

async function logNotification({ handoff, recipient, channel, message, result, error }) {
    const success = result?.success || false;
    const failureReason = result?.error || error?.message || null;

    try {
        await NotificationLog.create({
            handoff: handoff._id,
            recipient: {
                user: recipient.user || null,
                phone: recipient.phone,
                name: recipient.name || ''
            },
            channel,
            status: success ? 'sent' : 'failed',
            messageId: result?.messageId || null,
            content: message,
            sentAt: new Date(),
            failureReason
        });
    } catch (logError) {
        console.error(`Failed to log ${channel} notification:`, logError);
    }
}

function buildHandoffIdSequence(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

async function generateHandoffId() {
    const todayKey = buildHandoffIdSequence();
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const count = await Handoff.countDocuments({
        createdAt: { $gte: start, $lte: end }
    });
    const sequence = String(count + 1).padStart(3, '0');
    return `HND-${todayKey}-${sequence}`;
}

async function generateHandoffChainId() {
    const todayKey = buildHandoffIdSequence();
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const count = await CollectionSession.countDocuments({
        handoffChainId: { $regex: `^CHAIN-${todayKey}-` },
        createdAt: { $gte: start, $lte: end }
    });
    const sequence = String(count + 1).padStart(3, '0');
    return `CHAIN-${todayKey}-${sequence}`;
}

function normalizeContainerInput(containers = [], containerIds = []) {
    if (Array.isArray(containers) && containers.length > 0) {
        return containers;
    }
    if (Array.isArray(containerIds) && containerIds.length > 0) {
        return containerIds.map((id) => ({ container: id }));
    }
    return [];
}

function selectActiveOperator(operators = []) {
    if (!Array.isArray(operators) || operators.length === 0) return null;
    return operators.find((operator) => operator.active !== false) || operators[0];
}

async function ensureHandoffChain(session, type) {
    if (!session) return { chainId: null, sequence: null };

    let chainId = session.handoffChainId;
    if (!chainId) {
        chainId = await generateHandoffChainId();
        session.handoffChainId = chainId;
    }

    if (type === 'facility_to_driver') {
        const existing = await Handoff.findOne({
            session: session._id,
            type: 'facility_to_driver',
            status: { $ne: 'expired' }
        }).select('_id status');
        if (existing) {
            throw new AppError('Facility-to-driver handoff already exists for this session', 400);
        }
        session.handoffState = {
            stage: 'facility_to_driver',
            updatedAt: new Date()
        };
        return { chainId, sequence: 1 };
    }

    const step1 = await Handoff.findOne({
        session: session._id,
        type: 'facility_to_driver',
        status: 'completed'
    }).select('_id');
    if (!step1) {
        throw new AppError('Facility-to-driver handoff must be completed before incineration', 400);
    }

    const existing = await Handoff.findOne({
        session: session._id,
        type: 'driver_to_incinerator',
        status: { $ne: 'expired' }
    }).select('_id status');
    if (existing) {
        throw new AppError('Incineration handoff already exists for this session', 400);
    }

    session.handoffState = {
        stage: 'driver_to_incinerator',
        updatedAt: new Date()
    };
    return { chainId, sequence: 2 };
}

const createHandoff = asyncHandler(async (req, res, next) => {
    const { sessionId, type, facility, incinerationPlant, receiver, expiresAt } = req.body;
    const containersInput = normalizeContainerInput(req.body.containers, req.body.containerIds);

    if (!Array.isArray(containersInput) || containersInput.length === 0) {
        return next(new AppError('At least one container is required', 400));
    }
    if (type === 'facility_to_driver' && req.user.role === 'driver') {
        return next(new AppError('Only supervisors can create facility handoffs', 403));
    }
    if (type === 'driver_to_incinerator' && req.user.role !== 'driver' && req.user.role !== 'admin') {
        return next(new AppError('Only drivers can create incineration handoffs', 403));
    }

    let session = null;
    if (sessionId) {
        const isObjectId = mongoose.isValidObjectId(sessionId);
        session = isObjectId
            ? await CollectionSession.findById(sessionId)
            : await CollectionSession.findOne({ sessionId });

        if (!session) {
            return next(new AppError('Collection session not found', 404));
        }

        if (req.user.role === 'driver' && String(session.driver) !== String(req.user.id)) {
            return next(new AppError('You can only create handoffs for your own session', 403));
        }
    }

    if (req.user.role === 'supervisor' && req.body.company && req.user.company &&
        String(req.body.company) !== String(req.user.company)) {
        return next(new AppError('Company does not match supervisor scope', 403));
    }

    let companyId = session?.company || req.user.company || req.body.company;
    if (!companyId) {
        const driverProfile = await Driver.findOne({ user: req.user.id }).select('medicalCompany');
        companyId = driverProfile?.medicalCompany || null;
    }

    const facilityId = type === 'facility_to_driver'
        ? (facility || companyId)
        : facility || null;

    const containerIds = containersInput
        .map((item) => item.container)
        .filter(Boolean);

    const bins = await WasteBin.find({ _id: { $in: containerIds } })
        .select('binId wasteType fullness company');

    if (bins.length !== containerIds.length) {
        return next(new AppError('Some containers were not found', 404));
    }

    const inputMap = new Map(
        containersInput.map((item) => [String(item.container), item])
    );

    const containers = bins.map((bin) => {
        if (bin.company && String(bin.company) !== String(companyId)) {
            throw new AppError('Container belongs to another company', 403);
        }

        const input = inputMap.get(String(bin._id)) || {};
        return {
            container: bin._id,
            binId: bin.binId,
            wasteType: bin.wasteType,
            wasteClass: input.wasteClass,
            fillLevel: bin.fullness,
            declaredWeight: input.declaredWeight,
            confirmedWeight: input.confirmedWeight,
            bagCount: input.bagCount,
            notes: input.notes
        };
    });

    if (type === 'driver_to_incinerator' && session?._id) {
        const facilityHandoff = await Handoff.findOne({
            session: session._id,
            type: 'facility_to_driver',
            status: 'completed'
        }).select('containers');
        if (facilityHandoff?.containers?.length) {
            const weightMap = new Map(
                facilityHandoff.containers.map((item) => [String(item.container), item.declaredWeight])
            );
            containers.forEach((item) => {
                if (item.declaredWeight == null) {
                    item.declaredWeight = weightMap.get(String(item.container));
                }
            });
        }
    }

    let confirmationToken;
    let tokenExpiresAt;
    let rawToken;

    if (type === 'driver_to_incinerator') {
        const token = generateConfirmationToken();
        confirmationToken = token.hashedToken;
        tokenExpiresAt = token.expiresAt;
        rawToken = token.rawToken;
    }

    const receiverPayload = receiver || {};
    if (type === 'facility_to_driver') {
        if (!receiverPayload.user && session?.driver) {
            receiverPayload.user = session.driver;
            receiverPayload.role = 'driver';
        }

        if (!receiverPayload.user) {
            return next(new AppError('Receiver driver is required', 400));
        }

        const receiverUser = await User.findById(receiverPayload.user).select('role company username');
        if (!receiverUser) {
            return next(new AppError('Receiver not found', 404));
        }
        if (receiverUser.role !== 'driver') {
            return next(new AppError('Receiver must be a driver', 400));
        }
        if (!companyId && receiverUser.company) {
            companyId = receiverUser.company;
        }
        if (!companyId) {
            return next(new AppError('Company is required to create handoff', 400));
        }
        if (receiverUser.company && String(receiverUser.company) !== String(companyId)) {
            return next(new AppError('Receiver belongs to another company', 403));
        }
        receiverPayload.name = receiverPayload.name || receiverUser.username;
    }

    if (type === 'driver_to_incinerator') {
        if (incinerationPlant) {
            const plant = await IncinerationPlant.findById(incinerationPlant).select('name operators');
            if (!plant) {
                return next(new AppError('Incineration plant not found', 404));
            }
            const operator = selectActiveOperator(plant.operators || []);
            if (operator) {
                receiverPayload.name = receiverPayload.name || operator.name || plant.name;
                receiverPayload.phone = receiverPayload.phone || operator.phone;
            }
        }

        if (!receiverPayload.phone) {
            return next(new AppError('Receiver phone is required for incineration confirmation', 400));
        }

        receiverPayload.role = receiverPayload.role || 'incinerator_operator';
    }

    const { chainId, sequence } = await ensureHandoffChain(session, type);

    const handoffPayload = {
        handoffId: await generateHandoffId(),
        chainId,
        sequence,
        type,
        session: session?._id || null,
        company: companyId,
        facility: facilityId,
        incinerationPlant: incinerationPlant || null,
        sender: {
            user: req.user.id,
            role: req.user.role,
            name: req.user.username,
            confirmedAt: new Date()
        },
        receiver: receiverPayload,
        containers,
        status: 'confirmed_by_sender',
        expiresAt: expiresAt ? new Date(expiresAt) : undefined
    };

    if (confirmationToken) {
        handoffPayload.confirmationToken = confirmationToken;
        handoffPayload.tokenExpiresAt = tokenExpiresAt;
    }

    const handoff = await Handoff.create(handoffPayload);

    if (session?._id) {
        await CollectionSession.updateOne(
            { _id: session._id },
            {
                $addToSet: { handoffs: handoff._id },
                $set: {
                    handoffChainId: session.handoffChainId || chainId,
                    handoffState: session.handoffState || {
                        stage: type === 'facility_to_driver' ? 'facility_to_driver' : 'driver_to_incinerator',
                        updatedAt: new Date()
                    }
                }
            }
        );
    }

    if (type === 'driver_to_incinerator' && rawToken && receiverPayload.phone) {
        const confirmationUrl = `${CONFIRMATION_BASE_URL}/${rawToken}`;
        const message = `MedWaste: подтвердите прием отходов. Акт ${handoff.handoffId || handoff._id}. ${confirmationUrl}`;
        const recipient = {
            user: handoff.receiver?.user || null,
            phone: receiverPayload.phone,
            name: receiverPayload.name || ''
        };
        try {
            const result = await sendSMS(receiverPayload.phone, message);
            await logNotification({
                handoff,
                recipient,
                channel: 'sms',
                message,
                result
            });
        } catch (error) {
            console.error('Failed to send incineration confirmation SMS:', error);
            await logNotification({
                handoff,
                recipient,
                channel: 'sms',
                message,
                error
            });
        }

        try {
            const result = await sendWhatsAppMessage(receiverPayload.phone, message);
            await logNotification({
                handoff,
                recipient,
                channel: 'whatsapp',
                message,
                result
            });
        } catch (error) {
            console.error('Failed to send incineration confirmation WhatsApp:', error);
            await logNotification({
                handoff,
                recipient,
                channel: 'whatsapp',
                message,
                error
            });
        }
    }

    res.status(201).json({
        status: 'success',
        data: {
            handoff,
            confirmationToken: rawToken
        }
    });
});

const getHandoffs = asyncHandler(async (req, res) => {
    const query = {};

    if (req.user.role === 'supervisor' || req.user.role === 'driver') {
        query.company = req.user.company;
    }

    if (req.user.role === 'driver') {
        query.$or = [
            { 'sender.user': req.user.id },
            { 'receiver.user': req.user.id }
        ];
    }

    if (req.query.status) query.status = req.query.status;
    if (req.query.type) query.type = req.query.type;
    if (req.query.session) query.session = req.query.session;

    const handoffs = await Handoff.find(query)
        .sort({ createdAt: -1 })
        .populate('session', 'sessionId status')
        .populate('sender.user', 'username phoneNumber')
        .populate('receiver.user', 'username phoneNumber');

    res.status(200).json({
        status: 'success',
        results: handoffs.length,
        data: { handoffs }
    });
});

const getHandoffById = asyncHandler(async (req, res, next) => {
    const { handoffId } = req.params;
    const isObjectId = mongoose.isValidObjectId(handoffId);

    const query = isObjectId ? { _id: handoffId } : { handoffId };

    if (req.user.role === 'supervisor' || req.user.role === 'driver') {
        query.company = req.user.company;
    }

    if (req.user.role === 'driver') {
        query.$or = [
            { 'sender.user': req.user.id },
            { 'receiver.user': req.user.id }
        ];
    }

    const handoff = await Handoff.findOne(query)
        .populate('session', 'sessionId status')
        .populate('sender.user', 'username phoneNumber')
        .populate('receiver.user', 'username phoneNumber');

    if (!handoff) {
        return next(new AppError('Handoff not found', 404));
    }

    res.status(200).json({
        status: 'success',
        data: { handoff }
    });
});

function applyConfirmationStatus(handoff) {
    const senderConfirmed = !!handoff.sender?.confirmedAt;
    const receiverConfirmed = !!handoff.receiver?.confirmedAt;

    if (senderConfirmed && receiverConfirmed) {
        handoff.status = 'completed';
        handoff.completedAt = handoff.completedAt || new Date();
        return;
    }

    if (senderConfirmed) {
        handoff.status = 'confirmed_by_sender';
        return;
    }

    if (receiverConfirmed) {
        handoff.status = 'confirmed_by_receiver';
        return;
    }

    handoff.status = 'pending';
}

const confirmHandoff = asyncHandler(async (req, res, next) => {
    const { handoffId } = req.params;
    const isObjectId = mongoose.isValidObjectId(handoffId);

    const query = isObjectId ? { _id: handoffId } : { handoffId };

    if (req.user.role === 'supervisor' || req.user.role === 'driver') {
        query.company = req.user.company;
    }

    const handoff = await Handoff.findOne(query);
    if (!handoff) {
        return next(new AppError('Handoff not found', 404));
    }

    if (handoff.status === 'completed') {
        return next(new AppError('Handoff already confirmed', 400));
    }
    if (['disputed', 'resolved', 'expired'].includes(handoff.status)) {
        return next(new AppError('Handoff cannot be confirmed in current status', 400));
    }

    const isSender = handoff.sender?.user && String(handoff.sender.user) === String(req.user.id);
    const isReceiver = handoff.receiver?.user && String(handoff.receiver.user) === String(req.user.id);

    if (req.user.role === 'driver' && !isSender && !isReceiver) {
        return next(new AppError('Not authorized for this handoff', 403));
    }

    if (isReceiver && !handoff.session) {
        const activeSession = await CollectionSession.findOne({
            driver: req.user.id,
            status: 'active'
        });
        if (activeSession) {
            handoff.session = activeSession._id;
            await CollectionSession.updateOne(
                { _id: activeSession._id },
                { $addToSet: { handoffs: handoff._id } }
            );
        }
    }

    if (isSender) {
        handoff.sender.confirmedAt = new Date();
        handoff.sender.role = req.user.role;
        handoff.sender.name = req.user.username;
    } else if (isReceiver || req.user.role !== 'driver') {
        handoff.receiver = {
            ...handoff.receiver?.toObject?.(),
            user: req.user.id,
            role: req.user.role,
            name: req.user.username,
            confirmedAt: new Date()
        };
    }

    applyConfirmationStatus(handoff);
    await handoff.save();

    if (handoff.status === 'completed' && handoff.session) {
        const nextStage = handoff.sequence === 1
            ? 'driver_to_incinerator'
            : 'completed';
        await CollectionSession.updateOne(
            { _id: handoff.session },
            { $set: { handoffState: { stage: nextStage, updatedAt: new Date() } } }
        );
    }

    res.status(200).json({
        status: 'success',
        data: { handoff }
    });
});

const confirmHandoffByToken = asyncHandler(async (req, res, next) => {
    const { token } = req.params;
    if (!token) {
        return next(new AppError('Token is required', 400));
    }

    const hashed = hashToken(token);
    const handoff = await Handoff.findOne({
        confirmationToken: hashed,
        tokenExpiresAt: { $gte: new Date() }
    });

    if (!handoff) {
        return next(new AppError('Handoff not found or token expired', 404));
    }

    if (handoff.status === 'completed') {
        return next(new AppError('Handoff already confirmed', 400));
    }
    if (['disputed', 'resolved', 'expired'].includes(handoff.status)) {
        return next(new AppError('Handoff cannot be confirmed in current status', 400));
    }

    handoff.receiver = {
        ...handoff.receiver?.toObject?.(),
        role: handoff.receiver?.role || 'incinerator_operator',
        confirmedAt: new Date()
    };

    applyConfirmationStatus(handoff);
    handoff.confirmationToken = undefined;
    handoff.tokenExpiresAt = undefined;
    await handoff.save();

    if (handoff.status === 'completed' && handoff.session) {
        await CollectionSession.updateOne(
            { _id: handoff.session },
            { $set: { handoffState: { stage: 'completed', updatedAt: new Date() } } }
        );
    }

    res.status(200).json({
        status: 'success',
        data: { handoff }
    });
});

const getPublicHandoff = asyncHandler(async (req, res, next) => {
    const { token } = req.params;
    if (!token) {
        return next(new AppError('Token is required', 400));
    }

    const hashed = hashToken(token);
    const handoff = await Handoff.findOne({
        confirmationToken: hashed,
        tokenExpiresAt: { $gte: new Date() }
    }).select('handoffId type containers totalContainers totalDeclaredWeight status createdAt tokenExpiresAt');

    if (!handoff) {
        return next(new AppError('Handoff not found or token expired', 404));
    }

    res.status(200).json({
        status: 'success',
        data: {
            handoff,
            expiresAt: handoff.tokenExpiresAt || null
        }
    });
});

const disputeHandoff = asyncHandler(async (req, res, next) => {
    const { handoffId } = req.params;
    const isObjectId = mongoose.isValidObjectId(handoffId);
    const query = isObjectId ? { _id: handoffId } : { handoffId };

    if (req.user.role === 'supervisor' || req.user.role === 'driver') {
        query.company = req.user.company;
    }

    const handoff = await Handoff.findOne(query);
    if (!handoff) {
        return next(new AppError('Handoff not found', 404));
    }

    if (handoff.status === 'completed') {
        return next(new AppError('Cannot dispute completed handoff', 400));
    }

    const isSender = handoff.sender?.user && String(handoff.sender.user) === String(req.user.id);

    if (req.user.role === 'driver' && !isSender) {
        return next(new AppError('Not authorized for this handoff', 403));
    }

    handoff.status = 'disputed';
    handoff.dispute = {
        raisedBy: req.user.id,
        role: req.user.role,
        reason: req.body.reason,
        description: req.body.description,
        photos: req.body.photos || [],
        resolvedBy: null,
        resolution: null,
        resolvedAt: null
    };

    await handoff.save();

    res.status(200).json({
        status: 'success',
        data: { handoff }
    });
});

const resolveHandoff = asyncHandler(async (req, res, next) => {
    const { handoffId } = req.params;
    const isObjectId = mongoose.isValidObjectId(handoffId);
    const query = isObjectId ? { _id: handoffId } : { handoffId };

    if (req.user.role === 'supervisor') {
        query.company = req.user.company;
    }

    const handoff = await Handoff.findOne(query);
    if (!handoff) {
        return next(new AppError('Handoff not found', 404));
    }

    if (handoff.status !== 'disputed') {
        return next(new AppError('Handoff is not disputed', 400));
    }

    handoff.status = 'resolved';
    handoff.dispute = {
        ...handoff.dispute?.toObject?.(),
        resolvedBy: req.user.id,
        resolution: req.body.resolution,
        resolvedAt: new Date()
    };

    await handoff.save();

    res.status(200).json({
        status: 'success',
        data: { handoff }
    });
});

const resendHandoffNotification = asyncHandler(async (req, res, next) => {
    const { handoffId } = req.params;
    const isObjectId = mongoose.isValidObjectId(handoffId);
    const query = isObjectId ? { _id: handoffId } : { handoffId };

    if (req.user.role === 'supervisor') {
        query.company = req.user.company;
    }

    const handoff = await Handoff.findOne(query);
    if (!handoff) {
        return next(new AppError('Handoff not found', 404));
    }

    const phone = handoff.receiver?.phone;
    if (!phone) {
        return next(new AppError('Receiver phone is missing', 400));
    }

    let message = `MedWaste: подтвердите прием отходов. Акт ${handoff.handoffId || handoff._id}`;
    if (handoff.type === 'driver_to_incinerator') {
        const token = generateConfirmationToken();
        handoff.confirmationToken = token.hashedToken;
        handoff.tokenExpiresAt = token.expiresAt;
        await handoff.save();
        message = `${message}. ${CONFIRMATION_BASE_URL}/${token.rawToken}`;
    }
    const recipient = {
        user: handoff.receiver?.user || null,
        phone,
        name: handoff.receiver?.name || ''
    };

    const smsResult = await sendSMS(phone, message);
    await logNotification({
        handoff,
        recipient,
        channel: 'sms',
        message,
        result: smsResult
    });

    const whatsappResult = await sendWhatsAppMessage(phone, message);
    await logNotification({
        handoff,
        recipient,
        channel: 'whatsapp',
        message,
        result: whatsappResult
    });

    res.status(200).json({
        status: 'success',
        data: {
            handoff,
            sms: smsResult,
            whatsapp: whatsappResult
        }
    });
});

const getHandoffNotifications = asyncHandler(async (req, res) => {
    const { handoffId } = req.params;
    const isObjectId = mongoose.isValidObjectId(handoffId);
    const query = isObjectId ? { _id: handoffId } : { handoffId };

    if (req.user.role === 'supervisor') {
        query.company = req.user.company;
    }

    const handoff = await Handoff.findOne(query).select('_id company');
    if (!handoff) {
        return res.status(404).json({
            status: 'fail',
            message: 'Handoff not found'
        });
    }

    const logs = await NotificationLog.find({ handoff: handoff._id })
        .sort({ createdAt: -1 })
        .limit(50);

    res.status(200).json({
        status: 'success',
        results: logs.length,
        data: { logs }
    });
});

const getHandoffChain = asyncHandler(async (req, res, next) => {
    const { sessionId } = req.params;
    const isObjectId = mongoose.isValidObjectId(sessionId);
    const session = isObjectId
        ? await CollectionSession.findById(sessionId).select('_id company handoffChainId handoffState')
        : await CollectionSession.findOne({ sessionId }).select('_id company handoffChainId handoffState');

    if (!session) {
        return next(new AppError('Collection session not found', 404));
    }

    if (req.user.role === 'supervisor' && session.company &&
        String(session.company) !== String(req.user.company || '')) {
        return next(new AppError('Session belongs to another company', 403));
    }

    if (req.user.role === 'driver') {
        const hasAccess = await CollectionSession.exists({
            _id: session._id,
            driver: req.user.id
        });
        if (!hasAccess) {
            return next(new AppError('You do not have permission to view this session', 403));
        }
    }

    const handoffs = await Handoff.find({ session: session._id })
        .sort({ sequence: 1, createdAt: 1 });

    res.status(200).json({
        status: 'success',
        data: {
            chainId: session.handoffChainId || null,
            state: session.handoffState?.stage || 'none',
            handoffs
        }
    });
});

module.exports = {
    createHandoff,
    getHandoffs,
    getHandoffById,
    confirmHandoff,
    confirmHandoffByToken,
    getPublicHandoff,
    disputeHandoff,
    resolveHandoff,
    resendHandoffNotification,
    getHandoffNotifications,
    getHandoffChain
};
