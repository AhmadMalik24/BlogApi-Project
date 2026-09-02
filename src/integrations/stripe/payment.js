import mongoose from 'mongoose';
import Payment from '../../database/models/Payment.model.js';
import User from '../../database/models/User.model.js';

const isWalletRecharge = (paymentIntent) => paymentIntent.metadata?.action === 'wallet_recharge';

async function handlePaymentSuccess(paymentIntent) {
    if (!isWalletRecharge(paymentIntent)) return { ignored: true };
    const session = await mongoose.startSession();
    try {
        session.startTransaction();
        const paymentRecord = await Payment.findOne({ stripePaymentId: paymentIntent.id }).session(session);
        // Ask Stripe to retry if its webhook arrives before the recharge transaction commits.
        if (!paymentRecord) throw new Error(`Payment record not found for PaymentIntent ${paymentIntent.id}`);
        if (paymentRecord.status === 'completed') {
            await session.abortTransaction();
            return { success: true, alreadyProcessed: true };
        }
        const userId = paymentIntent.metadata.userId;
        if (!userId) throw new Error(`PaymentIntent ${paymentIntent.id} has no userId metadata`);
        const user = await User.findById(userId).session(session);
        if (!user) throw new Error(`User not found: ${userId}`);
        paymentRecord.status = 'completed';
        paymentRecord.failedReason = undefined;
        paymentRecord.failedAt = undefined;
        await paymentRecord.save({ session });
        user.walletBalance += paymentIntent.amount / 100;
        await user.save({ session });
        await session.commitTransaction();
        return { success: true };
    } catch (error) {
        if (session.inTransaction()) await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}

async function handlePaymentFailure(paymentIntent) {
    if (!isWalletRecharge(paymentIntent)) return { ignored: true };
    const paymentRecord = await Payment.findOne({ stripePaymentId: paymentIntent.id });
    if (!paymentRecord) throw new Error(`Payment record not found for PaymentIntent ${paymentIntent.id}`);
    if (paymentRecord.status === 'completed') return { success: true, alreadyProcessed: true };
    paymentRecord.status = 'failed';
    paymentRecord.failedReason = paymentIntent.last_payment_error?.message || 'Payment failed';
    paymentRecord.failedAt = new Date();
    await paymentRecord.save();
    return { success: true };
}

export { handlePaymentSuccess, handlePaymentFailure };
