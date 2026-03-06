/**
 * Custom error class for operational errors
 */
export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handler middleware
 */
export const errorHandler = (err, req, res, next) => {
  // Log error for debugging (but not in test environment)
  if (process.env.NODE_ENV !== "test") {
    console.error("❌ Error:", {
      message: err.message,
      stack: err.stack,
      statusCode: err.statusCode || 500,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
    });
  }

  // Set default values
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  // Handle different types of errors
  if (process.env.NODE_ENV === "development") {
    // Development: Send detailed error
    sendErrorDev(err, res);
  } else {
    // Production: Send sanitized error
    let error = { ...err };
    error.message = err.message;

    // Handle specific error types
    if (err.name === "CastError") error = handleCastErrorDB(err);
    if (err.code === 11000) error = handleDuplicateFieldDB(err);
    if (err.name === "ValidationError") error = handleValidationErrorDB(err);
    if (err.name === "JsonWebTokenError") error = handleJWTError();
    if (err.name === "TokenExpiredError") error = handleJWTExpiredError();

    sendErrorProd(error, res);
  }
};

/**
 * Send error response in development
 */
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    success: false,
    status: err.status,
    message: err.message,
    stack: err.stack,
    error: err,
  });
};

/**
 * Send error response in production
 */
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      status: err.status,
      message: err.message,
    });
  } else {
    // Programming or unknown error: don't leak details
    console.error("🔥 UNEXPECTED ERROR:", err);

    res.status(500).json({
      success: false,
      status: "error",
      message: "Something went wrong! Please try again later.",
    });
  }
};

/**
 * Handle MongoDB CastError (invalid ID)
 */
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

/**
 * Handle MongoDB duplicate field error
 */
const handleDuplicateFieldDB = (err) => {
  const field = Object.keys(err.keyPattern)[0];
  const value = err.keyValue[field];
  const message = `Duplicate field value: ${field}: ${value}. Please use another value.`;
  return new AppError(message, 400);
};

/**
 * Handle MongoDB validation errors
 */
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join(". ")}`;
  return new AppError(message, 400);
};

/**
 * Handle JWT errors
 */
const handleJWTError = () => {
  return new AppError("Invalid token. Please log in again.", 401);
};

const handleJWTExpiredError = () => {
  return new AppError("Your token has expired. Please log in again.", 401);
};

/**
 * Not Found middleware - handles 404 errors
 */
export const notFound = (req, res, next) => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};

/**
 * Async wrapper to catch errors in async route handlers
 */
export const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

/**
 * Rate limit error handler
 */
export const rateLimitHandler = (req, res) => {
  res.status(429).json({
    success: false,
    message: "Too many requests from this IP, please try again later.",
  });
};

/**
 * Multer error handler (file uploads)
 */
export const multerErrorHandler = (err, req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      message: "File too large. Maximum size is 5MB.",
    });
  }
  if (err.code === "LIMIT_FILE_COUNT") {
    return res.status(400).json({
      success: false,
      message: "Too many files. Maximum is 5 files.",
    });
  }
  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({
      success: false,
      message: "Unexpected file field.",
    });
  }
  next(err);
};

/**
 * Database connection error handler
 */
export const dbErrorHandler = (err) => {
  console.error("❌ Database connection error:", err.message);

  if (err.name === "MongoNetworkError") {
    console.error(
      "⚠️ Unable to connect to MongoDB. Please check if MongoDB is running.",
    );
    process.exit(1);
  }

  if (err.name === "MongooseServerSelectionError") {
    console.error(
      "⚠️ Cannot reach MongoDB server. Check your connection string.",
    );
    process.exit(1);
  }
};

/**
 * Example usage in auth.controller.js
 */
export const exampleControllerUsage = catchAsync(async (req, res, next) => {
  // Instead of try/catch, errors will be caught by catchAsync
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  res.json({ success: true, data: user });
});
