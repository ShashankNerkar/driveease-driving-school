/**
 * Fix: ensure InstructorProfile exists and is bookable (isAvailable: true, status: 'active')
 * for all active instructor User accounts.
 * Idempotent — safe to re-run.
 */
'use strict';
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const InstructorProfile = require('../src/models/InstructorProfile');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('\n=== Instructor Profile Fix ===\n');

  const instructors = await User.find({ role: 'instructor', isActive: true }).select('_id name email').lean();
  console.log(`Found ${instructors.length} active instructor user(s).`);

  for (const instructor of instructors) {
    const profile = await InstructorProfile.findOne({ userId: instructor._id });

    if (!profile) {
      // Create a minimal profile
      await InstructorProfile.create({
        userId:      instructor._id,
        isAvailable: true,
        status:      'active',
        experience:  0,
      });
      console.log(`[CREATED] InstructorProfile for "${instructor.name}" (${instructor._id})`);
    } else {
      // Ensure it's bookable
      let changed = false;
      if (!profile.isAvailable) { profile.isAvailable = true; changed = true; }
      if (profile.status !== 'active') { profile.status = 'active'; changed = true; }
      if (changed) {
        await profile.save();
        console.log(`[FIXED]   InstructorProfile for "${instructor.name}" → isAvailable=true, status=active`);
      } else {
        console.log(`[OK]      InstructorProfile for "${instructor.name}" — isAvailable=${profile.isAvailable}, status=${profile.status}`);
      }
    }
  }

  // Final state
  console.log('\n=== FINAL INSTRUCTOR PROFILES ===');
  for (const instructor of instructors) {
    const p = await InstructorProfile.findOne({ userId: instructor._id }).select('isAvailable status experience').lean();
    console.log(`  ${instructor.name.padEnd(30)} | isAvailable=${p?.isAvailable} | status=${p?.status} | experience=${p?.experience}yr`);
  }

  await mongoose.disconnect();
}

run().catch(err => { console.error('\nFATAL:', err.message); process.exitCode = 1; });
