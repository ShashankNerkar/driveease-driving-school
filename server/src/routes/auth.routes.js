const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const authenticate   = require('../middleware/authenticate');
const validate       = require('../middleware/validate');
const rateLimit      = require('express-rate-limit');

const {
  registerValidators,
  loginValidators,
  forgotPasswordValidators,
  resetPasswordValidators,
  changePasswordValidators,
} = require('../validators/auth.validators');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development', // TODO: remove 'development' before production deployment
  message: {
    success: false,
    message: 'Too many requests. Please wait before trying again.',
  },
});

router.post('/register', authLimiter, registerValidators, validate, authController.register);
router.post('/login', authLimiter, loginValidators, validate, authController.login);
router.post('/forgot-password', authLimiter, forgotPasswordValidators, validate, authController.forgotPassword);
router.post('/reset-password', authLimiter, resetPasswordValidators, validate, authController.resetPassword);
router.post('/refresh-token', authLimiter, authController.refreshToken);

router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getMe);
router.patch(
  '/change-password',
  authenticate,
  changePasswordValidators,
  validate,
  authController.changePassword
);

module.exports = router;
