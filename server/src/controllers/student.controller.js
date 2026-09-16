const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const Enrollment = require('../models/Enrollment');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const { getCourseProgress } = require('../services/courseProgress.service');

const getStudentRecord = async (userId) => {
  const [user, profile] = await Promise.all([
    User.findOne({ _id: userId, role: 'student', isActive: true }),
    StudentProfile.findOne({ userId }),
  ]);

  if (!user) throw new ApiError(401, 'Student account not found or deactivated.');
  return { user, profile };
};

const profilePayload = (user, profile) => ({
  user: user.toSafeObject(),
  profile: profile ? profile.toObject() : null,
});

/** GET /api/students/profile — authenticated student's own profile only. */
const getProfile = async (req, res, next) => {
  try {
    const { user, profile } = await getStudentRecord(req.user.id);
    return res.status(200).json(new ApiResponse(200, profilePayload(user, profile), 'Student profile fetched.'));
  } catch (error) { next(error); }
};

/** PATCH /api/students/profile — updates only a JWT-authenticated student's own record. */
const updateProfile = async (req, res, next) => {
  try {
    const { user } = await getStudentRecord(req.user.id);
    const { name, phone, dateOfBirth, address, drivingExperience, preferredTransmission } = req.body;

    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone || null;
    await user.save();

    const profileUpdates = {};
    if (dateOfBirth !== undefined) profileUpdates.dateOfBirth = dateOfBirth || null;
    if (address !== undefined) profileUpdates.address = address;
    if (drivingExperience !== undefined) profileUpdates.drivingExperience = drivingExperience;
    if (preferredTransmission !== undefined) profileUpdates.preferredTransmission = preferredTransmission;

    const profile = await StudentProfile.findOneAndUpdate(
      { userId: user._id },
      { $set: profileUpdates, $setOnInsert: { userId: user._id } },
      { returnDocument: 'after', upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json(new ApiResponse(200, profilePayload(user, profile), 'Student profile updated.'));
  } catch (error) { next(error); }
};

/**
 * GET /api/students/dashboard — own dashboard only.
 * Course values are calculated only from the student's persisted enrollment
 * and lesson-progress records.
 */
const getDashboard = async (req, res, next) => {
  try {
    const { user, profile } = await getStudentRecord(req.user.id);

    const enrollment = await Enrollment.findOne({ studentId: req.user.id }).sort({ enrolledAt: -1 }).populate('courseId');
    const courseProgress = enrollment ? await getCourseProgress(req.user.id, enrollment.courseId._id) : null;

    const [upcomingBooking, recentNotifications] = await Promise.all([
      Booking.findOne({ studentId: req.user.id, status: { $in: ['pending', 'confirmed'] } }).populate('instructorId', 'name').populate('slotId', 'date startTime endTime').sort({ requestedAt: -1 }),
      Notification.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(3),
    ]);

    return res.status(200).json(new ApiResponse(200, {
      ...profilePayload(user, profile),
      enrollment: enrollment ? { ...enrollment.toObject(), course: enrollment.courseId, progress: courseProgress } : null,
      lessonProgress: courseProgress,
      upcomingBooking: upcomingBooking ? upcomingBooking.toObject() : null,
      recentNotifications,
    }, 'Student dashboard fetched.'));
  } catch (error) { next(error); }
};

module.exports = { getProfile, updateProfile, getDashboard };
