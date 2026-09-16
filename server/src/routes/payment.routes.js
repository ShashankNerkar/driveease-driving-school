const express    = require('express');
const { body, query } = require('express-validator');
const authenticate = require('../middleware/authenticate');
const authorize    = require('../middleware/authorize');
const validate     = require('../middleware/validate');
const ctrl         = require('../controllers/payment.controller');

const router = express.Router();

// All payment routes require student authentication
router.use(authenticate, authorize('student'));

/**
 * POST /api/payments/create-order
 * Body: { courseId }
 * The server resolves the course's active plan; client price is never trusted.
 */
router.post(
  '/create-order',
  body('courseId').isMongoId().withMessage('A valid courseId is required.'),
  validate,
  ctrl.createOrder
);

/**
 * POST /api/payments/verify
 * Body: { razorpayOrderId, razorpayPaymentId, razorpaySignature, subscriptionId }
 * Signature verified server-side using RAZORPAY_KEY_SECRET.
 */
router.post(
  '/verify',
  body('razorpayOrderId').notEmpty().isString(),
  body('razorpayPaymentId').notEmpty().isString(),
  body('razorpaySignature').notEmpty().isString(),
  body('subscriptionId').isMongoId(),
  validate,
  ctrl.verifyPayment
);

/** GET /api/payments/history — own payment history only */
router.get(
  '/history',
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  validate,
  ctrl.getPaymentHistory
);

module.exports = router;
