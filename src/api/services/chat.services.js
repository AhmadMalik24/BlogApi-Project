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
        }).populate('participants', 'username email').lean();

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

export {CreateChatroom, GetChatrooms};

