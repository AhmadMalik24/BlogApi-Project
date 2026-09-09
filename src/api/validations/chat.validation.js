import Joi from 'joi';

const createChatroomSchema = Joi.object({
    participantId: Joi.string()
        .hex()
        .length(24)
        .required()
        .messages({
            'string.base': 'Recipient ID must be a string',
            'string.hex': 'Recipient ID must be a valid hexadecimal string',
            'string.length': 'Recipient ID must be 24 characters long',
            'any.required': 'Recipient ID is required'
        })
});

const sendMessageSchema = Joi.object({
    chatroomId: Joi.string()
        .hex()
        .length(24)
        .required()
        .messages({
            'string.base': 'Chatroom ID must be a string',
            'string.hex': 'Chatroom ID must be a valid hexadecimal string',
            'string.length': 'Chatroom ID must be 24 characters long',
            'any.required': 'Chatroom ID is required'
        }),
    content: Joi.string()
        .min(1)
        .max(2000)
        .required()
        .messages({
            'string.base': 'Message content must be a string',
            'string.empty': 'Message content cannot be empty',
            'string.max': 'Message cannot exceed 2000 characters',
            'any.required': 'Message content is required'
        })
});

const roomIdValidationSchema = Joi.object({
    roomId: Joi.string()
        .hex()
        .length(24)
        .required()
        .messages({
            'string.base': 'Room ID must be a string',
            'string.hex': 'Room ID must be a valid hexadecimal string',
            'string.length': 'Room ID must be 24 characters long',
            'any.required': 'Room ID is required'
        })
});

const messageIdValidationSchema = Joi.object({
    messageId: Joi.string()
        .hex()
        .length(24)
        .required()
        .messages({
            'string.base': 'Message ID must be a string',
            'string.hex': 'Message ID must be a valid hexadecimal string',
            'string.length': 'Message ID must be 24 characters long',
            'any.required': 'Message ID is required'
        })
});

export {
    createChatroomSchema,
    sendMessageSchema,
    roomIdValidationSchema,
    messageIdValidationSchema
};