import joi from "joi";

const userValidationSchema = joi.object({
    username: joi.string().required(),
    email: joi.string().email().required(),
    password: joi.string().min(6).required(),
    role: joi.string().valid('user', 'admin').optional()
});

export default userValidationSchema;