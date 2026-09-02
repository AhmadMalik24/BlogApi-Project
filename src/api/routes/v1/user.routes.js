import {getUserDetails, updateUserDetails, saveStripeOnboardingProfile} from "../../controllers/user.controller.js";
import express from 'express';
import {protect} from "../../middleware/auth.js";
import validate from '../../middleware/validation.js';
import { stripeOnboardingProfileValidationSchema } from '../../validations/user.validation.js';

const userRouter = express.Router();

userRouter.get('/me', protect, getUserDetails);
userRouter.put('/me', protect, updateUserDetails);
userRouter.put('/me/stripe-onboarding-profile', protect, validate(stripeOnboardingProfileValidationSchema), saveStripeOnboardingProfile);

export default userRouter;
