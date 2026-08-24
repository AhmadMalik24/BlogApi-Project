import catchAsync from '../../utils/catchAsync.js';
import {CreatePayment,RefundPayment,GetPaymentDetails,GetAllPaymentsForUser} from "../services/payment.services.js";

const buyPost = catchAsync(async (req, res) => {
    const { postId } = req.params;
    const { paymentMethod } = req.body;

    if (!req.user || !req.user.id) {
        const error = new Error('Authentication required');
        error.statusCode = 401;
        throw error;
    }

    await CreatePayment({
        user: req.user.id,
        paymentMethod,
        post: postId
    });

    res.status(201).json({ message: 'Payment processed successfully', payment: {  paymentMethod }});
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

    res.status(200).json({ payment: paymentDetails });
});


const refund = catchAsync(async (req, res) => {
    const { paymentId } = req.params;
    const { refundAmount, refundReason } = req.body;

    if (!req.user || !req.user.id) {
        const error = new Error('Authentication required');
        error.statusCode = 401;
        throw error;
    }

    await RefundPayment(paymentId, refundAmount, refundReason);

    res.status(200).json({ message: 'Refund processed successfully' });
});

const getAllPaymentsUser = catchAsync(async (req, res) => {
    const limit = parseInt(req.query.limit) || 3; // Default limit to 3 if not provided
    const afterId = req.query.afterId || null; // Get the last payment ID from the query parameter
    if (!req.user || !req.user.id) {
        const error = new Error('Authentication required');
        error.statusCode = 401;
        throw error;
    }
    console.log("Fetching payments for user:", req.user.id);

    const payments = await GetAllPaymentsForUser(req.user.id);
    res.status(200).json({ payments });
});

export { buyPost, refund, getPaymentDetails, getAllPaymentsUser };



