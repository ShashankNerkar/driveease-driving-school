const mongoose = require('mongoose');

/**
 * Notification — in-app notification for a single user.
 *
 * Security rules:
 * - userId is always set server-side; clients never supply it.
 * - isRead is toggled only by the owning user.
 * - No sensitive fields (tokens, hashes, payment secrets) stored here.
 */
const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      index:    true,
    },
    type: {
      type:     String,
      required: true,
      enum: [
        'booking_approved',
        'booking_rejected',
        'booking_cancelled',
        'booking_received',      // instructor receives a new booking request
        'assessment_recorded',
        'assessment_updated',
        'feedback_received',     // instructor receives feedback
        'subscription_activated',
        'subscription_cancelled',
        'payment_failed',
        'password_changed',
        'system',
      ],
      index: true,
    },
    title:   { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    // Optional reference to the resource that triggered this notification
    refModel: { type: String, enum: ['Booking', 'Assessment', 'Feedback', 'Subscription', 'PaymentOrder', null], default: null },
    refId:    { type: mongoose.Schema.Types.ObjectId, default: null },
    isRead:   { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
