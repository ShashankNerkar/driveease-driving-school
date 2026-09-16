import api from './axios';

// ── Booking API — implemented in PHASE 7 ────────────────────────────
export const createBooking      = (data) => api.post('/bookings', data);
export const getMyBookings      = (params) => api.get('/bookings/mine', { params });
export const getBookingRequests = (params) => api.get('/bookings/requests', { params });
export const acceptBooking      = (id)   => api.patch(`/bookings/${id}/accept`);
export const rejectBooking      = (id, data) => api.patch(`/bookings/${id}/reject`, data);
export const cancelBooking      = (id, data) => api.patch(`/bookings/${id}/cancel`, data);
export const getBookingById     = (id)   => api.get(`/bookings/${id}`);
