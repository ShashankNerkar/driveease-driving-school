const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Lesson = require('../models/Lesson');
const LessonProgress = require('../models/LessonProgress');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { getContentCourseId } = require('../services/courseContent.service');

const requireEnrollment = async (studentId, courseId) => {
  const enrollment = await Enrollment.findOne({ studentId, courseId });
  if (!enrollment) throw new ApiError(403, 'Enroll in this course before viewing its lessons.');
  return enrollment;
};
const ensureLessonBelongsToCourse = async (lesson, courseId, studentId) => {
  await requireEnrollment(studentId, courseId);
  const contentCourseId = await getContentCourseId(courseId);
  if (!lesson.courseId.equals(contentCourseId)) throw new ApiError(403, 'This lesson is not part of your selected course.');
};
const listCourseLessons = async (req, res, next) => { try {
  await requireEnrollment(req.user.id, req.params.courseId);
  const contentCourseId = await getContentCourseId(req.params.courseId);
  const lessons = await Lesson.find({ courseId: contentCourseId }).sort({ order: 1 });
  const completed = await LessonProgress.find({ studentId: req.user.id, lessonId: { $in: lessons.map((lesson) => lesson._id) }, completed: true }).distinct('lessonId');
  res.json(new ApiResponse(200, { lessons: lessons.map((lesson) => ({ ...lesson.toObject(), completed: completed.some((id) => id.equals(lesson._id)) })) }, 'Lessons fetched.'));
} catch (error) { next(error); } };
const getLesson = async (req, res, next) => { try {
  const lesson = await Lesson.findById(req.params.id); if (!lesson) throw new ApiError(404, 'Lesson not found.');
  await ensureLessonBelongsToCourse(lesson, req.query.courseId, req.user.id);
  const progress = await LessonProgress.findOne({ studentId: req.user.id, lessonId: lesson._id });
  res.json(new ApiResponse(200, { lesson, accessCourseId: req.query.courseId, progress: progress || null }, 'Lesson fetched.'));
} catch (error) { next(error); } };
const createLesson = async (req, res, next) => { try { const course = await Course.findById(req.body.courseId); if (!course) throw new ApiError(404, 'Course not found.'); const lesson = await Lesson.create(req.body); res.status(201).json(new ApiResponse(201, { lesson }, 'Lesson created.')); } catch (error) { next(error); } };
const updateLesson = async (req, res, next) => { try { const lesson = await Lesson.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after', runValidators: true }); if (!lesson) throw new ApiError(404, 'Lesson not found.'); res.json(new ApiResponse(200, { lesson }, 'Lesson updated.')); } catch (error) { next(error); } };
const deleteLesson = async (req, res, next) => { try { const lesson = await Lesson.findByIdAndDelete(req.params.id); if (!lesson) throw new ApiError(404, 'Lesson not found.'); res.json(new ApiResponse(200, null, 'Lesson deleted.')); } catch (error) { next(error); } };
const completeLesson = async (req, res, next) => { try {
  const lesson = await Lesson.findById(req.params.id); if (!lesson) throw new ApiError(404, 'Lesson not found.');
  await ensureLessonBelongsToCourse(lesson, req.body.courseId, req.user.id);
  const watchTime = req.body.watchTime;
  const progress = await LessonProgress.findOneAndUpdate({ studentId: req.user.id, lessonId: lesson._id }, { $set: { completed: true, completedAt: new Date(), ...(watchTime !== undefined ? { watchTime } : {}) } }, { returnDocument: 'after', upsert: true, runValidators: true, setDefaultsOnInsert: true });
  res.json(new ApiResponse(200, { progress }, 'Lesson marked complete.'));
} catch (error) { next(error); } };
module.exports = { listCourseLessons, getLesson, createLesson, updateLesson, deleteLesson, completeLesson };
