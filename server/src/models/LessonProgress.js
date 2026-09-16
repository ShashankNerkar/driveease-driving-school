const mongoose = require('mongoose');
const lessonProgressSchema = new mongoose.Schema({ studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }, lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true, index: true }, completed: { type: Boolean, default: false }, completedAt: { type: Date, default: null }, watchTime: { type: Number, min: 0, default: 0 } }, { timestamps: true });
lessonProgressSchema.index({ studentId: 1, lessonId: 1 }, { unique: true });
module.exports = mongoose.model('LessonProgress', lessonProgressSchema);
