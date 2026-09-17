const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const morgan       = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit    = require('express-rate-limit');

const errorHandler = require('./middleware/errorHandler');
const ApiError     = require('./utils/ApiError');

// ── Route imports ──────────────────────────────────────────────────────
const healthRoutes       = require('./routes/health.routes');
const authRoutes         = require('./routes/auth.routes');
const userRoutes         = require('./routes/user.routes');
const studentRoutes      = require('./routes/student.routes');
const instructorRoutes   = require('./routes/instructor.routes');
const courseRoutes       = require('./routes/course.routes');
const lessonRoutes       = require('./routes/lesson.routes');
const enrollmentRoutes   = require('./routes/enrollment.routes');
const progressRoutes     = require('./routes/progress.routes');
const slotRoutes         = require('./routes/slot.routes');
const bookingRoutes      = require('./routes/booking.routes');
const paymentRoutes      = require('./routes/payment.routes');
const notificationRoutes = require('./routes/notification.routes');
const reviewRoutes       = require('./routes/review.routes');
const adminRoutes        = require('./routes/admin.routes');

// ──────────────────────────────────────────────────────────────────────
const app = express();

// ── Security headers (Helmet) ──────────────────────────────────────────
// CSP is configured to allow the domains required by Razorpay and Cloudinary.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],

        // Scripts: self + Razorpay checkout SDK
        scriptSrc:  ["'self'", 'https://checkout.razorpay.com'],

        // Frames: Razorpay payment iframe
        frameSrc:   ["'self'", 'https://api.razorpay.com'],

        // Images: self + Cloudinary CDN (data URIs kept for icons/placeholders)
        imgSrc:     ["'self'", 'data:', 'https://res.cloudinary.com'],

        // Media: Cloudinary video/audio for testimonials and course videos
        mediaSrc:   ["'self'", 'https://res.cloudinary.com'],

        // Styles: self (Tailwind is inlined via build)
        styleSrc:   ["'self'", "'unsafe-inline'"],

        // Connections: self + Razorpay API + Cloudinary upload API
        connectSrc: [
          "'self'",
          'https://api.razorpay.com',
          'https://lumberjack.razorpay.com',
          'https://api.cloudinary.com',
        ],

        // Fonts: self
        fontSrc:    ["'self'"],

        // Objects: none
        objectSrc:  ["'none'"],

        // Base URI: restrict to self
        baseUri:    ["'self'"],
      },
    },
  })
);

// ── CORS — allow configured origins + Vercel preview deployments ──────
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'https://driveease-driving-school.vercel.app', // Production Vercel domain
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // Check if origin is in allowedOrigins list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Allow Vercel preview deployments: driveease-driving-school-*-shashanknerkars-projects.vercel.app
    const vercelPreviewPattern = /^https:\/\/driveease-driving-school-[a-z0-9]+-shashanknerkars-projects\.vercel\.app$/;
    if (vercelPreviewPattern.test(origin)) {
      return callback(null, true);
    }

    // Reject other origins
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true, // required for httpOnly cookie exchange
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// ── Request logging (dev only) ────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ── Body parsing ──────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ── Cookie parsing ────────────────────────────────────────────────────
app.use(cookieParser());

// ── Global rate limiter — 100 requests per 15 minutes per IP ─────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders:   false,
  // TODO: Remove the development bypass before production deployment.
  skip:            () => ['development', 'test'].includes(process.env.NODE_ENV),
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again later.',
  },
});
app.use('/api', globalLimiter);

// ── Route mounting ────────────────────────────────────────────────────
app.use('/api/health',         healthRoutes);
app.use('/api/auth',           authRoutes);
app.use('/api/users',          userRoutes);
app.use('/api/students',       studentRoutes);
app.use('/api/instructors',    instructorRoutes);
app.use('/api/courses',        courseRoutes);
app.use('/api/lessons',        lessonRoutes);
app.use('/api/enrollments',    enrollmentRoutes);
app.use('/api/progress',       progressRoutes);
app.use('/api/slots',          slotRoutes);
app.use('/api/bookings',       bookingRoutes);
app.use('/api/payments',       paymentRoutes);
app.use('/api/notifications',  notificationRoutes);
app.use('/api/reviews',        reviewRoutes);
app.use('/api/admin',          adminRoutes);

// ── 404 handler ───────────────────────────────────────────────────────
app.use((req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
});

// ── Centralized error handler (must be last) ──────────────────────────
app.use(errorHandler);

module.exports = app;
