import api from './axios';

// ── Review & Testimonial API — implemented in PHASE 13 ──────────────
export const getApprovedReviews      = (params) => api.get('/reviews', { params });
export const submitReview            = (data)   => api.post('/reviews', data);
export const getMyReviews            = ()       => api.get('/reviews/mine');
export const getReviewEligibleTargets = ()      => api.get('/reviews/eligible-targets');
export const updateReview            = (id, data) => api.patch(`/reviews/${id}`, data);
export const deleteReview            = (id)     => api.delete(`/reviews/${id}`);
export const approveReview           = (id)     => api.patch(`/reviews/${id}/approve`);
export const rejectReview            = (id)     => api.patch(`/reviews/${id}/reject`);

export const getApprovedTestimonials = (params) => api.get('/testimonials', { params });
export const submitTestimonial       = (formData) =>
  api.post('/testimonials', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const getMyTestimonials       = ()       => api.get('/testimonials/mine');
export const updateTestimonial       = (id, formData) => api.patch(`/testimonials/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deleteTestimonial       = (id)     => api.delete(`/testimonials/${id}`);
export const approveTestimonial      = (id) => api.patch(`/testimonials/${id}/approve`);
export const rejectTestimonial       = (id) => api.patch(`/testimonials/${id}/reject`);
