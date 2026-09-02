import mongoose from 'mongoose';
import { User, BankAccount, Withdrawal } from '../../database/models/index.js';

async function handleTransferReversed(transfer) {
    // A partial reversal may still be paid out. It needs manual reconciliation rather than a
    // full wallet refund, so only automate the unambiguous full-reversal case.
    if (transfer.amount_reversed < transfer.amount) {
        console.warn(`Transfer ${transfer.id} was only partially reversed; manual reconciliation required`);
        return { ignored: true };
    }
    const session = await mongoose.startSession();
    try {
        session.startTransaction();
        const withdrawal = await Withdrawal.findOneAndUpdate(
            { stripeTransferId: transfer.id, status: 'processing' },
            { status: 'failed', failureReason: 'Stripe reversed the transfer', failedAt: new Date() },
            { new: true, session }
        );
        if (withdrawal) {
            await User.updateOne({ _id: withdrawal.user }, { $inc: { walletBalance: withdrawal.amount } }, { session });
        }
        await session.commitTransaction();
    } catch (error) {
        if (session.inTransaction()) await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}

async function handlePayoutEvent(eventType, payout, connectedAccountId) {
    // Automatic payouts can bundle transfers. Only update the local record if the payout maps
    // unambiguously to one withdrawal by connected account, destination bank, and net amount.
    if (!connectedAccountId) return { ignored: true };
    const bankAccount = await BankAccount.findOne({
        stripeConnectAccountId: connectedAccountId,
        bankAccountId: payout.destination
    });
    if (!bankAccount) return { ignored: true };
    const candidates = await Withdrawal.find({
        bankAccount: bankAccount._id,
        status: 'processing',
        netAmount: payout.amount / 100
    }).sort({ requestedAt: 1 }).limit(2);
    if (candidates.length !== 1) {
        console.warn(`Cannot uniquely match payout ${payout.id} to a withdrawal`);
        return { ignored: true };
    }
    const withdrawal = candidates[0];
    withdrawal.stripePayoutId = payout.id;
    if (eventType === 'payout.paid') {
        withdrawal.status = 'completed';
        withdrawal.completedAt = new Date();
    } else {
        withdrawal.status = 'failed';
        withdrawal.failureReason = payout.failure_message || 'Stripe payout failed';
        withdrawal.failureCode = payout.failure_code;
        withdrawal.failedAt = new Date();
    }
    await withdrawal.save();
    return { success: true };
}

export { handleTransferReversed, handlePayoutEvent };
