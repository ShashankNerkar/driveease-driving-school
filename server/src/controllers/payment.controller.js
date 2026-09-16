const crypto       = require('crypto');
const getRazorpay  = require('../config/razorpay');
const Course       = require('../models/Course');
const Enrollment   = require('../models/Enrollment');
const PaymentOrder = require('../models/PaymentOrder');
const User         = require('../models/User');
const ApiResponse  = require('../utils/ApiResponse');
const ApiError     = require('../utils/ApiError');
const { notify }   = require('../services/notificationService');

/**
 * POST /api/payments/create-order  (student)
 *
 * Creates a Razorpay order for course enrollment payment.
 * Amount comes from the course price in the database.
 */
const createOrder = async (req, res, next) => {
  try {
    const { courseId, amountPaise } = req.body;

    // Validate course exists and is published
    const course = await Course.findOne({ _id: courseId, isActive: true });
    if (!course) throw new ApiError(404, 'Course not found or no longer available.');

    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({
      studentId: req.user.id,
      courseId: course._id,
    });
    if (existingEnrollment) {
      throw new ApiError(409, 'You are already enrolled in this course.');
    }

    // Check for existing pending order
    const existingPending = await PaymentOrder.findOne({
      studentId: req.user.id,
      courseId: course._id,
      status: 'created',
    });
    if (existingPending) {
      return res.json(new ApiResponse(200, {
        orderId: existingPending.razorpayOrderId,
        amountPaise: existingPending.amountPaise,
        currency: existingPending.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
      }, 'Existing pending order returned.'));
    }

    // Use provided amount (in paise)
    const finalAmount = amountPaise || 0;

    // Create Razorpay order
    let rzpOrder;
    try {
      const rzp = getRazorpay();
      rzpOrder = await rzp.orders.create({
        amount:   finalAmount,
        currency: 'INR',
        receipt:  `course_${req.user.id}_${Date.now()}`,
        notes: {
          studentId: req.user.id,
          courseId:  course._id.toString(),
          courseName: course.title,
        },
      });
    } catch (rzpError) {
      if (rzpError.message && rzpError.message.includes('not configured')) {
        throw new ApiError(503, 'Payment gateway is not configured. Contact support.');
      }
      throw new ApiError(502, 'Payment gateway error. Please try again later.');
    }

    // Create payment order record
    const paymentOrder = await PaymentOrder.create({
      studentId:       req.user.id,
      courseId:        course._id,
      razorpayOrderId: rzpOrder.id,
      amountPaise:     finalAmount,
      currency:        'INR',
      status:          'created',
    });

    res.status(201).json(new ApiResponse(201, {
      orderId:     rzpOrder.id,
      amountPaise: finalAmount,
      currency:    'INR',
      keyId:       process.env.RAZORPAY_KEY_ID,
      paymentOrderId: paymentOrder._id,
    }, 'Payment order created.'));
  } catch (error) { next(error); }
};

/**
 * POST /api/payments/verify  (student)
 *
 * Verifies payment and enrolls student in course.
 */
const verifyPayment = async (req, res, next) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature)
      throw new ApiError(400, 'razorpayOrderId, razorpayPaymentId, and razorpaySignature are required.');

    // Load payment order and verify ownership
    const paymentOrder = await PaymentOrder.findOne({ razorpayOrderId });
    if (!paymentOrder) throw new ApiError(404, 'Payment order not found.');
    if (paymentOrder.studentId.toString() !== req.user.id)
      throw new ApiError(403, 'You are not authorised to verify this payment.');

    // Check if already verified
    if (paymentOrder.status === 'paid') {
      const enrollment = await Enrollment.findOne({ 
        studentId: req.user.id, 
        courseId: paymentOrder.courseId 
      });
      return res.json(new ApiResponse(200, { enrollment, alreadyVerified: true }, 'Payment already verified.'));
    }

    // Verify HMAC-SHA256 signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      paymentOrder.status = 'failed';
      paymentOrder.failReason = 'Signature mismatch';
      await paymentOrder.save();
      
      notify({ 
        userId: paymentOrder.studentId, 
        type: 'payment_failed', 
        title: 'Payment failed', 
        message: 'Your payment could not be verified. Please try again or contact support.',
        refModel: 'PaymentOrder', 
        refId: paymentOrder._id 
      });
      
      throw new ApiError(400, 'Payment verification failed: invalid signature.');
    }

    // Signature valid — update payment order and enroll student
    paymentOrder.razorpayPaymentId = razorpayPaymentId;
    paymentOrder.razorpaySignature = razorpaySignature;
    paymentOrder.status = 'paid';
    paymentOrder.verifiedAt = new Date();
    await paymentOrder.save();

    // Create enrollment
    const enrollment = await Enrollment.findOneAndUpdate(
      { studentId: req.user.id, courseId: paymentOrder.courseId },
      { $setOnInsert: { studentId: req.user.id, courseId: paymentOrder.courseId, status: 'active' } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Notify student
    const student = await User.findById(req.user.id).select('name email');
    const course = await Course.findById(paymentOrder.courseId).select('title');
    
    notify({ 
      userId: req.user.id, 
      type: 'enrollment_success', 
      title: 'Enrollment successful', 
      message: `You are now enrolled in ${course?.title || 'the course'}.`,
      refModel: 'Enrollment', 
      refId: enrollment._id 
    });

    res.json(new ApiResponse(200, { enrollment }, 'Payment verified. Enrollment successful.'));
  } catch (error) { next(error); }
};

/**
 * GET /api/payments/history  (student) — own payment orders only
 */
const getPaymentHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [orders, total] = await Promise.all([
      PaymentOrder.find({ studentId: req.user.id })
        .populate('courseId', 'title')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      PaymentOrder.countDocuments({ studentId: req.user.id }),
    ]);
    
    res.json(new ApiResponse(200, { 
      orders, 
      total, 
      page: parseInt(page), 
      totalPages: Math.ceil(total / parseInt(limit)) 
    }, 'Payment history fetched.'));
  } catch (error) { next(error); }
};

module.exports = { createOrder, verifyPayment, getPaymentHistory };
