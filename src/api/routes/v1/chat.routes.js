import express from 'express';
import { protect } from "../../middleware/auth.js";
import { createChatroom,getChatrooms } from "../../controllers/chat.controller.js";
import {
    createChatroomSchema,
    sendMessageSchema,
    roomIdValidationSchema,
    messageIdValidationSchema
} from "../../validations/chat.validation.js";
import validate from '../../middleware/validation.js';
const chatRouter = express.Router();

chatRouter.use(protect);

chatRouter.post('/create', validate(createChatroomSchema), createChatroom);
chatRouter.get('/list', getChatrooms);

export default chatRouter;