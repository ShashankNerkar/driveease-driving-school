const mongoose = require('mongoose');

/**
 * connectDB — establishes a Mongoose connection to MongoDB.
 *
 * - Reads MONGODB_URI from environment variables.
 * - Exits the process with code 1 if the URI is missing or the connection fails.
 *
 * In production, set MONGODB_URI to a MongoDB Atlas connection string.
 * In development, use: mongodb://127.0.0.1:27017/driveease
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('❌  MONGODB_URI is not set in environment variables.');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log(`✅  MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌  MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
