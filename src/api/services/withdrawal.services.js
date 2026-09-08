import mongoose from 'mongoose';
import { User, BankAccount, Withdrawal } from '../../database/models/index.js';
import { stripe, walletCurrency } from '../../config/stripe.js';
import crypto from 'crypto';
import {buildCustomAccountPayload} from "../../utils/helpers.js";


// ============================================
// BANK ACCOUNT SERVICES
// ============================================

const AddBankAccount = async (userId, accountDetails) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const user = await User.findById(userId).session(session);
        if (!user) throw new Error('User not found');

        const existingVerified = await BankAccount.findOne({
            user: userId,
            isVerified: true
        }).session(session);
        if (existingVerified) {
            throw new Error('You already have a verified bank account. Delete it first to add another.');
        }

        // 1. Create or retrieve Stripe Custom Connected Account
        let stripeConnectAccountId = user.stripeConnectAccountId;
        if (!stripeConnectAccountId) {
            const customAccountPayload = buildCustomAccountPayload(user);
            const stripeAccount = await stripe.accounts.create(customAccountPayload);

            stripeConnectAccountId = stripeAccount.id;
            user.stripeConnectAccountId = stripeConnectAccountId;
            await user.save({ session });
        }

        // 2. Attach External Bank Account using the secure token
        let externalAccount;
        try {
            externalAccount = await stripe.accounts.createExternalAccount(
                stripeConnectAccountId,
                {
                    // Pass the token ID directly instead of raw account details
                    external_account: accountDetails.bankTokenId 
                }
            );
        } catch (stripeError) {
            throw new Error(`Failed to attach bank account to Stripe: ${stripeError.message}`);
        }

        // 3. Prevent duplicate accounts by checking the fingerprint/last4 returned by Stripe
        const existingAccount = await BankAccount.findOne({
            user: userId,
            last4: externalAccount.last4
        }).session(session);
        if (existingAccount) {
            throw new Error('This bank account is already registered');
        }

        // 4. Save Bank Account Record locally using the safe data returned by Stripe
        const bankAccount = new BankAccount({
            user: userId,
            accountHolderName: externalAccount.account_holder_name || 'Bank Account',
            accountNumber: 'hidden', // No longer handling raw numbers
            routingNumber: externalAccount.routing_number || 'hidden',
            accountType: 'checking', // Stripe auto-detects this for external accounts
            last4: externalAccount.last4,
            bankName: externalAccount.bank_name || 'Bank Account',
            stripeConnectAccountId: stripeConnectAccountId,
            bankAccountId: externalAccount.id,
            isVerified: true, 
            verificationStatus: 'verified',
            isPrimary: true,
            verifiedAt: new Date()
        });

        console.log("Saving bank account:", bankAccount);

        await bankAccount.save({ session });
        await session.commitTransaction();
        session.endSession();

        return {
            bankAccountId: bankAccount._id,
            last4: bankAccount.last4,
            bankName: bankAccount.bankName,
            stripeConnectAccountId: stripeConnectAccountId,
            isVerified: true,
            verificationStatus: 'verified',
            onboardingUrl: null,
            message: 'Bank account added and linked successfully using a secure token.'
        };
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
};

const CreateConnectOnboardingLink = async (userId) => {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    let stripeConnectAccountId = user.stripeConnectAccountId;
    if (!stripeConnectAccountId) {
        const customAccountPayload = buildCustomAccountPayload(user);
        const stripeAccount = await stripe.accounts.create(customAccountPayload);
        stripeConnectAccountId = stripeAccount.id;
        user.stripeConnectAccountId = stripeConnectAccountId;
        await user.save();
    }

    const account = await stripe.accounts.retrieve(stripeConnectAccountId);

    // If requirements are pending, return the missing fields
    const requirements = account.requirements;
    const isReady = requirements?.currently_due?.length === 0 && account.payouts_enabled;

    return {
        success: true,
        isCustomAccount: true,
        stripeConnectAccountId,
        status: isReady ? 'active' : 'requirements_pending',
        requirementsDue: requirements?.currently_due || [],
        payoutsEnabled: account.payouts_enabled,
        transfersEnabled: account.capabilities?.transfers === 'active',
        message: isReady
            ? 'Your custom payout account is fully onboarded and active.'
            : 'Additional verification details are required for Stripe Custom onboarding.'
    };
};

const GetBankAccounts = async (userId) => {
    return await BankAccount.find({ user: userId })
        .select('-accountNumber -routingNumber')
        .sort({ createdAt: -1 });
};



const DeleteBankAccount = async (userId, bankAccountId) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const bankAccount = await BankAccount.findOne({ _id: bankAccountId, user: userId }).session(session);
        if (!bankAccount) throw new Error('Bank account not found');

        await stripe.accounts.deleteExternalAccount(
            bankAccount.stripeConnectAccountId,
            bankAccount.bankAccountId
        );

        await stripe.accounts.del(bankAccount.stripeConnectAccountId);

        await bankAccount.deleteOne({ session });

        await session.commitTransaction();
        session.endSession();
        return { success: true, message: 'Bank account deleted successfully' };
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
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
        const user = await User.findById(userId).session(session);
        if (!user) throw new Error('User not found');

        if (user.walletBalance < amount) {
            throw new Error(`Insufficient balance. You have $${user.walletBalance}, need $${amount}`);
        }

        const bankAccount = await BankAccount.findOne({
            _id: bankAccountId,
            user: userId,
            isVerified: true
        }).session(session);
        if (!bankAccount) throw new Error('Verified bank account not found');

        // Check payouts on the Custom Connect account
        const connectedAccount = await stripe.accounts.retrieve(bankAccount.stripeConnectAccountId);
        if (!connectedAccount.payouts_enabled) {
            const err = new Error('Your custom account is pending verification by Stripe before payouts can be made.');
            err.statusCode = 409;
            throw err;
        }

        const amountInCents = Math.round(amount * 100);
        const feeInCents = Math.round(amountInCents * 0.05);
        const netAmountInCents = amountInCents - feeInCents;

        if (netAmountInCents < 50) {
            throw new Error('Withdrawal amount is too small after the 5% platform fee. Minimum withdrawal is $0.53.');
        }

        const fee = feeInCents / 100;
        const netAmount = netAmountInCents / 100;
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

        // Deduct wallet balance and reserve record
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

        // 1. Transfer to Custom Account
        let stripeTransfer;
        try {
            stripeTransfer = await stripe.transfers.create({
                amount: netAmountInCents,
                currency: walletCurrency,
                destination: bankAccount.stripeConnectAccountId,
                description: `Custom wallet withdrawal to ${bankAccount.last4}`,
                metadata: {
                    userId: userId.toString(),
                    bankAccountId: bankAccount._id.toString(),
                    withdrawalId: withdrawal._id.toString()
                }
            }, { idempotencyKey: `tr_${idempotencyKey}` });
        } catch (stripeError) {
            // Revert balance on transfer failure
            await User.updateOne({ _id: userId }, { $inc: { walletBalance: amountInCents / 100 } });
            await Withdrawal.updateOne({ _id: withdrawal._id }, {
                status: 'failed',
                failureReason: stripeError.message,
                failedAt: new Date()
            });
            throw new Error(`Transfer failed: ${stripeError.message}`);
        }

        // 2. Trigger instant or manual Payout to External Account (Custom Connect capability)
        let stripePayout;
        try {
            stripePayout = await stripe.payouts.create({
                amount: netAmountInCents,
                currency: walletCurrency,
                destination: bankAccount.bankAccountId
            }, {
                stripeAccount: bankAccount.stripeConnectAccountId,
                idempotencyKey: `po_${idempotencyKey}`
            });
        } catch (payoutError) {
            console.warn(`Automatic payout failed (funds remain in Custom Connected Account): ${payoutError.message}`);
        }

        await Withdrawal.updateOne(
            { _id: withdrawal._id },
            {
                status: 'processing',
                stripeTransferId: stripeTransfer.id,
                stripePayoutId: stripePayout?.id || null
            }
        );

        return {
            success: true,
            withdrawalId: withdrawal._id,
            amount,
            netAmount,
            fee,
            status: 'processing',
            stripeTransferId: stripeTransfer.id,
            stripePayoutId: stripePayout?.id || null,
            bankAccountLast4: bankAccount.last4,
            expectedArrival: withdrawal.expectedArrival,
            message: `Withdrawal of $${amount} requested. $${netAmount} will arrive in 1-2 business days.`
        };
    } catch (error) {
        if (session.inTransaction()) await session.abortTransaction();
        session.endSession();
        throw error;
    }
};

const GetWithdrawalHistory = async (userId, limit = 10) => {
    return await Withdrawal.find({ user: userId })
        .populate('bankAccount', 'last4 bankName')
        .sort({ requestedAt: -1 })
        .limit(limit);
};

const GetWithdrawalDetails = async (userId, withdrawalId) => {
    const withdrawal = await Withdrawal.findOne({ _id: withdrawalId, user: userId }).populate('bankAccount');
    if (!withdrawal) throw new Error('Withdrawal not found');
    return withdrawal;
};

export {
    AddBankAccount,
    CreateConnectOnboardingLink,
    GetBankAccounts,
    DeleteBankAccount,
    RequestWithdrawal,
    GetWithdrawalHistory,
    GetWithdrawalDetails
};