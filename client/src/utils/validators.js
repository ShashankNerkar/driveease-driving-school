/**
 * Client-side validation helpers.
 * These complement (never replace) server-side validation.
 */

export const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const isValidPhone = (phone) =>
  /^[6-9]\d{9}$/.test(phone); // Indian mobile number

export const isStrongPassword = (password) =>
  password.length >= 8 &&
  /[A-Z]/.test(password) &&
  /[a-z]/.test(password) &&
  /\d/.test(password);

export const isValidDate = (dateStr) =>
  !isNaN(new Date(dateStr).getTime());

/**
 * Returns a field-error map from a server validation error response.
 *
 * @param {object} axiosError - The Axios error object
 * @returns {object}          - { fieldName: 'error message', ... }
 */
export const extractServerErrors = (axiosError) => {
  const errors = axiosError?.response?.data?.errors;
  if (!Array.isArray(errors)) return {};
  return errors.reduce((acc, { field, message }) => {
    acc[field] = message;
    return acc;
  }, {});
};
