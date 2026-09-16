const Notification = require('../models/Notification');

/**
 * notificationService — creates in-app notifications.
 *
 * notify() is intentionally fire-and-forget: it never throws to the caller.
 * A DB failure here must not corrupt the triggering business transaction.
 *
 * Usage:
 *   await notificationService.notify({ userId, type, title, message, refModel, refId });
 *
 * All callers pass server-side data only — userId always comes from req.user
 * or a DB record, never from the request body.
 */

/**
 * notify — persist one notification for one user.
 *
 * @param {object} opts
 * @param {string|ObjectId} opts.userId
 * @param {string}          opts.type      - must match Notification.type enum
 * @param {string}          opts.title
 * @param {string}          opts.message
 * @param {string}          [opts.refModel]
 * @param {string|ObjectId} [opts.refId]
 * @returns {Promise<void>}  — never rejects; errors are logged only
 */
const notify = async ({ userId, type, title, message, refModel = null, refId = null }) => {
  try {
    await Notification.create({ userId, type, title, message, refModel, refId });
  } catch (err) {
    // Log but never surface — notification failure must not break business logic
    console.error('[notificationService] Failed to persist notification:', err.message);
  }
};

module.exports = { notify };
