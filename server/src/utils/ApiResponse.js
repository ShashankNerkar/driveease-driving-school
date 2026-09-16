/**
 * ApiResponse — Consistent success response wrapper.
 *
 * All controllers should use this to send success responses so the
 * client always receives a uniform shape:
 * {
 *   success: true,
 *   statusCode: 200,
 *   message: "...",
 *   data: { ... }
 * }
 *
 * Usage:
 *   res.status(200).json(new ApiResponse(200, data, 'Students fetched successfully'));
 */
class ApiResponse {
  /**
   * @param {number} statusCode - HTTP status code (2xx)
   * @param {*}      data       - Payload to return to the client
   * @param {string} message    - Human-readable success message
   */
  constructor(statusCode, data, message = 'Success') {
    this.success = true;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
  }
}

module.exports = ApiResponse;
