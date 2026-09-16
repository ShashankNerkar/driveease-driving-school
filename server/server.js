require('dotenv').config();

const app = require('./src/app');
const connectDB = require('./src/config/db');
const { configureCloudinary } = require('./src/config/cloudinary');

const PORT = process.env.PORT || 5000;

/**
 * Bootstrap function — connect to DB, configure third-party services,
 * then start the HTTP server.
 *
 * If any critical startup step fails, the process exits with code 1.
 */
const startServer = async () => {
  // ── Connect to MongoDB ─────────────────────────────────────────────
  await connectDB();

  // ── Configure Cloudinary ───────────────────────────────────────────
  configureCloudinary();

  // ── Start Express HTTP server ──────────────────────────────────────
  app.listen(PORT, () => {
    console.log(`🚀  DriveEase API server running on port ${PORT}`);
    console.log(`🌍  Environment : ${process.env.NODE_ENV || 'development'}`);
    console.log(`🏥  Health check: http://localhost:${PORT}/api/health`);
  });
};

// ── Handle unhandled promise rejections ───────────────────────────────
process.on('unhandledRejection', (err) => {
  console.error('💥  Unhandled Rejection:', err.message);
  process.exit(1);
});

startServer();
