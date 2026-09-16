import api from './axios';

// ── Course API — implemented in PHASE 5 ─────────────────────────────
export const getCourses    = (params) => api.get('/courses', { params });
export const getCourseById = (id)     => api.get(`/courses/${id}`);
export const createCourse  = (data)   => api.post('/courses', data);
export const updateCourse  = (id, data) => api.patch(`/courses/${id}`, data);
export const deleteCourse  = (id)     => api.delete(`/courses/${id}`);
export const enrollInCourse = (courseId) => api.post('/enrollments', { courseId });
export const getMyEnrollments = () => api.get('/enrollments/mine');
export const getEnrollment = (id) => api.get(`/enrollments/${id}`);
export const getCourseLessons = (courseId) => api.get(`/lessons/course/${courseId}`);
export const getLesson = (id, courseId) => api.get(`/lessons/${id}`, { params: { courseId } });
export const completeLesson = (id, courseId, data = {}) => api.post(`/lessons/${id}/complete`, { ...data, courseId });
export const getCourseProgress = (courseId) => api.get(`/progress/courses/${courseId}`);
