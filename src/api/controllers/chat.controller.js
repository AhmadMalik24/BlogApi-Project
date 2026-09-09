import { GetAllUsers, CreateChatroom, GetChatrooms, SendMessage, GetMessages, DeleteMessage, MarkMessagesAsSeen, DeleteChatroom } from "../services/chat.services.js";
import catchAsync from "../../utils/catchAsync.js";

const getAllUsers = catchAsync(async (req, res) => {

    const limit = parseInt(req.query.limit) || 10; // Default limit to 10 if not provided
    const afterId = req.query.afterId || null; // Get the last user ID from the query parameter

    const { data: users, nextCursor } = await GetAllUsers(limit, afterId);

    res.status(200).json({
        success: true,
        message: `Users Found: ${users.length}`,
        data: users,
        timestamp: new Date().toISOString(),
        nextCursor: nextCursor
    });
});

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


const sendMessage = catchAsync(async (req, res) => {
    const { chatroomId, content } = req.body;

    if (!req.user || !req.user.id) {
        const error = new Error('Authentication required');
        error.statusCode = 401;
        throw error;
    }

    const message = await SendMessage(req.user.id, chatroomId, content);

    res.status(201).json({
        success: true,
        message: 'Message sent successfully',
        data: message,
        timestamp: new Date().toISOString()
    });
});


const getMessages = catchAsync(async (req, res) => {
    const { chatroomId } = req.params;
    const limit = parseInt(req.query.limit) || 10; // Default limit to 10 if not provided
    const afterId = req.query.afterId || null; // Get the last message ID from the query parameter
    if (!req.user || !req.user.id) {
        const error = new Error('Authentication required');
        error.statusCode = 401;
        throw error;
    }

    const { formattedMessages, chatroom_Id,nextCursor } = await GetMessages(req.user.id, chatroomId, limit, afterId);

    res.status(200).json({
        success: true,
        message: `Found ${formattedMessages.length} message(s)`,
        chatroom: chatroom_Id,
        data: formattedMessages,
        timestamp: new Date().toISOString(),
        nextCursor: nextCursor
    });
});

const deleteMessage = catchAsync(async (req, res) => {
    const { messageId } = req.params;

    if (!req.user || !req.user.id) {
        const error = new Error('Authentication required');
        error.statusCode = 401;
        throw error;
    }

    const result = await DeleteMessage(req.user.id, messageId);

    res.status(200).json({
        success: true,
        message: result.message,
        timestamp: new Date().toISOString()
    });
});

const markMessagesAsSeen = catchAsync(async (req, res) => {
    const { chatroomId } = req.body;

    if (!req.user || !req.user.id) {
        const error = new Error('Authentication required');
        error.statusCode = 401;
        throw error;
    }

    await MarkMessagesAsSeen(req.user.id, chatroomId);

    res.status(200).json({
        success: true,
        message: 'Messages marked as seen successfully',
        timestamp: new Date().toISOString()
    });
});


const deleteChatroom = catchAsync(async (req, res) => {
    const { chatroomId } = req.params;

    if (!req.user || !req.user.id) {
        const error = new Error('Authentication required');
        error.statusCode = 401;
        throw error;
    }

    const result = await DeleteChatroom(req.user.id, chatroomId);

    res.status(200).json({
        success: true,
        message: result.message,
        timestamp: new Date().toISOString()
    });
});

export { getAllUsers, createChatroom, getChatrooms, sendMessage, getMessages, deleteMessage, markMessagesAsSeen, deleteChatroom };



