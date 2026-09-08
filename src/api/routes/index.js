import auth from './v1/auth.routes.js';
import category from './v1/category.routes.js';
import express from 'express';
import post from "./v1/post.routes.js";
import paymentRouter from "./v1/payment.routes.js";
import userRouter from "./v1/user.routes.js";
import withdrawalRouter from "./v1/withdrawal.routes.js";
import handleStripeWebhook from "../../integrations/stripe/webhook.js";
import chatRouter from "./v1/chat.routes.js";

const apiRouter = express.Router();

// Stripe webhook endpoint
apiRouter.post('/v1/stripe/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

apiRouter.use(express.json());
apiRouter.use('/v1/auth', auth);
apiRouter.use('/v1/Cat', category);
apiRouter.use('/v1/Post', post);
apiRouter.use('/v1/payment', paymentRouter);
apiRouter.use('/v1/withdrawal', withdrawalRouter);
apiRouter.use('/v1/user', userRouter);
apiRouter.use('/v1/room', chatRouter);



export default apiRouter;