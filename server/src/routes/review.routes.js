const express = require('express');
const { body, param, query } = require('express-validator');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const controller = require('../controllers/review.controller');
const router = express.Router();

const pagination = [query('page').optional().isInt({ min: 1 }).toInt(), query('limit').optional().isInt({ min: 1, max: 100 }).toInt()];
const createFields = [body('targetType').isIn(['course', 'instructor']), body('targetId').isMongoId(), body('rating').isInt({ min: 1, max: 5 }).toInt(), body('comment').isString().trim().isLength({ min: 3, max: 1000 })];

router.get('/', pagination, validate, controller.listApprovedReviews);
router.get('/mine', authenticate, authorize('student'), controller.listMyReviews);
router.get('/eligible-targets', authenticate, authorize('student'), controller.listEligibleTargets);
router.post('/', authenticate, authorize('student'), createFields, validate, controller.createReview);
router.patch('/:id', authenticate, authorize('student'), param('id').isMongoId(), body('rating').optional().isInt({ min: 1, max: 5 }).toInt(), body('comment').optional().isString().trim().isLength({ min: 3, max: 1000 }), validate, controller.updateReview);
router.delete('/:id', authenticate, authorize('student'), param('id').isMongoId(), validate, controller.deleteReview);
router.get('/moderation/all', authenticate, authorize('admin'), query('status').optional().isIn(['pending', 'approved', 'rejected']), validate, controller.listModerationReviews);
router.patch('/:id/approve', authenticate, authorize('admin'), param('id').isMongoId(), validate, controller.approveReview);
router.patch('/:id/reject', authenticate, authorize('admin'), param('id').isMongoId(), validate, controller.rejectReview);

module.exports = router;
