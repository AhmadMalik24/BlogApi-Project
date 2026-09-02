import catchAsync from '../../utils/catchAsync.js';
import { CreatePayment, RefundPayment, GetPaymentDetails, GetAllPaymentsForUser, RechargeWallet } from "../services/payment.services.js";

const buyPost = catchAsync(async (req, res) => {
    const { postId } = req.params;
    const { paymentMethod } = req.body;

    if (!req.user || !req.user.id) {
        const error = new Error('Authentication required');
        error.statusCode = 401;
        throw error;
    }

    const payment = await CreatePayment({
        user: req.user.id,
        paymentMethod,
        post: postId
    });

    res.status(201).json({
        success: true,
        message: 'Post purchased successfully using wallet balance',
        data: payment,
        timestamp: new Date().toISOString()
    });
});

const getPaymentDetails = catchAsync(async (req, res) => {
    const { paymentId } = req.params;

    if (!req.user || !req.user.id) {
        const error = new Error('Authentication required');
        error.statusCode = 401;
        throw error;
    }

    const paymentDetails = await GetPaymentDetails(paymentId, req.user.id);

    if (!paymentDetails) {
        const error = new Error('Payment not found');
        error.statusCode = 404;
        throw error;
    }

    res.status(200).json({
        success: true,
        message: 'Payment details retrieved successfully',
        data: paymentDetails,
        timestamp: new Date().toISOString()
    });
});


const refund = catchAsync(async (req, res) => {
    const { paymentId } = req.params;
    const { refundAmount, refundReason } = req.body;

    if (!req.user || !req.user.id) {
        const error = new Error('Authentication required');
        error.statusCode = 401;
        throw error;
    }

    const refundResult = await RefundPayment(paymentId, refundAmount, refundReason);

    res.status(200).json({
        success: true,
        message: 'Refund processed successfully',
        data: refundResult,
        timestamp: new Date().toISOString()
    });
});

const getAllPaymentsUser = catchAsync(async (req, res) => {
    const limit = parseInt(req.query.limit) || 10; // Default limit to 10 if not provided
    const afterId = req.query.afterId || null; // Get the last payment ID from the query parameter
    if (!req.user || !req.user.id) {
        const error = new Error('Authentication required');
        error.statusCode = 401;
        throw error;
    }
    console.log("Fetching payments for user:", req.user.id);

    const payments = await GetAllPaymentsForUser(req.user.id, limit, afterId);
    res.status(200).json({
        success: true,
        message: 'Payments retrieved successfully',
        data: payments,
        timestamp: new Date().toISOString()
    });
});

const rechargeWallet = catchAsync(async (req, res) => {
    const { amount, paymentMethodId } = req.body;

    if (!req.user || !req.user.id) {
        const error = new Error('Authentication required');
        error.statusCode = 401;
        throw error;
    }

    // Call the service to recharge the wallet
    const result = await RechargeWallet(req.user.id, amount, paymentMethodId, req.get('Idempotency-Key'));

    res.status(200).json({
        message: 'Wallet recharge processed',
        data: result
    });
});

export { buyPost, refund, getPaymentDetails, getAllPaymentsUser, rechargeWallet };



