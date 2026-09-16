const mongoose = require('mongoose');

/**
 * Booking is the reservation request for one instructor availability slot.
 * The partial unique index permits history (rejected/cancelled records), while
 * ensuring that only one pending or confirmed request can hold a slot.
 */
const bookingSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  studentProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudentProfile', required: true },
  instructorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  instructorProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'InstructorProfile', required: true },
  slotId: { type: mongoose.Schema.Types.ObjectId, ref: 'Slot', required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'rejected', 'cancelled'], default: 'pending', index: true },
  requestedAt: { type: Date, default: Date.now, required: true },
  approvedAt: { type: Date, default: null },
  rejectedAt: { type: Date, default: null },
  cancelledAt: { type: Date, default: null },
  cancellationReason: { type: String, trim: true, maxlength: 500, default: null },
  rejectionReason: { type: String, trim: true, maxlength: 500, default: null },
}, { timestamps: true });

bookingSchema.index(
  { slotId: 1 },
  { name: 'active_slot_booking_unique', unique: true, partialFilterExpression: { status: { $in: ['pending', 'confirmed'] } } }
);
bookingSchema.index({ studentId: 1, requestedAt: -1 });
bookingSchema.index({ instructorId: 1, status: 1, requestedAt: -1 });

module.exports = mongoose.model('Booking', bookingSchema);
