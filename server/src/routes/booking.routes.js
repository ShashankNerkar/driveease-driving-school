const express = require('express');
const { body, param, query } = require('express-validator');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const controller = require('../controllers/booking.controller');
const router = express.Router();

const idParam = param('id').isMongoId();
const listValidators = [query('instructorId').optional().isMongoId(), query('date').optional().isISO8601(), query('status').optional().isIn(['pending', 'confirmed', 'rejected', 'cancelled'])];

router.get('/available-slots', authenticate, authorize('student'), listValidators, validate, controller.listAvailableSlots);
router.post('/', authenticate, authorize('student'), body('slotId').isMongoId(), validate, controller.createBooking);
router.get('/mine', authenticate, authorize('student'), listValidators, validate, controller.getMyBookings);
router.get('/requests', authenticate, authorize('instructor'), listValidators, validate, controller.getIncomingBookings);
router.patch('/:id/accept', authenticate, authorize('instructor'), idParam, validate, controller.approveBooking);
router.patch('/:id/reject', authenticate, authorize('instructor'), idParam, body('reason').optional().isString().trim().isLength({ max: 500 }), validate, controller.rejectBooking);
router.patch('/:id/cancel', authenticate, authorize('student'), idParam, body('reason').optional().isString().trim().isLength({ max: 500 }), validate, controller.cancelBooking);
router.get('/:id', authenticate, authorize('student', 'instructor'), idParam, validate, controller.getBooking);

module.exports = router;
