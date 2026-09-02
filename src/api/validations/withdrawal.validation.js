import Joi from "joi";

// Bank account validation
const bankAccountValidationSchema = Joi.object({
    accountHolderName: Joi.string()
        .trim()
        .min(2)
        .max(100)
        .required()
        .messages({
            'string.base': 'Account holder name must be a string',
            'string.min': 'Name must be at least 2 characters',
            'string.max': 'Name cannot exceed 100 characters',
            'any.required': 'Account holder name is required'
        }),

    accountNumber: Joi.string()
        .pattern(/^\d{8,20}$/)
        .required()
        .messages({
            'string.base': 'Account number must be a string',
            'string.pattern.base': 'Account number must be 8-20 digits',
            'any.required': 'Account number is required'
        }),

    routingNumber: Joi.string()
        .pattern(/^\d{6,9}$/)
        .required()
        .messages({
            'string.base': 'Routing number must be a string',
            'string.pattern.base': 'Routing number must be 6-9 digits (for AU BSB or US routing)',
            'any.required': 'Routing number is required'
        }),

    accountType: Joi.string()
        .valid('checking', 'savings')
        .required()
        .messages({
            'string.base': 'Account type must be a string',
            'any.only': 'Account type must be either checking or savings',
            'any.required': 'Account type is required'
        }),

    bankName: Joi.string()
        .trim()
        .max(100)
        .optional()
        .messages({
            'string.base': 'Bank name must be a string',
            'string.max': 'Bank name cannot exceed 100 characters'
        })
});

// Verification sync validation. Stripe Connect, not client-provided microdeposit values,
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
