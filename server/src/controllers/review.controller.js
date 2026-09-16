const Review = require('../models/Review');
const Enrollment = require('../models/Enrollment');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Course = require('../models/Course');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

const publicFields = 'studentName targetType rating comment approvedAt createdAt';
const ownFields = `${publicFields} status updatedAt`;

const assertEligibleTarget = async (studentId, targetType, targetId) => {
  const eligible = targetType === 'course'
    ? await Enrollment.exists({ studentId, courseId: targetId })
    : await Booking.exists({ studentId, instructorId: targetId, status: 'completed' });
  if (!eligible) throw new ApiError(403, targetType === 'course' ? 'You can review only courses you are enrolled in.' : 'You can review only instructors from completed bookings.');
};

const listApprovedReviews = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [reviews, total] = await Promise.all([
      Review.find({ status: 'approved' }).select(publicFields).sort({ approvedAt: -1, createdAt: -1 }).skip(skip).limit(parseInt(limit, 10)).lean(),
      Review.countDocuments({ status: 'approved' }),
    ]);
    res.json(new ApiResponse(200, { reviews, total, page: parseInt(page, 10), totalPages: Math.ceil(total / parseInt(limit, 10)) }, 'Reviews fetched.'));
  } catch (error) { next(error); }
};

const createReview = async (req, res, next) => {
  try {
    await assertEligibleTarget(req.user.id, req.body.targetType, req.body.targetId);
    await Review.init();
    const student = await User.findById(req.user.id).select('name');
    try {
      const review = await Review.create({ studentId: req.user.id, studentName: student?.name || 'DriveEase student', targetType: req.body.targetType, targetId: req.body.targetId, rating: req.body.rating, comment: req.body.comment });
      res.status(201).json(new ApiResponse(201, { review: await Review.findById(review._id).select(ownFields) }, 'Review submitted for moderation.'));
    } catch (error) {
      if (error.code === 11000) throw new ApiError(409, 'You have already reviewed this course or instructor.');
      throw error;
    }
  } catch (error) { next(error); }
};

const listMyReviews = async (req, res, next) => { try { const reviews = await Review.find({ studentId: req.user.id }).select(ownFields).sort({ createdAt: -1 }).lean(); res.json(new ApiResponse(200, { reviews }, 'Your reviews fetched.')); } catch (error) { next(error); } };

const listEligibleTargets = async (req, res, next) => {
  try {
    const [courseIds, instructorIds, reviewed] = await Promise.all([
      Enrollment.find({ studentId: req.user.id, status: 'completed' }).distinct('courseId'),
      Attendance.find({ studentId: req.user.id, status: 'present' }).distinct('instructorId'),
      Review.find({ studentId: req.user.id }).select('targetType targetId').lean(),
    ]);
    const seen = new Set(reviewed.map((review) => `${review.targetType}:${review.targetId}`));
    const [courses, instructors] = await Promise.all([Course.find({ _id: { $in: courseIds } }).select('title'), User.find({ _id: { $in: instructorIds }, role: 'instructor' }).select('name')]);
    const targets = [...courses.filter((course) => !seen.has(`course:${course._id}`)).map((course) => ({ targetType: 'course', targetId: course._id, label: course.title })), ...instructors.filter((instructor) => !seen.has(`instructor:${instructor._id}`)).map((instructor) => ({ targetType: 'instructor', targetId: instructor._id, label: instructor.name }))];
    res.json(new ApiResponse(200, { targets }, 'Review-eligible targets fetched.'));
  } catch (error) { next(error); }
};

const updateReview = async (req, res, next) => {
  try {
    const review = await Review.findOne({ _id: req.params.id, studentId: req.user.id });
    if (!review) throw new ApiError(404, 'Review not found.');
    if (req.body.rating !== undefined) review.rating = req.body.rating;
    if (req.body.comment !== undefined) review.comment = req.body.comment;
    review.status = 'pending'; review.approvedAt = null; review.approvedBy = null;
    await review.save();
    res.json(new ApiResponse(200, { review: await Review.findById(review._id).select(ownFields) }, 'Review updated and returned to moderation.'));
  } catch (error) { next(error); }
};

const deleteReview = async (req, res, next) => { try { const review = await Review.findOneAndDelete({ _id: req.params.id, studentId: req.user.id }); if (!review) throw new ApiError(404, 'Review not found.'); res.json(new ApiResponse(200, null, 'Review deleted.')); } catch (error) { next(error); } };
const listModerationReviews = async (req, res, next) => { try { const reviews = await Review.find(req.query.status ? { status: req.query.status } : {}).select(ownFields).sort({ createdAt: -1 }).lean(); res.json(new ApiResponse(200, { reviews }, 'Reviews fetched for moderation.')); } catch (error) { next(error); } };
const moderateReview = (status) => async (req, res, next) => { try { const review = await Review.findById(req.params.id); if (!review) throw new ApiError(404, 'Review not found.'); review.status = status; review.approvedAt = status === 'approved' ? new Date() : null; review.approvedBy = status === 'approved' ? req.user.id : null; await review.save(); res.json(new ApiResponse(200, { review: await Review.findById(review._id).select(ownFields) }, `Review ${status}.`)); } catch (error) { next(error); } };

module.exports = { listApprovedReviews, createReview, listMyReviews, listEligibleTargets, updateReview, deleteReview, listModerationReviews, approveReview: moderateReview('approved'), rejectReview: moderateReview('rejected') };
