import express from 'express';
import { protect } from "../../middleware/auth.js";
import { buyPost, refund, getPaymentDetails, getAllPaymentsUser, rechargeWallet ,getSavedCards} from "../../controllers/payment.controller.js";
import {  postIdValidationSchema, refundValidationSchema } from "../../validations/payment.validation.js";
import validate from '../../middleware/validation.js';
const paymentRouter = express.Router();

paymentRouter.use(protect);


paymentRouter.post('/cards', getSavedCards);


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


paymentRouter.post('/recharge', rechargeWallet);         // ← Specific path with validation

/**
 * @swagger
 * /payment/recharge:
 *   post:
 *     summary: Recharge wallet balance using Stripe PaymentMethod
 *     tags: [Payments]
 *     description: |
 *       Recharge wallet using a Stripe PaymentMethod token.
 *       Frontend should use Stripe.js with PUBLIC_KEY to create paymentMethodId,
 *       then send it to this endpoint.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, paymentMethodId]
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount to recharge (in USD, between $0.50 and $99,999)
 *                 example: 50.00
 *                 minimum: 0.50
 *                 maximum: 99999
 *               paymentMethodId:
 *                 type: string
 *                 description: Stripe PaymentMethod ID starting with 'pm_'
 *                 example: pm_1A2B3C4D5E6F7G8H
 *                 pattern: '^pm_[a-zA-Z0-9]+$'
 *     responses:
 *       200:
 *         description: Wallet recharge processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                 timestamp:
 *                   type: string
 *       400:
 *         description: Invalid input or payment failed
 *       401:
 *         description: Authentication required
 */
paymentRouter.post('/buy/:postId', validate(postIdValidationSchema, 'params'), buyPost);              // ← Specific path

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
paymentRouter.get('/:paymentId', validate(postIdValidationSchema, 'params'), getPaymentDetails);      // ← MOVE THIS DOWN!

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