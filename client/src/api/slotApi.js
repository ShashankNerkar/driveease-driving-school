import api from './axios';

// ── Slot API — implemented in PHASE 6 / 7 ───────────────────────────
export const getAvailableSlots = (params) => api.get('/bookings/available-slots', { params });
export const createSlot        = (data)   => api.post('/slots', data);
export const getMySlots        = (params) => api.get('/slots/mine', { params });
export const deleteSlot        = (id)     => api.delete(`/slots/${id}`);
export const updateSlot        = (id, data) => api.patch(`/slots/${id}`, data);
