const authService = require('../services/authService');
const ApiResponse  = require('../utils/ApiResponse');
const { setTokenCookies, clearTokenCookies } = require('../utils/generateToken');

/**
 * register — POST /api/auth/register
 *
 * Public. Creates a student account only.
 * Input validated by registerValidators before this runs.
 */
const register = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;
    
    const metadata = {
      userAgent: req.get('user-agent'),
      ipAddress: req.ip || req.connection.remoteAddress,
    };

    const { user, studentProfile, accessToken, refreshToken } =
      await authService.registerStudent({ name, email, phone, password }, metadata);

    setTokenCookies(res, accessToken, refreshToken);

    return res.status(201).json(
      new ApiResponse(
        201,
        { user: user.toSafeObject(), profile: studentProfile },
        'Account created successfully. Welcome to DriveEase!'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * login — POST /api/auth/login
 *
 * Public. Validates credentials and issues tokens via httpOnly cookies.
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    const metadata = {
      userAgent: req.get('user-agent'),
      ipAddress: req.ip || req.connection.remoteAddress,
    };

    const { user, accessToken, refreshToken } =
      await authService.loginUser({ email, password }, metadata);

    setTokenCookies(res, accessToken, refreshToken);

    return res.status(200).json(
      new ApiResponse(200, { user: user.toSafeObject() }, 'Login successful.')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * logout — POST /api/auth/logout
 *
 * Deletes the specific session for this refresh token, allowing
 * independent logout per browser without affecting other sessions.
 */
const logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    await authService.logoutUser(refreshToken);
    clearTokenCookies(res);
    return res.status(200).json(
      new ApiResponse(200, null, 'Logged out successfully.')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * getMe — GET /api/auth/me
 *
 * Protected. Returns the authenticated user's data + profile.
 * Role is read from the verified JWT — never from a request param.
 */
const getMe = async (req, res, next) => {
  try {
    const { user, profile } = await authService.getAuthenticatedUser(req.user.id);

    return res.status(200).json(
      new ApiResponse(200, { user: user.toSafeObject(), profile }, 'User data fetched successfully.')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * forgotPassword — POST /api/auth/forgot-password
 *
 * Public. Always returns success to prevent email enumeration.
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email }   = req.body;
    const clientUrl   = process.env.CLIENT_URL || 'http://localhost:5173';

    await authService.initiatePasswordReset(email, clientUrl);

    return res.status(200).json(
      new ApiResponse(
        200, null,
        'If an account with that email exists, a password reset link has been sent.'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * resetPassword — POST /api/auth/reset-password
 *
 * Public. Validates token and updates password.
 */
const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    await authService.resetPassword(token, password);

    return res.status(200).json(
      new ApiResponse(200, null, 'Password reset successfully. Please log in with your new password.')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * refreshToken — POST /api/auth/refresh-token
 *
 * Public (uses refresh cookie). Issues a new access + refresh token pair.
 * Validates the incoming refresh token hash for rotation protection.
 */
const refreshToken = async (req, res, next) => {
  try {
    const raw = req.cookies?.refreshToken;
    
    const metadata = {
      userAgent: req.get('user-agent'),
      ipAddress: req.ip || req.connection.remoteAddress,
    };
    
    const { user, accessToken, refreshToken: newRefreshToken } =
      await authService.refreshSession(raw, metadata);

    setTokenCookies(res, accessToken, newRefreshToken);

    return res.status(200).json(
      new ApiResponse(200, { user: user.toSafeObject() }, 'Session refreshed.')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * changePassword — PATCH /api/auth/change-password
 *
 * Protected. Also invalidates existing refresh tokens so other sessions
 * must re-login after a password change.
 */
const changePassword = async (req, res, next) => {
  try {
    await authService.changePassword(req.user.id, req.body.currentPassword, req.body.password);

    // Clear cookies — all sessions invalidated by changePassword
    clearTokenCookies(res);

    return res.status(200).json(
      new ApiResponse(200, null, 'Password changed successfully. Please log in again.')
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  refreshToken,
  changePassword,
};
