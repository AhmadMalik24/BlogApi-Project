import auth from './v1/auth.routes.js';
import category from './v1/category.routes.js';
import express from 'express';
import post from "./v1/post.routes.js";
import paymentRouter from "./v1/payment.routes.js";
import userRouter from "./v1/user.routes.js";

const apiRouter = express.Router();

apiRouter.use('/v1/auth', auth);
apiRouter.use('/v1/Cat', category);
apiRouter.use('/v1/Post', post);
apiRouter.use('/v1/payment', paymentRouter);
apiRouter.use('/v1/user', userRouter);


export default apiRouter;