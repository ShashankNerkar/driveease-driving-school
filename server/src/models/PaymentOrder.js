const mongoose = require('mongoose');

/**
 * PaymentOrder — audit log of every Razorpay order created.
 *
 * Created when the student hits POST /api/payments/create-order.
 * Updated on verification (success or failure).
 *
 * Security: razorpaySignature stored after successful verification only.
 * Amount comes from server-side Plan data — NEVER from the request body.
 */
const paymentOrderSchema = new mongoose.Schema(
  {
    studentId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User',         required: true, index: true },
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', required: true, index: true },
    planId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Plan',         required: true },

    // Razorpay order data (from orders.create response)
    razorpayOrderId: { type: String, required: true, unique: true },
    amountPaise:     { type: Number, required: true },
    currency:        { type: String, default: 'INR' },

    // Filled on successful verification
    razorpayPaymentId: { type: String, default: null },
    razorpaySignature: { type: String, default: null },

    status: {
      type: String,
      enum: ['created', 'paid', 'failed'],
      default: 'created',
      index: true,
    },

    verifiedAt: { type: Date, default: null },
    failReason:  { type: String, default: '' },
  },
  { timestamps: true }
);

paymentOrderSchema.index({ studentId: 1, createdAt: -1 });

module.exports = mongoose.model('PaymentOrder', paymentOrderSchema);
