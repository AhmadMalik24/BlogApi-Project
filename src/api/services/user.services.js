import { User, BankAccount } from "../../database/models/index.js";

import { buildCustomAccountPayload } from "../../utils/helpers.js";
import { stripe } from "../../config/stripe.js";
const UpdateUserDetails = async (userId, updateData) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('User not found');
    }

    // Update only the fields that are provided in updateData
    Object.keys(updateData).forEach((key) => {
        if (updateData[key] !== undefined) {
            user[key] = updateData[key];
        }
    });

    await user.save();
    return user;
};

const GetUserDetails = async (userId) => {
    const user = await User.findById(userId).select('-password -__v -stripeConnectAccountId -savedPaymentMethods'); // Exclude sensitive fields like password and version key
    if (!user) {
        throw new Error('User not found');
    }
    const BankAccounts = await BankAccount.find({ user: user.id });
    console.log("Bank Accounts:", BankAccounts);
    return { user, BankAccounts };
};

const SaveStripeOnboardingProfile = async (userId, profile) => {
    const [month, day, year] = profile.dateOfBirth.split('/').map(Number);
    const dateOfBirth = new Date(Date.UTC(year, month - 1, day));
    if (Number.isNaN(dateOfBirth.getTime()) || dateOfBirth.getUTCMonth() !== month - 1 || dateOfBirth.getUTCDate() !== day) {
        throw new Error('dateOfBirth must be a real date in MM/DD/YYYY format');
    }

    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    user.stripeOnboardingProfile = {
        ...profile,
        email: profile.email.toLowerCase(),
        homeAddress: { ...profile.homeAddress, country: 'AU' },
        dateOfBirth
    };
    await user.save();

    // ==========================================
    // CLEAN STRIPE SYNC LOGIC USING UTILITY
    // ==========================================
    if (user.stripeConnectAccountId) {
        try {
            // Pass true because we are updating an existing account!
            const updatePayload = buildCustomAccountPayload(user, true);

            await stripe.accounts.update(user.stripeConnectAccountId, updatePayload);
            console.log(`✅ Successfully synced KYC data to Stripe for account: ${user.stripeConnectAccountId}`);

        } catch (stripeError) {
            console.error('❌ Stripe Sync Error:', stripeError.message);
            throw new Error(`Profile saved locally, but Stripe rejected the data: ${stripeError.message}`);
        }
    }

    return user.stripeOnboardingProfile;
};

export { UpdateUserDetails, GetUserDetails, SaveStripeOnboardingProfile };
