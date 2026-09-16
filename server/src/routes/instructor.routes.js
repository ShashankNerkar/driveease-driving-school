const express = require('express');
const router  = express.Router();
const { body } = require('express-validator');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { listInstructors, getInstructor, getOwnProfile, updateOwnProfile, getDashboard } = require('../controllers/instructor.controller');

// Public — no auth required
router.get('/',    listInstructors);
router.get('/profile', authenticate, authorize('instructor'), getOwnProfile);
router.patch('/profile', authenticate, authorize('instructor'), [body('name').optional().trim().isLength({ min: 2, max: 100 }), body('phone').optional({ nullable: true, checkFalsy: true }).matches(/^[6-9]\d{9}$/), body('bio').optional().trim().isLength({ max: 500 }), body('experience').optional().isFloat({ min: 0 }), body('specialization').optional().isArray(), body('transmissionExpertise').optional().isArray(), body('transmissionExpertise.*').optional().isIn(['manual', 'automatic']), body('profileImage').optional({ nullable: true }).isURL(), body('isAvailable').optional().isBoolean(), body('status').optional().isIn(['active', 'inactive'])], validate, updateOwnProfile);
router.get('/dashboard', authenticate, authorize('instructor'), getDashboard);
router.get('/:id', getInstructor);

// PATCH /profile and /dashboard → Phase 6

module.exports = router;
