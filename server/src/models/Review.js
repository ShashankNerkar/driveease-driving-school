const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    studentName: { type: String, trim: true, default: '' }, // denormalised for display
    targetType: {
      type: String,
      enum: ['course', 'instructor'],
      required: true,
      index: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required.'],
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: [true, 'Review comment is required.'],
      trim: true,
      maxlength: [1000, 'Comment must not exceed 1000 characters.'],
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    approvedAt: { type: Date, default: null },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

reviewSchema.index({ status: 1, createdAt: -1 });
reviewSchema.index({ studentId: 1, targetType: 1, targetId: 1 }, { unique: true });

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;
