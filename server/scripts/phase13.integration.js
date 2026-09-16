/** Phase 13 live MongoDB integration. All records use TEST_PHASE13_ and are removed. */
require('dotenv').config();
const assert = require('node:assert/strict');
const fs = require('node:fs');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const User = require('../src/models/User'); const Course = require('../src/models/Course'); const Enrollment = require('../src/models/Enrollment'); const Attendance = require('../src/models/Attendance'); const Review = require('../src/models/Review'); const Testimonial = require('../src/models/Testimonial');
const { cloudinary, configureCloudinary } = require('../src/config/cloudinary');
const prefix = 'TEST_PHASE13_'; const passwordHash = '$2b$10$1S4ofapAwbQZF9Zdv0t5.O8N2Kx3.bT5xM3jLwqMdWzV65NTENKJ6';
let server; let studentOne; let studentTwo; let instructor; let admin; let course;
const cloudPublicIds = new Set();
const request = async (path, { method = 'GET', user, body } = {}) => { const token = user ? jwt.sign({ id: user._id.toString(), role: user.role }, process.env.JWT_SECRET, { expiresIn: '5m' }) : null; const response = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Cookie: `accessToken=${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined }); return { status: response.status, body: await response.json() }; };
const expect = async (path, status, options = {}) => { const result = await request(path, options); assert.equal(result.status, status, `${options.method || 'GET'} ${path}: expected ${status}, got ${result.status}\n${JSON.stringify(result.body)}`); return result.body; };
const multipart = async (path, method, user, caption) => { const token = jwt.sign({ id: user._id.toString(), role: user.role }, process.env.JWT_SECRET, { expiresIn: '5m' }); const form = new FormData(); form.append('caption', caption); form.append('video', new Blob([fs.readFileSync(process.env.PHASE13_TEST_VIDEO)], { type: 'video/mp4' }), 'phase13.mp4'); const response = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, { method, headers: { Cookie: `accessToken=${token}` }, body: form }); return { status: response.status, body: await response.json() }; };
const assertAssetMissing = async (publicId) => {
  let lastError;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try { await cloudinary.api.resource(publicId, { resource_type: 'video' }); }
    catch (error) { const message = error?.message || error?.error?.message || ''; if (/not found|404/i.test(message)) return; lastError = new Error(message || 'Cloudinary asset lookup failed.'); }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw lastError || new Error(`Cloudinary asset still exists: ${publicId}`);
};
async function cleanup() { const users = await User.find({ email: new RegExp(`^${prefix}`, 'i') }).select('_id'); const ids = users.map((user) => user._id); const courses = await Course.find({ title: new RegExp(`^${prefix}`, 'i') }).select('_id'); await Promise.all([Review.deleteMany({ $or: [{ studentId: { $in: ids } }, { studentName: new RegExp(`^${prefix}`, 'i') }] }), Testimonial.deleteMany({ $or: [{ studentId: { $in: ids } }, { studentName: new RegExp(`^${prefix}`, 'i') }] }), Enrollment.deleteMany({ $or: [{ studentId: { $in: ids } }, { courseId: { $in: courses.map((item) => item._id) } }] }), Attendance.deleteMany({ $or: [{ studentId: { $in: ids } }, { instructorId: { $in: ids } }] }), Course.deleteMany({ _id: { $in: courses.map((item) => item._id) } }), User.deleteMany({ _id: { $in: ids } })]); }
async function main() {
  if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) throw new Error('MONGODB_URI and JWT_SECRET are required.');
  await mongoose.connect(process.env.MONGODB_URI); configureCloudinary(); server = app.listen(0);
  try {
    await cleanup();
    [studentOne, studentTwo, instructor, admin] = await User.create([
      { name: `${prefix} Student One`, email: `${prefix}student1@example.test`, passwordHash, role: 'student' }, { name: `${prefix} Student Two`, email: `${prefix}student2@example.test`, passwordHash, role: 'student' }, { name: `${prefix} Instructor`, email: `${prefix}instructor@example.test`, passwordHash, role: 'instructor' }, { name: `${prefix} Admin`, email: `${prefix}admin@example.test`, passwordHash, role: 'admin' },
    ]);
    course = await Course.create({ title: `${prefix} Course`, description: 'Integration course.', level: 'beginner', duration: '1 week', status: 'published' });
    await Enrollment.create({ studentId: studentOne._id, courseId: course._id, status: 'completed' });
    await Attendance.create({ bookingId: new mongoose.Types.ObjectId(), studentId: studentOne._id, instructorId: instructor._id, status: 'present', markedBy: instructor._id });

    console.log('1. Review authentication, eligibility, and duplicate protection...');
    await expect('/reviews', 200); await expect('/reviews/mine', 401);
    await expect('/reviews', 403, { method: 'POST', user: studentTwo, body: { targetType: 'course', targetId: course._id.toString(), rating: 5, comment: 'Not eligible.' } });
    const created = await expect('/reviews', 201, { method: 'POST', user: studentOne, body: { targetType: 'course', targetId: course._id.toString(), rating: 5, comment: 'Excellent completed course.' } });
    const reviewId = created.data.review._id;
    await expect('/reviews', 409, { method: 'POST', user: studentOne, body: { targetType: 'course', targetId: course._id.toString(), rating: 4, comment: 'Duplicate completed course review.' } });
    const pendingPublic = await expect('/reviews', 200); assert.equal(pendingPublic.data.total, 0, 'Pending reviews must not be public.');
    await expect(`/reviews/${reviewId}`, 404, { method: 'PATCH', user: studentTwo, body: { comment: 'Attempted ownership bypass.' } });
    await expect('/reviews/moderation/all', 403, { user: studentOne });

    console.log('2. Review moderation and public privacy...');
    await expect(`/reviews/${reviewId}/approve`, 200, { method: 'PATCH', user: admin });
    const publicReviews = await expect('/reviews', 200); assert.equal(publicReviews.data.total, 1); assert.equal(publicReviews.data.reviews[0].studentId, undefined); assert.equal(publicReviews.data.reviews[0].status, undefined); assert.equal(publicReviews.data.reviews[0].targetId, undefined);
    const update = await expect(`/reviews/${reviewId}`, 200, { method: 'PATCH', user: studentOne, body: { rating: 4, comment: 'Updated completed course review.' } }); assert.equal(update.data.review.status, 'pending');
    assert.equal((await expect('/reviews', 200)).data.total, 0, 'Edited reviews must return to pending.');
    await expect(`/reviews/${reviewId}/reject`, 200, { method: 'PATCH', user: admin });
    const instructorReview = await expect('/reviews', 201, { method: 'POST', user: studentOne, body: { targetType: 'instructor', targetId: instructor._id.toString(), rating: 5, comment: 'Excellent instructor.' } });
    assert.equal(instructorReview.data.review.targetType, 'instructor');

    console.log('3. Testimonial moderation and private-data boundaries...');
    const testimonial = await Testimonial.create({ studentId: studentOne._id, studentName: `${prefix} Student One`, videoUrl: 'https://res.cloudinary.com/example/video/upload/test.mp4', caption: 'Pending story.', cloudinary: { publicId: `${prefix}asset`, resourceType: 'video' } });
    const mine = await expect('/testimonials/mine', 200, { user: studentOne }); assert.equal(mine.data.testimonials[0].cloudinary, undefined, 'Cloudinary public IDs must not be exposed.');
    assert.equal((await expect('/testimonials', 200)).data.total, 0, 'Pending testimonials must not be public.');
    await expect('/testimonials/moderation/all', 403, { user: studentOne });
    await expect(`/testimonials/${testimonial._id}/approve`, 200, { method: 'PATCH', user: admin });
    const publicTestimonials = await expect('/testimonials', 200); assert.equal(publicTestimonials.data.total, 1); assert.equal(publicTestimonials.data.testimonials[0].studentId, undefined); assert.equal(publicTestimonials.data.testimonials[0].cloudinary, undefined);
    await expect(`/testimonials/${testimonial._id}`, 404, { method: 'PATCH', user: studentTwo, body: { caption: 'ownership bypass' } });
    const cloudinaryReady = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'].every((key) => { const value = process.env[key] || ''; return value && !/your_|replace_|example/i.test(value); });
    if (cloudinaryReady && process.env.PHASE13_TEST_VIDEO && fs.existsSync(process.env.PHASE13_TEST_VIDEO)) {
      console.log('4. Cloudinary upload, replacement, and deletion...');
      const uploaded = await multipart('/testimonials', 'POST', studentOne, 'Cloudinary upload test'); assert.equal(uploaded.status, 201, JSON.stringify(uploaded.body));
      const uploadId = uploaded.body.data.testimonial._id; const first = await Testimonial.findById(uploadId).select('+cloudinary.publicId'); cloudPublicIds.add(first.cloudinary.publicId);
      const replaced = await multipart(`/testimonials/${uploadId}`, 'PATCH', studentOne, 'Cloudinary replacement test'); assert.equal(replaced.status, 200, JSON.stringify(replaced.body));
      const second = await Testimonial.findById(uploadId).select('+cloudinary.publicId'); cloudPublicIds.add(second.cloudinary.publicId); assert.notEqual(first.cloudinary.publicId, second.cloudinary.publicId);
      await assertAssetMissing(first.cloudinary.publicId); cloudPublicIds.delete(first.cloudinary.publicId);
      await expect(`/testimonials/${uploadId}`, 200, { method: 'DELETE', user: studentOne }); assert.equal(await Testimonial.exists({ _id: uploadId }), null);
      await assertAssetMissing(second.cloudinary.publicId); cloudPublicIds.delete(second.cloudinary.publicId);
      console.log('Temporary Phase 13 Cloudinary assets = 0. ✓');
    } else console.log('[PENDING] Cloudinary upload/delete skipped: credentials or test fixture unavailable.');
    console.log('All Phase 13 verifiable backend tests passed.');
  } finally {
    await Promise.all([...cloudPublicIds].map((publicId) => cloudinary.uploader.destroy(publicId, { resource_type: 'video', invalidate: true }).catch(() => {})));
    await cleanup();
    const [users, reviews, testimonials, courses] = await Promise.all([User.countDocuments({ email: new RegExp(`^${prefix}`, 'i') }), Review.countDocuments({ studentName: new RegExp(`^${prefix}`, 'i') }), Testimonial.countDocuments({ studentName: new RegExp(`^${prefix}`, 'i') }), Course.countDocuments({ title: new RegExp(`^${prefix}`, 'i') })]);
    assert.equal(users + reviews + testimonials + courses, 0, 'Temporary Phase 13 MongoDB records remain.'); console.log('Temporary Phase 13 MongoDB records = 0. ✓');
    if (server) await new Promise((resolve) => server.close(resolve)); await mongoose.disconnect();
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
