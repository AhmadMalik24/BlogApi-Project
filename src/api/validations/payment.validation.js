import Joi from "joi";

const paymentValidationSchema = Joi.object({
    amount: Joi.number()
        .min(0.50)
        .max(99999)
        .precision(2)
        .required()
        .messages({
            'number.base': 'Amount must be a number',
            'number.min': 'Amount must be at least $0.50',
            'number.max': 'Amount cannot exceed $99,999',
            'number.precision': 'Amount must have at most 2 decimal places',
            'any.required': 'Amount is required'
        }),
    paymentMethodId: Joi.string()
        .pattern(/^pm_[a-zA-Z0-9_]+$/)
        .min(4)
        .required()
        .messages({
            'string.base': 'Payment method ID must be a string',
            'string.pattern.base': 'Invalid Stripe PaymentMethod ID format (should be pm_xxx...)',
            'string.min': 'Payment method ID is too short',
            'any.required': 'Payment method ID is required'
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

export { paymentValidationSchema, postIdValidationSchema, refundValidationSchema };
