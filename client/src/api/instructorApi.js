import api from './axios';

// ── Instructor API — implemented in PHASE 6 ─────────────────────────
export const getInstructors        = (params) => api.get('/instructors', { params });
export const getInstructorById     = (id)     => api.get(`/instructors/${id}`);
export const updateInstructorProfile = (data) => api.patch('/instructors/profile', data);
export const getInstructorDashboard  = ()     => api.get('/instructors/dashboard');
export const getInstructorProfile = () => api.get('/instructors/profile');
