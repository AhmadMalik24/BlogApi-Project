const buildErrorPayload = ({
    req,
    statusCode,
    type,
    message,
    details
}) => {
    const payload = {
        success: false,
        statusCode,
        error: {
            type,
            message,
            details: details || null
        },
        meta: {
            path: req.originalUrl,
            method: req.method,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || null
        }
    };

    return payload;
};

const mapError = (err) => {
    if (!err) {
        return {
            statusCode: 500,
            type: 'InternalServerError',
            message: 'Something went wrong. Please try again later.',
            details: null
        };
    }

    if (err.name === 'RequestValidationError') {
        return {
            statusCode: 400,
            type: 'ValidationError',
            message: err.message || 'Validation failed.',
            details: err.details || null
        };
    }

    if (err.name === 'ValidationError') {
        const details = err.details || Object.values(err.errors || {}).map((fieldError) => ({
            field: fieldError.path,
            message: fieldError.message,
            value: fieldError.value
        }));

        return {
            statusCode: 400,
            type: 'ValidationError',
            message: err.message || 'Some fields are invalid. Please review and try again.',
            details
        };
    }

    if (err.name === 'CastError') {
        return {
            statusCode: 400,
            type: 'BadRequest',
            message: `Invalid value provided for ${err.path}.`,
            details: [{ field: err.path, value: err.value }]
        };
    }

    if (err.code === 11000) {
        const duplicateFields = Object.keys(err.keyValue || {});
        const details = duplicateFields.map((field) => ({
            field,
            value: err.keyValue[field]
        }));
        const singleFieldMessageMap = {
            email: 'Email already exists',
            username: 'Username already exists'
        };
        const message = duplicateFields.length === 1 && singleFieldMessageMap[duplicateFields[0]]
            ? singleFieldMessageMap[duplicateFields[0]]
            : `Duplicate value found for ${duplicateFields.join(', ')}.`;

        return {
            statusCode: 409,
            type: 'ConflictError',
            message,
            details
        };
    }

    if (err.name === 'JsonWebTokenError') {
        return {
            statusCode: 401,
            type: 'AuthenticationError',
            message: 'Invalid authentication token.',
            details: null
        };
    }

    if (err.name === 'TokenExpiredError') {
        return {
            statusCode: 401,
            type: 'AuthenticationError',
            message: 'Authentication token has expired. Please log in again.',
            details: null
        };
    }

    if (err.type === 'entity.parse.failed') {
        return {
            statusCode: 400,
            type: 'InvalidJSON',
            message: 'Request body contains invalid JSON.',
            details: null
        };
    }

    if (err.statusCode || err.status) {
        return {
            statusCode: err.statusCode || err.status,
            type: err.name || 'ApplicationError',
            message: err.message || 'Request could not be processed.',
            details: err.details || null
        };
    }

    return {
        statusCode: 500,
        type: err.name || 'InternalServerError',
        message: err.message || 'Something went wrong. Please try again later.',
        details: null
    };
};

const notFoundHandler = (req, res, next) => {
    const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
    error.statusCode = 404;
    error.name = 'NotFoundError';
    next(error);
};

const errorHandler = (err, req, res, next) => {
    const { statusCode, type, message, details } = mapError(err);

    res.status(statusCode).json(
        buildErrorPayload({
            req,
            statusCode,
            type,
            message,
            details
        })
    );
};

export { notFoundHandler, errorHandler };
export default errorHandler;
