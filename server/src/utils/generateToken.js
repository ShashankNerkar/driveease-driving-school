const crypto = require('crypto');
const jwt    = require('jsonwebtoken');

/**
 * Generate a short-lived JWT access token.
 *
 * @param {object} payload - Data to embed in the token (e.g. { id, role })
 * @returns {string} Signed JWT string
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  });
};

/**
 * Generate a long-lived JWT refresh token with a unique jti claim.
 *
 * A random jti is embedded so the token can be fingerprinted server-side.
 * The SHA-256 hash of the raw token is stored on the User record; on the
 * next /refresh-token call the incoming token is re-hashed and compared.
 * Any mismatch (replayed or stolen token) invalidates the whole session.
 *
 * @param {object} payload - Data to embed (e.g. { id })
 * @returns {{ token: string, hash: string }}
 */
const generateRefreshToken = (payload) => {
  const jti   = crypto.randomBytes(16).toString('hex');
  const token = jwt.sign({ ...payload, jti }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
  const hash  = crypto.createHash('sha256').update(token).digest('hex');
  return { token, hash };
};

/**
 * Set the access and refresh tokens as httpOnly cookies on the response.
 * httpOnly prevents client-side JS from reading the tokens (XSS protection).
 *
 * @param {object} res          - Express response object
 * @param {string} accessToken
 * @param {string} refreshToken - raw refresh token string
 */
const setTokenCookies = (res, accessToken, refreshToken) => {
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure:   isProduction,           // HTTPS only in production
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge:   15 * 60 * 1000,         // 15 minutes in ms
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure:   isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days in ms
  });
};

/**
 * Clear both auth cookies (used on logout).
 *
 * @param {object} res - Express response object
 */
const clearTokenCookies = (res) => {
  const cookieOptions = {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  };

  res.clearCookie('accessToken',  cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  setTokenCookies,
  clearTokenCookies,
};
