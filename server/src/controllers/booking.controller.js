const Booking = require('../models/Booking');
const Slot = require('../models/Slot');
const StudentProfile = require('../models/StudentProfile');
const InstructorProfile = require('../models/InstructorProfile');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { notify } = require('../services/notificationService');
const { sendBookingApprovedEmail, sendBookingRejectedEmail } = require('../services/emailNotificationService');

const bookingPopulate = (query) => query
  .populate('studentId', 'name email phone')
  .populate('studentProfileId', 'drivingExperience preferredTransmission')
  .populate('instructorId', 'name email phone')
  .populate('instructorProfileId', 'experience specialization profileImage bio transmissionExpertise')
  .populate({ path: 'slotId', populate: { path: 'vehicleId', select: 'brand model registrationNumber transmission' } });

const listAvailableSlots = async (req, res, next) => {
  try {
    const filter = { status: 'available', date: { $gte: new Date() } };
    if (req.query.instructorId) filter.instructorId = req.query.instructorId;
    if (req.query.date) {
      const day = new Date(`${req.query.date}T00:00:00.000Z`);
      if (Number.isNaN(day.getTime()) || req.query.date !== day.toISOString().slice(0, 10)) throw new ApiError(400, 'Please provide a valid date.');
      filter.date = { $gte: day, $lt: new Date(day.getTime() + 86400000) };
    }
    const heldSlotIds = await Booking.distinct('slotId', { status: { $in: ['pending', 'confirmed'] } });
    filter._id = { $nin: heldSlotIds };
    const slots = await Slot.find(filter).populate('instructorId', 'name').populate('vehicleId', 'brand model registrationNumber transmission').sort({ date: 1, startTime: 1 });
    res.json(new ApiResponse(200, { slots }, 'Available instructor slots fetched.'));
  } catch (error) { next(error); }
};

const createBooking = async (req, res, next) => {
  try {
    // The partial unique index is the cross-request double-booking guard.
    // Awaiting initialization also protects the very first request after deploy.
    await Booking.init();
    const studentProfile = await StudentProfile.findOne({ userId: req.user.id });
    if (!studentProfile) throw new ApiError(403, 'Student profile is required to book a slot.');
    const slot = await Slot.findById(req.body.slotId);
    if (!slot) throw new ApiError(404, 'Slot not found.');
    if (slot.status !== 'available' || slot.date < new Date()) throw new ApiError(409, 'This slot is no longer available.');
    const instructorProfile = await InstructorProfile.findOne({ userId: slot.instructorId, isAvailable: true, status: 'active' });
    if (!instructorProfile) throw new ApiError(409, 'This instructor is not available for bookings.');
    try {
      const booking = await Booking.create({
        studentId: req.user.id,
        studentProfileId: studentProfile._id,
        instructorId: slot.instructorId,
        instructorProfileId: instructorProfile._id,
        slotId: slot._id,
        status: 'pending',
      });
      const populated = await bookingPopulate(Booking.findById(booking._id));
      res.status(201).json(new ApiResponse(201, { booking: populated }, 'Booking request sent.'));
      // Notify instructor of incoming request (fire-and-forget)
      notify({
        userId:   slot.instructorId,
        type:     'booking_received',
        title:    'New booking request',
        message:  `${populated.studentId?.name || 'A student'} has requested a lesson on ${new Date(slot.date).toLocaleDateString()}.`,
        refModel: 'Booking',
        refId:    booking._id,
      });
    } catch (error) {
      if (error.code === 11000) throw new ApiError(409, 'This slot already has an active booking request.');
      throw error;
    }
  } catch (error) { next(error); }
};

const getMyBookings = async (req, res, next) => {
  try {
    const filter = { studentId: req.user.id };
    if (req.query.status) filter.status = req.query.status;
    const bookings = await bookingPopulate(Booking.find(filter).sort({ requestedAt: -1 }));
    res.json(new ApiResponse(200, { bookings }, 'Your bookings fetched.'));
  } catch (error) { next(error); }
};

const getIncomingBookings = async (req, res, next) => {
  try {
    const filter = { instructorId: req.user.id };
    if (req.query.status) filter.status = req.query.status;
    const bookings = await bookingPopulate(Booking.find(filter).sort({ requestedAt: -1 }));
    res.json(new ApiResponse(200, { bookings }, 'Incoming booking requests fetched.'));
  } catch (error) { next(error); }
};

const getBooking = async (req, res, next) => {
  try {
    const booking = await bookingPopulate(Booking.findById(req.params.id));
    if (!booking) throw new ApiError(404, 'Booking not found.');
    const ownsBooking = req.user.role === 'student' ? booking.studentId._id.equals(req.user.id) : req.user.role === 'instructor' && booking.instructorId._id.equals(req.user.id);
    if (!ownsBooking) throw new ApiError(403, 'You cannot access this booking.');
    res.json(new ApiResponse(200, { booking }, 'Booking fetched.'));
  } catch (error) { next(error); }
};

const approveBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) throw new ApiError(404, 'Booking not found.');
    if (!booking.instructorId.equals(req.user.id)) throw new ApiError(403, 'You cannot manage this booking.');
    if (booking.status !== 'pending') throw new ApiError(409, 'Only pending booking requests can be approved.');
    const slot = await Slot.findOneAndUpdate({ _id: booking.slotId, instructorId: req.user.id, status: 'available' }, { $set: { status: 'booked' } }, { returnDocument: 'after' });
    if (!slot) throw new ApiError(409, 'This slot is no longer available.');
    const confirmed = await Booking.findOneAndUpdate({ _id: booking._id, status: 'pending' }, { $set: { status: 'confirmed', approvedAt: new Date() } }, { returnDocument: 'after' });
    if (!confirmed) {
      await Slot.updateOne({ _id: slot._id, status: 'booked' }, { $set: { status: 'available' } });
      throw new ApiError(409, 'Booking status changed before approval.');
    }
    const populated = await bookingPopulate(Booking.findById(confirmed._id));
    res.json(new ApiResponse(200, { booking: populated }, 'Booking confirmed.'));
    // Notify student (fire-and-forget)
    const slotDate = new Date(slot.date).toLocaleDateString();
    notify({
      userId:   confirmed.studentId,
      type:     'booking_approved',
      title:    'Booking confirmed',
      message:  `Your lesson on ${slotDate} has been confirmed.`,
      refModel: 'Booking',
      refId:    confirmed._id,
    });
    sendBookingApprovedEmail(populated.studentId?.email, populated.studentId?.name, slotDate);
  } catch (error) { next(error); }
};

const rejectBooking = async (req, res, next) => {
  try {
    const existing = await Booking.findById(req.params.id);
    if (!existing) throw new ApiError(404, 'Booking not found.');
    if (!existing.instructorId.equals(req.user.id)) throw new ApiError(403, 'You cannot manage this booking.');
    if (existing.status !== 'pending') throw new ApiError(409, 'Only pending booking requests can be rejected.');
    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.id, instructorId: req.user.id, status: 'pending' },
      { $set: { status: 'rejected', rejectedAt: new Date(), rejectionReason: req.body.reason || null } },
      { returnDocument: 'after' }
    );
    if (!booking) throw new ApiError(409, 'Only your pending booking requests can be rejected.');
    await Slot.updateOne({ _id: booking.slotId, instructorId: req.user.id, status: { $ne: 'cancelled' } }, { $set: { status: 'available' } });
    const populated = await bookingPopulate(Booking.findById(booking._id));
    res.json(new ApiResponse(200, { booking: populated }, 'Booking rejected and slot released.'));
    // Notify student (fire-and-forget)
    notify({
      userId:   booking.studentId,
      type:     'booking_rejected',
      title:    'Booking not approved',
      message:  `Your booking request was not approved${booking.rejectionReason ? ': ' + booking.rejectionReason : '.'}`,
      refModel: 'Booking',
      refId:    booking._id,
    });
    sendBookingRejectedEmail(populated.studentId?.email, populated.studentId?.name, booking.rejectionReason);
  } catch (error) { next(error); }
};

const cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, studentId: req.user.id, status: 'confirmed' });
    if (!booking) throw new ApiError(409, 'Only your confirmed bookings can be cancelled.');
    const cancelled = await Booking.findOneAndUpdate(
      { _id: booking._id, status: 'confirmed' },
      { $set: { status: 'cancelled', cancelledAt: new Date(), cancellationReason: req.body.reason || null } }, { returnDocument: 'after' }
    );
    if (!cancelled) throw new ApiError(409, 'Booking status changed before cancellation.');
    await Slot.updateOne({ _id: booking.slotId, instructorId: booking.instructorId, status: 'booked' }, { $set: { status: 'available' } });
    const populated = await bookingPopulate(Booking.findById(cancelled._id));
    res.json(new ApiResponse(200, { booking: populated }, 'Booking cancelled and slot released.'));
    // Notify instructor of cancellation (fire-and-forget)
    notify({
      userId:   cancelled.instructorId,
      type:     'booking_cancelled',
      title:    'Booking cancelled',
      message:  `${populated.studentId?.name || 'A student'} has cancelled their booking.`,
      refModel: 'Booking',
      refId:    cancelled._id,
    });
  } catch (error) { next(error); }
};

module.exports = { listAvailableSlots, createBooking, getMyBookings, getIncomingBookings, getBooking, approveBooking, rejectBooking, cancelBooking };

