const { sendEmail } = require('./emailService');

/**
 * emailNotificationService — thin wrapper over emailService for system event emails.
 *
 * All functions are safe-fire: SMTP failures are caught and logged.
 * They never throw to the caller so a mail failure cannot corrupt a transaction.
 *
 * SMTP credentials come exclusively from env vars; nothing is hardcoded.
 * If EMAIL_HOST is missing or still a placeholder, send is skipped cleanly.
 */

const PLACEHOLDER_HOSTS = ['smtp.your-provider.com', 'localhost', ''];

const isSmtpConfigured = () => {
  const host = process.env.EMAIL_HOST || '';
  return host.length > 0 && !PLACEHOLDER_HOSTS.includes(host);
};

/**
 * safeSend — wraps sendEmail with SMTP config guard + error swallow.
 * @returns {Promise<boolean>} true if sent, false if skipped/failed
 */
const safeSend = async (opts) => {
  if (!isSmtpConfigured()) {
    // Dev environment — log but don't attempt connect
    console.info('[emailNotificationService] SMTP not configured — email skipped:', opts.subject);
    return false;
  }
  try {
    await sendEmail(opts);
    return true;
  } catch (err) {
    console.error('[emailNotificationService] Email send failed:', err.message);
    return false;
  }
};

// ── HTML wrapper ───────────────────────────────────────────────────────────
const wrap = (body) => `
  <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#111827;">
    <h1 style="font-size:20px;font-weight:700;color:#1d4ed8;margin:0 0 24px;">DriveEase</h1>
    ${body}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
    <p style="color:#9ca3af;font-size:12px;margin:0;">&copy; ${new Date().getFullYear()} DriveEase. All rights reserved.</p>
  </div>`;

// ── Booking emails ─────────────────────────────────────────────────────────

const sendBookingApprovedEmail = async (toEmail, userName, slotDate) =>
  safeSend({
    to: toEmail,
    subject: 'DriveEase — Booking Confirmed',
    html: wrap(`
      <h2 style="font-size:17px;margin:0 0 12px;">Your booking has been confirmed</h2>
      <p>Hi ${userName},</p>
      <p>Your lesson on <strong>${slotDate}</strong> has been confirmed by your instructor.</p>
      <p>Log in to DriveEase to view full details.</p>`),
  });

const sendBookingRejectedEmail = async (toEmail, userName, reason) =>
  safeSend({
    to: toEmail,
    subject: 'DriveEase — Booking Update',
    html: wrap(`
      <h2 style="font-size:17px;margin:0 0 12px;">Booking request not approved</h2>
      <p>Hi ${userName},</p>
      <p>Unfortunately your booking request could not be approved${reason ? `: <em>${reason}</em>` : '.'}.</p>
      <p>You can browse available slots and book another session.</p>`),
  });

// ── Assessment email ────────────────────────────────────────────────────────

const sendAssessmentEmail = async (toEmail, userName, category, score) =>
  safeSend({
    to: toEmail,
    subject: 'DriveEase — New Assessment Recorded',
    html: wrap(`
      <h2 style="font-size:17px;margin:0 0 12px;">Assessment recorded</h2>
      <p>Hi ${userName},</p>
      <p>Your instructor has recorded an assessment for <strong>${category}</strong>: score <strong>${score}/5</strong>.</p>
      <p>Log in to view the full assessment and any remarks.</p>`),
  });

// ── Subscription email ──────────────────────────────────────────────────────

const sendSubscriptionActivatedEmail = async (toEmail, userName, planName, endDate) =>
  safeSend({
    to: toEmail,
    subject: 'DriveEase — Subscription Activated',
    html: wrap(`
      <h2 style="font-size:17px;margin:0 0 12px;">Your subscription is now active</h2>
      <p>Hi ${userName},</p>
      <p>Your <strong>${planName}</strong> subscription has been activated and is valid until <strong>${endDate}</strong>.</p>
      <p>Thank you for subscribing to DriveEase!</p>`),
  });

// ── Password changed email ──────────────────────────────────────────────────

const sendPasswordChangedEmail = async (toEmail, userName) =>
  safeSend({
    to: toEmail,
    subject: 'DriveEase — Password Changed',
    html: wrap(`
      <h2 style="font-size:17px;margin:0 0 12px;">Your password was changed</h2>
      <p>Hi ${userName},</p>
      <p>Your DriveEase account password was recently changed.</p>
      <p>If you did not make this change, please contact support immediately.</p>`),
  });

module.exports = {
  isSmtpConfigured,
  sendBookingApprovedEmail,
  sendBookingRejectedEmail,
  sendAssessmentEmail,
  sendSubscriptionActivatedEmail,
  sendPasswordChangedEmail,
};
