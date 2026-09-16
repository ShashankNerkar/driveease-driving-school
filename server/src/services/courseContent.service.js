const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const ApiError = require('../utils/ApiError');

const getContentCourseId = async (courseId) => {
  const course = await Course.findById(courseId).select('contentSourceCourseId');
  if (!course) throw new ApiError(404, 'Course not found.');
  return course.contentSourceCourseId || course._id;
};

const getEnrollmentForContent = async (studentId, contentCourseId) => {
  const courses = await Course.find({ $or: [{ _id: contentCourseId }, { contentSourceCourseId: contentCourseId }] }).select('_id');
  const enrollment = await Enrollment.findOne({ studentId, courseId: { $in: courses.map((course) => course._id) } });
  if (!enrollment) throw new ApiError(403, 'Enroll in this course before viewing its lessons.');
  return enrollment;
};

module.exports = { getContentCourseId, getEnrollmentForContent };
