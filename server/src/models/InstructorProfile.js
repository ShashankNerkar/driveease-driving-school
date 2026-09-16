const mongoose = require('mongoose');

/**
 * InstructorProfile — extended profile for users with role 'instructor'.
 *
 * Created by Admin when adding an instructor (Phase 6 / Phase 14).
 * Kept separate from User for the same reasons as StudentProfile.
 */
const instructorProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    experience: {
      type: Number,    // years of teaching experience
      min: 0,
      default: 0,
    },

    specialization: {
      type: [String],  // e.g. ['manual', 'highway', 'parking']
      default: [],
    },

    profileImage: {
      type: String,    // Cloudinary URL
      default: null,
    },

    bio: {
      type: String,
      trim: true,
      maxlength: [500, 'Bio must not exceed 500 characters.'],
      default: '',
    },

    isAvailable: {
      type: Boolean,
      default: true,
    },
    transmissionExpertise: {
      type: [String],
      enum: ['manual', 'automatic'],
      default: [],
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

const InstructorProfile = mongoose.model('InstructorProfile', instructorProfileSchema);

module.exports = InstructorProfile;
