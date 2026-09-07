import mongoose from 'mongoose';
import crypto from 'crypto';

import { User, Payment, Post, Withdrawal,BankAccount,Category } from "../../database/models/index.js";
import { stripe, walletCurrency } from "./../../config/stripe.js";

const CreatePayment = async ({ user, paymentMethod, post }) => {
    console.log('CreatePayment called with:', { user, paymentMethod, post });

    // ✅ 1. Validate inputs
    if (!user || !post || !paymentMethod) {
        throw new Error('User, post, and payment method are required');
    }

    // ✅ 2. Fetch documents
    const userDoc = await User.findById(user);
    if (!userDoc) throw new Error('User not found');

    const postDoc = await Post.findById(post);
    if (!postDoc) throw new Error('Post not found');
    if (!postDoc.isPremium) throw new Error('This post is not premium content');

    // Can not buy your own post
    if (postDoc.author.equals(userDoc._id)) {
        const error = new Error('You cannot purchase your own post');
        error.statusCode = 403;
        throw error;
    }

    const authorDoc = await User.findById(postDoc.author);
    if (!authorDoc) throw new Error('Author not found');

    // ✅ 3. Check if user already owns this post
    const existingPayment = await Payment.findOne({
        user: user,
        post: post,
        status: 'completed'
    });
    if (existingPayment) {
        throw new Error('You already own this post');
    }

    // ✅ 4. Check balance
    if (userDoc.walletBalance < postDoc.price) {
        throw new Error(`Insufficient balance. Need $${postDoc.price}, have $${userDoc.walletBalance}`);
    }

    // ✅ 5. Start transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 6️⃣ Deduct from buyer
        userDoc.walletBalance -= postDoc.price;
        await userDoc.save({ session });

        // 7️⃣ Add to author
        authorDoc.walletBalance += postDoc.price;
        await authorDoc.save({ session });

        // 8️⃣ Update post earnings
        postDoc.totalEarnings = (postDoc.totalEarnings || 0) + postDoc.price;
        await postDoc.save({ session });

        // 9️⃣ Create payment record
        const payment = new Payment({
            user: user,
            post: post,
            amount: postDoc.price,
            method: paymentMethod,
            currentBalance: userDoc.walletBalance + postDoc.price, // Before deduction
            newBalance: userDoc.walletBalance, // After deduction
            status: 'completed'
        });
        await payment.save({ session });

        // 🔟 Commit
        await session.commitTransaction();
        session.endSession();
        console.log("userDoc.walletBalance", userDoc.walletBalance);
        return payment;

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
};

const RefundPayment = async (paymentId, refundAmount, refundReason) => {
    // ✅ 1. Find payment
    const payment = await Payment.findById(paymentId);
    if (!payment) {
        throw new Error('Payment not found');
    }

    if (payment.status !== 'completed') {
        throw new Error('Only completed payments can be refunded');
    }

    if (refundAmount <= 0 || refundAmount > payment.amount) {
        throw new Error('Invalid refund amount');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 2️⃣ Update payment
        payment.refundedAmount += refundAmount;
        payment.refundReason = refundReason;
        payment.refundedAt = new Date();

        if (payment.refundedAmount === payment.amount) {
            payment.status = 'refunded';
        }
        await payment.save({ session });

        // 3️⃣ Refund buyer
        const buyer = await User.findById(payment.user).session(session);
        buyer.walletBalance += refundAmount;
        await buyer.save({ session });

        // 4️⃣ Deduct from author
        const post = await Post.findById(payment.post).session(session);
        const author = await User.findById(post.author).session(session);
        author.walletBalance -= refundAmount;
        await author.save({ session });

        // 5️⃣ Update post earnings
        post.totalEarnings -= refundAmount;
        await post.save({ session });

        await session.commitTransaction();
        session.endSession();

        return payment;

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
};

const GetPaymentDetails = async (paymentId, userId) => {
    const paymentDetails = await Payment.findOne({ _id: paymentId, user: userId })
        .populate('user')
        .populate('post');

    if (!paymentDetails) {
        throw new Error('Payment not found');
    }

    return paymentDetails;
};


const GetAllPaymentsForUser = async (userId, limit, afterId) => {
    const query = { user: userId };
    if (afterId) {
        // Decode the Base64 cursor to get the actual ID
        const decodedCursor = Buffer.from(afterId, 'base64').toString('utf8');
        query._id = { $gt: new mongoose.Types.ObjectId(decodedCursor) };
    }

    const payments = await Promise.all([
        Payment.find(query)
            .populate('post','title price isPremium categories')
            .lean() // Converts Mongoose documents to plain JS objects so we can modify them
            .sort({ createdAt: -1 })
            .limit(limit + 1),
        Withdrawal.find(query)
            .populate('bankAccount','accountHolderName bankName accountNumber accountType last4 verificationStatus verifiedAt isVerified ')
            .select(" amount fee netAmount bankAccountLast4 requestedAt")
    ]);
    const hasMore = payments.length > limit;
    const data = hasMore ? payments.slice(0, limit) : payments;

    // Sanitize the data to hide earnings if the user is only a buyer
    const sanitizedData = data.map(payment => {
        if (payment.post) {
            // Check if the requesting user is the owner of the post 
            // (Note: change 'user' to 'author' if your Post schema uses a different field name for the creator)
            const isOwner = payment.post.user && payment.post.user.toString() === userId.toString();

            if (!isOwner) {
                // Hide sensitive earnings/revenue metrics from the buyer
                delete payment.post.totalEarnings;
                // Add any other creator-only fields here if needed (e.g., delete payment.post.revenue)
            }
        }
        return payment;
    });

    let nextCursor = null;
    if (hasMore && sanitizedData.length > 0) {
        const lastItem = sanitizedData[sanitizedData.length - 1];
        // Encode the _id as Base64
        nextCursor = Buffer.from(lastItem._id.toString()).toString('base64');
    }

    return {
        payments: sanitizedData,
        hasMore: hasMore,
        nextCursor: nextCursor
    };
};
const RechargeWallet = async (userId, amount, paymentMethodId, requestIdempotencyKey) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        console.log(`Recharging wallet for user: ${userId}`);
        console.log(`Amount: $${amount}`);
        console.log(`Payment Method: ${paymentMethodId}`);

        // 1. Find user
        const user = await User.findById(userId).session(session);
        if (!user) {
            throw new Error('User not found');
        }

        const idempotencyKey = requestIdempotencyKey || crypto.randomUUID();
        const existingPayment = await Payment.findOne({ user: userId, idempotencyKey }).session(session);
        if (existingPayment) {
            await session.commitTransaction();
            session.endSession();
            return {
                success: existingPayment.status === 'completed',
                paymentIntentId: existingPayment.stripePaymentId,
                status: existingPayment.status,
                payment: existingPayment,
                message: 'This recharge request was already processed.'
            };
        }

        // 2. Check/create Stripe customer
        if (!user.stripeCustomerId) {
            console.log('🆕 Creating Stripe customer...');
            const customer = await stripe.customers.create({
                metadata: { userId: userId.toString() }
            });
            user.stripeCustomerId = customer.id;
            await user.save({ session });
            console.log(`✅ Customer created: ${customer.id}`);
        }

        // 3. TRY to attach payment method (but don't fail if it doesn't work)
        console.log('📎 Attempting to attach payment method...');
        let isAttached = false;
        try {
            await stripe.paymentMethods.attach(paymentMethodId, {
                customer: user.stripeCustomerId,
            });
            isAttached = true;
            console.log('✅ Payment method attached successfully');
        } catch (attachError) {
            // In production, some cards may fail to attach
            // But we can still try to charge them!
            console.log(`⚠️ Could not attach: ${attachError.message}`);

            // Only fail if it's a critical error
            if (attachError.code === 'payment_method_invalid') {
                throw new Error('Invalid payment method');
            }

            // For card_declined, insufficient_funds, etc.
            // We CONTINUE and try to charge anyway
            console.log('🔄 Continuing to attempt payment...');
        }

        // 4. ✅ ALWAYS create the PaymentIntent (THIS IS THE KEY!)
        console.log('💳 Creating payment intent...');

        let paymentIntent;
        try {
            paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(amount * 100),
                currency: walletCurrency,
                customer: user.stripeCustomerId,
                payment_method: paymentMethodId,
                // Wallet recharge uses a PaymentMethod collected in Stripe.js. Redirect-based
                // methods need a return_url, so explicitly exclude them from this API flow.
                automatic_payment_methods: {
                    enabled: true,
                    allow_redirects: 'never'
                },
                confirm: true,
                metadata: {
                    userId: userId.toString(),
                    amount: amount.toString(),
                    paymentMethod: paymentMethodId,
                    action: 'wallet_recharge'
                }
            }, { idempotencyKey });

            console.log(`✅ Payment intent created: ${paymentIntent.id}`);
            console.log(`📊 Status: ${paymentIntent.status}`);

        } catch (paymentError) {
            console.error('❌ Payment error:', paymentError.message);

            // ✅ IMPORTANT: Even if payment fails, PaymentIntent was created!
            // We can record this in our database
            if (paymentError.payment_intent?.id) {
                console.log(`📝 PaymentIntent was created: ${paymentError.payment_intent.id}`);

                // Save the failed payment
                const payment = new Payment({
                    user: userId,
                    amount: amount,
                    method: 'stripe',
                    status: 'failed',
                    stripePaymentId: paymentError.payment_intent.id,
                    description: `Failed wallet recharge - $${amount}`,
                    failedReason: paymentError.message,
                    failedAt: new Date(),
                    idempotencyKey
                });
                await payment.save({ session });

                await session.commitTransaction();
                session.endSession();

                return {
                    success: false,
                    paymentIntentId: paymentError.payment_intent.id,
                    status: 'failed',
                    errorMessage: paymentError.message,
                    payment: payment
                };
            }

            throw paymentError;
        }

        if (paymentIntent.payment_method_details?.card) {
            // Ensure the array exists
            if (!user.savedPaymentMethods) {
                user.savedPaymentMethods = [];
            }

            // Check if we already have this card saved by its Stripe pm_ ID
            const cardAlreadySaved = user.savedPaymentMethods.some(
                card => card.paymentMethodId === paymentMethodId
            );

            if (!cardAlreadySaved) {
                user.savedPaymentMethods.push({
                    paymentMethodId: paymentMethodId,
                    brand: paymentIntent.payment_method_details.card.brand,
                    last4: paymentIntent.payment_method_details.card.last4,
                    expMonth: paymentIntent.payment_method_details.card.exp_month,
                    expYear: paymentIntent.payment_method_details.card.exp_year
                });
                await user.save({ session });
                console.log(`💾 Card ending in ${paymentIntent.payment_method_details.card.last4} saved locally.`);
            }
        }

        // 5. Create payment record (status: pending)
        const payment = new Payment({
            user: userId,
            amount: amount,
            currentBalance: user.walletBalance, // Before recharge
            method: 'stripe',
            status: 'pending', // Webhook will update
            stripePaymentId: paymentIntent.id,
            description: `Wallet recharge - $${amount}`,
            cardLastFourDigits: paymentIntent.payment_method_details?.card?.last4,
            cardType: paymentIntent.payment_method_details?.card?.brand,
            isAttached: isAttached,
            idempotencyKey
        });
        await payment.save({ session });
        console.log(`✅ Payment record created: ${payment._id}`);

        // ⚠️ DON'T update wallet here - webhook handles it
        // This prevents double-charging and race conditions

        await session.commitTransaction();
        session.endSession();

        return {
            success: paymentIntent.status === 'succeeded',
            paymentIntentId: paymentIntent.id,
            clientSecret: paymentIntent.client_secret,
            status: paymentIntent.status,
            //payment: payment,
            message: paymentIntent.status === 'succeeded'
                ? 'Payment successful, wallet will be updated shortly'
                : 'Payment processing, wallet will be updated when confirmed'
        };

    } catch (error) {
        console.error('❌ Recharge error:', error.message);
        if (session.inTransaction()) await session.abortTransaction();
        session.endSession();
        throw error;
    }
};

const GetSavedCards = async (userId) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('User not found');
    }

    if (!user.stripeCustomerId) {
        return []; // No customer ID means they haven't saved any cards yet
    }

    // Ask Stripe for all cards attached to this customer
    const paymentMethods = await stripe.paymentMethods.list({
        customer: user.stripeCustomerId,
        type: 'card',
    });

    // Format the data nicely for the frontend
    return paymentMethods.data.map(pm => ({
        paymentMethodId: pm.id,
        brand: pm.card.brand,
        last4: pm.card.last4,
        expMonth: pm.card.exp_month,
        expYear: pm.card.exp_year
    }));
};

export { CreatePayment, RefundPayment, GetPaymentDetails, GetAllPaymentsForUser, RechargeWallet, GetSavedCards };
