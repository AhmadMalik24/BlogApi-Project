import Joi from "joi";

const createPostValidationSchema = Joi.object({
    title: Joi.string().required(),
    content: Joi.string().required(),
    isPremium: Joi.boolean().optional(),
    premiumContent: Joi.string().optional(),
    categories: Joi.array().items(Joi.string()).optional(),
    price: Joi.number().optional(),
    status: Joi.string().valid('draft', 'published', 'archived', 'scheduled', 'pending').required(),
});

const updatePostValidationSchema = Joi.object({
    title: Joi.string().optional(),
    content: Joi.string().optional(),
    isPremium: Joi.boolean().optional(),
    premiumContent: Joi.string().optional(),
    categories: Joi.array().items(Joi.string()).optional(),
    price: Joi.number().optional(),
    status: Joi.string().valid('draft', 'published', 'archived', 'scheduled', 'pending').optional(),
});

const deletePostValidationSchema = Joi.object({
    postId: Joi.string().hex().length(24).required(),
});

export { createPostValidationSchema, updatePostValidationSchema, deletePostValidationSchema };
