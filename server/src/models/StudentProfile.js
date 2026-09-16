const mongoose = require('mongoose');

/**
 * StudentProfile — extended profile for users with role 'student'.
 *
 * Kept separate from User to:
 * - avoid polluting the base auth record with business data
 * - allow independent updates without touching credentials
 * - follow the approved architecture decision
 */
const studentProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,    // one profile per user
      index: true,
    },

    dateOfBirth: {
      type: Date,
      default: null,
    },

    address: {
      street:  { type: String, trim: true, default: '' },
      city:    { type: String, trim: true, default: '' },
      state:   { type: String, trim: true, default: '' },
      pincode: { type: String, trim: true, default: '' },
    },

    drivingExperience: {
      type: String,
      enum: ['none', 'beginner', 'intermediate', 'experienced'],
      default: 'none',
    },

    preferredTransmission: {
      type: String,
      enum: ['manual', 'automatic', 'both'],
      default: 'both',
    },

    profileImage: {
      type: String,     // Cloudinary URL — set in Phase 9
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const StudentProfile = mongoose.model('StudentProfile', studentProfileSchema);

module.exports = StudentProfile;
