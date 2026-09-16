/**
 * Format a number as Indian Rupees.
 *
 * @param {number} amount  - Amount in smallest unit (paise) or rupees
 * @param {boolean} paise  - If true, divide by 100 first (Razorpay uses paise)
 * @returns {string}       - e.g. "₹1,499"
 */
export const formatCurrency = (amount, paise = false) => {
  if (amount == null) return '—';
  const value = paise ? amount / 100 : amount;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
};
