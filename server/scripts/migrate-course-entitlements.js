/*
 * One-time, opt-in migration for the course-specific plan model.
 * Usage: node scripts/migrate-course-entitlements.js --apply
 * It never runs during server startup or seeding.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('../src/models/Course');
const Plan = require('../src/models/Plan');
const Subscription = require('../src/models/Subscription');
const Enrollment = require('../src/models/Enrollment');
const User = require('../src/models/User');

const coursesByTitle = ['DriveEase Driving Basics', 'DriveEase Road Ready', 'DriveEase Pro Driving Mastery'];
const planNames = { 'DriveEase Road Ready': 'DriveEase Road Ready Plan', 'DriveEase Pro Driving Mastery': 'DriveEase Pro Mastery Plan' };

const main = async () => {
  if (!process.argv.includes('--apply')) throw new Error('Refusing to modify data. Re-run with --apply after backup and review.');
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const courses = await Course.find({ title: { $in: coursesByTitle } });
    const byTitle = new Map(courses.map((course) => [course.title, course]));
    if (byTitle.size !== 3) throw new Error('All three named courses must exist before migration.');
    const basics = byTitle.get('DriveEase Driving Basics');
    const admin = await User.findOne({ role: 'admin', isActive: true }).select('_id');
    if (!admin) throw new Error('An active admin is required to create the free plan.');

    await Course.updateMany({ _id: { $in: [byTitle.get('DriveEase Road Ready')._id, byTitle.get('DriveEase Pro Driving Mastery')._id] } }, { $set: { contentSourceCourseId: basics._id } });
    await Plan.findOneAndUpdate({ name: 'DriveEase Driving Basics Plan' }, { $set: { courseId: basics._id, description: 'Free enrollment for DriveEase Driving Basics.', durationDays: 3650, amountPaise: 0, currency: 'INR', isActive: true }, $setOnInsert: { name: 'DriveEase Driving Basics Plan', createdBy: admin._id, features: ['DriveEase Driving Basics course access'] } }, { upsert: true, new: true, setDefaultsOnInsert: true });
    for (const title of ['DriveEase Road Ready', 'DriveEase Pro Driving Mastery']) {
      const plan = await Plan.findOne({ name: planNames[title] });
      if (!plan) throw new Error(`Missing plan: ${planNames[title]}`);
      plan.courseId = byTitle.get(title)._id;
      await plan.save();
    }
    const paidSubscriptions = await Subscription.find({ status: 'active' }).populate('planId', 'courseId');
    for (const subscription of paidSubscriptions) {
      if (subscription.planId?.courseId) await Enrollment.updateOne({ studentId: subscription.studentId, courseId: subscription.planId.courseId }, { $setOnInsert: { status: 'active', enrolledAt: subscription.startDate || new Date() } }, { upsert: true });
    }
    console.log('Course plan links, shared content sources, and active paid enrollments migrated.');
  } finally { await mongoose.disconnect(); }
};
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
