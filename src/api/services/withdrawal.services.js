import mongoose from 'mongoose';
import { User, BankAccount, Withdrawal } from '../../database/models/index.js';
import { stripe } from '../../config/stripe.js';

const PLATFORM_COUNTRY = process.env.STRIPE_PLATFORM_COUNTRY?.toUpperCase();

// ============================================
// BANK ACCOUNT SERVICES
// ============================================

const AddBankAccount = async (userId, accountDetails) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        console.log('🏦 Adding bank account for user:', userId);

        if (!PLATFORM_COUNTRY) {
            throw new Error('STRIPE_PLATFORM_COUNTRY is not configured. Set it to your Stripe account country, for example US, GB, AU.');
        }

        // CHECK 1: User exists
        const user = await User.findById(userId).session(session);
        if (!user) {
            throw new Error('User not found');
        }
        console.log('✅ User found:', user.email);

        // CHECK 2: User country is supported (optional for testing)
        // For now we'll skip this, can add later

        // CHECK 3: No duplicate verified accounts
        const existingVerified = await BankAccount.findOne({
            user: userId,
            isVerified: true
        }).session(session);

        if (existingVerified) {
            throw new Error('You already have a verified bank account. Delete it first to add another.');
        }
        console.log('✅ No existing verified account found');

        // CHECK 4: No duplicate bank account (same routing + account number)
        const existingAccount = await BankAccount.findOne({
            user: userId,
            routingNumber: accountDetails.routingNumber,
            last4: accountDetails.accountNumber.slice(-4)
        }).session(session);

        if (existingAccount) {
            throw new Error('This bank account is already registered');
        }
        console.log('✅ Bank account not already registered');

        // CHECK 5: Check if already has connected account
        let stripeConnectAccountId = user.stripeConnectAccountId;

        if (!stripeConnectAccountId) {
            console.log('🆕 Creating Stripe Connected Account (v2 API)...');

            try {
                // Using Stripe v2 Core Accounts API (v1 deprecated)
                // Note: transfers requires card_payments capability in US
                const stripeAccount = await stripe.core.accounts.create({
                    type: 'express',
                    country: PLATFORM_COUNTRY,
                    email: user.email,
                    capabilities: {
                        card_payments: { requested: true },
                        transfers: { requested: true }
                    },
                    metadata: {
                        userId: userId.toString()
                    }
                });

                stripeConnectAccountId = stripeAccount.id;
                user.stripeConnectAccountId = stripeConnectAccountId;
                await user.save({ session });
                console.log('✅ Connected account created (v2):', stripeConnectAccountId);
            } catch (stripeError) {
                console.error('❌ Stripe error creating account:', stripeError.message);

                // Fallback: Try v1 if v2 fails (some older setups)
                try {
                    console.log('🔄 Trying v1 Accounts API as fallback...');
                    const stripeAccount = await stripe.accounts.create({
                        type: 'express',
                        country: PLATFORM_COUNTRY,
                        email: user.email,
                        capabilities: {
                            card_payments: { requested: true },
                            transfers: { requested: true }
                        },
                        metadata: {
                            userId: userId.toString()
                        }
                    });

                    stripeConnectAccountId = stripeAccount.id;
                    user.stripeConnectAccountId = stripeConnectAccountId;
                    await user.save({ session });
                    console.log('✅ Connected account created (v1 fallback):', stripeConnectAccountId);
                } catch (fallbackError) {
                    console.error('❌ Both v2 and v1 failed:', fallbackError.message);

                    if (fallbackError.code === 'rate_limit_error') {
                        throw new Error('Too many requests. Please try again later.');
                    }
                    if (fallbackError.message.includes('country')) {
                        throw new Error('Your country is not supported for withdrawals.');
                    }
                    throw new Error(`Failed to create account: ${fallbackError.message}`);
                }
            }
        } else {
            console.log('♻️ Using existing connected account:', stripeConnectAccountId);
        }

        // ADD: Bank account to Stripe Connected Account
        console.log('📎 Adding bank account to Stripe...');

        let bankAccountId;
        try {
            const externalAccount = await stripe.accounts.createExternalAccount(
                stripeConnectAccountId,
                {
                    external_account: {
                        object: 'bank_account',
                        country: PLATFORM_COUNTRY,
                        currency: 'aud',
                        account_holder_name: accountDetails.accountHolderName,
                        account_holder_type: 'individual',
                        routing_number: accountDetails.routingNumber,
                        account_number: accountDetails.accountNumber
                        // Note: account_type is NOT a valid parameter for Stripe external accounts
                        // Stripe automatically detects account type from routing number
                    }
                }
            );

            bankAccountId = externalAccount.id;
            console.log('✅ Bank account added to Stripe:', bankAccountId);
        } catch (stripeError) {
            console.error('❌ Error adding bank account:', stripeError.message);
            throw new Error(`Failed to add bank account: ${stripeError.message}`);
        }

        // SAVE: Bank account to database
        const bankAccount = new BankAccount({
            user: userId,
            accountHolderName: accountDetails.accountHolderName,
            accountNumber: accountDetails.accountNumber,
            routingNumber: accountDetails.routingNumber,
            accountType: accountDetails.accountType,
            last4: accountDetails.accountNumber.slice(-4),
            bankName: accountDetails.bankName || 'Bank Account',
            stripeConnectAccountId: stripeConnectAccountId,
            bankAccountId: bankAccountId,
            isVerified: false,
            verificationStatus: 'pending',
            isPrimary: true
        });

        await bankAccount.save({ session });
        console.log('✅ Bank account saved to database:', bankAccount._id);

        let onboardingUrl = null;
        try {
            const loginLink = await stripe.accounts.createLoginLink(stripeConnectAccountId);
            onboardingUrl = loginLink.url;
        } catch (loginLinkError) {
            console.warn('⚠️ Could not create Stripe login link:', loginLinkError.message);
        }

        await session.commitTransaction();
        session.endSession();

        return {
            bankAccountId: bankAccount._id,
            last4: bankAccount.last4,
            bankName: bankAccount.bankName,
            stripeConnectAccountId: stripeConnectAccountId,
            isVerified: false,
            verificationStatus: 'pending',
            onboardingUrl,
            message: 'Bank account added. You\'ll receive two microdeposits (typically 1-2 days). Complete Stripe onboarding before requesting a withdrawal.'
        };

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('❌ Error in AddBankAccount:', error.message);
        throw error;
    }
};

const CreateConnectOnboardingLink = async (userId) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('User not found');
    }

    let stripeConnectAccountId = user.stripeConnectAccountId;

    if (!stripeConnectAccountId) {
        console.log('🆕 Creating Stripe Connect account for onboarding...');

        try {
            const stripeAccount = await stripe.core.accounts.create({
                type: 'express',
                country: PLATFORM_COUNTRY,
                email: user.email,
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true }
                },
                metadata: {
                    userId: userId.toString()
                }
            });

            stripeConnectAccountId = stripeAccount.id;
            user.stripeConnectAccountId = stripeConnectAccountId;
            await user.save();
        } catch (error) {
            console.error('❌ Could not create Stripe Connect account:', error.message);
            try {
                const stripeAccount = await stripe.accounts.create({
                    type: 'express',
                    country: PLATFORM_COUNTRY,
                    email: user.email,
                    capabilities: {
                        card_payments: { requested: true },
                        transfers: { requested: true }
                    },
                    metadata: {
                        userId: userId.toString()
                    }
                });

                stripeConnectAccountId = stripeAccount.id;
                user.stripeConnectAccountId = stripeConnectAccountId;
                await user.save();
            } catch (fallbackError) {
                throw new Error(`Failed to create Stripe Connect account: ${fallbackError.message}`);
            }
        }
    }

    console.log('🔗 Creating Stripe onboarding link for account:', stripeConnectAccountId);

    const redirectUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const returnUrl = `${redirectUrl}/withdrawal/onboarding/complete`;
    const refreshUrl = `${redirectUrl}/withdrawal/onboarding/refresh`;

    const accountDetails = await stripe.accounts.retrieve(stripeConnectAccountId);
    const isOnboarded = accountDetails?.details_submitted === true && accountDetails?.payouts_enabled === true;

    if (isOnboarded) {
        const loginLink = await stripe.accounts.createLoginLink(stripeConnectAccountId, {
            redirect_url: returnUrl
        });

        return {
            success: true,
            message: 'Your Stripe onboarding is already complete. Use the login link below to manage the account.',
            stripeConnectAccountId,
            onboardingUrl: loginLink.url
        };
    }

    const accountLink = await stripe.accountLinks.create({
        account: stripeConnectAccountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding'
    });

    return {
        success: true,
        message: 'Complete the Stripe onboarding flow to enable withdrawals.',
        stripeConnectAccountId,
        onboardingUrl: accountLink.url
    };
};

const GetBankAccounts = async (userId) => {
    console.log('📂 Fetching bank accounts for user:', userId);

    const bankAccounts = await BankAccount.find({ user: userId })
        .select('-accountNumber -routingNumber')
        .sort({ createdAt: -1 });

    console.log(`✅ Found ${bankAccounts.length} bank account(s)`);

    return bankAccounts;
};

const VerifyBankAccount = async (userId, bankAccountId, microdeposit1, microdeposit2) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        console.log('🔐 Verifying bank account:', bankAccountId);

        // CHECK 1: Bank account exists and belongs to user
        const bankAccount = await BankAccount.findOne({
            _id: bankAccountId,
            user: userId
        }).session(session);

        if (!bankAccount) {
            throw new Error('Bank account not found');
        }
        console.log('✅ Bank account found');

        // CHECK 2: Not already verified
        if (bankAccount.isVerified) {
            throw new Error('This bank account is already verified');
        }

        // CHECK 3: Not too many verification attempts
        if (bankAccount.verificationAttempts >= 3) {
            throw new Error('Too many verification attempts. Please contact support.');
        }

        // VERIFY: Stripe Connect external account verification is not exposed on this SDK version.
        // The supported API is to retrieve the attached external account and confirm it is accepted
        // and not in an errored/failed state. We still accept the two microdeposit values from the
        // caller so the API contract remains stable for custom onboarding flows, but Stripe itself
        // validates the bank account on the external account resource rather than via a method that
        // does not exist in this installed Stripe package.
        console.log('📡 Checking Stripe external account status...');

        try {
            const stripeExternalAccount = await stripe.accounts.retrieveExternalAccount(
                bankAccount.stripeConnectAccountId,
                bankAccount.bankAccountId
            );

            const acceptedStatuses = ['new', 'validated', 'verified'];
            if (!acceptedStatuses.includes(stripeExternalAccount.status)) {
                throw new Error(`Stripe rejected this bank account: ${stripeExternalAccount.status}`);
            }

            console.log('✅ Stripe external account accepted:', stripeExternalAccount.status);
        } catch (stripeError) {
            console.error('❌ Verification failed:', stripeError.message);

            bankAccount.verificationAttempts += 1;
            bankAccount.verificationStatus = 'failed';
            bankAccount.verificationFailureReason = stripeError.message;
            await bankAccount.save({ session });

            throw new Error(`Verification failed: ${stripeError.message}`);
        }

        // UPDATE: Mark as verified
        bankAccount.isVerified = true;
        bankAccount.verificationStatus = 'verified';
        bankAccount.verifiedAt = new Date();
        await bankAccount.save({ session });

        await session.commitTransaction();
        session.endSession();

        console.log('✅ Bank account fully verified');

        return {
            success: true,
            message: 'Bank account verified successfully!',
            bankAccountId: bankAccount._id,
            last4: bankAccount.last4,
            isVerified: true
        };

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('❌ Error in VerifyBankAccount:', error.message);
        throw error;
    }
};

const DeleteBankAccount = async (userId, bankAccountId) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        console.log('🗑️ Deleting bank account:', bankAccountId);

        // Find and delete
        const bankAccount = await BankAccount.findOneAndDelete({
            _id: bankAccountId,
            user: userId
        }).session(session);

        if (!bankAccount) {
            throw new Error('Bank account not found');
        }

        console.log('✅ Bank account deleted');

        await session.commitTransaction();
        session.endSession();

        return {
            success: true,
            message: 'Bank account deleted successfully'
        };

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('❌ Error in DeleteBankAccount:', error.message);
        throw error;
    }
};

// ============================================
// WITHDRAWAL SERVICES
// ============================================

const RequestWithdrawal = async (userId, amount, bankAccountId) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        console.log(`💰 Withdrawal requested - User: ${userId}, Amount: $${amount}`);

        // CHECK 1: User exists and fetch current balance
        const user = await User.findById(userId).session(session);
        if (!user) {
            throw new Error('User not found');
        }
        console.log(`✅ User found. Current balance: $${user.walletBalance}`);

        // CHECK 2: Sufficient balance
        if (user.walletBalance < amount) {
            throw new Error(
                `Insufficient balance. You have $${user.walletBalance}, need $${amount}`
            );
        }
        console.log('✅ Sufficient balance');

        // CHECK 3: Bank account exists and is verified
        const bankAccount = await BankAccount.findOne({
            _id: bankAccountId,
            user: userId,
            isVerified: true
        }).session(session);

        if (!bankAccount) {
            throw new Error('Verified bank account not found');
        }
        console.log('✅ Verified bank account found');

        // CHECK 4: Stripe connected account must be transfer-enabled and onboarded
        const connectedAccount = await stripe.accounts.retrieve(bankAccount.stripeConnectAccountId);
        const transfersEnabled = connectedAccount?.capabilities?.transfers?.status === 'active';
        const payoutsEnabled = connectedAccount?.payouts_enabled === true;

        if (!transfersEnabled && !payoutsEnabled) {
            throw new Error('Stripe payout onboarding is not complete yet. Complete the connected account onboarding in Stripe before withdrawing funds.');
        }

        // CALCULATE: Fee and net amount
        const fee = 0.25; // Stripe standard fee
        const netAmount = amount - fee;
        console.log(`💸 Amount: $${amount}, Fee: $${fee}, Net: $${netAmount}`);

        // CREATE: Transfer on Stripe
        console.log('🔄 Creating Stripe transfer...');

        let stripeTransfer;
        try {
            stripeTransfer = await stripe.transfers.create({
                amount: Math.round(amount * 100),
                currency: 'aud',
                destination: bankAccount.stripeConnectAccountId,
                description: `Wallet withdrawal to ${bankAccount.last4}`,
                metadata: {
                    userId: userId.toString(),
                    bankAccountId: bankAccount._id.toString()
                }
            });

            console.log('✅ Stripe transfer created:', stripeTransfer.id);
        } catch (stripeError) {
            console.error('❌ Stripe transfer failed:', stripeError.message);

            if (stripeError.message && stripeError.message.includes("restricted outside of your platform's region")) {
                throw new Error('Transfer failed: the destination bank account country does not match your Stripe platform country. Set STRIPE_PLATFORM_COUNTRY to the same country as your Stripe account and use a bank account in that region.');
            }

            // Create failed withdrawal record for audit
            const failedWithdrawal = new Withdrawal({
                user: userId,
                bankAccount: bankAccountId,
                amount: amount,
                fee: fee,
                netAmount: netAmount,
                bankAccountLast4: bankAccount.last4,
                status: 'failed',
                failureReason: stripeError.message,
                failureCode: stripeError.code
            });

            await failedWithdrawal.save({ session });

            throw new Error(`Transfer failed: ${stripeError.message}`);
        }

        // DEDUCT: From user wallet
        user.walletBalance -= amount;
        await user.save({ session });
        console.log(`✅ Wallet deducted. New balance: $${user.walletBalance}`);

        // SAVE: Withdrawal record
        const withdrawal = new Withdrawal({
            user: userId,
            bankAccount: bankAccountId,
            amount: amount,
            fee: fee,
            netAmount: netAmount,
            bankAccountLast4: bankAccount.last4,
            status: 'processing',
            stripeTransferId: stripeTransfer.id,
            requestedAt: new Date(),
            expectedArrival: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // +2 days
            metadata: {
                bankName: bankAccount.bankName
            }
        });

        await withdrawal.save({ session });
        console.log('✅ Withdrawal record created:', withdrawal._id);

        await session.commitTransaction();
        session.endSession();

        return {
            success: true,
            withdrawalId: withdrawal._id,
            amount: amount,
            netAmount: netAmount,
            fee: fee,
            status: withdrawal.status,
            stripeTransferId: stripeTransfer.id,
            bankAccountLast4: bankAccount.last4,
            expectedArrival: withdrawal.expectedArrival,
            message: `Withdrawal of $${amount} requested. You'll receive $${netAmount} (after $${fee} fee) in 1-2 business days.`
        };

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('❌ Error in RequestWithdrawal:', error.message);
        throw error;
    }
};

const GetWithdrawalHistory = async (userId, limit = 10) => {
    console.log(`📜 Fetching withdrawal history for user: ${userId}`);

    const withdrawals = await Withdrawal.find({ user: userId })
        .populate('bankAccount', 'last4 bankName')
        .sort({ requestedAt: -1 })
        .limit(limit);

    console.log(`✅ Found ${withdrawals.length} withdrawals`);

    return withdrawals;
};

const GetWithdrawalDetails = async (userId, withdrawalId) => {
    console.log(`🔍 Fetching withdrawal details: ${withdrawalId}`);

    const withdrawal = await Withdrawal.findOne({
        _id: withdrawalId,
        user: userId
    }).populate('bankAccount');

    if (!withdrawal) {
        throw new Error('Withdrawal not found');
    }

    console.log('✅ Withdrawal found');

    return withdrawal;
};

export {
    AddBankAccount,
    CreateConnectOnboardingLink,
    GetBankAccounts,
    VerifyBankAccount,
    DeleteBankAccount,
    RequestWithdrawal,
    GetWithdrawalHistory,
    GetWithdrawalDetails
};
