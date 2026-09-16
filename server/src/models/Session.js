const mongoose = require('mongoose');

/**
 * Session — tracks individual login sessions per device/browser.
 *
 * Each login creates a new session with a unique refresh token hash.
 * This allows:
 * - Multiple simultaneous logins from different browsers
 * - Independent logout (logging out from one browser doesn't affect others)
 * - Per-session token rotation tracking
 *
 * Security:
 * - refreshTokenHash stores SHA-256 hash of the current refresh token
 * - expiresAt enables automatic cleanup of expired sessions
 * - userAgent and ipAddress help identify sessions for security monitoring
 */
const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    refreshTokenHash: {
      type: String,
      required: true,
      select: false,  // Don't return in queries by default
    },

    userAgent: {
      type: String,
      default: null,
    },

    ipAddress: {
      type: String,
      default: null,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true,  // For efficient cleanup queries
    },

    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient session lookups and cleanup
sessionSchema.index({ userId: 1, expiresAt: 1 });

// Automatically delete expired sessions
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;
