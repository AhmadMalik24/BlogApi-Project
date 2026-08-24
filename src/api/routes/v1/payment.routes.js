import express from 'express';
import { protect } from "../../middleware/auth.js";
import { buyPost, refund, getPaymentDetails, getAllPaymentsUser } from "../../controllers/payment.controller.js";
import {paymentValidationSchema,postIdValidationSchema,refundValidationSchema} from "../../validations/payment.validation.js";
import validate from '../../middleware/validation.js';
const paymentRouter = express.Router();

paymentRouter.use(protect);

// ✅ SPECIFIC ROUTES FIRST (no :param)
paymentRouter.get('/history', getAllPaymentsUser);        // ← MOVE THIS UP!
paymentRouter.post('/buy/:postId', validate(postIdValidationSchema,'params'), buyPost);              // ← Specific path
paymentRouter.post('/refund/:paymentId', validate(refundValidationSchema), refund);         // ← Specific path



// ✅ DYNAMIC ROUTE LAST (with :param)
paymentRouter.get('/:paymentId', validate(paymentValidationSchema),validate(postIdValidationSchema,'params'), getPaymentDetails);      // ← MOVE THIS DOWN!

export default paymentRouter;