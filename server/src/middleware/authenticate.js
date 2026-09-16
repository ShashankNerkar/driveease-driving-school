const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');

/**
 * authenticate — verify the JWT access token from the httpOnly cookie.
 *
 * 1. Reads accessToken from req.cookies (set by setTokenCookies on login/register).
 * 2. Verifies signature + expiry using JWT_SECRET.
 * 3. Attaches decoded payload to req.user: { id, role, iat, exp }.
 * 4. Rejects with 401 on any failure.
 *
 * Role is read from the VERIFIED token — never from request body/headers.
 * This prevents role escalation from the client side.
 */
const authenticate = (req, res, next) => {
  try {
    const token = req.cookies?.accessToken;

    if (!token) {
      throw new ApiError(401, 'Not authenticated. Please log in.');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach only the fields controllers/middleware should use
    req.user = {
      id:   decoded.id,
      role: decoded.role,
    };

    next();
  } catch (error) {
    // Let the centralized errorHandler normalise JWT-specific errors
    next(error);
  }
};

module.exports = authenticate;
