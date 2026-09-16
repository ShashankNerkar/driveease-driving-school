const express    = require('express');
const { param, query } = require('express-validator');
const authenticate = require('../middleware/authenticate');
const authorize    = require('../middleware/authorize');
const validate     = require('../middleware/validate');
const ctrl         = require('../controllers/notification.controller');

const router = express.Router();

// All notification routes require authentication.
// Both students AND instructors can receive notifications.
router.use(authenticate, authorize('student', 'instructor', 'admin'));

// GET /api/notifications — own list, sorted newest first
router.get(
  '/',
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('unreadOnly').optional().isBoolean(),
  validate,
  ctrl.listNotifications
);

// GET /api/notifications/unread-count — lightweight bell poll
// Must be declared before /:id to avoid param capture
router.get('/unread-count', ctrl.getUnreadCount);

// PATCH /api/notifications/read-all — mark all own unread as read
router.patch('/read-all', ctrl.markAllRead);

// PATCH /api/notifications/:id/read — mark one notification as read
router.patch(
  '/:id/read',
  param('id').isMongoId(),
  validate,
  ctrl.markRead
);

module.exports = router;
