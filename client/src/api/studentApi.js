import api from './axios';

// ── Student API — implemented in PHASE 4 ────────────────────────────
export const getStudentProfile  = ()     => api.get('/students/profile');
export const updateStudentProfile = (data) => api.patch('/students/profile', data);
export const getStudentDashboard  = ()   => api.get('/students/dashboard');
