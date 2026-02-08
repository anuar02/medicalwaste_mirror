require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const PHONE_REGEX = /^\+[1-9]\d{6,14}$/;

function normalizePhone(value) {
    if (!value) return '';
    return String(value).replace(/[^\d+]/g, '');
}

function generatePhoneFromId(id) {
    const hex = String(id).slice(-8);
    const num = parseInt(hex, 16) % 1e9;
    const suffix = String(num).padStart(9, '0');
    return `+7${suffix}`;
}

function deriveNames({ firstName, lastName, username, email }) {
    const existingFirst = firstName?.trim();
    const existingLast = lastName?.trim();
    if (existingFirst && existingLast) {
        return { firstName: existingFirst, lastName: existingLast };
    }

    const source = (username || '').trim() || (email || '').split('@')[0] || '';
    const parts = source.split(/[\s._-]+/).filter(Boolean);

    if (parts.length >= 2) {
        return {
            firstName: existingFirst || parts[0],
            lastName: existingLast || parts[1]
        };
    }

    if (parts.length === 1) {
        return {
            firstName: existingFirst || parts[0],
            lastName: existingLast || 'Unknown'
        };
    }

    return {
        firstName: existingFirst || 'Unknown',
        lastName: existingLast || 'User'
    };
}

async function run() {
    const dryRun = process.argv.includes('--dry-run');

    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const users = await User.find({
            $or: [
                { firstName: { $exists: false } },
                { firstName: '' },
                { lastName: { $exists: false } },
                { lastName: '' },
                { phoneNumber: { $exists: false } },
                { phoneNumber: '' }
            ]
        });

        let updated = 0;

        for (const user of users) {
            const updates = {};

            const names = deriveNames(user);
            if (!user.firstName || user.firstName.trim() === '') updates.firstName = names.firstName;
            if (!user.lastName || user.lastName.trim() === '') updates.lastName = names.lastName;

            const normalizedPhone = normalizePhone(user.phoneNumber);
            if (normalizedPhone && PHONE_REGEX.test(normalizedPhone)) {
                if (normalizedPhone !== user.phoneNumber) updates.phoneNumber = normalizedPhone;
            } else if (!normalizedPhone) {
                updates.phoneNumber = generatePhoneFromId(user._id);
            } else {
                updates.phoneNumber = generatePhoneFromId(user._id);
            }

            if (Object.keys(updates).length === 0) continue;

            updated += 1;
            if (!dryRun) {
                await User.updateOne({ _id: user._id }, updates, { runValidators: true });
            }
        }

        console.log(`Processed ${users.length} users. ${dryRun ? 'Would update' : 'Updated'} ${updated}.`);
        process.exit(0);
    } catch (error) {
        console.error('Backfill failed:', error);
        process.exit(1);
    }
}

run();
