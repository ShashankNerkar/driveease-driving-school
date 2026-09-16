const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { body } = require('express-validator');
const studentController = require('../controllers/student.controller');

const profileValidators = [
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters.'),
  body('phone').optional({ nullable: true, checkFalsy: true }).trim().matches(/^[6-9]\d{9}$/).withMessage('Please provide a valid 10-digit Indian mobile number.'),
  body('dateOfBirth').optional({ nullable: true, checkFalsy: true }).isISO8601().toDate().withMessage('Please provide a valid date of birth.'),
  body('address').optional().isObject().withMessage('Address must be an object.'),
  body('address.street').optional().trim().isLength({ max: 200 }).withMessage('Street must not exceed 200 characters.'),
  body('address.city').optional().trim().isLength({ max: 100 }).withMessage('City must not exceed 100 characters.'),
  body('address.state').optional().trim().isLength({ max: 100 }).withMessage('State must not exceed 100 characters.'),
  body('address.pincode').optional().trim().isLength({ max: 20 }).withMessage('Pincode must not exceed 20 characters.'),
  body('drivingExperience').optional().isIn(['none', 'beginner', 'intermediate', 'experienced']).withMessage('Invalid driving experience.'),
  body('preferredTransmission').optional().isIn(['manual', 'automatic', 'both']).withMessage('Invalid preferred transmission.'),
];

router.use(authenticate, authorize('student'));
router.get('/profile', studentController.getProfile);
router.patch('/profile', profileValidators, validate, studentController.updateProfile);
router.get('/dashboard', studentController.getDashboard);

module.exports = router;
