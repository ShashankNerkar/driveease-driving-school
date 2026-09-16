const Course = require('../models/Course'); 
const Enrollment = require('../models/Enrollment'); 
const ApiResponse = require('../utils/ApiResponse'); 
const ApiError = require('../utils/ApiError'); 
const { getCourseProgress } = require('../services/courseProgress.service');

const serialize = async (enrollment) => ({ 
  ...enrollment.toObject(), 
  progress: await getCourseProgress(enrollment.studentId, enrollment.courseId) 
});

const enroll = async (req, res, next) => { 
  try { 
    const course = await Course.findOne({ 
      _id: req.body.courseId, 
      $or: [{ status: 'published' }, { status: { $exists: false }, isActive: true }] 
    }).setOptions({ strictQuery: false }); 
    
    if (!course) throw new ApiError(404, 'Course not found.'); 
    
    const exists = await Enrollment.exists({ studentId: req.user.id, courseId: course._id }); 
    if (exists) throw new ApiError(409, 'You are already enrolled in this course.'); 
    
    const enrollment = await Enrollment.create({ studentId: req.user.id, courseId: course._id }); 
    enrollment.courseId = course; 
    
    res.status(201).json(new ApiResponse(201, { enrollment: await serialize(enrollment) }, 'Enrolled in course.')); 
  } catch (error) { 
    next(error); 
  } 
};

const myEnrollments = async (req, res, next) => { 
  try { 
    const enrollments = await Enrollment.find({ studentId: req.user.id }).populate('courseId'); 
    const data = await Promise.all(enrollments.map(async (enrollment) => ({ 
      ...await serialize(enrollment), 
      course: enrollment.courseId 
    }))); 
    
    res.json(new ApiResponse(200, { enrollments: data }, 'Enrollments fetched.')); 
  } catch (error) { 
    next(error); 
  } 
};

const getEnrollment = async (req, res, next) => { 
  try { 
    const enrollment = await Enrollment.findOne({ _id: req.params.id, studentId: req.user.id }).populate('courseId'); 
    if (!enrollment) throw new ApiError(404, 'Enrollment not found.'); 
    
    res.json(new ApiResponse(200, { 
      enrollment: { ...await serialize(enrollment), course: enrollment.courseId } 
    }, 'Enrollment fetched.')); 
  } catch (error) { 
    next(error); 
  } 
};

module.exports = { enroll, myEnrollments, getEnrollment };
