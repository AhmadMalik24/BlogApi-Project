import mongoose from 'mongoose';
import { User, BankAccount, Withdrawal } from '../../database/models/index.js';
import { stripe, walletCurrency } from '../../config/stripe.js';
import crypto from 'crypto';

const PLATFORM_COUNTRY = process.env.STRIPE_PLATFORM_COUNTRY?.toUpperCase();

const industryToMcc = {
    software: '7372',
    'computer software': '7372'
};

const prefillStripeConnectAccount = async (user, stripeConnectAccountId) => {
    const profile = user.stripeOnboardingProfile;
    if (!profile) return;

    const address = profile.homeAddress;
    const stripeAddress = address ? {
        country: 'AU',
        line1: address.streetAddress,
        line2: address.apartmentUnit || undefined,
        city: address.suburb,
        state: address.state,
        postal_code: address.postalCode
    } : undefined;
    const dateOfBirth = profile.dateOfBirth ? new Date(profile.dateOfBirth) : null;
    const dob = dateOfBirth ? {
        day: dateOfBirth.getUTCDate(),
        month: dateOfBirth.getUTCMonth() + 1,
        year: dateOfBirth.getUTCFullYear()
    } : undefined;

    const accountData = {
        business_type: profile.businessType === 'company' ? 'company' : 'individual',
        business_profile: {
            url: profile.website || undefined,
            product_description: profile.productDescription || undefined,
            mcc: industryToMcc[profile.industry?.toLowerCase()] || undefined
        },
        metadata: {
            platformUserId: user._id.toString(),
            declaredBusinessType: profile.businessType,
            declaredIndustry: profile.industry || ''
        }
    };

    if (profile.businessType === 'company') {
        accountData.company = {
            name: profile.legalBusinessName,
            phone: profile.phoneNumber,
            address: stripeAddress,
            tax_id: profile.hasABN ? profile.abnNumber : undefined
        };
    } else {
        accountData.individual = {
            first_name: profile.legalFirstName,
            last_name: profile.legalLastName,
            email: profile.email,
            phone: profile.phoneNumber,
            dob,
            address: stripeAddress
        };
    }

    await stripe.accounts.update(stripeConnectAccountId, accountData);
};

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
                // Using Stripe v2
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

                // Fallback: Try v1 
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
                        currency: walletCurrency,
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
            message: 'Bank account added. Complete Stripe Connect onboarding before requesting a withdrawal.'
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

    const redirectUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const returnUrl = `${redirectUrl}/withdrawal/onboarding/complete`;
    const refreshUrl = `${redirectUrl}/withdrawal/onboarding/refresh`;

    console.log('🔗 Checking Stripe onboarding status for account:', stripeConnectAccountId);
    let accountDetails = await stripe.accounts.retrieve(stripeConnectAccountId);
    const detailsSubmitted = accountDetails?.details_submitted === true;

    // Stripe locks regulated identity fields after the hosted form is submitted. Prefill only
    // before that point; repeated calls after onboarding must be read-only status checks.
    if (!detailsSubmitted) {
        await prefillStripeConnectAccount(user, stripeConnectAccountId);
        accountDetails = await stripe.accounts.retrieve(stripeConnectAccountId);
    }

    const finalDetailsSubmitted = accountDetails?.details_submitted === true;
    const finalTransfersEnabled = accountDetails?.capabilities?.transfers?.status === 'active';
    const finalPayoutsEnabled = accountDetails?.payouts_enabled === true;
    const isOnboarded = finalDetailsSubmitted
        && (accountDetails?.capabilities?.transfers?.status === 'active' || accountDetails?.payouts_enabled === true);

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

    if (finalDetailsSubmitted) {
        return {
            success: true,
            status: 'pending_activation',
            message: 'Your Stripe details were submitted and Stripe is activating payouts. This can take a few moments; please try your withdrawal again shortly.',
            stripeConnectAccountId,
            onboardingUrl: null,
            transfersEnabled: finalTransfersEnabled,
            payoutsEnabled: finalPayoutsEnabled
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

const VerifyBankAccount = async (userId, bankAccountId) => {
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

        // Connect external accounts are validated through Stripe Connect onboarding. There is no
        // API in this integration that verifies client-supplied microdeposit amounts, so we only
        // trust the status returned by Stripe.
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

        const bankAccount = await BankAccount.findOne({
            _id: bankAccountId,
            user: userId
        }).session(session);

        if (!bankAccount) {
            throw new Error('Bank account not found');
        }

        // Keep Stripe and MongoDB in sync: removing only the local record leaves an active
        // external account that could still receive Connect payouts.
        await stripe.accounts.deleteExternalAccount(
            bankAccount.stripeConnectAccountId,
            bankAccount.bankAccountId
        );
        await bankAccount.deleteOne({ session });
        console.log('✅ Bank account deleted from Stripe and MongoDB');

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

const RequestWithdrawal = async (userId, amount, bankAccountId, requestIdempotencyKey) => {
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

        // CHECK 4: Stripe connected account must be transfer-enabled and onboarded.
        // Returning from Stripe's form can precede activation, so distinguish that temporary
        // state from incomplete onboarding.
        const connectedAccount = await stripe.accounts.retrieve(bankAccount.stripeConnectAccountId);
        const detailsSubmitted = connectedAccount?.details_submitted === true;
        const transfersEnabled = connectedAccount?.capabilities?.transfers?.status === 'active';
        const payoutsEnabled = connectedAccount?.payouts_enabled === true;

        if (!transfersEnabled && !payoutsEnabled) {
            const error = new Error(
                detailsSubmitted
                    ? 'Your Stripe account is being activated. Please try your withdrawal again shortly.'
                    : 'Complete Stripe payout onboarding before withdrawing funds.'
            );
            error.statusCode = 409;
            throw error;
        }

        // CALCULATE: retain 5% on the platform and transfer only the remainder.
        const amountInCents = Math.round(amount * 100);
        const feeInCents = Math.round(amountInCents * 0.05);
        const netAmountInCents = amountInCents - feeInCents;
        if (netAmountInCents < 50) {
            throw new Error('Withdrawal amount is too small after the 5% platform fee. Minimum withdrawal is $0.53.');
        }
        const fee = feeInCents / 100;
        const netAmount = netAmountInCents / 100;
        console.log(`💸 Amount: $${amount}, Fee: $${fee}, Net: $${netAmount}`);

        const idempotencyKey = requestIdempotencyKey || crypto.randomUUID();
        const existingWithdrawal = await Withdrawal.findOne({ user: userId, idempotencyKey }).session(session);
        if (existingWithdrawal) {
            await session.commitTransaction();
            session.endSession();
            return {
                success: existingWithdrawal.status !== 'failed',
                withdrawalId: existingWithdrawal._id,
                amount: existingWithdrawal.amount,
                netAmount: existingWithdrawal.netAmount,
                fee: existingWithdrawal.fee,
                status: existingWithdrawal.status,
                stripeTransferId: existingWithdrawal.stripeTransferId,
                bankAccountLast4: existingWithdrawal.bankAccountLast4,
                expectedArrival: existingWithdrawal.expectedArrival,
                message: 'This withdrawal request was already processed.'
            };
        }

        // Reserve the wallet amount and create the local withdrawal before calling Stripe.
        // This prevents two concurrent requests from spending the same wallet balance.
        const withdrawal = new Withdrawal({
            user: userId,
            bankAccount: bankAccountId,
            amount: amountInCents / 100,
            fee,
            netAmount,
            bankAccountLast4: bankAccount.last4,
            status: 'pending',
            idempotencyKey,
            requestedAt: new Date(),
            expectedArrival: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
            metadata: { bankName: bankAccount.bankName, currency: walletCurrency }
        });

        user.walletBalance -= amountInCents / 100;
        await user.save({ session });
        await withdrawal.save({ session });
        await session.commitTransaction();
        session.endSession();

        // CREATE: Transfer on Stripe
        console.log('🔄 Creating Stripe transfer...');

        let stripeTransfer;
        try {
            stripeTransfer = await stripe.transfers.create({
                amount: netAmountInCents,
                currency: walletCurrency,
                destination: bankAccount.stripeConnectAccountId,
                description: `Wallet withdrawal to ${bankAccount.last4}`,
                metadata: {
                    userId: userId.toString(),
                    bankAccountId: bankAccount._id.toString(),
                    withdrawalId: withdrawal._id.toString(),
                    grossAmount: (amountInCents / 100).toFixed(2),
                    platformFee: fee.toFixed(2),
                    netAmount: netAmount.toFixed(2)
                }
            }, { idempotencyKey });

            console.log('✅ Stripe transfer created:', stripeTransfer.id);
        } catch (stripeError) {
            console.error('❌ Stripe transfer failed:', stripeError.message);

            if (stripeError.message && stripeError.message.includes("restricted outside of your platform's region")) {
                throw new Error('Transfer failed: the destination bank account country does not match your Stripe platform country. Set STRIPE_PLATFORM_COUNTRY to the same country as your Stripe account and use a bank account in that region.');
            }

            // The reserved amount was never sent. Atomically refund it once.
            const refundSession = await mongoose.startSession();
            try {
                refundSession.startTransaction();
                const reservedWithdrawal = await Withdrawal.findOneAndUpdate(
                    { _id: withdrawal._id, status: 'pending' },
                    { status: 'failed', failureReason: stripeError.message, failureCode: stripeError.code, failedAt: new Date() },
                    { new: true, session: refundSession }
                );
                if (reservedWithdrawal) {
                    await User.updateOne({ _id: userId }, { $inc: { walletBalance: amountInCents / 100 } }, { session: refundSession });
                }
                await refundSession.commitTransaction();
            } finally {
                refundSession.endSession();
            }

            throw new Error(`Transfer failed: ${stripeError.message}`);
        }

        await Withdrawal.updateOne(
            { _id: withdrawal._id },
            { status: 'processing', stripeTransferId: stripeTransfer.id }
        );
        console.log('✅ Withdrawal record created:', withdrawal._id);

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
        if (session.inTransaction()) await session.abortTransaction();
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
