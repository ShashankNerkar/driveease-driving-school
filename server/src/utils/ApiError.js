/**
 * ApiError — Custom error class for operational errors.
 *
 * Thrown inside controllers/services to produce structured HTTP error responses.
 * The centralized error handler distinguishes ApiError (known) from
 * unexpected runtime errors (unknown).
 *
 * Usage:
 *   throw new ApiError(404, 'Student not found');
 *   throw new ApiError(400, 'Validation failed', ['field errors...']);
 */
class ApiError extends Error {
  /**
   * @param {number} statusCode  - HTTP status code (4xx / 5xx)
   * @param {string} message     - Human-readable error message
   * @param {Array}  errors      - Optional array of field-level errors
   * @param {string} stack       - Optional custom stack trace
   */
  constructor(
    statusCode,
    message = 'An error occurred',
    errors = [],
    stack = ''
  ) {
    super(message);

    this.statusCode = statusCode;
    this.message = message;
    this.success = false;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

module.exports = ApiError;
