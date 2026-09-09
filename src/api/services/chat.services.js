import { User, Chatroom, Message } from '../../database/models/index.js';

const GetAllUsers = async (limit, afterId) => {
    try {
        const query = {};

        if (afterId) {
            // Decode the Base64 cursor to get the actual ID
            const decodedCursor = Buffer.from(afterId, 'base64').toString('utf8');
            query._id = { $gt: decodedCursor };
        }

        const users = await User.find(query)
            .select('username email')
            .limit(limit + 1)
            .sort({ _id: 1 });

        const hasMore = users.length > limit;
        const data = hasMore ? users.slice(0, limit) : users;

        let nextCursor = null;
        if (hasMore && data.length > 0) {
            const lastUserId = data[data.length - 1]._id.toString();
            nextCursor = Buffer.from(lastUserId).toString('base64');
        }

        return { data, nextCursor };
    } catch (error) {
        throw new Error(`Error fetching users: ${error.message}`);
    }
};



const CreateChatroom = async (userId, participantId) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        if (userId.toString() === participantId.toString()) {
            throw new Error('Cannot create a chatroom with yourself');
        }

        const participant = await User.findById(participantId);
        if (!participant) {
            throw new Error('Participant not found');
        }

        // Check for existing chatroom
        let chatroom = await Chatroom.findOne({
            participants: { $all: [userId, participant._id] }
        }).populate('participants', 'username email');

        let isExisting = true;

        // If chatroom doesn't exist, create it
        if (!chatroom) {
            const newChatroom = new Chatroom({
                participants: [userId, participant._id]
            });
            await newChatroom.save();
            chatroom = await newChatroom.populate('participants', 'username email');
            isExisting = false;
        }

        // Always return the same structure
        return { chatroom, isExisting };

    } catch (error) {
        throw new Error(`Error creating chatroom: ${error.message}`);
    }
};

const GetChatrooms = async (userId) => {
    try {
        const chatrooms = await Chatroom.find({
            participants: userId,
            hiddenFor: { $ne: userId }
        })
            .populate('participants', 'username email ')
            .populate('lastMessage', 'content createdAt')
            .lean();

        const formattedChatrooms = chatrooms.map(chatroom => {
            const otherParticipant = chatroom.participants.find(participant => participant._id.toString() !== userId.toString());
            return {
                _id: chatroom._id,
                participant: otherParticipant,
                lastMessage: chatroom.lastMessage,
                createdAt: chatroom.createdAt,
                updatedAt: chatroom.updatedAt
            };
        });

        return formattedChatrooms;
    } catch (error) {
        throw new Error(`Error fetching chatrooms: ${error.message}`);
    }
};

const DeleteChatroom = async (userId, chatroomId) => {
    try {
        const chatroom = await Chatroom.findById({ _id: chatroomId });
        if (!chatroom) {
            throw new Error('Chatroom not found');
        }

        if (!chatroom.participants.includes(userId)) {
            throw new Error('User is not a participant of this chatroom');
        }

        await Chatroom.findByIdAndUpdate({ _id: chatroomId }, {
            $pull: { clearedAt: { user: userId } }
        });

        await Chatroom.findByIdAndUpdate({ _id: chatroomId }, {
            $push: { clearedAt: { user: userId, timestamp: new Date() } },
            $addToSet: { hiddenFor: userId }
        });

        return { success: true, message: 'Chatroom hidden successfully' };
    } catch (error) {
        throw new Error(`Error hiding chatroom: ${error.message}`);
    }
};


const SendMessage = async (senderId, chatroomId, content) => {
    try {
        const chatroom = await Chatroom.findById(chatroomId);
        if (!chatroom) {
            throw new Error('Chatroom not found');
        }

        if (!chatroom.participants.includes(senderId)) {
            throw new Error('Sender is not a participant of this chatroom');
        }

        const message = new Message({
            chatroom: chatroomId,
            sender: senderId,
            content: content
        });

        await message.save();

        // Update the last message in the chatroom
        await Chatroom.findByIdAndUpdate(chatroomId, {
            lastMessage: message._id,
            $set: { hiddenFor: [] } // Pops the chat back into inboxes, but preserves clearedAt history filtering
        });

        return message;
    } catch (error) {
        throw new Error(`Error sending message: ${error.message}`);
    }
};

const GetMessages = async (userId, chatroomId, limit = 20, afterId = null) => {
    try {
        const chatroom = await Chatroom.findOne({ _id: chatroomId, participants: userId });
        if (!chatroom) {
            throw new Error('Chatroom not found or user is not a participant');
        }

        const userClearRecord = chatroom.clearedAt.find(
            record => record.user.toString() === userId.toString()
        );
        const clearedTime = userClearRecord ? userClearRecord.timestamp : new Date(0);

        // Build the message query combining chatroom, cleared time, and cursor
        const query = {
            chatroom: chatroomId,
            createdAt: { $gt: clearedTime }
        };

        if (afterId) {
            const decodedCursor = Buffer.from(afterId, 'base64').toString('utf8');
            query._id = { $gt: decodedCursor };
        }

        // Fetch limit + 1 to check if there are more pages
        const messages = await Message.find(query)
            .populate('sender', 'username email')
            .populate('seenBy.user', 'username ')
            .sort({ _id: 1 }) // Cursor pagination relies on sorting by _id
            .limit(limit + 1)
            .lean();

        const hasMore = messages.length > limit;
        const data = hasMore ? messages.slice(0, limit) : messages;

        let nextCursor = null;
        if (hasMore && data.length > 0) {
            const lastMessageId = data[data.length - 1]._id.toString();
            nextCursor = Buffer.from(lastMessageId).toString('base64');
        }

        const formattedMessages = data.map(msg => {
            const isSender = msg.sender._id.toString() === userId.toString();
            return {
                id: msg._id,
                content: msg.content,
                sender: {
                    id: msg.sender._id,
                    username: msg.sender.username
                },
                seenBy: isSender ? msg.seenBy : [],
                isSender: isSender,
                createdAt: msg.createdAt,
                updatedAt: msg.updatedAt
            };
        });

        return { 
            formattedMessages, 
            chatroom_Id: chatroom._id,
            nextCursor 
        };
    } catch (error) {
        throw new Error(`Error fetching messages: ${error.message}`);
    }
};

const DeleteMessage = async (userId, messageId) => {
    try {
        const message = await Message.findById(messageId);
        if (!message) {
            throw new Error('Message not found');
        }

        if (message.sender.toString() !== userId.toString()) {
            throw new Error('User is not the sender of this message');
        }

        await message.deleteOne();

        // If the deleted message was the last message in the chatroom, update the chatroom's lastMessage
        const chatroom = await Chatroom.findById(message.chatroom);
        if (chatroom.lastMessage && chatroom.lastMessage.toString() === messageId.toString()) {
            const lastMessage = await Message.findOne({ chatroom: chatroom._id }).sort({ createdAt: -1 });
            chatroom.lastMessage = lastMessage ? lastMessage._id : null;
            await chatroom.save();
        }

        return { success: true, message: 'Message deleted successfully' };
    } catch (error) {
        throw new Error(`Error deleting message: ${error.message}`);
    }
};

const MarkMessagesAsSeen = async (userId, roomId) => {
    const chatroom = await Chatroom.findOne({ _id: roomId, participants: userId });
    if (!chatroom) {
        const error = new Error('Chatroom not found or unauthorized');
        error.statusCode = 404;
        throw error;
    }

    await Message.updateMany(
        {
            chatroom: roomId,
            sender: { $ne: userId },
            'seenBy.user': { $ne: userId }
        },
        {
            $push: {
                seenBy: { user: userId, seenAt: new Date() }
            }
        }
    );

    return { success: true, message: 'Messages marked as seen' };
};




export { GetAllUsers,CreateChatroom, GetChatrooms, SendMessage, GetMessages, DeleteMessage, MarkMessagesAsSeen, DeleteChatroom };

