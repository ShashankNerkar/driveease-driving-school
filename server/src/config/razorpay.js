const Razorpay = require('razorpay');

/**
 * Razorpay instance using test/sandbox credentials from environment variables.
 * Used only for payment order creation and verification — no card data is stored.
 *
 * Lazy-initialized so the app can start even when placeholder keys are configured.
 * Controllers call getRazorpay() instead of importing the instance directly.
 */
let _instance = null;

const getRazorpay = () => {
  if (_instance) return _instance;

  const keyId     = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || keyId.startsWith('rzp_test_your') || keyId === 'rzp_test_your_key_id') {
    throw new Error('Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.');
  }

  _instance = new Razorpay({ key_id: keyId, key_secret: keySecret });
  return _instance;
};

module.exports = getRazorpay;
