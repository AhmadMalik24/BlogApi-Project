// payment.js
import Payment from "../../database/models/Payment.model.js";
import mongoose from "mongoose";
import User from "../../database/models/User.model.js";

async function handlePaymentSuccess(paymentIntent) {
    const session = await mongoose.startSession();
    console.log('🔍 [DEBUG] Starting handlePaymentSuccess');
    console.log('📊 Payment Intent ID:', paymentIntent.id);
    console.log('📊 Amount:', paymentIntent.amount / 100);
    console.log('📊 Metadata:', paymentIntent.metadata);

    session.startTransaction();
    try {
        // ✅ Find the existing payment record (created in RechargeWallet)
        let paymentRecord = await Payment.findOne({ 
            stripePaymentId: paymentIntent.id 
        }).session(session);

        if (!paymentRecord) {
            console.error(`❌ Payment record not found for PaymentIntent ID: ${paymentIntent.id}`);
            console.log('⚠️ Creating payment record (shouldn\'t happen if RechargeWallet worked)');
            
            // Fallback: Create the payment record if it doesn't exist
            const userId = paymentIntent.metadata.userId;
            paymentRecord = new Payment({
                user: userId,
                amount: paymentIntent.amount / 100,
                method: paymentIntent.metadata.paymentMethod || 'stripe',
                status: 'completed',
                stripePaymentId: paymentIntent.id,
                description: `Wallet recharge - $${paymentIntent.amount / 100}`
            });
            await paymentRecord.save({ session });
        } else {
            // ✅ Update existing record
            paymentRecord.status = 'completed';
            await paymentRecord.save({ session });
            console.log(`✅ Updated payment record: ${paymentRecord._id}`);
        }

        // ✅ Update user's wallet
        const userId = paymentIntent.metadata.userId;
        const user = await User.findById(userId).session(session);
        if (!user) {
            throw new Error(`User not found: ${userId}`);
        }

        // Update the user's wallet balance
        user.walletBalance += paymentIntent.amount / 100;
        await user.save({ session });
        console.log(`💰 Updated wallet for user ${userId}: $${user.walletBalance}`);

        await session.commitTransaction();
        session.endSession();
        
        console.log('✅ Payment success fully processed');
        return { success: true };

    } catch (error) {
        console.error('❌ Error in handlePaymentSuccess:', error);
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
}

async function handlePaymentFailure(paymentIntent) {
    console.log('🔍 Handling payment failure for:', paymentIntent.id);
    
    try {
        // ✅ Find and update the payment record
        let paymentRecord = await Payment.findOne({ 
            stripePaymentId: paymentIntent.id 
        });

        if (!paymentRecord) {
            console.log(`⚠️ Payment record not found for failed payment: ${paymentIntent.id}`);
            console.log('💡 This could happen if the webhook arrives before the database transaction completes');
            
            // 🔍 Log the failure for debugging
            console.log('📊 Failed payment details:', {
                id: paymentIntent.id,
                amount: paymentIntent.amount / 100,
                userId: paymentIntent.metadata.userId,
                error: paymentIntent.last_payment_error?.message
            });
            
            // ✅ Create a record for the failed payment
            const userId = paymentIntent.metadata.userId;
            const amount = paymentIntent.amount / 100;
            
            paymentRecord = new Payment({
                user: userId,
                amount: amount,
                method: paymentIntent.metadata.paymentMethod || 'stripe',
                status: 'failed',
                stripePaymentId: paymentIntent.id,
                description: `Failed wallet recharge - $${amount}`,
                failureReason: paymentIntent.last_payment_error?.message || 'Payment failed'
            });
            
            await paymentRecord.save();
            console.log(`✅ Created failed payment record: ${paymentRecord._id}`);
        } else {
            // ✅ Update existing record
            paymentRecord.status = 'failed';
            paymentRecord.failureReason = paymentIntent.last_payment_error?.message || 'Payment failed';
            await paymentRecord.save();
            console.log(`✅ Updated payment record to failed: ${paymentRecord._id}`);
        }

        console.log('✅ Payment failure handled successfully');
        return { success: true };

    } catch (error) {
        console.error('❌ Error in handlePaymentFailure:', error);
        throw error;
    }
}

export { handlePaymentSuccess, handlePaymentFailure };