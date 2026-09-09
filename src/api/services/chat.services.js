import { User, Chatroom, Message } from '../../database/models/index.js';

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
            participants: userId
        })
        .populate('participants', 'username email ')
        .populate('lastMessage','content createdAt')
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
        chatroom.lastMessage = message._id;
        await chatroom.save();

        return message;
    } catch (error) {
        throw new Error(`Error sending message: ${error.message}`);
    }
};

const GetMessages = async (userId,chatroomId) => {
    try {
        const chatroom = await Chatroom.findOne({_id: chatroomId, participants: userId });
        if (!chatroom) {
            throw new Error('Chatroom not found or user is not a participant');
        }
        const messages = await Message.find({ chatroom: chatroomId })
            .populate('sender', 'username')
            .populate('seenBy.user', 'username')
            .sort({ createdAt: 1 })
            .lean();

        const formattedMessages = messages.map(msg => {
            const isSender = msg.sender._id.toString() === userId.toString();
            return{
                id: msg._id,
                content: msg.content,
                sender: {
                    id: msg.sender._id,
                    username: msg.sender.username
                },
                seenBy: msg.seenBy.map(seen => ({
                    userId: seen.user,
                    seenAt: seen.seenAt
                })),
                isSender: isSender,
                createdAt: msg.createdAt,
                updatedAt: msg.updatedAt    
            }
        })
        
        return {formattedMessages, chatroom_Id: chatroom._id};
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
    console.log('MarkMessagesAsSeen called with userId:', userId, 'roomId:', roomId);
    const chatroom = await Chatroom.findOne({ _id: roomId, participants: userId });
    if (!chatroom) {
        const error = new Error('Chatroom not found or unauthorized');
        error.statusCode = 404;
        throw error;
    }

    await Message.updateMany(
        {
            chatroom: roomId,
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

export { CreateChatroom, GetChatrooms, SendMessage, GetMessages, DeleteMessage,MarkMessagesAsSeen };

