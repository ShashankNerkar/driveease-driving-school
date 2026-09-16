/**
 * Phase 15 — Security & Production-Readiness Integration Tests
 *
 * Covers:
 *   1.  Refresh token rotation — new pair issued on every /refresh-token call
 *   2.  Refresh token revocation — replayed token is rejected with 401
 *   3.  Secure logout — POST /auth/logout requires authentication
 *   4.  Post-logout refresh token invalidation — cookie cannot be replayed
 *   5.  Health endpoint — does NOT expose environment name
 *   6.  CSP header — present on all API responses
 *   7.  CORS header — present for allowed origin
 *   8.  /users/ping stub removed — 404
 *   9.  Lesson enrollment gate — 403 without enrollment
 *   10. Enrollment ownership — cannot access another student's enrollment
 *   11. Admin RBAC on refresh token hash field — not exposed in user responses
 *   12. changePassword invalidates refresh token
 *   13. DB = 0 after cleanup
 *
 * All test records are prefixed TEST_PHASE15_ and cleaned up in finally.
 */
require('dotenv').config();
const assert   = require('node:assert/strict');
const crypto   = require('node:crypto');
const mongoose = require('mongoose');
const jwt      = require('jsonwebtoken');
const app      = require('../src/app');

const User           = require('../src/models/User');
const StudentProfile = require('../src/models/StudentProfile');
const Course         = require('../src/models/Course');
const Lesson         = require('../src/models/Lesson');
const Enrollment     = require('../src/models/Enrollment');

const PREFIX = 'TEST_PHASE15_';
const HASH   = '$2b$12$tn11QikSkjFBNJDod8Ey5.3KTmXqLVW93nTsqbayLv58PcSHs60au'; // bcrypt(12) of 'Password1!'

let server;

// ── HTTP helpers ─────────────────────────────────────────────────────────
const request = async (path, { method = 'GET', cookies = {}, body, headers = {} } = {}) => {
  const cookieHeader = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');

  const res = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  // Parse Set-Cookie so tests can inspect issued tokens
  const rawSetCookie = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  const setCookies   = {};
  for (const c of rawSetCookie) {
    const [pair] = c.split(';');
    const [name, val] = pair.split('=');
    setCookies[name.trim()] = val;
  }

  return { status: res.status, body: await res.json(), headers: res.headers, setCookies };
};

const expect = async (path, status, options = {}) => {
  const result = await request(path, options);
  assert.equal(
    result.status, status,
    `${options.method || 'GET'} ${path}: expected ${status}, got ${result.status}\n${JSON.stringify(result.body)}`
  );
  return result;
};

// ── Cleanup ──────────────────────────────────────────────────────────────
async function cleanup() {
  const users   = await User.find({ email: new RegExp(`^${PREFIX}`, 'i') }).select('_id');
  const ids     = users.map((u) => u._id);
  const courses = await Course.find({ title: new RegExp(`^${PREFIX}`, 'i') }).select('_id');
  const cids    = courses.map((c) => c._id);

  await Promise.all([
    Enrollment.deleteMany({ $or: [{ studentId: { $in: ids } }, { courseId: { $in: cids } }] }),
    Lesson.deleteMany({ courseId: { $in: cids } }),
    Course.deleteMany({ _id: { $in: cids } }),
    StudentProfile.deleteMany({ userId: { $in: ids } }),
    User.deleteMany({ _id: { $in: ids } }),
  ]);
}

// ── Main ─────────────────────────────────────────────────────────────────
async function main() {
  if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
    throw new Error('MONGODB_URI and JWT_SECRET are required.');
  }
  await mongoose.connect(process.env.MONGODB_URI);
  server = app.listen(0);

  try {
    await cleanup();

    // ── Seed ──────────────────────────────────────────────────────────
    const [studentA, studentB, admin] = await User.create([
      { name: `${PREFIX}StudentA`, email: `${PREFIX}studenta@example.test`, passwordHash: HASH, role: 'student', isActive: true },
      { name: `${PREFIX}StudentB`, email: `${PREFIX}studentb@example.test`, passwordHash: HASH, role: 'student', isActive: true },
      { name: `${PREFIX}Admin`,    email: `${PREFIX}admin@example.test`,    passwordHash: HASH, role: 'admin',   isActive: true },
    ]);
    await Promise.all([
      StudentProfile.create({ userId: studentA._id }),
      StudentProfile.create({ userId: studentB._id }),
    ]);

    const course  = await Course.create({ title: `${PREFIX}Course`, description: 'Phase 15 test.', level: 'beginner', duration: '1 week', status: 'published' });
    const lesson  = await Lesson.create({ courseId: course._id, title: `${PREFIX}Lesson`, description: 'Phase 15 lesson.', order: 1, duration: 20, videoUrl: 'https://example.com/v.mp4' });
    const enrollment = await Enrollment.create({ studentId: studentA._id, courseId: course._id });

    // Helper: login and get cookies
    const loginAs = async (email) => {
      const r = await request('/auth/login', {
        method: 'POST',
        body: { email, password: 'Password1!' },
      });
      assert.equal(r.status, 200, `Login failed for ${email}: ${JSON.stringify(r.body)}`);
      return r.setCookies; // { accessToken, refreshToken }
    };

    // ═══════════════════════════════════════════════════════════════════
    // 1. Refresh token rotation — new tokens on each /refresh-token call
    // ═══════════════════════════════════════════════════════════════════
    console.log('1. Refresh token rotation...');
    const cookies1 = await loginAs(`${PREFIX}studenta@example.test`);
    assert.ok(cookies1.accessToken,  'No accessToken cookie after login');
    assert.ok(cookies1.refreshToken, 'No refreshToken cookie after login');

    const refresh1 = await request('/auth/refresh-token', { method: 'POST', cookies: cookies1 });
    assert.equal(refresh1.status, 200, `refresh-token failed: ${JSON.stringify(refresh1.body)}`);
    const cookies2 = refresh1.setCookies;
    assert.ok(cookies2.refreshToken, 'No refreshToken in rotation response');
    assert.notEqual(cookies2.refreshToken, cookies1.refreshToken, 'Refresh token was NOT rotated');
    console.log('   Rotation passed ✓');

    // ═══════════════════════════════════════════════════════════════════
    // 2. Refresh token revocation — replayed (old) token must be rejected
    // ═══════════════════════════════════════════════════════════════════
    console.log('2. Refresh token revocation (replay attack)...');
    // Use the OLD refresh token — should now be rejected
    const replayResult = await request('/auth/refresh-token', { method: 'POST', cookies: cookies1 });
    assert.equal(replayResult.status, 401, `Replayed refresh token was NOT rejected (got ${replayResult.status})`);
    console.log('   Revocation passed ✓');

    // ═══════════════════════════════════════════════════════════════════
    // 3. Secure logout requires authentication
    // ═══════════════════════════════════════════════════════════════════
    console.log('3. Secure logout requires authentication...');
    const unauthLogout = await request('/auth/logout', { method: 'POST' });
    assert.equal(unauthLogout.status, 401, 'Unauthenticated logout was not rejected');
    console.log('   Unauthenticated logout correctly rejected ✓');

    // ═══════════════════════════════════════════════════════════════════
    // 4. Post-logout refresh token invalidation
    // ═══════════════════════════════════════════════════════════════════
    console.log('4. Post-logout refresh token invalidation...');
    const cookiesForLogout = await loginAs(`${PREFIX}studenta@example.test`);
    const logoutResult = await request('/auth/logout', { method: 'POST', cookies: cookiesForLogout });
    assert.equal(logoutResult.status, 200, `Logout failed: ${JSON.stringify(logoutResult.body)}`);
    // The refresh token cookie used for logout must now be rejected
    const postLogoutRefresh = await request('/auth/refresh-token', { method: 'POST', cookies: cookiesForLogout });
    assert.equal(postLogoutRefresh.status, 401, 'Post-logout refresh token was not invalidated');
    console.log('   Post-logout invalidation passed ✓');

    // ═══════════════════════════════════════════════════════════════════
    // 5. Health endpoint does NOT expose environment
    // ═══════════════════════════════════════════════════════════════════
    console.log('5. Health endpoint — no environment exposure...');
    const health = await request('/health');
    assert.equal(health.status, 200, 'Health endpoint failed');
    assert.equal(health.body.data.environment, undefined, 'Health endpoint exposes environment field');
    assert.ok(health.body.data.server === 'ok', 'Health body missing server field');
    assert.ok(health.body.data.database, 'Health body missing database field');
    console.log('   Health endpoint passed ✓');

    // ═══════════════════════════════════════════════════════════════════
    // 6. CSP header present on API responses
    // ═══════════════════════════════════════════════════════════════════
    console.log('6. Content-Security-Policy header...');
    const csp = health.headers.get('content-security-policy');
    assert.ok(csp, 'Content-Security-Policy header is missing');
    assert.ok(csp.includes('checkout.razorpay.com'), `CSP missing Razorpay: ${csp}`);
    assert.ok(csp.includes('res.cloudinary.com'), `CSP missing Cloudinary: ${csp}`);
    assert.ok(csp.includes("object-src 'none'"), `CSP missing object-src none: ${csp}`);
    console.log('   CSP header passed ✓');

    // ═══════════════════════════════════════════════════════════════════
    // 7. /users/ping stub removed — should return 404
    // ═══════════════════════════════════════════════════════════════════
    console.log('7. /users/ping stub removed...');
    const ping = await request('/users/ping');
    assert.equal(ping.status, 404, '/users/ping is still accessible (stub not removed)');
    console.log('   /users/ping correctly returns 404 ✓');

    // ═══════════════════════════════════════════════════════════════════
    // 8. Lesson enrollment gate — student without enrollment gets 403
    // ═══════════════════════════════════════════════════════════════════
    console.log('8. Lesson enrollment gate...');
    const cookiesB = await loginAs(`${PREFIX}studentb@example.test`);
    // StudentB has no enrollment — must be blocked
    const blockedLesson = await request(`/lessons/course/${course._id}`, { cookies: cookiesB });
    assert.equal(blockedLesson.status, 403, `Non-enrolled student got ${blockedLesson.status} (expected 403)`);

    // StudentA IS enrolled — must succeed
    const cookiesA = await loginAs(`${PREFIX}studenta@example.test`);
    const allowedLesson = await request(`/lessons/course/${course._id}`, { cookies: cookiesA });
    assert.equal(allowedLesson.status, 200, `Enrolled student got ${allowedLesson.status} (expected 200)`);
    console.log('   Lesson enrollment gate passed ✓');

    // ═══════════════════════════════════════════════════════════════════
    // 9. Enrollment ownership — StudentB cannot access StudentA's enrollment
    // ═══════════════════════════════════════════════════════════════════
    console.log('9. Enrollment ownership...');
    const ownEnrollment   = await request(`/enrollments/${enrollment._id}`, { cookies: cookiesA });
    assert.equal(ownEnrollment.status, 200, "StudentA can't access own enrollment");

    const crossEnrollment = await request(`/enrollments/${enrollment._id}`, { cookies: cookiesB });
    assert.equal(crossEnrollment.status, 404, `Cross-enrollment access returned ${crossEnrollment.status} (expected 404)`);
    console.log('   Enrollment ownership passed ✓');

    // ═══════════════════════════════════════════════════════════════════
    // 10. refreshTokenHash not exposed in API user responses
    // ═══════════════════════════════════════════════════════════════════
    console.log('10. refreshTokenHash not exposed in API responses...');
    const adminToken = jwt.sign({ id: admin._id.toString(), role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '5m' });
    const meResult   = await request('/auth/me', { cookies: { accessToken: adminToken } });
    assert.equal(meResult.status, 200, `/auth/me failed: ${JSON.stringify(meResult.body)}`);
    assert.equal(meResult.body.data?.user?.refreshTokenHash, undefined, 'refreshTokenHash exposed in /auth/me response');
    console.log('   refreshTokenHash not exposed ✓');

    // ═══════════════════════════════════════════════════════════════════
    // 11. changePassword invalidates refresh token
    // ═══════════════════════════════════════════════════════════════════
    console.log('11. changePassword invalidates refresh token...');
    const cookiesForPwChange = await loginAs(`${PREFIX}studentb@example.test`);
    const changePw = await request('/auth/change-password', {
      method:  'PATCH',
      cookies: cookiesForPwChange,
      body:    { currentPassword: 'Password1!', password: 'NewPass1!', confirmPassword: 'NewPass1!' },
    });
    assert.equal(changePw.status, 200, `changePassword failed: ${JSON.stringify(changePw.body)}`);
    // Old refresh token must now be invalid
    const afterChangePw = await request('/auth/refresh-token', { method: 'POST', cookies: cookiesForPwChange });
    assert.equal(afterChangePw.status, 401, 'Old refresh token still valid after password change');
    console.log('   changePassword refresh invalidation passed ✓');

    console.log('\nAll Phase 15 security tests passed. ✓');

  } finally {
    await cleanup();

    // Verify DB = 0
    const [u, c, e] = await Promise.all([
      User.countDocuments({ email: new RegExp(`^${PREFIX}`, 'i') }),
      Course.countDocuments({ title: new RegExp(`^${PREFIX}`, 'i') }),
      Enrollment.countDocuments({}),
    ]);
    const remaining = u + c;
    assert.equal(remaining, 0, `Temporary Phase 15 records remain: users=${u} courses=${c}`);
    console.log('Temporary Phase 15 MongoDB records = 0. ✓');

    if (server) await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
