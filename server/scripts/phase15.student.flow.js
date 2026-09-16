/**
 * Phase 15 — Student Flow Verification
 *
 * Verifies:
 *  1. Student navigation pages respond correctly
 *  2. Exactly 3 live courses with ₹0 / ₹1 / ₹1000 plans
 *  3. Course-specific payment/enrollment/access
 *  4. Lesson access gated on enrollment
 *  5. Lesson progress (mark complete)
 *  6. Book slot flow with existing instructor data
 *
 * All test records prefixed FLOW15_ and cleaned up in finally.
 */
'use strict';
require('dotenv').config();
const assert   = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt      = require('jsonwebtoken');
const app      = require('../src/app');

const User           = require('../src/models/User');
const StudentProfile = require('../src/models/StudentProfile');
const InstructorProfile = require('../src/models/InstructorProfile');
const Course         = require('../src/models/Course');
const Plan           = require('../src/models/Plan');
const Enrollment     = require('../src/models/Enrollment');
const Slot           = require('../src/models/Slot');
const Booking        = require('../src/models/Booking');

const PREFIX = 'FLOW15_';
const ADMIN_HASH = '$2b$12$tn11QikSkjFBNJDod8Ey5.3KTmXqLVW93nTsqbayLv58PcSHs60au'; // Password1!
let server;

const request = async (path, { method = 'GET', user, body } = {}) => {
  const token = user ? jwt.sign({ id: user._id.toString(), role: user.role }, process.env.JWT_SECRET, { expiresIn: '5m' }) : null;
  const res = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Cookie: `accessToken=${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json() };
};

const expect = async (path, status, opts = {}) => {
  const r = await request(path, opts);
  assert.equal(r.status, status, `${opts.method || 'GET'} ${path}: expected ${status}, got ${r.status}\n${JSON.stringify(r.body)}`);
  return r;
};

async function cleanup() {
  const users   = await User.find({ email: new RegExp(`^${PREFIX}`, 'i') }).select('_id');
  const ids     = users.map(u => u._id);
  const courses = await Course.find({ title: new RegExp(`^${PREFIX}`, 'i') }).select('_id');
  const cids    = courses.map(c => c._id);
  await Promise.all([
    Booking.deleteMany({ studentId: { $in: ids } }),
    Slot.deleteMany({ instructorId: { $in: ids } }),
    Enrollment.deleteMany({ $or: [{ studentId: { $in: ids } }, { courseId: { $in: cids } }] }),
    Plan.deleteMany({ courseId: { $in: cids } }),
    Course.deleteMany({ _id: { $in: cids } }),
    StudentProfile.deleteMany({ userId: { $in: ids } }),
    InstructorProfile.deleteMany({ userId: { $in: ids } }),
    User.deleteMany({ _id: { $in: ids } }),
  ]);
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  server = app.listen(0);
  const port = server.address().port;
  console.log(`\nStudent flow verification (port ${port})\n`);

  try {
    await cleanup();

    // ── Seed: test student + test instructor ──────────────────────────
    const [student, instructor, adminUser] = await User.create([
      { name: `${PREFIX}Student`, email: `${PREFIX}student@test.local`, passwordHash: ADMIN_HASH, role: 'student', isActive: true },
      { name: `${PREFIX}Instructor`, email: `${PREFIX}instr@test.local`, passwordHash: ADMIN_HASH, role: 'instructor', isActive: true },
      { name: `${PREFIX}Admin`, email: `${PREFIX}admin@test.local`, passwordHash: ADMIN_HASH, role: 'admin', isActive: true },
    ]);
    await StudentProfile.create({ userId: student._id });
    await InstructorProfile.create({ userId: instructor._id, isAvailable: true, status: 'active' });

    // ── Seed: 3 test courses + plans ─────────────────────────────────
    const [c1, c2, c3] = await Course.create([
      { title: `${PREFIX}Basics`,   description: 'Free basics.', level: 'beginner',     duration: '1 week',  status: 'published' },
      { title: `${PREFIX}Road`,     description: 'Paid road.',   level: 'beginner',     duration: '2 weeks', status: 'published' },
      { title: `${PREFIX}Pro`,      description: 'Paid pro.',    level: 'intermediate', duration: '4 weeks', status: 'published' },
    ]);

    const [p1, p2, p3] = await Plan.create([
      { courseId: c1._id, name: `${PREFIX}Free Plan`,  description: 'Free', durationDays: 30,  amountPaise: 0,      currency: 'INR', features: [], createdBy: adminUser._id },
      { courseId: c2._id, name: `${PREFIX}₹1 Plan`,   description: '₹1',  durationDays: 30,  amountPaise: 100,    currency: 'INR', features: [], createdBy: adminUser._id },
      { courseId: c3._id, name: `${PREFIX}₹1000 Plan`, description: '₹1000', durationDays: 90, amountPaise: 100000, currency: 'INR', features: [], createdBy: adminUser._id },
    ]);

    // Add a lesson to c1 for lesson-flow test
    const lesson = await require('../src/models/Lesson').create({
      courseId: c1._id, title: `${PREFIX}Lesson 1`, description: 'Test lesson', order: 1, duration: '10 minutes',
    });

    // Slot for booking test
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setUTCHours(0,0,0,0);
    const slot = await Slot.create({ instructorId: instructor._id, date: tomorrow, startTime: '10:00', endTime: '11:00', status: 'available' });

    // ═══════════════════════════════════════════════════════════════
    // 1. Student navigation pages
    // ═══════════════════════════════════════════════════════════════
    console.log('1. Student navigation endpoints...');
    // Dashboard
    const dash = await expect('/students/dashboard', 200, { user: student });
    assert.ok(dash.body.data.user, 'Dashboard missing user');
    console.log('   Dashboard ✓');

    // Profile
    await expect('/students/profile', 200, { user: student });
    console.log('   Profile ✓');

    // Courses (plan listing = /subscriptions/plans — populated with courseId)
    const plans = await expect('/subscriptions/plans', 200);
    assert.ok(Array.isArray(plans.body.data.plans), 'Plans not an array');
    const myPlans = plans.body.data.plans.filter(p => p.name?.startsWith(PREFIX));
    assert.equal(myPlans.length, 3, `Expected 3 FLOW15_ plans, got ${myPlans.length}`);
    console.log('   Courses/Plans listing ✓');

    // Book slot listing
    const slots = await expect('/bookings/available-slots', 200, { user: student });
    assert.ok(Array.isArray(slots.body.data.slots), 'Slots not an array');
    console.log('   Book Slot listing ✓');

    // My Bookings (empty at start)
    const bookings = await expect('/bookings/mine', 200, { user: student });
    assert.ok(Array.isArray(bookings.body.data.bookings), 'Bookings not an array');
    console.log('   My Bookings listing ✓');

    // ═══════════════════════════════════════════════════════════════
    // 2. Pricing verification — ₹0 / ₹1 / ₹1000
    // ═══════════════════════════════════════════════════════════════
    console.log('\n2. Pricing verification...');
    const flowPlans = plans.body.data.plans.filter(p => p.name?.startsWith(PREFIX));
    const free   = flowPlans.find(p => p.amountPaise === 0);
    const one    = flowPlans.find(p => p.amountPaise === 100);
    const thou   = flowPlans.find(p => p.amountPaise === 100000);
    assert.ok(free,  'No ₹0 plan found');
    assert.ok(one,   'No ₹1 plan found');
    assert.ok(thou,  'No ₹1000 plan found');
    assert.ok(free.courseId,  '₹0 plan not linked to course');
    assert.ok(one.courseId,   '₹1 plan not linked to course');
    assert.ok(thou.courseId,  '₹1000 plan not linked to course');
    console.log(`   ₹0 plan → "${free.courseId.title || free.courseId}" ✓`);
    console.log(`   ₹1 plan → "${one.courseId.title  || one.courseId}" ✓`);
    console.log(`   ₹1000 plan → "${thou.courseId.title || thou.courseId}" ✓`);

    // ═══════════════════════════════════════════════════════════════
    // 3. Course-specific enrollment/access
    // ═══════════════════════════════════════════════════════════════
    console.log('\n3. Enrollment and access control...');

    // 3a. ₹0 course: direct enrollment allowed
    const freeEnroll = await expect('/enrollments', 201, {
      method: 'POST', user: student, body: { courseId: c1._id.toString() },
    });
    assert.equal(freeEnroll.body.data.enrollment.studentId?.toString() || freeEnroll.body.data.enrollment.studentId, student._id.toString());
    console.log('   ₹0 course → direct enrollment ✓');

    // 3b. ₹1 course: enrollment blocked without payment
    const paidBlock = await request('/enrollments', {
      method: 'POST', user: student, body: { courseId: c2._id.toString() },
    });
    assert.equal(paidBlock.status, 403, `₹1 course should block direct enrollment (got ${paidBlock.status})`);
    console.log('   ₹1 course → direct enrollment correctly blocked (403) ✓');

    // 3c. ₹1000 course: enrollment blocked without payment
    const proBlock = await request('/enrollments', {
      method: 'POST', user: student, body: { courseId: c3._id.toString() },
    });
    assert.equal(proBlock.status, 403, `₹1000 course should block direct enrollment (got ${proBlock.status})`);
    console.log('   ₹1000 course → direct enrollment correctly blocked (403) ✓');

    // 3d. Paid course: create-order returns 503 (Razorpay unconfigured locally — expected)
    const order = await request('/payments/create-order', {
      method: 'POST', user: student, body: { courseId: c2._id.toString() },
    });
    assert.ok([503, 201].includes(order.status), `create-order: expected 503 or 201, got ${order.status}`);
    if (order.status === 503) {
      console.log('   ₹1 course → create-order returns 503 (Razorpay unconfigured — expected) ✓');
    } else {
      console.log('   ₹1 course → create-order returns 201 (Razorpay configured) ✓');
    }

    // ═══════════════════════════════════════════════════════════════
    // 4. Lesson access — enrolled course only
    // ═══════════════════════════════════════════════════════════════
    console.log('\n4. Lesson and progress flow...');

    // List lessons for enrolled course
    const lessons = await expect(`/lessons/course/${c1._id}`, 200, { user: student });
    assert.ok(lessons.body.data.lessons.length >= 1, 'No lessons returned for enrolled course');
    console.log('   Lesson list for enrolled course ✓');

    // Get individual lesson (requires ?courseId)
    const lessonDetail = await expect(`/lessons/${lesson._id}?courseId=${c1._id}`, 200, { user: student });
    assert.ok(lessonDetail.body.data.lesson._id, 'Lesson detail missing _id');
    console.log('   GET /lessons/:id?courseId ✓');

    // Lesson access blocked for unenrolled paid course
    // First, check if any lessons exist for c2
    const Lesson = require('../src/models/Lesson');
    const c2lesson = await Lesson.create({ courseId: c2._id, title: `${PREFIX}Paid Lesson`, description: 'Paid', order: 1, duration: '10 minutes' });
    const blockedLesson = await request(`/lessons/course/${c2._id}`, { user: student });
    assert.equal(blockedLesson.status, 403, `Unenrolled paid course lesson list should be 403 (got ${blockedLesson.status})`);
    console.log('   Lesson list for unenrolled paid course correctly blocked (403) ✓');

    // Mark complete
    const complete = await expect(`/lessons/${lesson._id}/complete`, 200, {
      method: 'POST', user: student, body: { courseId: c1._id.toString() },
    });
    assert.ok(complete.body.data.progress.completed === true, 'Lesson not marked complete');
    console.log('   Mark lesson complete ✓');

    // Progress API
    const progress = await expect(`/progress/courses/${c1._id}`, 200, { user: student });
    assert.ok(progress.body.data.progress?.completionPercentage >= 0, 'Progress missing completionPercentage');
    console.log(`   Course progress: ${progress.body.data.progress?.completionPercentage}% ✓`);

    // ═══════════════════════════════════════════════════════════════
    // 5. Booking flow
    // ═══════════════════════════════════════════════════════════════
    console.log('\n5. Booking flow...');

    // Verify the test slot is visible in available-slots
    const availableCheck = await expect('/bookings/available-slots', 200, { user: student });
    const testSlot = availableCheck.body.data.slots.find(s => s._id === slot._id.toString());
    assert.ok(testSlot, 'Test slot not visible in available-slots');
    console.log('   Test slot visible in available-slots ✓');

    // Create booking
    const bookingResult = await expect('/bookings', 201, {
      method: 'POST', user: student, body: { slotId: slot._id.toString() },
    });
    const bookingId = bookingResult.body.data.booking._id;
    assert.equal(bookingResult.body.data.booking.status, 'pending');
    console.log('   Booking request created (status: pending) ✓');

    // Verify it appears in /bookings/mine
    const myBookings = await expect('/bookings/mine', 200, { user: student });
    assert.ok(myBookings.body.data.bookings.some(b => b._id === bookingId), 'Booking not in mine list');
    console.log('   Booking appears in /bookings/mine ✓');

    // Instructor accepts the booking
    const accepted = await expect(`/bookings/${bookingId}/accept`, 200, {
      method: 'PATCH', user: instructor,
    });
    assert.equal(accepted.body.data.booking.status, 'confirmed');
    console.log('   Instructor accepted booking (status: confirmed) ✓');

    // Student cancels the confirmed booking
    const cancelled = await expect(`/bookings/${bookingId}/cancel`, 200, {
      method: 'PATCH', user: student, body: { reason: 'Flow test cleanup' },
    });
    assert.equal(cancelled.body.data.booking.status, 'cancelled');
    console.log('   Student cancelled booking (status: cancelled) ✓');

    // Verify slot is released back to available
    const slotAfter = await Slot.findById(slot._id);
    assert.equal(slotAfter.status, 'available', 'Slot not released after cancellation');
    console.log('   Slot released back to available after cancellation ✓');

    console.log('\nAll student flow checks passed. ✓');

  } finally {
    // Clean Lesson model entries too
    const Lesson = require('../src/models/Lesson');
    const courses = await Course.find({ title: new RegExp(`^${PREFIX}`, 'i') }).select('_id');
    const cids = courses.map(c => c._id);
    await Lesson.deleteMany({ courseId: { $in: cids } });
    await cleanup();

    const remaining = await User.countDocuments({ email: new RegExp(`^${PREFIX}`, 'i') })
                    + await Course.countDocuments({ title: new RegExp(`^${PREFIX}`, 'i') });
    assert.equal(remaining, 0, `Temporary FLOW15_ records remain: ${remaining}`);
    console.log('Temporary FLOW15_ MongoDB records = 0. ✓');

    if (server) await new Promise(r => server.close(r));
    await mongoose.disconnect();
  }
}

main().catch(err => { console.error(err); process.exitCode = 1; });
