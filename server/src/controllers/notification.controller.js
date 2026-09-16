const Notification = require('../models/Notification');
const ApiResponse  = require('../utils/ApiResponse');
const ApiError     = require('../utils/ApiError');

/**
 * GET /api/notifications
 * Query: page, limit, unreadOnly
 * Returns own notifications only — userId always from JWT.
 */
const listNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const skip   = (parseInt(page) - 1) * parseInt(limit);
    const filter = { userId: req.user.id };
    if (unreadOnly === 'true') filter.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Notification.countDocuments(filter),
      Notification.countDocuments({ userId: req.user.id, isRead: false }),
    ]);

    res.json(new ApiResponse(200, {
      notifications,
      total,
      unreadCount,
      page:       parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    }, 'Notifications fetched.'));
  } catch (error) { next(error); }
};

/**
 * GET /api/notifications/unread-count
 * Lightweight poll endpoint for the notification bell.
 */
const getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({ userId: req.user.id, isRead: false });
    res.json(new ApiResponse(200, { unreadCount: count }, 'Unread count fetched.'));
  } catch (error) { next(error); }
};

/**
 * PATCH /api/notifications/:id/read
 * Marks one notification as read. Ownership enforced — userId must match JWT.
 */
const markRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: { isRead: true } },
      { returnDocument: 'after' }
    );
    if (!notification) throw new ApiError(404, 'Notification not found.');
    res.json(new ApiResponse(200, { notification }, 'Notification marked as read.'));
  } catch (error) { next(error); }
};

/**
 * PATCH /api/notifications/read-all
 * Marks ALL of the authenticated user's unread notifications as read.
 */
const markAllRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      { userId: req.user.id, isRead: false },
      { $set: { isRead: true } }
    );
    res.json(new ApiResponse(200, { modifiedCount: result.modifiedCount }, 'All notifications marked as read.'));
  } catch (error) { next(error); }
};

module.exports = { listNotifications, getUnreadCount, markRead, markAllRead };
