const express = require('express'); const authenticate = require('../middleware/authenticate'); const authorize = require('../middleware/authorize'); const controller = require('../controllers/progress.controller'); const router = express.Router();
router.get('/courses/:courseId', authenticate, authorize('student'), controller.getProgress); module.exports = router;
