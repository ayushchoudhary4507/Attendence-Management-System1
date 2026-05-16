const logger = require('./logger');

class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

const errorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    // Log the error
    logger.error(`Error ${err.statusCode}: ${err.message}`, {
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        body: req.body,
        user: req.user ? req.user.id : 'anonymous'
    });

    if (process.env.NODE_ENV === 'development') {
        res.status(err.statusCode).json({
            success: false,
            status: err.status,
            error: err,
            message: err.message,
            stack: err.stack
        });
    } else {
        // Production: don't leak error details
        if (err.isOperational) {
            res.status(err.statusCode).json({
                success: false,
                status: err.status,
                message: err.message
            });
        } else {
            // Programming or other unknown errors: don't leak details
            res.status(500).json({
                success: false,
                status: 'error',
                message: 'Something went very wrong!'
            });
        }
    }
};

module.exports = { AppError, errorHandler };
