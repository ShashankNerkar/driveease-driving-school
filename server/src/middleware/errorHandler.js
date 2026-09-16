const ApiError = require('../utils/ApiError');

/**
 * Centralized error handling middleware.
 *
 * Must be registered LAST in the Express middleware chain (after all routes).
 * Handles both operational ApiErrors and unexpected runtime errors.
 *
 * Response shape (error):
 * {
 *   success: false,
 *   statusCode: number,
 *   message: string,
 *   errors: [],
 *   ...(stack trace in development only)
 * }
 */
const errorHandler = (err, req, res, next) => {
  // ── Mongoose CastError (invalid ObjectId) ──────────────────────────────
  if (err.name === 'CastError') {
    err = new ApiError(400, `Invalid ${err.path}: ${err.value}`);
  }

  // ── Mongoose ValidationError ──────────────────────────────────────────
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    err = new ApiError(400, 'Validation failed', messages);
  }

  // ── Mongoose duplicate key (E11000) ──────────────────────────────────
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    err = new ApiError(409, `Duplicate value for field: ${field}`);
  }

  // ── JWT errors ────────────────────────────────────────────────────────
  if (err.name === 'JsonWebTokenError') {
    err = new ApiError(401, 'Invalid token. Please log in again.');
  }

  if (err.name === 'TokenExpiredError') {
    err = new ApiError(401, 'Token expired. Please log in again.');
  }

  // ── Multer file size error ────────────────────────────────────────────
  if (err.code === 'LIMIT_FILE_SIZE') {
    err = new ApiError(400, 'File size too large.');
  }

  // ── Default to ApiError if not already one ────────────────────────────
  const statusCode = err.statusCode || 500;
  const message =
    err instanceof ApiError ? err.message : 'Internal Server Error';
  const errors = err.errors || [];

  const response = {
    success: false,
    statusCode,
    message,
    errors,
  };

  // Include stack trace only in development — never expose in production
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  return res.status(statusCode).json(response);
};

module.exports = errorHandler;
