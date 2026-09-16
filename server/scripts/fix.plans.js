/**
 * One-time data fix: link existing orphaned plans to their courses,
 * create the missing ₹0 plan for Basics.
 *
 * Uses Mongoose directly (admin operation — not a user-facing API call).
 * Does NOT modify any application code.
 * Idempotent: safe to run multiple times.
 */
'use strict';
require('dotenv').config();
const mongoose = require('mongoose');
const Plan     = require('../src/models/Plan');
const Course   = require('../src/models/Course');
const User     = require('../src/models/User');

const COURSE_IDS = {
  basics:  '6a93bd766a071fe6eab25682',
  road:    '6a93ce679d04f0dd38d871b2',
  pro:     '6a93ce679d04f0dd38d871b3',
};

const PLAN_IDS = {
  road:  '6a93ce679d04f0dd38d871c7',   // DriveEase Road Ready Plan — amountPaise 100
  pro:   '6a93ce679d04f0dd38d871c8',   // DriveEase Pro Mastery Plan — amountPaise 100000
};

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('\n=== Plan Fix Script ===\n');

  // Need a createdBy admin user ID for the ₹0 plan
  const admin = await User.findOne({ role: 'admin', isActive: true }).select('_id').lean();
  if (!admin) throw new Error('No active admin user found in DB. Cannot create the free plan.');
  console.log(`Admin user for createdBy: ${admin._id}`);

  // 1. Verify the 3 target courses actually exist
  for (const [key, id] of Object.entries(COURSE_IDS)) {
    const course = await Course.findById(id).select('title status').lean();
    if (!course) throw new Error(`Course not found: ${key} (${id})`);
    console.log(`Course "${course.title}" (${course.status}) — OK`);
  }

  // 2. Link Road Ready plan → Road Ready course
  const roadPlan = await Plan.findById(PLAN_IDS.road);
  if (!roadPlan) throw new Error(`Road plan ${PLAN_IDS.road} not found`);
  if (roadPlan.courseId && roadPlan.courseId.toString() === COURSE_IDS.road) {
    console.log(`\n[SKIPPED] Road Ready plan already linked to Road Ready course`);
  } else if (roadPlan.courseId) {
    console.log(`\n[SKIPPED] Road Ready plan already linked to different courseId: ${roadPlan.courseId}`);
  } else {
    // Confirm no other plan already has this courseId
    const existing = await Plan.findOne({ courseId: COURSE_IDS.road, _id: { $ne: PLAN_IDS.road } }).lean();
    if (existing) {
      console.log(`\n[SKIPPED] Another plan already linked to Road Ready: ${existing._id} (${existing.name})`);
    } else {
      roadPlan.courseId = new mongoose.Types.ObjectId(COURSE_IDS.road);
      await roadPlan.save();
      console.log(`\n[FIXED] Road Ready plan linked to courseId ${COURSE_IDS.road}`);
    }
  }

  // 3. Link Pro Mastery plan → Pro Mastery course
  const proPlan = await Plan.findById(PLAN_IDS.pro);
  if (!proPlan) throw new Error(`Pro plan ${PLAN_IDS.pro} not found`);
  if (proPlan.courseId && proPlan.courseId.toString() === COURSE_IDS.pro) {
    console.log(`[SKIPPED] Pro plan already linked to Pro Mastery course`);
  } else if (proPlan.courseId) {
    console.log(`[SKIPPED] Pro plan already linked to different courseId: ${proPlan.courseId}`);
  } else {
    const existing = await Plan.findOne({ courseId: COURSE_IDS.pro, _id: { $ne: PLAN_IDS.pro } }).lean();
    if (existing) {
      console.log(`[SKIPPED] Another plan already linked to Pro Mastery: ${existing._id} (${existing.name})`);
    } else {
      proPlan.courseId = new mongoose.Types.ObjectId(COURSE_IDS.pro);
      await proPlan.save();
      console.log(`[FIXED] Pro Mastery plan linked to courseId ${COURSE_IDS.pro}`);
    }
  }

  // 4. Create ₹0 plan for Basics if none exists
  const existingFree = await Plan.findOne({ courseId: COURSE_IDS.basics }).lean();
  if (existingFree) {
    console.log(`[SKIPPED] Free plan for Basics already exists: "${existingFree.name}" (amountPaise=${existingFree.amountPaise}, active=${existingFree.isActive})`);
    if (!existingFree.isActive) {
      await Plan.updateOne({ _id: existingFree._id }, { $set: { isActive: true } });
      console.log(`  → Re-activated the free plan.`);
    }
  } else {
    const freePlan = await Plan.create({
      courseId:     new mongoose.Types.ObjectId(COURSE_IDS.basics),
      name:         'DriveEase Driving Basics',
      description:  'Free access to the Driving Basics course. No payment required.',
      durationDays: 365,
      amountPaise:  0,
      currency:     'INR',
      features:     ['Driving Basics course access', 'All beginner lessons', 'Traffic Signs quiz'],
      isActive:     true,
      createdBy:    admin._id,
    });
    console.log(`[CREATED] Free plan for Basics: ${freePlan._id}`);
  }

  // 5. Final state
  console.log('\n=== FINAL PLAN STATE ===');
  const finalPlans = await Plan.find({ isActive: true }).populate('courseId', 'title').lean();
  for (const p of finalPlans) {
    const amount = p.amountPaise === 0 ? '₹0 (free)' : `₹${p.amountPaise / 100}`;
    console.log(`  ${amount.padEnd(14)} | ${(p.courseId?.title || 'NO COURSE').padEnd(40)} | active=${p.isActive} | id=${p._id}`);
  }

  // 6. Verify exactly 3 course-linked plans
  const linkedPlans = finalPlans.filter(p => p.courseId != null);
  if (linkedPlans.length === 3) {
    console.log('\n[OK] Exactly 3 active course-linked plans. ✓');
  } else {
    console.log(`\n[WARNING] Expected 3 course-linked plans, found ${linkedPlans.length}`);
  }

  const orphans = finalPlans.filter(p => p.courseId == null);
  if (orphans.length > 0) {
    console.log(`[WARNING] ${orphans.length} active plan(s) still have no courseId:`);
    for (const o of orphans) console.log(`  ${o._id} — ${o.name}`);
  } else {
    console.log('[OK] No active orphaned plans. ✓');
  }

  await mongoose.disconnect();
}

run().catch(err => { console.error('\nFATAL:', err.message); process.exitCode = 1; });
