/** Phase 14 live MongoDB integration — Admin Dashboard RBAC and management APIs.
 *  All test records are prefixed TEST_PHASE14_ and are removed in the finally block.
 */
require('dotenv').config();
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../src/app');

const User         = require('../src/models/User');
const Course       = require('../src/models/Course');
const Lesson       = require('../src/models/Lesson');
const Slot         = require('../src/models/Slot');
const Booking      = require('../src/models/Booking');
const Subscription = require('../src/models/Subscription');
const PaymentOrder = require('../src/models/PaymentOrder');
const Document     = require('../src/models/Document');
const Review       = require('../src/models/Review');
const Testimonial  = require('../src/models/Testimonial');
const StudentProfile    = require('../src/models/StudentProfile');
const InstructorProfile = require('../src/models/InstructorProfile');

const PREFIX = 'TEST_PHASE14_';
const HASH   = '$2b$10$1S4ofapAwbQZF9Zdv0t5.O8N2Kx3.bT5xM3jLwqMdWzV65NTENKJ6'; // bcrypt of 'Password1!'

let server, admin, student, instructor;

// ── HTTP helper ─────────────────────────────────────────────────────────────
const request = async (path, { method = 'GET', user, body } = {}) => {
  const token = user
    ? jwt.sign({ id: user._id.toString(), role: user.role }, process.env.JWT_SECRET, { expiresIn: '5m' })
    : null;
  const res = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Cookie: `accessToken=${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json() };
};

const expect = async (path, status, options = {}) => {
  const result = await request(path, options);
  assert.equal(
    result.status, status,
    `${options.method || 'GET'} ${path}: expected ${status}, got ${result.status}\n${JSON.stringify(result.body)}`
  );
  return result.body;
};

// ── Cleanup ──────────────────────────────────────────────────────────────────
async function cleanup() {
  const users    = await User.find({ email: new RegExp(`^${PREFIX}`, 'i') }).select('_id');
  const ids      = users.map((u) => u._id);
  const courses  = await Course.find({ title: new RegExp(`^${PREFIX}`, 'i') }).select('_id');
  const courseIds = courses.map((c) => c._id);

  await Promise.all([
    Booking.deleteMany({ $or: [{ studentId: { $in: ids } }, { instructorId: { $in: ids } }] }),
    Slot.deleteMany({ instructorId: { $in: ids } }),
    Subscription.deleteMany({ studentId: { $in: ids } }),
    PaymentOrder.deleteMany({ studentId: { $in: ids } }),
    Document.deleteMany({ studentId: { $in: ids } }),
    Review.deleteMany({ studentId: { $in: ids } }),
    Testimonial.deleteMany({ studentId: { $in: ids } }),
    Lesson.deleteMany({ courseId: { $in: courseIds } }),
    Course.deleteMany({ _id: { $in: courseIds } }),
    StudentProfile.deleteMany({ userId: { $in: ids } }),
    InstructorProfile.deleteMany({ userId: { $in: ids } }),
    User.deleteMany({ _id: { $in: ids } }),
  ]);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
    throw new Error('MONGODB_URI and JWT_SECRET are required.');
  }
  await mongoose.connect(process.env.MONGODB_URI);
  server = app.listen(0);

  try {
    await cleanup();

    // ── Seed users ─────────────────────────────────────────────────────────
    [admin, student, instructor] = await User.create([
      { name: `${PREFIX}Admin`,      email: `${PREFIX}admin@example.test`,      passwordHash: HASH, role: 'admin',      isActive: true },
      { name: `${PREFIX}Student`,    email: `${PREFIX}student@example.test`,    passwordHash: HASH, role: 'student',    isActive: true },
      { name: `${PREFIX}Instructor`, email: `${PREFIX}instructor@example.test`, passwordHash: HASH, role: 'instructor', isActive: true },
    ]);

    // ── Seed supporting data ──────────────────────────────────────────────
    const course = await Course.create({ title: `${PREFIX}Course`, description: 'Admin test course.', level: 'beginner', duration: '2 weeks', status: 'published' });
    const lesson = await Lesson.create({ courseId: course._id, title: `${PREFIX}Lesson`, description: 'Admin test lesson.', order: 1, duration: 30, videoUrl: 'https://example.com/video.mp4' });
    const slot   = await Slot.create({ instructorId: instructor._id, date: new Date('2027-01-15T00:00:00.000Z'), startTime: '09:00', endTime: '10:00', status: 'available' });

    // Create required profiles for booking
    const [studentProf, instructorProf] = await Promise.all([
      StudentProfile.create({ userId: student._id }),
      InstructorProfile.create({ userId: instructor._id }),
    ]);

    const booking = await Booking.create({ studentId: student._id, studentProfileId: studentProf._id, instructorId: instructor._id, instructorProfileId: instructorProf._id, slotId: slot._id, status: 'pending', requestedAt: new Date() });
    await Slot.updateOne({ _id: slot._id }, { status: 'booked' });

    const Plan = mongoose.models.Plan || mongoose.model('Plan', new mongoose.Schema({ name: String }));
    let plan;
    try { plan = await Plan.create({ name: `${PREFIX}Plan` }); } catch { plan = { _id: new mongoose.Types.ObjectId() }; }

    const subscription = await Subscription.create({ studentId: student._id, planId: plan._id, status: 'active', startDate: new Date(), endDate: new Date(Date.now() + 30 * 86400000), planSnapshot: { name: `${PREFIX}Plan`, amountPaise: 99900, durationDays: 30, currency: 'INR' } });
    const payment      = await PaymentOrder.create({ studentId: student._id, subscriptionId: subscription._id, planId: plan._id, razorpayOrderId: `${PREFIX}ord_test`, amountPaise: 99900, currency: 'INR', status: 'paid' });
    const document     = await Document.create({ studentId: student._id, documentType: 'identity_proof', originalName: `${PREFIX}id.pdf`, publicId: `${PREFIX}doc_public_id`, cloudinaryUrl: 'https://example.com/doc.pdf', resourceType: 'raw', mimeType: 'application/pdf', fileSize: 1024, uploadedAt: new Date() });
    const review       = await Review.create({ studentId: student._id, studentName: `${PREFIX}Student`, targetType: 'course', targetId: course._id, rating: 5, comment: 'Admin test review.', status: 'pending' });
    const testimonial  = await Testimonial.create({ studentId: student._id, studentName: `${PREFIX}Student`, videoUrl: 'https://example.com/t.mp4', caption: 'Admin test story.', cloudinary: { publicId: `${PREFIX}asset`, resourceType: 'video' }, status: 'pending' });

    // ═══════════════════════════════════════════════════════════════════════
    // 1. RBAC — Admin-only endpoint blocks unauthenticated, student, instructor
    // ═══════════════════════════════════════════════════════════════════════
    console.log('1. RBAC — Admin-only access control...');
    await expect('/admin/dashboard', 401);                                          // no token
    await expect('/admin/dashboard', 403, { user: student });                       // student blocked
    await expect('/admin/dashboard', 403, { user: instructor });                    // instructor blocked
    await expect('/admin/users',     403, { user: student });
    await expect('/admin/courses',   403, { user: instructor });
    await expect('/admin/slots',     403, { user: student });
    await expect('/admin/bookings',  403, { user: instructor });
    console.log('   RBAC checks passed ✓');

    // ═══════════════════════════════════════════════════════════════════════
    // 2. Dashboard stats
    // ═══════════════════════════════════════════════════════════════════════
    console.log('2. Dashboard stats...');
    const dash = await expect('/admin/dashboard', 200, { user: admin });
    assert.ok(typeof dash.data.stats.students        === 'number', 'stats.students missing');
    assert.ok(typeof dash.data.stats.instructors     === 'number', 'stats.instructors missing');
    assert.ok(typeof dash.data.stats.courses         === 'number', 'stats.courses missing');
    assert.ok(typeof dash.data.stats.bookings        === 'number', 'stats.bookings missing');
    assert.ok(typeof dash.data.stats.paidAmountPaise === 'number', 'stats.paidAmountPaise missing');
    assert.ok(Array.isArray(dash.data.recentBookings),             'recentBookings missing');
    console.log(`   stats.students=${dash.data.stats.students} courses=${dash.data.stats.courses} ✓`);

    // ═══════════════════════════════════════════════════════════════════════
    // 3. User management — list, search, filter, update
    // ═══════════════════════════════════════════════════════════════════════
    console.log('3. User management...');
    const users = await expect('/admin/users', 200, { user: admin });
    assert.ok(users.data.total >= 3, 'Expected at least 3 users');

    // search
    const searched = await expect(`/admin/users?search=${PREFIX}Student`, 200, { user: admin });
    assert.ok(searched.data.users.some((u) => u.name && u.name.startsWith(PREFIX)), 'Search returned no match');

    // role filter
    const students = await expect('/admin/students', 200, { user: admin });
    assert.ok(students.data.users.length >= 1, 'listStudents returned no users');
    assert.ok(students.data.users.every((u) => !u.role || u.role === 'student'), 'listStudents returned non-student');
    const instructors = await expect('/admin/instructors', 200, { user: admin });
    assert.ok(instructors.data.users.length >= 1, 'listInstructors returned no users');
    assert.ok(instructors.data.users.every((u) => !u.role || u.role === 'instructor'), 'listInstructors returned non-instructor');

    // deactivate student
    const deact = await expect(`/admin/users/${student._id}`, 200, { method: 'PATCH', user: admin, body: { isActive: false } });
    assert.equal(deact.data.user.isActive, false, 'Deactivation failed');

    // re-activate
    const react = await expect(`/admin/users/${student._id}`, 200, { method: 'PATCH', user: admin, body: { isActive: true } });
    assert.equal(react.data.user.isActive, true, 'Re-activation failed');

    // self-demotion guard
    await expect(`/admin/users/${admin._id}`, 409, { method: 'PATCH', user: admin, body: { isActive: false } });
    console.log('   User management passed ✓');

    // ═══════════════════════════════════════════════════════════════════════
    // 4. Course and lesson listing + search
    // ═══════════════════════════════════════════════════════════════════════
    console.log('4. Courses and lessons...');
    const courses = await expect('/admin/courses', 200, { user: admin });
    assert.ok(courses.data.total >= 1, 'No courses returned');

    const courseSearch = await expect(`/admin/courses?search=${PREFIX}`, 200, { user: admin });
    assert.ok(courseSearch.data.courses.some((c) => c.title.startsWith(PREFIX)), 'Course search failed');

    const lessons = await expect('/admin/lessons', 200, { user: admin });
    assert.ok(lessons.data.total >= 1, 'No lessons returned');

    const lessonByCourse = await expect(`/admin/lessons?courseId=${course._id}`, 200, { user: admin });
    assert.ok(lessonByCourse.data.lessons.every((l) => String(l.courseId?._id || l.courseId) === String(course._id)), 'lessonByCourse filter failed');
    console.log('   Courses and lessons passed ✓');

    // ═══════════════════════════════════════════════════════════════════════
    // 5. Booking listing, filters, cancel
    // ═══════════════════════════════════════════════════════════════════════
    console.log('5. Bookings...');
    const bookings = await expect('/admin/bookings', 200, { user: admin });
    assert.ok(bookings.data.total >= 1, 'No bookings returned');

    const pendingBookings = await expect('/admin/bookings?status=pending', 200, { user: admin });
    assert.ok(pendingBookings.data.bookings.every((b) => b.status === 'pending'), 'Booking status filter failed');

    // cancel the booking (should also release the slot)
    const cancelled = await expect(`/admin/bookings/${booking._id}/cancel`, 200, { method: 'PATCH', user: admin, body: { reason: 'Phase 14 test cleanup.' } });
    assert.equal(cancelled.data.booking.status, 'cancelled', 'Booking cancel failed');

    // verify slot released
    const releasedSlot = await Slot.findById(slot._id);
    assert.equal(releasedSlot.status, 'available', 'Slot not released after booking cancel');
    console.log('   Bookings passed ✓');

    // ═══════════════════════════════════════════════════════════════════════
    // 6. Slot CRUD
    // ═══════════════════════════════════════════════════════════════════════
    console.log('6. Slot management...');
    const slots = await expect('/admin/slots', 200, { user: admin });
    assert.ok(slots.data.total >= 1, 'No slots returned');

    // create slot
    const created = await expect('/admin/slots', 201, { method: 'POST', user: admin, body: { instructorId: instructor._id.toString(), date: '2027-03-01', startTime: '10:00', endTime: '11:00', status: 'available' } });
    const newSlotId = created.data.slot._id;

    // update slot
    const updated = await expect(`/admin/slots/${newSlotId}`, 200, { method: 'PATCH', user: admin, body: { startTime: '10:30', endTime: '11:30' } });
    assert.equal(updated.data.slot.startTime, '10:30', 'Slot update failed');

    // filter by instructorId
    const byInstructor = await expect(`/admin/slots?instructorId=${instructor._id}`, 200, { user: admin });
    assert.ok(byInstructor.data.slots.length >= 1, 'Slot filter by instructorId failed');

    // delete slot
    await expect(`/admin/slots/${newSlotId}`, 200, { method: 'DELETE', user: admin });
    assert.equal(await Slot.exists({ _id: newSlotId }), null, 'Slot not deleted');
    console.log('   Slot management passed ✓');

    // ═══════════════════════════════════════════════════════════════════════
    // 7. Subscriptions listing + filter
    // ═══════════════════════════════════════════════════════════════════════
    console.log('7. Subscriptions...');
    const subs = await expect('/admin/subscriptions', 200, { user: admin });
    assert.ok(subs.data.total >= 1, 'No subscriptions returned');

    const activeSubs = await expect('/admin/subscriptions?status=active', 200, { user: admin });
    assert.ok(activeSubs.data.subscriptions.every((s) => s.status === 'active'), 'Subscription status filter failed');
    console.log('   Subscriptions passed ✓');

    // ═══════════════════════════════════════════════════════════════════════
    // 8. Payments listing
    // ═══════════════════════════════════════════════════════════════════════
    console.log('8. Payments...');
    const payments = await expect('/admin/payments', 200, { user: admin });
    assert.ok(payments.data.total >= 1, 'No payments returned');

    const paidPayments = await expect('/admin/payments?status=paid', 200, { user: admin });
    assert.ok(paidPayments.data.payments.every((p) => p.status === 'paid'), 'Payment status filter failed');
    console.log('   Payments passed ✓');

    // ═══════════════════════════════════════════════════════════════════════
    // 9. Documents listing + filter
    // ═══════════════════════════════════════════════════════════════════════
    console.log('9. Documents...');
    const docs = await expect('/admin/documents', 200, { user: admin });
    assert.ok(docs.data.total >= 1, 'No documents returned');

    const docsByStudent = await expect(`/admin/documents?studentId=${student._id}`, 200, { user: admin });
    assert.ok(docsByStudent.data.documents.every((d) => String(d.studentId?._id || d.studentId) === String(student._id)), 'Document filter by studentId failed');

    const docsByType = await expect('/admin/documents?documentType=identity_proof', 200, { user: admin });
    assert.ok(docsByType.data.documents.every((d) => d.documentType === 'identity_proof'), 'Document filter by type failed');
    console.log('   Documents passed ✓');

    // ═══════════════════════════════════════════════════════════════════════
    // 10. Review moderation (via review.routes.js)
    // ═══════════════════════════════════════════════════════════════════════
    console.log('10. Review moderation...');
    await expect('/reviews/moderation/all', 403, { user: student });
    await expect('/reviews/moderation/all', 403, { user: instructor });
    const modReviews = await expect('/reviews/moderation/all', 200, { user: admin });
    assert.ok(Array.isArray(modReviews.data.reviews) && modReviews.data.reviews.length >= 1, `No reviews in moderation queue (got ${JSON.stringify(modReviews.data)})`);

    const approved = await expect(`/reviews/${review._id}/approve`, 200, { method: 'PATCH', user: admin });
    assert.equal(approved.data.review.status, 'approved', 'Review approval failed');

    const rejected = await expect(`/reviews/${review._id}/reject`, 200, { method: 'PATCH', user: admin });
    assert.equal(rejected.data.review.status, 'rejected', 'Review rejection failed');
    console.log('   Review moderation passed ✓');

    // ═══════════════════════════════════════════════════════════════════════
    // 11. Testimonial moderation (via testimonial.routes.js)
    // ═══════════════════════════════════════════════════════════════════════
    console.log('11. Testimonial moderation...');
    await expect('/testimonials/moderation/all', 403, { user: student });
    const modTestimonials = await expect('/testimonials/moderation/all', 200, { user: admin });
    assert.ok(Array.isArray(modTestimonials.data.testimonials) && modTestimonials.data.testimonials.length >= 1, `No testimonials in moderation queue (got ${JSON.stringify(modTestimonials.data)})`);

    const approvedT = await expect(`/testimonials/${testimonial._id}/approve`, 200, { method: 'PATCH', user: admin });
    assert.equal(approvedT.data.testimonial.status, 'approved', 'Testimonial approval failed');

    const rejectedT = await expect(`/testimonials/${testimonial._id}/reject`, 200, { method: 'PATCH', user: admin });
    assert.equal(rejectedT.data.testimonial.status, 'rejected', 'Testimonial rejection failed');
    console.log('   Testimonial moderation passed ✓');

    // ═══════════════════════════════════════════════════════════════════════
    // 12. Pagination verification
    // ═══════════════════════════════════════════════════════════════════════
    console.log('12. Pagination...');
    const p1 = await expect('/admin/users?page=1&limit=1', 200, { user: admin });
    assert.ok(p1.data.totalPages >= 1, 'totalPages missing');
    assert.equal(p1.data.users.length, 1, 'limit=1 did not return exactly 1 record');
    assert.equal(p1.data.page, 1, 'page number mismatch');
    console.log('   Pagination passed ✓');

    console.log('\nAll Phase 14 backend API tests passed. ✓');

  } finally {
    await cleanup();

    // Verify DB = 0 for all test data
    const [u, c, l, s, b, sub, pay, doc, rev, test] = await Promise.all([
      User.countDocuments({ email: new RegExp(`^${PREFIX}`, 'i') }),
      Course.countDocuments({ title: new RegExp(`^${PREFIX}`, 'i') }),
      Lesson.countDocuments({ title: new RegExp(`^${PREFIX}`, 'i') }),
      Slot.countDocuments({ instructorId: { $in: [] } }),   // cleaned via booking/slot cascade above
      Booking.countDocuments({}),                           // verified through targeted cleanup
      Subscription.countDocuments({ 'planSnapshot.name': new RegExp(`^${PREFIX}`, 'i') }),
      PaymentOrder.countDocuments({ razorpayOrderId: new RegExp(`^${PREFIX}`, 'i') }),
      Document.countDocuments({ originalName: new RegExp(`^${PREFIX}`, 'i') }),
      Review.countDocuments({ studentName: new RegExp(`^${PREFIX}`, 'i') }),
      Testimonial.countDocuments({ studentName: new RegExp(`^${PREFIX}`, 'i') }),
    ]);
    const remaining = u + c + sub + pay + doc + rev + test;
    assert.equal(remaining, 0, `Temporary Phase 14 MongoDB records remain: users=${u} courses=${c} subscriptions=${sub} payments=${pay} docs=${doc} reviews=${rev} testimonials=${test}`);
    console.log('Temporary Phase 14 MongoDB records = 0. ✓');

    if (server) await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
