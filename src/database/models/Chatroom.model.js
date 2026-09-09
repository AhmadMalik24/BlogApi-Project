import mongoose from 'mongoose';

const chatroomSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }],
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    },
    hiddenFor: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    clearedAt:[{user:mongoose.Schema.Types.ObjectId, timestamp: Date}]

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

chatroomSchema.index({ participants: 1 });

const Chatroom = mongoose.model('Chatroom', chatroomSchema);
export default Chatroom;