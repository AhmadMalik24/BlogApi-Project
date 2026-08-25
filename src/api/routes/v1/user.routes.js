import {getUserDetails, updateUserDetails} from "../../controllers/user.controller.js";
import express from 'express';
import {protect} from "../../middleware/auth.js";

const userRouter = express.Router();

userRouter.get('/me', protect, getUserDetails);
userRouter.put('/me', protect, updateUserDetails);

export default userRouter;
