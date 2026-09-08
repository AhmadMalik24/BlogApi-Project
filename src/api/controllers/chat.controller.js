import { CreateChatroom, GetChatrooms } from "../services/chat.services.js";
import catchAsync from "../../utils/catchAsync.js";

const createChatroom = catchAsync(async (req, res) => {
    const { participantId } = req.body;

    if (!req.user || !req.user.id) {
        const error = new Error('Authentication required');
        error.statusCode = 401;
        throw error;
    }

    const { chatroom, isExisting } = await CreateChatroom(req.user.id, participantId);

    res.status(201).json({
        success: true,
        message: isExisting ? 'Chatroom already exists' : 'Chatroom created successfully',
        data: chatroom,
        timestamp: new Date().toISOString()
    });
});

const getChatrooms = catchAsync(async (req, res) => {
    if (!req.user || !req.user.id) {
        const error = new Error('Authentication required');
        error.statusCode = 401;
        throw error;
    }

    const chatrooms = await GetChatrooms(req.user.id);

    res.status(200).json({
        success: true,
        message: `Found ${chatrooms.length} chatroom(s)`,
        data: chatrooms,
        timestamp: new Date().toISOString()
    });
});

export { createChatroom, getChatrooms };