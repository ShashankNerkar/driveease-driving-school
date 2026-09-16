const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema({
  instructorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date: { type: Date, required: true, index: true },
  startTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  endTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', default: null },
  status: { type: String, enum: ['available', 'booked', 'cancelled'], default: 'available' },
}, { timestamps: true });
slotSchema.index({ instructorId: 1, date: 1, startTime: 1, endTime: 1 }, { unique: true });
module.exports = mongoose.model('Slot', slotSchema);
