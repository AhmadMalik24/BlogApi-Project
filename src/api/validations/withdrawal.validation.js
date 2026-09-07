import Joi from "joi";

// Bank account validation
const bankAccountValidationSchema = Joi.object({
    bankTokenId: Joi.string()
        .pattern(/^btok_[a-zA-Z0-9_]+$/)
        .required()
        .messages({
            'string.base': 'Bank token ID must be a string',
            'string.pattern.base': 'Invalid Stripe Bank Token ID format (should be btok_xxx...)',
            'any.required': 'Bank token ID is required'
        })
});// Verification sync validation. Stripe Connect, not client-provided microdeposit values,
// is the source of truth for an external account's status.
const verifyBankAccountValidationSchema = Joi.object({
    bankAccountId: Joi.string()
        .pattern(/^[a-f0-9]{24}$/)
        .required()
        .messages({
            'string.base': 'Bank account ID must be a string',
            'string.pattern.base': 'Invalid bank account ID format',
            'any.required': 'Bank account ID is required'
        }),

    // Accepted for backwards compatibility with clients using the old microdeposit form.
    // Stripe Connect's external-account status remains the verification source of truth.
    amount1: Joi.number().min(0).max(99).optional(),
    amount2: Joi.number().min(0).max(99).optional()
});

// Withdrawal validation
const withdrawalValidationSchema = Joi.object({
    amount: Joi.number()
        .min(0.53)
        .max(99999)
        .precision(2)
        .required()
        .messages({
            'number.base': 'Withdrawal amount must be a number',
            'number.min': 'Minimum withdrawal is $0.53 after the 5% platform fee',
            'number.max': 'Maximum withdrawal is $99,999',
            'number.precision': 'Amount must have at most 2 decimal places',
            'any.required': 'Withdrawal amount is required'
        }),

    bankAccountId: Joi.string()
        .length(24)
        .hex()
        .required()
        .messages({
            'string.base': 'Bank account ID must be a string',
            'string.length': 'Invalid bank account ID',
            'string.hex': 'Invalid bank account ID',
            'any.required': 'Bank account ID is required'
        })
});

export {
    bankAccountValidationSchema,
    verifyBankAccountValidationSchema,
    withdrawalValidationSchema
};
