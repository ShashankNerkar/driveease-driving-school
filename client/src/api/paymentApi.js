import api from './axios';

// ── Payment API — implemented in PHASE 11 ───────────────────────────
export const createOrder    = (data) => api.post('/payments/create-order', data);
export const verifyPayment  = (data) => api.post('/payments/verify', data);
export const getPaymentHistory = (params) => api.get('/payments/history', { params });
