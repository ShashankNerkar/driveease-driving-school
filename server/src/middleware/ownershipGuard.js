const ApiError = require('../utils/ApiError');

/**
 * ownershipGuard — Ensures a student can only access their own resources.
 *
 * Compares req.user.id (from JWT) with a studentId extracted from the
 * request params, body, or a pre-fetched resource on req.resource.
 *
 * Admin bypasses ownership checks.
 * Instructors have separate scoped checks in their own middleware (Phase 6+).
 *
 * Usage (param-based):
 *   router.get('/:studentId/docs', authenticate, ownershipGuard('params', 'studentId'), controller)
 *
 * Usage (resource-based — after fetching resource):
 *   router.get('/:id', authenticate, fetchDocument, ownershipGuard('resource', 'studentId'), controller)
 */
const ownershipGuard = (source = 'params', field = 'studentId') => {
  return (req, res, next) => {
    // Admin bypasses ownership restrictions
    if (req.user?.role === 'admin') {
      return next();
    }

    let resourceOwnerId;

    if (source === 'params') {
      resourceOwnerId = req.params[field];
    } else if (source === 'body') {
      resourceOwnerId = req.body[field];
    } else if (source === 'resource') {
      resourceOwnerId = req.resource?.[field]?.toString();
    }

    if (!resourceOwnerId) {
      return next(new ApiError(400, 'Ownership check failed: owner ID not found.'));
    }

    if (req.user.id !== resourceOwnerId.toString()) {
      return next(new ApiError(403, 'Access denied. You can only access your own data.'));
    }

    next();
  };
};

module.exports = ownershipGuard;
