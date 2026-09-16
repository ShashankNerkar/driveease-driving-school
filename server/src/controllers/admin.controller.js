const User = require('../models/User'); 
const StudentProfile = require('../models/StudentProfile'); 
const InstructorProfile = require('../models/InstructorProfile'); 
const Course = require('../models/Course'); 
const Lesson = require('../models/Lesson'); 
const Booking = require('../models/Booking'); 
const Slot = require('../models/Slot'); 
const PaymentOrder = require('../models/PaymentOrder'); 
const Review = require('../models/Review');
const ApiResponse = require('../utils/ApiResponse'); 
const ApiError = require('../utils/ApiError');

const pageOptions = (query) => { 
  const page = Math.max(Number(query.page) || 1, 1); 
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100); 
  return { page, limit, skip: (page - 1) * limit }; 
};

const paged = async (model, filter, query, select, populate, sort = { createdAt: -1 }) => { 
  const { page, limit, skip } = pageOptions(query); 
  let rows = model.find(filter).select(select).sort(sort).skip(skip).limit(limit); 
  for (const item of populate || []) rows = rows.populate(item); 
  const [items, total] = await Promise.all([rows.lean(), model.countDocuments(filter)]); 
  return { items, total, page, totalPages: Math.ceil(total / limit) }; 
};

const dashboard = async (req, res, next) => { 
  try { 
    const [students, instructors, activeUsers, courses, bookings, pendingReviews, paidAmount, recentBookings] = await Promise.all([
      User.countDocuments({ role: 'student' }), 
      User.countDocuments({ role: 'instructor' }), 
      User.countDocuments({ isActive: true }), 
      Course.countDocuments(), 
      Booking.countDocuments(), 
      Review.countDocuments({ status: 'pending' }), 
      PaymentOrder.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: null, value: { $sum: '$amountPaise' } } }]), 
      Booking.find().populate('studentId', 'name email').populate('instructorId', 'name email').populate('slotId', 'date startTime endTime').sort({ createdAt: -1 }).limit(6).lean()
    ]); 
    res.json(new ApiResponse(200, { 
      stats: { students, instructors, activeUsers, courses, bookings, pendingReviews, paidAmountPaise: paidAmount[0]?.value || 0 }, 
      recentBookings 
    }, 'Admin dashboard fetched.')); 
  } catch (error) { 
    next(error); 
  } 
};

const listUsers = async (req, res, next) => { 
  try { 
    const filter = {}; 
    if (req.query.role) filter.role = req.query.role; 
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true'; 
    if (req.query.search) filter.$or = [{ name: { $regex: req.query.search, $options: 'i' } }, { email: { $regex: req.query.search, $options: 'i' } }]; 
    const result = await paged(User, filter, req.query, 'name email phone role isActive createdAt updatedAt'); 
    res.json(new ApiResponse(200, { users: result.items, total: result.total, page: result.page, totalPages: result.totalPages }, 'Users fetched.')); 
  } catch (error) { 
    next(error); 
  } 
};

const updateUser = async (req, res, next) => { 
  try { 
    const user = await User.findById(req.params.id); 
    if (!user) throw new ApiError(404, 'User not found.'); 
    if (user._id.equals(req.user.id) && (req.body.isActive === false || req.body.role && req.body.role !== 'admin')) 
      throw new ApiError(409, 'You cannot deactivate or demote your own admin account.'); 
    if (req.body.name !== undefined) user.name = req.body.name; 
    if (req.body.role !== undefined) user.role = req.body.role; 
    if (req.body.isActive !== undefined) user.isActive = req.body.isActive; 
    await user.save(); 
    res.json(new ApiResponse(200, { user: user.toSafeObject() }, 'User updated.')); 
  } catch (error) { 
    next(error); 
  } 
};

const listStudents = async (req, res, next) => { 
  try { 
    const filter = { role: 'student' }; 
    if (req.query.search) filter.$or = [{ name: { $regex: req.query.search, $options: 'i' } }, { email: { $regex: req.query.search, $options: 'i' } }]; 
    const result = await paged(User, filter, req.query, 'name email phone role isActive createdAt updatedAt'); 
    res.json(new ApiResponse(200, { users: result.items, total: result.total, page: result.page, totalPages: result.totalPages }, 'Users fetched.')); 
  } catch (error) { 
    next(error); 
  } 
};

const listInstructors = async (req, res, next) => { 
  try { 
    const filter = { role: 'instructor' }; 
    if (req.query.search) filter.$or = [{ name: { $regex: req.query.search, $options: 'i' } }, { email: { $regex: req.query.search, $options: 'i' } }]; 
    const result = await paged(User, filter, req.query, 'name email phone role isActive createdAt updatedAt'); 
    res.json(new ApiResponse(200, { users: result.items, total: result.total, page: result.page, totalPages: result.totalPages }, 'Users fetched.')); 
  } catch (error) { 
    next(error); 
  } 
};

const listCourses = async (req, res, next) => { 
  try { 
    const filter = {}; 
    if (req.query.status) filter.status = req.query.status; 
    if (req.query.search) filter.title = { $regex: req.query.search, $options: 'i' }; 
    const result = await paged(Course, filter, req.query, 'title description level duration thumbnail status createdAt updatedAt'); 
    res.json(new ApiResponse(200, { courses: result.items, total: result.total, page: result.page, totalPages: result.totalPages }, 'Courses fetched.')); 
  } catch (error) { 
    next(error); 
  } 
};

const listLessons = async (req, res, next) => { 
  try { 
    const filter = req.query.courseId ? { courseId: req.query.courseId } : {}; 
    if (req.query.search) filter.title = { $regex: req.query.search, $options: 'i' }; 
    const result = await paged(Lesson, filter, req.query, 'courseId title description duration order videoUrl createdAt updatedAt', [{ path: 'courseId', select: 'title' }], { courseId: 1, order: 1 }); 
    res.json(new ApiResponse(200, { lessons: result.items, total: result.total, page: result.page, totalPages: result.totalPages }, 'Lessons fetched.')); 
  } catch (error) { 
    next(error); 
  } 
};

const listBookings = async (req, res, next) => { 
  try { 
    const filter = {}; 
    if (req.query.status) filter.status = req.query.status; 
    if (req.query.studentId) filter.studentId = req.query.studentId; 
    if (req.query.instructorId) filter.instructorId = req.query.instructorId; 
    const result = await paged(Booking, filter, req.query, 'studentId instructorId slotId status requestedAt approvedAt rejectedAt cancelledAt rejectionReason cancellationReason', [{ path: 'studentId', select: 'name email' }, { path: 'instructorId', select: 'name email' }, { path: 'slotId', select: 'date startTime endTime status' }], { requestedAt: -1 }); 
    res.json(new ApiResponse(200, { bookings: result.items, total: result.total, page: result.page, totalPages: result.totalPages }, 'Bookings fetched.')); 
  } catch (error) { 
    next(error); 
  } 
};

const cancelBooking = async (req, res, next) => { 
  try { 
    const booking = await Booking.findById(req.params.id); 
    if (!booking) throw new ApiError(404, 'Booking not found.'); 
    if (!['pending', 'confirmed'].includes(booking.status)) 
      throw new ApiError(409, 'Only pending or confirmed bookings can be cancelled.'); 
    booking.status = 'cancelled'; 
    booking.cancelledAt = new Date(); 
    booking.cancellationReason = req.body.reason || 'Cancelled by administrator.'; 
    await booking.save(); 
    await Slot.updateOne({ _id: booking.slotId, status: 'booked' }, { $set: { status: 'available' } }); 
    res.json(new ApiResponse(200, { booking }, 'Booking cancelled.')); 
  } catch (error) { 
    next(error); 
  } 
};

const listSlots = async (req, res, next) => { 
  try { 
    const filter = {}; 
    if (req.query.status) filter.status = req.query.status; 
    if (req.query.instructorId) filter.instructorId = req.query.instructorId; 
    if (req.query.date) { 
      const date = new Date(`${req.query.date}T00:00:00.000Z`); 
      filter.date = { $gte: date, $lt: new Date(date.getTime() + 86400000) }; 
    } 
    const result = await paged(Slot, filter, req.query, 'instructorId date startTime endTime status createdAt updatedAt', [{ path: 'instructorId', select: 'name email' }], { date: 1, startTime: 1 }); 
    res.json(new ApiResponse(200, { slots: result.items, total: result.total, page: result.page, totalPages: result.totalPages }, 'Slots fetched.')); 
  } catch (error) { 
    next(error); 
  } 
};

const createSlot = async (req, res, next) => { 
  try { 
    const instructor = await User.exists({ _id: req.body.instructorId, role: 'instructor', isActive: true }); 
    if (!instructor) throw new ApiError(404, 'Active instructor not found.'); 
    const slot = await Slot.create(req.body); 
    res.status(201).json(new ApiResponse(201, { slot }, 'Slot created.')); 
  } catch (error) { 
    next(error); 
  } 
};

const updateSlot = async (req, res, next) => { 
  try { 
    const slot = await Slot.findById(req.params.id); 
    if (!slot) throw new ApiError(404, 'Slot not found.'); 
    if (slot.status === 'booked' && (req.body.date || req.body.startTime || req.body.endTime || req.body.instructorId)) 
      throw new ApiError(409, 'Booked slots cannot be rescheduled.'); 
    Object.assign(slot, req.body); 
    await slot.save(); 
    res.json(new ApiResponse(200, { slot }, 'Slot updated.')); 
  } catch (error) { 
    next(error); 
  } 
};

const deleteSlot = async (req, res, next) => { 
  try { 
    const slot = await Slot.findById(req.params.id); 
    if (!slot) throw new ApiError(404, 'Slot not found.'); 
    if (await Booking.exists({ slotId: slot._id, status: { $in: ['pending', 'confirmed'] } })) 
      throw new ApiError(409, 'Slots with active bookings cannot be deleted.'); 
    await slot.deleteOne(); 
    res.json(new ApiResponse(200, null, 'Slot deleted.')); 
  } catch (error) { 
    next(error); 
  } 
};

const listPayments = async (req, res, next) => { 
  try { 
    const filter = req.query.status ? { status: req.query.status } : {}; 
    const result = await paged(PaymentOrder, filter, req.query, 'studentId courseId razorpayOrderId razorpayPaymentId amountPaise currency status verifiedAt failReason createdAt', [{ path: 'studentId', select: 'name email' }, { path: 'courseId', select: 'title' }]); 
    res.json(new ApiResponse(200, { payments: result.items, total: result.total, page: result.page, totalPages: result.totalPages }, 'Payment records fetched.')); 
  } catch (error) { 
    next(error); 
  } 
};

module.exports = { 
  dashboard, 
  listUsers, 
  updateUser, 
  listStudents, 
  listInstructors, 
  listCourses, 
  listLessons, 
  listBookings, 
  cancelBooking, 
  listSlots, 
  createSlot, 
  updateSlot, 
  deleteSlot, 
  listPayments 
};
