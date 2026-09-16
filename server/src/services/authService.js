const crypto = require('crypto');
const jwt    = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const User           = require('../models/User');
const Session        = require('../models/Session');
const StudentProfile = require('../models/StudentProfile');
const ApiError       = require('../utils/ApiError');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateToken');
const { sendPasswordResetEmail } = require('./emailService');

const BCRYPT_SALT_ROUNDS = 12;

// ── Internal helper ────────────────────────────────────────────────────────
/**
 * Issue a new access + refresh token pair and create a new session record.
 * Each login creates an independent session for per-device logout capability.
 *
 * @param {object} user - Mongoose User document
 * @param {object} metadata - Optional { userAgent, ipAddress }
 * @returns {{ accessToken: string, rawRefreshToken: string, sessionId: string }}
 */
const issueTokens = async (user, metadata = {}) => {
  const payload = { id: user._id.toString(), role: user.role };

  const accessToken                     = generateAccessToken(payload);
  const { token: rawRefreshToken, hash } = generateRefreshToken(payload);

  // Calculate expiry based on JWT_REFRESH_EXPIRES_IN (default 7d)
  const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  const expiresAt = new Date();
  
  // Parse duration (e.g., '7d', '24h', '30m')
  const match = refreshExpiresIn.match(/^(\d+)([dhm])$/);
  if (match) {
    const value = parseInt(match[1]);
    const unit = match[2];
    if (unit === 'd') expiresAt.setDate(expiresAt.getDate() + value);
    else if (unit === 'h') expiresAt.setHours(expiresAt.getHours() + value);
    else if (unit === 'm') expiresAt.setMinutes(expiresAt.getMinutes() + value);
  } else {
    expiresAt.setDate(expiresAt.getDate() + 7); // Default 7 days
  }

  // Create session record
  const session = await Session.create({
    userId: user._id,
    refreshTokenHash: hash,
    userAgent: metadata.userAgent || null,
    ipAddress: metadata.ipAddress || null,
    expiresAt,
    lastUsedAt: new Date(),
  });

  return { accessToken, rawRefreshToken, sessionId: session._id.toString() };
};

// ── Public service functions ───────────────────────────────────────────────

/**
 * registerStudent — creates a User (role: student) + StudentProfile.
 *
 * Never allows role to be set by the caller. Public registration
 * is student-only. Admin/Instructor creation is handled separately
 * in admin management.
 *
 * @param {{ name, email, phone, password }} data
 * @param {object} metadata - Optional { userAgent, ipAddress }
 * @returns {{ user, studentProfile, accessToken, refreshToken }}
 */
const registerStudent = async ({ name, email, phone, password }, metadata = {}) => {
  const normalisedEmail = email.toLowerCase().trim();

  const existing = await User.findOne({ email: normalisedEmail });
  if (existing) {
    throw new ApiError(409, 'An account with this email address already exists.');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  // role is hardcoded to 'student' — never from caller input
  const user = await User.create({
    name:  name.trim(),
    email: normalisedEmail,
    phone: phone || null,
    passwordHash,
    role:  'student',
  });

  const studentProfile = await StudentProfile.create({ userId: user._id });

  const { accessToken, rawRefreshToken } = await issueTokens(user, metadata);

  return { user, studentProfile, accessToken, refreshToken: rawRefreshToken };
};

/**
 * loginUser — authenticate with email + password.
 *
 * Generic error messages prevent email-enumeration.
 *
 * @param {{ email, password }} credentials
 * @param {object} metadata - Optional { userAgent, ipAddress }
 * @returns {{ user, accessToken, refreshToken }}
 */
const loginUser = async ({ email, password }, metadata = {}) => {
  const normalisedEmail = email.toLowerCase().trim();
  const GENERIC_ERROR   = 'Invalid email or password.';

  const user = await User.findOne({ email: normalisedEmail }).select('+passwordHash');

  if (!user)            throw new ApiError(401, GENERIC_ERROR);
  if (!user.isActive)   throw new ApiError(403, 'Your account has been deactivated. Please contact support.');

  const passwordMatch = await user.comparePassword(password);
  if (!passwordMatch)   throw new ApiError(401, GENERIC_ERROR);

  const { accessToken, rawRefreshToken } = await issueTokens(user, metadata);

  return { user, accessToken, refreshToken: rawRefreshToken };
};

/**
 * refreshSession — validate the incoming refresh token and issue a new pair.
 *
 * Security contract:
 * 1. Verifies JWT signature + expiry.
 * 2. Finds the session by re-hashing the raw token and comparing against
 *    stored session hashes. A mismatch means token was already used or stolen
 *    → the session is deleted and a 401 is thrown.
 * 3. On success, a new pair is issued and the session hash is rotated.
 *
 * @param {string} rawRefreshToken - raw token from the httpOnly cookie
 * @param {object} metadata - Optional { userAgent, ipAddress }
 * @returns {{ user, accessToken, refreshToken }}
 */
const refreshSession = async (rawRefreshToken, metadata = {}) => {
  if (!rawRefreshToken) {
    throw new ApiError(401, 'Refresh token is required.');
  }

  // 1. Verify signature and expiry
  let decoded;
  try {
    decoded = jwt.verify(rawRefreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw new ApiError(401, 'Invalid or expired refresh token. Please log in again.');
  }

  // 2. Find the matching session by hashing the incoming token
  const incomingHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
  
  const session = await Session.findOne({
    userId: decoded.id,
    refreshTokenHash: incomingHash,
  }).select('+refreshTokenHash');

  if (!session) {
    // Token replay detected or session was explicitly deleted
    throw new ApiError(401, 'Refresh token has already been used or is invalid. Please log in again.');
  }

  // Check if session expired
  if (session.expiresAt < new Date()) {
    await Session.deleteOne({ _id: session._id });
    throw new ApiError(401, 'Session has expired. Please log in again.');
  }

  // 3. Load user and verify account is active
  const user = await User.findById(decoded.id);
  if (!user) {
    await Session.deleteOne({ _id: session._id });
    throw new ApiError(401, 'User not found. Please log in again.');
  }
  if (!user.isActive) {
    await Session.deleteOne({ _id: session._id });
    throw new ApiError(403, 'Your account has been deactivated. Please contact support.');
  }

  // 4. Issue new token pair (rotation) and update session
  const { accessToken, rawRefreshToken: newRefreshToken } = await issueTokens(user, metadata);
  
  // Delete old session and create new one (simpler than updating hash)
  await Session.deleteOne({ _id: session._id });

  return { user, accessToken, refreshToken: newRefreshToken };
};

/**
 * logoutUser — delete the specific session by refresh token.
 * This allows per-device logout without affecting other browser sessions.
 *
 * @param {string} rawRefreshToken - the refresh token from cookie
 */
const logoutUser = async (rawRefreshToken) => {
  if (!rawRefreshToken) {
    // No token means already logged out or never logged in
    return;
  }

  try {
    // Decode to get user ID (no need to verify expiry since we're deleting anyway)
    const decoded = jwt.decode(rawRefreshToken);
    if (!decoded || !decoded.id) return;

    // Find and delete the matching session
    const incomingHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
    await Session.deleteOne({
      userId: decoded.id,
      refreshTokenHash: incomingHash,
    });
  } catch {
    // If anything fails, silently succeed (logout should be idempotent)
    return;
  }
};

/**
 * changePassword — verify current password then update hash.
 * Also invalidates ALL sessions for this user, requiring re-login everywhere.
 *
 * @param {string} userId
 * @param {string} currentPassword
 * @param {string} newPassword
 */
const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) {
    throw new ApiError(401, 'User not found. Please log in again.');
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw new ApiError(400, 'Current password is incorrect.');
  }

  user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
  await user.save({ validateBeforeSave: false });

  // Delete all sessions for this user (force re-login everywhere)
  await Session.deleteMany({ userId: user._id });
};

/**
 * getAuthenticatedUser — fetch full user + profile for GET /api/auth/me.
 *
 * @param {string} userId - from req.user.id (JWT payload)
 * @returns {{ user, profile }}
 */
const getAuthenticatedUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user || !user.isActive) {
    throw new ApiError(401, 'User not found or account deactivated.');
  }

  let profile = null;
  if (user.role === 'student') {
    const SP = require('../models/StudentProfile');
    profile   = await SP.findOne({ userId: user._id });
  } else if (user.role === 'instructor') {
    const IP = require('../models/InstructorProfile');
    profile  = await IP.findOne({ userId: user._id });
  }

  return { user, profile };
};

/**
 * initiatePasswordReset — generate a secure reset token, store its hash,
 * and send the reset email.
 *
 * The raw token is sent to the user's email.
 * Only the SHA-256 hash of the token is stored in the database.
 *
 * @param {string} email
 * @param {string} clientUrl - used to build the reset link
 */
const initiatePasswordReset = async (email, clientUrl) => {
  const normalisedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalisedEmail });

  // Always respond with success — prevents email enumeration
  if (!user || !user.isActive) return;

  const rawToken    = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

  user.passwordResetToken   = hashedToken;
  user.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 min
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${clientUrl}/reset-password?token=${rawToken}`;

  if (process.env.NODE_ENV === 'test') return;

  try {
    await sendPasswordResetEmail(user.email, resetUrl, user.name);
  } catch {
    // Clear token so the user can try again
    user.passwordResetToken   = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    throw new ApiError(500, 'Failed to send the reset email. Please try again.');
  }
};

/**
 * resetPassword — validate the reset token and update the password.
 * Also invalidates ALL sessions for this user, requiring re-login everywhere.
 *
 * @param {string} rawToken
 * @param {string} newPassword
 */
const resetPassword = async (rawToken, newPassword) => {
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

  const user = await User
    .findOne({ passwordResetToken: hashedToken })
    .select('+passwordResetToken +passwordResetExpires');

  if (!user) {
    throw new ApiError(400, 'Invalid or expired password reset token.');
  }

  if (user.passwordResetExpires < Date.now()) {
    throw new ApiError(400, 'Password reset token has expired. Please request a new one.');
  }

  user.passwordHash         = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
  user.passwordResetToken   = undefined;
  user.passwordResetExpires = undefined;
  await user.save({ validateBeforeSave: false });

  // Delete all sessions for this user (force re-login everywhere)
  await Session.deleteMany({ userId: user._id });
};

module.exports = {
  registerStudent,
  loginUser,
  getAuthenticatedUser,
  initiatePasswordReset,
  resetPassword,
  refreshSession,
  logoutUser,
  changePassword,
};
