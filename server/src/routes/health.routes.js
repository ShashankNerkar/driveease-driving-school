const express  = require('express');
const mongoose = require('mongoose');
const router   = express.Router();
const ApiResponse = require('../utils/ApiResponse');

/**
 * GET /api/health
 *
 * Public health-check endpoint.
 * Reports server liveness and MongoDB connection state.
 * Does NOT expose environment name or internal configuration.
 *
 * Mongoose readyState: 0=disconnected 1=connected 2=connecting 3=disconnecting
 */
router.get('/', (req, res) => {
  const dbReadyState = mongoose.connection.readyState;
  const dbConnected  = dbReadyState === 1;
  const dbStatusMap  = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

  res.status(200).json(
    new ApiResponse(200, {
      server:    'ok',
      database:  dbStatusMap[dbReadyState] ?? 'unknown',
      timestamp: new Date().toISOString(),
      uptime:    `${Math.floor(process.uptime())}s`,
    },
    dbConnected
      ? 'DriveEase API is running. Database connected.'
      : 'DriveEase API is running. Database is NOT connected.'
    )
  );
});

module.exports = router;
