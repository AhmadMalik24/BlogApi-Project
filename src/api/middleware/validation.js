const validate = (schema, source = 'body') => (req, res, next) => {
    // ✅ Choose where to get data from
    let data;
    if (source === 'params') {
        data = req.params;
    } else if (source === 'query') {
        data = req.query;
    } else {
        data = req.body;  // ← default
    }

    const { error } = schema.validate(data, { abortEarly: false });
    
    if (error) {
        const messages = error.details.map((detail) => detail.message);
        const validationError = new Error(messages[0] || 'Validation failed');
        validationError.statusCode = 400;
        validationError.name = 'RequestValidationError';
        validationError.details = error.details.map((detail) => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value
        }));
        return next(validationError);
    }
    next();
};

export default validate;