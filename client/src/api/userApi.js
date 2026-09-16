import api from './axios';

export const getMe          = ()     => api.get('/users/me');
export const changePassword = (data) => api.patch('/users/change-password', data);
