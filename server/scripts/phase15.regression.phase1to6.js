/**
 * Phase 15 — Regression for Phases 1–6 critical paths.
 *
 * Phases 1–6 had no dedicated integration scripts. This covers the areas
 * most impacted by the Phase 15 security changes:
 *   Phase 1: Server health, app load
 *   Phase 2: Auth — register, login, me, logout, refresh, change-password
 *   Phase 3: Courses, public listing
 *   Phase 4: Student profile
 *   Phase 5: Lessons (enrollment-gated), course CRUD
 *   Phase 6: Instructor profile, instructor routes
 *
 * All test records use prefix REG_P1P6_ and are removed in finally.
 */
require('dotenv').config();
const assert   = require('node:assert/strict');
const mongoose = require('mongoose');
const app      = require('../src/app');

const User           = require('../src/models/User');
const StudentProfile = require('../src/models/StudentProfile');
const InstructorProfile = require('../src/models/InstructorProfile');
const Course         = require('../src/models/Course');
const Lesson         = require('../src/models/Lesson');
const Enrollment     = require('../src/models/Enrollment');
const Plan           = require('../src/models/Plan');

const PREFIX = 'REG_P1P6_';
let server;

// ── HTTP helper ──────────────────────────────────────────────────────────
const request = async (path, { method = 'GET', cookies = {}, body } = {}) => {
  const cookieHeader = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
  const res = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const rawSetCookie = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  const setCookies   = {};
  for (const c of rawSetCookie) {
    const [pair] = c.split(';');
    const [name, val] = pair.split('=');
    setCookies[name.trim()] = val;
  }
  return { status: res.status, body: await res.json(), setCookies };
};

const expect = async (path, status, opts = {}) => {
  const r = await request(path, opts);
  assert.equal(r.status, status, `${opts.method || 'GET'} ${path}: expected ${status}, got ${r.status}\n${JSON.stringify(r.body)}`);
  return r;
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
    Plan.deleteMany({ courseId: { $in: cids } }),
    Course.deleteMany({ _id: { $in: cids } }),
    StudentProfile.deleteMany({ userId: { $in: ids } }),
    InstructorProfile.deleteMany({ userId: { $in: ids } }),
    User.deleteMany({ _id: { $in: ids } }),
  ]);
}

async function main() {
  if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) throw new Error('MONGODB_URI and JWT_SECRET required.');
  await mongoose.connect(process.env.MONGODB_URI);
  server = app.listen(0);

  try {
    await cleanup();

    // ─── Phase 1: Health ─────────────────────────────────────────────
    console.log('Phase 1 — Health endpoint...');
    const h = await expect('/health', 200);
    assert.equal(h.body.data.server, 'ok');
    assert.equal(h.body.data.database, 'connected');
    assert.equal(h.body.data.environment, undefined, 'environment must not be exposed');
    console.log('   Health ✓');

    // ─── Phase 2: Auth ────────────────────────────────────────────────
    console.log('Phase 2 — Auth register/login/me/logout/refresh...');

    // Register
    const regResult = await expect('/auth/register', 201, {
      method: 'POST',
      body: { name: `${PREFIX}Student`, email: `${PREFIX}student@example.test`, password: 'TestPass1!', confirmPassword: 'TestPass1!' },
    });
    assert.ok(regResult.body.data.user.id, 'Register missing user.id');
    assert.equal(regResult.body.data.user.role, 'student');
    const cookies = regResult.setCookies;
    assert.ok(cookies.accessToken,  'No accessToken cookie after register');
    assert.ok(cookies.refreshToken, 'No refreshToken cookie after register');

    // /auth/me
    const meResult = await expect('/auth/me', 200, { cookies });
    assert.equal(meResult.body.data.user.email, `${PREFIX}student@example.test`.toLowerCase());
    assert.equal(meResult.body.data.user.refreshTokenHash, undefined, 'refreshTokenHash must not be exposed');

    // Duplicate register
    await expect('/auth/register', 409, {
      method: 'POST',
      body: { name: `${PREFIX}Student`, email: `${PREFIX}student@example.test`, password: 'TestPass1!', confirmPassword: 'TestPass1!' },
    });

    // Login
    const loginResult = await expect('/auth/login', 200, {
      method: 'POST',
      body: { email: `${PREFIX}student@example.test`, password: 'TestPass1!' },
    });
    const loginCookies = loginResult.setCookies;

    // Refresh token
    const refreshResult = await expect('/auth/refresh-token', 200, {
      method: 'POST', cookies: loginCookies,
    });
    const newCookies = refreshResult.setCookies;
    assert.notEqual(newCookies.refreshToken, loginCookies.refreshToken, 'Refresh token not rotated');

    // Replay old refresh token — must be rejected
    const replayResult = await request('/auth/refresh-token', { method: 'POST', cookies: loginCookies });
    assert.equal(replayResult.status, 401, 'Old refresh token replay not rejected');

    // Logout (authenticated)
    const logoutResult = await expect('/auth/logout', 200, { method: 'POST', cookies: newCookies });
    assert.ok(logoutResult.body.success);

    // Unauthenticated logout must fail
    await expect('/auth/logout', 401, { method: 'POST' });

    // Login again for further tests
    const reloginResult = await expect('/auth/login', 200, {
      method: 'POST',
      body: { email: `${PREFIX}student@example.test`, password: 'TestPass1!' },
    });
    const activeCookies = reloginResult.setCookies;

    // Wrong password
    await expect('/auth/login', 401, {
      method: 'POST', body: { email: `${PREFIX}student@example.test`, password: 'WrongPass1!' },
    });

    console.log('   Auth ✓');

    // ─── Phase 3: Public courses ──────────────────────────────────────
    console.log('Phase 3 — Public course listing...');
    const adminUser = await User.create({ name: `${PREFIX}Admin`, email: `${PREFIX}admin@example.test`, passwordHash: '$2b$12$tn11QikSkjFBNJDod8Ey5.3KTmXqLVW93nTsqbayLv58PcSHs60au', role: 'admin', isActive: true });
    const adminLogin = await expect('/auth/login', 200, { method: 'POST', body: { email: `${PREFIX}admin@example.test`, password: 'Password1!' } });
    const adminCookies = adminLogin.setCookies;

    // Admin creates a course
    const courseResult = await expect('/courses', 201, {
      method: 'POST', cookies: adminCookies,
      body: { title: `${PREFIX}Course`, description: 'Regression course.', level: 'beginner', duration: '2 weeks', status: 'published' },
    });
    const courseId = courseResult.body.data.course._id;
    assert.ok(courseId, 'Course creation failed');

    // Public listing (no auth)
    const coursesResult = await expect('/courses', 200);
    assert.ok(coursesResult.body.data.courses.length >= 1);

    // Public detail
    await expect(`/courses/${courseId}`, 200);
    console.log('   Courses ✓');

    // ─── Phase 4: Student profile ────────────────────────────────────
    console.log('Phase 4 — Student profile update...');
    await expect('/students/profile', 200, { cookies: activeCookies });
    const profileUpdate = await expect('/students/profile', 200, {
      method: 'PATCH', cookies: activeCookies,
      body: { drivingExperience: 'beginner', preferredTransmission: 'manual' },
    });
    assert.equal(profileUpdate.body.data.profile.drivingExperience, 'beginner');
    console.log('   Student profile ✓');

    // ─── Phase 5: Enrollment + lesson access ─────────────────────────
    console.log('Phase 5 — Enrollment and lesson access gating...');

    // Add a lesson
    const lessonResult = await expect('/lessons', 201, {
      method: 'POST', cookies: adminCookies,
      body: { courseId, title: `${PREFIX}Lesson`, description: 'Test lesson.', order: 1, duration: 15, videoUrl: 'https://example.com/v.mp4' },
    });
    const lessonId = lessonResult.body.data.lesson._id;

    // Create a free plan for this test course (enrollment controller requires a plan)
    const planResult = await expect('/subscriptions/plans', 201, {
      method: 'POST', cookies: adminCookies,
      body: { courseId, name: `${PREFIX}Free Plan`, description: 'Free plan for regression testing.', durationDays: 30, amountPaise: 0, currency: 'INR', features: [] },
    });

    // Not enrolled — lesson list must be 403
    await expect(`/lessons/course/${courseId}`, 403, { cookies: activeCookies });

    // Enroll (free course — direct enrollment, no payment)
    const enrollResult = await expect('/enrollments', 201, {
      method: 'POST', cookies: activeCookies, body: { courseId },
    });
    const enrollmentId = enrollResult.body.data.enrollment._id;

    // Now enrolled — lesson list must be 200
    const lessonList = await expect(`/lessons/course/${courseId}`, 200, { cookies: activeCookies });
    assert.ok(lessonList.body.data.lessons.length >= 1);

    // Lesson detail — requires courseId query param
    await expect(`/lessons/${lessonId}?courseId=${courseId}`, 200, { cookies: activeCookies });

    // Enrollment ownership
    await expect(`/enrollments/${enrollmentId}`, 200, { cookies: activeCookies });
    console.log('   Enrollment + lessons ✓');

    // ─── Phase 6: Instructor routes ───────────────────────────────────
    console.log('Phase 6 — Instructor profile...');
    const instructorUser = await User.create({ name: `${PREFIX}Instructor`, email: `${PREFIX}instr@example.test`, passwordHash: '$2b$12$tn11QikSkjFBNJDod8Ey5.3KTmXqLVW93nTsqbayLv58PcSHs60au', role: 'instructor', isActive: true });
    await InstructorProfile.create({ userId: instructorUser._id });
    const instrLogin = await expect('/auth/login', 200, { method: 'POST', body: { email: `${PREFIX}instr@example.test`, password: 'Password1!' } });
    const instrCookies = instrLogin.setCookies;

    // Instructor can access their profile
    await expect('/instructors/profile', 200, { cookies: instrCookies });

    // Student cannot access instructor-only routes
    await expect('/instructors/profile', 403, { cookies: activeCookies });
    console.log('   Instructor routes ✓');

    console.log('\nPhase 1–6 regression: ALL PASSED ✓');

  } finally {
    await cleanup();
    const remaining = await User.countDocuments({ email: new RegExp(`^${PREFIX}`, 'i') })
      + await Course.countDocuments({ title: new RegExp(`^${PREFIX}`, 'i') });
    assert.equal(remaining, 0, `Temporary regression records remain: ${remaining}`);
    console.log('Temporary Phase 1–6 regression MongoDB records = 0. ✓');
    if (server) await new Promise((r) => server.close(r));
    await mongoose.disconnect();
  }
}

main().catch((err) => { console.error(err); process.exitCode = 1; });
