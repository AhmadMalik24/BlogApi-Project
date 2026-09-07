import Joi from "joi";


const paymentValidationSchema = Joi.object({
    paymentMethod: Joi.string()
        .valid('credit_card', 'debit_card', 'paypal', 'Stripe', 'bank_transfer')
        .required()
        .messages({
            'string.base': 'Payment method must be a string',
            'any.only': 'Payment method must be one of [credit_card, debit_card, paypal, Stripe, bank_transfer]',
            'any.required': 'Payment method is required'
        })
});

const postIdValidationSchema = Joi.object({
    postId: Joi.string()
        .hex()
        .length(24)
        .required()
        .messages({
            'string.base': 'Post ID must be a string',
            'string.hex': 'Post ID must be a valid hexadecimal string',
            'string.length': 'Post ID must be 24 characters long',
            'any.required': 'Post ID is required'
        })
});

const refundValidationSchema = Joi.object({
    refundAmount: Joi.number()
        .positive()
        .required()
        .messages({
            'number.base': 'Refund amount must be a number',
            'number.positive': 'Refund amount must be a positive number',
            'any.required': 'Refund amount is required'
        }),
    refundReason: Joi.string()
        .min(5)
        .max(255)
        .required()
        .messages({
            'string.base': 'Refund reason must be a string',
            'string.min': 'Refund reason must be at least 5 characters long',
            'string.max': 'Refund reason must not exceed 255 characters',
            'any.required': 'Refund reason is required'
        })
});

export { paymentValidationSchema,postIdValidationSchema, refundValidationSchema };
