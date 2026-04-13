const AppError = require('../utils/appError');

// Canonical status values — must match the enum in models/Handoff.js
const STATUSES = Object.freeze({
    CREATED: 'created',
    PENDING: 'pending',
    CONFIRMED_BY_SENDER: 'confirmed_by_sender',
    CONFIRMED_BY_RECEIVER: 'confirmed_by_receiver',
    COMPLETED: 'completed',
    DISPUTED: 'disputed',
    RESOLVING: 'resolving',
    RESOLVED: 'resolved',
    EXPIRED: 'expired'
});

const TERMINAL_STATUSES = new Set([
    STATUSES.COMPLETED,
    STATUSES.RESOLVED,
    STATUSES.EXPIRED
]);

// Allowed transitions. Any status change not listed here is rejected by
// assertTransition(). Terminal statuses have no outgoing edges.
const TRANSITIONS = Object.freeze({
    [STATUSES.CREATED]: [
        STATUSES.PENDING,
        STATUSES.CONFIRMED_BY_SENDER,
        STATUSES.EXPIRED
    ],
    [STATUSES.PENDING]: [
        STATUSES.CONFIRMED_BY_SENDER,
        STATUSES.CONFIRMED_BY_RECEIVER,
        STATUSES.COMPLETED,
        STATUSES.DISPUTED,
        STATUSES.EXPIRED
    ],
    [STATUSES.CONFIRMED_BY_SENDER]: [
        STATUSES.CONFIRMED_BY_RECEIVER,
        STATUSES.COMPLETED,
        STATUSES.DISPUTED,
        STATUSES.EXPIRED
    ],
    [STATUSES.CONFIRMED_BY_RECEIVER]: [
        STATUSES.CONFIRMED_BY_SENDER,
        STATUSES.COMPLETED,
        STATUSES.DISPUTED,
        STATUSES.EXPIRED
    ],
    [STATUSES.DISPUTED]: [
        STATUSES.RESOLVING,
        STATUSES.RESOLVED
    ],
    [STATUSES.RESOLVING]: [
        STATUSES.RESOLVED,
        STATUSES.DISPUTED
    ],
    [STATUSES.COMPLETED]: [],
    [STATUSES.RESOLVED]: [],
    [STATUSES.EXPIRED]: []
});

function isTerminal(status) {
    return TERMINAL_STATUSES.has(status);
}

function canTransition(from, to) {
    if (from === to) return true;
    const allowed = TRANSITIONS[from];
    if (!allowed) return false;
    return allowed.includes(to);
}

function assertTransition(handoff, to) {
    const from = handoff?.status;
    if (!canTransition(from, to)) {
        throw new AppError(
            `Invalid handoff transition: ${from} → ${to}`,
            409
        );
    }
}

/**
 * Compute the status a handoff should be in based on sender/receiver
 * confirmation timestamps. Does NOT mutate the handoff. Callers must validate
 * the target via assertTransition() before applying.
 *
 * Crucially, if the handoff is already in a dispute/terminal branch, that
 * branch is preserved — confirmation events cannot overwrite a dispute.
 *
 * @param {Object} handoff
 * @returns {string} target status
 */
function deriveConfirmationStatus(handoff) {
    if (isTerminal(handoff.status) || handoff.status === STATUSES.DISPUTED
        || handoff.status === STATUSES.RESOLVING) {
        return handoff.status;
    }

    const senderConfirmed = !!handoff.sender?.confirmedAt;
    const receiverConfirmed = !!handoff.receiver?.confirmedAt;

    if (senderConfirmed && receiverConfirmed) return STATUSES.COMPLETED;
    if (senderConfirmed) return STATUSES.CONFIRMED_BY_SENDER;
    if (receiverConfirmed) return STATUSES.CONFIRMED_BY_RECEIVER;
    return STATUSES.PENDING;
}

/**
 * Apply derived confirmation status to a handoff, validating the transition.
 * Mutates handoff in place. Sets completedAt when moving to completed.
 * Returns the new status.
 */
function applyConfirmation(handoff) {
    const target = deriveConfirmationStatus(handoff);
    if (target === handoff.status) return target;

    assertTransition(handoff, target);
    handoff.status = target;
    if (target === STATUSES.COMPLETED && !handoff.completedAt) {
        handoff.completedAt = new Date();
    }
    return target;
}

function canBeDisputed(handoff) {
    return !isTerminal(handoff.status)
        && handoff.status !== STATUSES.DISPUTED
        && handoff.status !== STATUSES.RESOLVING;
}

function canBeConfirmed(handoff) {
    return !isTerminal(handoff.status)
        && handoff.status !== STATUSES.DISPUTED
        && handoff.status !== STATUSES.RESOLVING;
}

module.exports = {
    STATUSES,
    TRANSITIONS,
    isTerminal,
    canTransition,
    assertTransition,
    deriveConfirmationStatus,
    applyConfirmation,
    canBeDisputed,
    canBeConfirmed
};
