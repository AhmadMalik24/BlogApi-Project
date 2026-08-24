import joi from 'joi';

/**
 * ✅ COMPLETE REGISTER VALIDATION
 * Matches your User model schema exactly
 */
const registerSchema = joi.object({
  username: joi.string()
    .min(3)
    .max(30)
    .pattern(/^[a-zA-Z0-9_]+$/)
    .required()
    .messages({
      'string.base': 'Username must be a string',
      'string.empty': 'Username is required',
      'string.min': 'Username must be at least 3 characters long',
      'string.max': 'Username cannot exceed 30 characters',
      'string.pattern.base': 'Username can only contain letters, numbers, and underscores',
      'any.required': 'Username is required'
    }),

  email: joi.string()
    .email({ minDomainSegments: 2 })
    .pattern(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/)
    .required()
    .messages({
      'string.base': 'Email must be a string',
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email address',
      'string.pattern.base': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),

  password: joi.string()
    .min(8)
    .max(100)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .required()
    .messages({
      'string.base': 'Password must be a string',
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password cannot exceed 100 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (!@#$%^&*)',
      'any.required': 'Password is required'
    }),

  confirmPassword: joi.string()
    .valid(joi.ref('password'))
    .required()
    .messages({
      'string.base': 'Confirm password must be a string',
      'string.empty': 'Please confirm your password',
      'any.only': 'Passwords do not match',
      'any.required': 'Please confirm your password'
    }),

  // Required profile fields
  firstName: joi.string()
    .min(1)
    .max(50)
    .required()
    .messages({
      'string.base': 'First name must be a string',
      'string.empty': 'First name is required',
      'any.required': 'First name is required',
      'string.min': 'First name must be at least 1 character',
      'string.max': 'First name cannot exceed 50 characters'
    }),

  lastName: joi.string()
    .min(1)
    .max(50)
    .optional()
    .messages({
      'string.min': 'Last name must be at least 1 character',
      'string.max': 'Last name cannot exceed 50 characters'
    }),
  role: joi.string()
    .valid('reader', 'author', 'admin')
    .required()
    .messages({
      'any.only': 'Role must be one of reader, author, or admin',
      'any.required': 'Role is required'
    })
});

/**
 * ✅ COMPLETE LOGIN VALIDATION
 */
const loginSchema = joi.object({
  email: joi.string()
    .email()
    .required()
    .messages({
      'string.base': 'Email must be a string',
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),

  password: joi.string()
    .required()
    .messages({
      'string.base': 'Password must be a string',
      'string.empty': 'Password is required',
      'any.required': 'Password is required'
    })
});

/**
 * ✅ FORGOT PASSWORD VALIDATION
 */
const forgotPasswordSchema = joi.object({
  email: joi.string()
    .email()
    .required()
    .messages({
      'string.base': 'Email must be a string',
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    })
});

/**
 * ✅ RESET PASSWORD VALIDATION
 */
const resetPasswordSchema = joi.object({
  newPassword: joi.string()
    .min(8)
    .max(100)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .required()
    .messages({
      'string.base': 'Password must be a string',
      'string.empty': 'New password is required',
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password cannot exceed 100 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (!@#$%^&*)',
      'any.required': 'New password is required'
    }),

  confirmPassword: joi.string()
    .valid(joi.ref('newPassword'))
    .required()
    .messages({
      'string.base': 'Confirm password must be a string',
      'string.empty': 'Please confirm your password',
      'any.only': 'Passwords do not match',
      'any.required': 'Please confirm your password'
    })
});

/**
 * ✅ CHANGE PASSWORD VALIDATION (Authenticated)
 */
const changePasswordSchema = joi.object({
  currentPassword: joi.string()
    .required()
    .messages({
      'string.base': 'Current password must be a string',
      'string.empty': 'Current password is required',
      'any.required': 'Current password is required'
    }),

  newPassword: joi.string()
    .min(8)
    .max(100)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .required()
    .messages({
      'string.base': 'Password must be a string',
      'string.empty': 'New password is required',
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password cannot exceed 100 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (!@#$%^&*)',
      'any.required': 'New password is required'
    }),

  confirmPassword: joi.string()
    .valid(joi.ref('newPassword'))
    .required()
    .messages({
      'string.base': 'Confirm password must be a string',
      'string.empty': 'Please confirm your password',
      'any.only': 'Passwords do not match',
      'any.required': 'Please confirm your password'
    })
});

/**
 * ✅ REFRESH TOKEN VALIDATION
 */
const refreshTokenSchema = joi.object({
  refreshToken: joi.string()
    .required()
    .messages({
      'string.base': 'Refresh token must be a string',
      'string.empty': 'Refresh token is required',
      'any.required': 'Refresh token is required'
    })
});

/**
 * ✅ RESEND VERIFICATION VALIDATION
 */
const resendVerificationSchema = joi.object({
  email: joi.string()
    .email()
    .required()
    .messages({
      'string.base': 'Email must be a string',
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    })
});

export {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  refreshTokenSchema,
  resendVerificationSchema
};