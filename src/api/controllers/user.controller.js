import catchAsync from "../../utils/catchAsync.js";

import { UpdateUserDetails, GetUserDetails, SaveStripeOnboardingProfile } from "../services/user.services.js";


const getUserDetails = catchAsync(async (req, res) => {
    console.log("User ID:", req.user.id);
    const { user, BankAccounts } = await GetUserDetails(req.user.id);

    res.status(200).json({
        message: 'User details fetched successfully',
        userDetails: {
            user,
            bankAccounts: BankAccounts.map(account => ({
                accountHolderName: account.accountHolderName,
                last4: account.last4,
                AccountType: account.accountType,
                bankName: account.bankName,
                isPrimary: account.isPrimary
            }))
        }
    });
});

const updateUserDetails = catchAsync(async (req, res) => {
    console.log("User ID:", req.user.id); // Log the user ID to verify it's being passed correctly
    const user = req.user.id; // Assuming the user is attached to the request object after authentication
    const updateData = req.body; // The data to update, sent in the request body
    const updatedUser = await UpdateUserDetails(req.user.id, updateData);
    res.status(200).json({ message: 'User details updated successfully', user: updatedUser });
});

const saveStripeOnboardingProfile = catchAsync(async (req, res) => {
    const profile = await SaveStripeOnboardingProfile(req.user.id, req.body);
    res.status(200).json({
        message: 'Stripe onboarding profile saved successfully',
        data: profile
    });
});

export { getUserDetails, updateUserDetails, saveStripeOnboardingProfile };
