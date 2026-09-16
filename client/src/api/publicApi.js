import api from './axios';

// ── Courses ──────────────────────────────────────────────────────────
export const getCourses    = (params) => api.get('/courses', { params });
export const getCourseById = (id)     => api.get(`/courses/${id}`);

// ── Instructors ──────────────────────────────────────────────────────
export const getInstructors    = (params) => api.get('/instructors', { params });
export const getInstructorById = (id)     => api.get(`/instructors/${id}`);

// ── Vehicles ─────────────────────────────────────────────────────────
export const getVehicles    = (params) => api.get('/vehicles', { params });
export const getVehicleById = (id)     => api.get(`/vehicles/${id}`);

// ── Rules & Safety ───────────────────────────────────────────────────
export const getRules   = (params) => api.get('/rules', { params });
export const getRuleById = (id)    => api.get(`/rules/${id}`);

// ── Traffic Signs ─────────────────────────────────────────────────────
export const getTrafficSigns   = (params) => api.get('/traffic-signs', { params });
export const getTrafficSignById = (id)    => api.get(`/traffic-signs/${id}`);

// ── License Preparation ───────────────────────────────────────────────
export const getLicenseResources   = (params) => api.get('/license', { params });
export const getLicenseResourceById = (id)    => api.get(`/license/${id}`);

// ── Approved Reviews & Testimonials (public) ─────────────────────────
export const getApprovedReviews      = (params) => api.get('/reviews', { params });
export const getApprovedTestimonials = (params) => api.get('/testimonials', { params });
