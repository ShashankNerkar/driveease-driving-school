const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: { type: String, required: [true, 'Course title is required.'], trim: true, maxlength: 120 },
  description: { type: String, required: [true, 'Description is required.'], trim: true },
  level: { type: String, required: true, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
  duration: { type: String, required: [true, 'Course duration is required.'], trim: true, maxlength: 60 },
  thumbnail: { type: String, default: null, trim: true },
  status: { type: String, enum: ['draft', 'published'], default: 'draft' },
  // Paid course variants reuse this course's lessons instead of duplicating them.
  contentSourceCourseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null },
}, { timestamps: true });
courseSchema.index({ status: 1, createdAt: -1 });

const Course = mongoose.model('Course', courseSchema);
module.exports = Course;
