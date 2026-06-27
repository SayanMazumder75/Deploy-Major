const errorhandler = (err, req, res, next) =>{
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Server Error';

    //Mongoose bad ObjectId
    if (err.name === 'CastError'){
        message = 'Resource not found';
        statusCode = 404;
    }

    //Mongoose duplicate key
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        message = `${field} already exists`;
        statusCode = 400;
    }

    //Mongoose validation error
    if (err.name === 'ValidationError'){
        message = Object.values(err.errors).map(val => val.message).join(', ');
        statusCode = 400;
    }

    //multer file size error — read the active limit from env so the user-
    //facing message always matches the configured limit. We render in MB
    //for readability (1 MB = 1,048,576 bytes).
    if (err.code === 'LIMIT_FILE_SIZE'){
        const limitBytes = parseInt(process.env.MAX_FILE_SIZE, 10) || 104857600;
        const limitMb = Math.round(limitBytes / (1024 * 1024));
        message = `File size exceeds the maximum limit of ${limitMb}MB`;
        statusCode = 400;
    }

    //JWT errors
    if (err.name == 'JsonWebTokenError'){
        message = 'Invalid token';
        statusCode = 401;
    }

    if (err.name === 'TokenExpirederror'){
        message = 'Token expired';
        statusCode = 401;
    }

    console.error('Error:' ,{
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });

    res.status(statusCode).json({
        success: false,
        error: message,
        statusCode,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

export default errorhandler;