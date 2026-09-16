const mongoose = require('mongoose');
const enrollmentSchema = new mongoose.Schema({ studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }, courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true }, enrolledAt: { type: Date, default: Date.now }, status: { type: String, enum: ['active', 'completed'], default: 'active' } }, { timestamps: true });
enrollmentSchema.index({ studentId: 1, courseId: 1 }, { unique: true });
module.exports = mongoose.model('Enrollment', enrollmentSchema);
