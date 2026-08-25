import express from 'express';
import { protect } from "../../middleware/auth.js";
import { buyPost, refund, getPaymentDetails, getAllPaymentsUser,rechargeWallet } from "../../controllers/payment.controller.js";
import {paymentValidationSchema,postIdValidationSchema,refundValidationSchema} from "../../validations/payment.validation.js";
import validate from '../../middleware/validation.js';
const paymentRouter = express.Router();

paymentRouter.use(protect);

// ✅ SPECIFIC ROUTES FIRST (no :param)
paymentRouter.get('/history', getAllPaymentsUser);        // ← MOVE THIS UP!

/**
 * @swagger
 * /payment/history:
 *   get:
 *     summary: Get user payment history
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: Payment history retrieved successfully
 */


paymentRouter.post('/recharge', rechargeWallet);         // ← Specific path

/**
 * @swagger
 * /payment/recharge:
 *   post:
 *     summary: Recharge wallet balance
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, paymentMethod]
 *             properties:
 *               amount:
 *                 type: number
 *               paymentMethod:
 *                 type: string
 *                 enum: [credit_card, debit_card, paypal, Stripe, bank_transfer]
 *     responses:
 *       200:
 *         description: Wallet recharged successfully
 */
paymentRouter.post('/buy/:postId', validate(postIdValidationSchema,'params'), buyPost);              // ← Specific path

/**
 * @swagger
 * /payment/buy/{postId}:
 *   post:
 *     summary: Purchase a premium post using wallet balance
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [paymentMethod]
 *             properties:
 *               paymentMethod:
 *                 type: string
 *                 enum: [credit_card, debit_card, paypal, Stripe, bank_transfer]
 *     responses:
 *       201:
 *         description: Payment processed successfully
 */

paymentRouter.post('/refund/:paymentId', validate(refundValidationSchema), refund);         // ← Specific path

/**
 * @swagger
 * /payment/refund/{paymentId}:
 *   post:
 *     summary: Request a refund for a payment
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refundAmount, refundReason]
 *             properties:
 *               refundAmount:
 *                 type: number
 *               refundReason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Refund processed successfully
 */

// ✅ DYNAMIC ROUTE LAST (with :param)
paymentRouter.get('/:paymentId', validate(paymentValidationSchema),validate(postIdValidationSchema,'params'), getPaymentDetails);      // ← MOVE THIS DOWN!

/**
 * @swagger
 * /payment/{paymentId}:
 *   get:
 *     summary: Get details of a specific payment
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment details retrieved
 */

export default paymentRouter;