const nodemailer = require('nodemailer');

/**
 * emailService — Nodemailer-based email sender.
 *
 * Reads SMTP credentials exclusively from environment variables.
 * No credentials are hardcoded.
 *
 * In development: configure EMAIL_* vars in .env.
 * In production: use a real SMTP provider (SendGrid, Mailgun, SES, etc.)
 *   and set the environment variables accordingly.
 */

/**
 * createTransporter — builds a Nodemailer transport from env vars.
 * Called lazily so missing env vars produce a clear error at send time,
 * not at server startup.
 *
 * @returns {nodemailer.Transporter}
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    host:   process.env.EMAIL_HOST,
    port:   parseInt(process.env.EMAIL_PORT, 10) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

/**
 * sendEmail — send a single email.
 *
 * @param {object} options
 * @param {string} options.to      - Recipient email address
 * @param {string} options.subject - Email subject line
 * @param {string} options.html    - HTML body
 * @param {string} [options.text]  - Plain-text fallback
 * @returns {Promise<object>}      - Nodemailer send result
 */
const sendEmail = async ({ to, subject, html, text }) => {
  const transporter = createTransporter();

  const mailOptions = {
    from:    process.env.EMAIL_FROM || '"DriveEase" <noreply@driveease.com>',
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, ''), // strip HTML tags for plain-text fallback
  };

  const result = await transporter.sendMail(mailOptions);
  return result;
};

/**
 * sendPasswordResetEmail — sends the password reset link to a user.
 *
 * @param {string} toEmail     - Recipient's email
 * @param {string} resetUrl    - Full reset URL including the token
 * @param {string} userName    - Recipient's name for personalisation
 */
const sendPasswordResetEmail = async (toEmail, resetUrl, userName) => {
  const subject = 'DriveEase — Reset Your Password';

  const html = `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; color: #111827;">
      <div style="margin-bottom: 24px;">
        <h1 style="font-size: 22px; font-weight: 700; color: #1d4ed8; margin: 0;">DriveEase</h1>
      </div>
      <h2 style="font-size: 18px; font-weight: 600; margin: 0 0 12px;">Reset Your Password</h2>
      <p style="color: #374151; line-height: 1.6; margin: 0 0 16px;">
        Hi ${userName},
      </p>
      <p style="color: #374151; line-height: 1.6; margin: 0 0 24px;">
        We received a request to reset the password for your DriveEase account.
        Click the button below to set a new password. This link is valid for
        <strong>30 minutes</strong> and can only be used once.
      </p>
      <a href="${resetUrl}"
         style="display: inline-block; background: #2563eb; color: #fff;
                padding: 12px 28px; border-radius: 8px; text-decoration: none;
                font-weight: 600; font-size: 14px; margin-bottom: 24px;">
        Reset Password
      </a>
      <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin: 0 0 8px;">
        If you did not request a password reset, please ignore this email.
        Your password will not be changed.
      </p>
      <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin: 0;">
        If the button above doesn't work, copy and paste this link into your browser:
        <br />
        <span style="color: #2563eb; word-break: break-all;">${resetUrl}</span>
      </p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        &copy; ${new Date().getFullYear()} DriveEase. All rights reserved.
      </p>
    </div>
  `;

  await sendEmail({ to: toEmail, subject, html });
};

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
};
