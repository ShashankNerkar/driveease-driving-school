const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

/**
 * User — base authentication record.
 *
 * Stores credentials and role only.
 * Extended profile data lives in StudentProfile / InstructorProfile.
 *
 * Security rules:
 * - passwordHash is never returned in API responses (select: false)
 * - email is normalised to lowercase before save
 * - passwordResetToken and passwordResetExpires are select: false
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required.'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters.'],
      maxlength: [100, 'Name must not exceed 100 characters.'],
    },

    email: {
      type: String,
      required: [true, 'Email is required.'],
      unique: true,
      lowercase: true,   // normalise before storing
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address.',
      ],
    },

    phone: {
      type: String,
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Please provide a valid 10-digit Indian mobile number.'],
      default: null,
    },

    passwordHash: {
      type: String,
      required: [true, 'Password is required.'],
      select: false,     // never returned in queries by default
    },

    role: {
      type: String,
      enum: {
        values: ['student', 'instructor', 'admin'],
        message: 'Role must be student, instructor, or admin.',
      },
      default: 'student',
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // ── Password reset ──────────────────────────────────────────────
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,   // adds createdAt, updatedAt
  }
);

// ── Index ─────────────────────────────────────────────────────────────
// Unique index on email is already created by `unique: true` above.
// Explicit additional index for active-user lookups:
userSchema.index({ role: 1, isActive: 1 });

// ── Instance method: compare plain-text password against hash ─────────
userSchema.methods.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};




/**
 * toSafeObject — returns user data safe to send to the client.
 * Excludes passwordHash, reset tokens, and internal fields.
 */
userSchema.methods.toSafeObject = function () {
  return {
    id:        this._id,
    name:      this.name,
    email:     this.email,
    phone:     this.phone,
    role:      this.role,
    isActive:  this.isActive,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const User = mongoose.model('User', userSchema);

module.exports = User;
