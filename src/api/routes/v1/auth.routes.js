import express from 'express';
import { registerUser, loginUser, logoutUser,refreshToken } from '../../controllers/auth.controller.js';
import validate from '../../middleware/validation.js';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema, resendVerificationSchema } from '../../validations/auth.validation.js';
import {protectRefreshToken} from "../../middleware/auth.js";

const router = express.Router();

router.post('/register', validate(registerSchema), registerUser);
router.post('/login', validate(loginSchema), loginUser);
router.post('/logout', protectRefreshToken, logoutUser);
// router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
// router.post('/reset-password', validate(resetPasswordSchema), resetPassword);
// router.post('/change-password', validate(changePasswordSchema), changePassword);
router.post('/refresh-token', protectRefreshToken, refreshToken);
// router.post('/resend-verification', validate(resendVerificationSchema), resendVerification);

export default router;
