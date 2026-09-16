const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

/**
 * validate — Runs after express-validator rule chains.
 *
 * Collects validation errors and throws a 400 ApiError with field-level detail.
 * Place this after your validation rule array in the route definition.
 *
 * Usage:
 *   router.post('/register', registerValidators, validate, authController.register)
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const extractedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));

    return next(new ApiError(400, 'Validation failed.', extractedErrors));
  }

  next();
};

module.exports = validate;
