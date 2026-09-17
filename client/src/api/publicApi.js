import api from './axios';

// ── Courses ──────────────────────────────────────────────────────────
export const getCourses    = (params) => api.get('/courses', { params });
export const getCourseById = (id)     => api.get(`/courses/${id}`);

// ── Instructors ──────────────────────────────────────────────────────
export const getInstructors    = (params) => api.get('/instructors', { params });
export const getInstructorById = (id)     => api.get(`/instructors/${id}`);

// ── Approved Reviews (public) ────────────────────────────────────────
export const getApprovedReviews = (params) => api.get('/reviews', { params });

