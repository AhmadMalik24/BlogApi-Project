import express from 'express';
import { protect } from "../../middleware/auth.js";
import { createChatroom,getChatrooms,sendMessage,getMessages,deleteMessage,markMessagesAsSeen } from "../../controllers/chat.controller.js";
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
chatRouter.post('/send', validate(sendMessageSchema), sendMessage);
chatRouter.get('/messages/:chatroomId', validate(roomIdValidationSchema), getMessages);
chatRouter.delete('/message/:messageId', validate(messageIdValidationSchema), deleteMessage);
chatRouter.patch('/mark-seen', markMessagesAsSeen);


export default chatRouter;