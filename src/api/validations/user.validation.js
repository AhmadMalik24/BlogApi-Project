import joi from "joi";

const userValidationSchema = joi.object({
    username: joi.string().required(),
    email: joi.string().email().required(),
    password: joi.string().min(6).required(),
    role: joi.string().valid('user', 'admin').optional(),
    bio: joi.string().optional()
});

const stripeOnboardingProfileValidationSchema = joi.object({
    businessType: joi.string().valid('individual', 'sole_trader', 'company').required(),
    hasABN: joi.boolean().required(),
    abnNumber: joi.string().trim().pattern(/^\d{11}$/).when('hasABN', {
        is: true,
        then: joi.required(),
        otherwise: joi.allow(null, '').optional()
    }),
    legalBusinessName: joi.string().trim().max(100).when('businessType', {
        is: 'company', then: joi.required(), otherwise: joi.optional()
    }),
    legalFirstName: joi.string().trim().max(50).required(),
    legalLastName: joi.string().trim().max(50).required(),
    email: joi.string().email().required(),
    dateOfBirth: joi.string().pattern(/^\d{2}\/\d{2}\/\d{4}$/).required(),
    homeAddress: joi.object({
        country: joi.string().valid('Australia', 'AU').required(),
        streetAddress: joi.string().trim().max(100).required(),
        apartmentUnit: joi.string().trim().max(100).allow('', null).optional(),
        suburb: joi.string().trim().max(100).required(),
        state: joi.string().trim().max(50).required(),
        postalCode: joi.string().pattern(/^\d{4}$/).required()
    }).required(),
    phoneNumber: joi.string().trim().pattern(/^\+61\s?\d{1,4}\s?\d{3,4}\s?\d{3,4}$/).required(),
    industry: joi.string().trim().max(100).required(),
    website: joi.string().uri().empty('').optional(),
    productDescription: joi.string().trim().max(500).empty('').optional()
}).or('website', 'productDescription');

export { userValidationSchema, stripeOnboardingProfileValidationSchema };
