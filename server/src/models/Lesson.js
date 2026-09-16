const mongoose = require('mongoose');
const lessonSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 160 }, description: { type: String, default: '', trim: true },
  content: { type: String, default: null, trim: true }, videoUrl: { type: String, default: null, trim: true },
  duration: { type: String, required: true, trim: true, maxlength: 60 }, order: { type: Number, required: true, min: 1 },
}, { timestamps: true });
lessonSchema.index({ courseId: 1, order: 1 }, { unique: true });
module.exports = mongoose.model('Lesson', lessonSchema);
