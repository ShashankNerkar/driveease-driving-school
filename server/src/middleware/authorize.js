const ApiError = require('../utils/ApiError');

/**
 * authorize — Role-based access control middleware.
 *
 * Must be used AFTER authenticate middleware.
 * Accepts one or more allowed roles and blocks requests from other roles.
 *
 * Usage:
 *   router.get('/admin/stats', authenticate, authorize('admin'), controller)
 *   router.get('/lessons',     authenticate, authorize('student', 'instructor'), controller)
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Not authenticated. Please log in.'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ApiError(
          403,
          `Access denied. Required role: ${allowedRoles.join(' or ')}.`
        )
      );
    }

    next();
  };
};

module.exports = authorize;
