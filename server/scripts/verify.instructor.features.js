/**
 * Verify instructor Availability, Attendance, and Assessment API endpoints.
 * Uses existing real instructor accounts (Soham, Phase 6 Browser Instructor).
 */
'use strict';
require('dotenv').config();
const assert   = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt      = require('jsonwebtoken');
const app      = require('../src/app');
const User     = require('../src/models/User');
const Slot     = require('../src/models/Slot');
const Booking  = require('../src/models/Booking');
const Attendance = require('../src/models/Attendance');
const Assessment = require('../src/models/Assessment');
const StudentProfile    = require('../src/models/StudentProfile');
const InstructorProfile = require('../src/models/InstructorProfile');

const BCRYPT = '$2b$12$tn11QikSkjFBNJDod8Ey5.3KTmXqLVW93nTsqbayLv58PcSHs60au'; // Password1!
const PREFIX = 'INSTRTEST_';
let server;

const req = async (path, { method = 'GET', user, body } = {}) => {
  const token = user ? jwt.sign({ id: user._id.toString(), role: user.role }, process.env.JWT_SECRET, { expiresIn: '5m' }) : null;
  const res = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Cookie: `accessToken=${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json() };
};

const expect = async (path, status, opts = {}) => {
  const r = await req(path, opts);
  assert.equal(r.status, status, `${opts.method || 'GET'} ${path} → expected ${status}, got ${r.status}\n${JSON.stringify(r.body)}`);
  return r;
};

async function cleanup() {
  const users   = await User.find({ email: new RegExp(`^${PREFIX}`, 'i') }).select('_id');
  const ids     = users.map(u => u._id);
  await Promise.all([
    Assessment.deleteMany({ instructorId: { $in: ids } }),
    Attendance.deleteMany({ instructorId: { $in: ids } }),
    Booking.deleteMany({ instructorId: { $in: ids } }),
    Slot.deleteMany({ instructorId: { $in: ids } }),
    StudentProfile.deleteMany({ userId: { $in: ids } }),
    InstructorProfile.deleteMany({ userId: { $in: ids } }),
    User.deleteMany({ _id: { $in: ids } }),
  ]);
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  server = app.listen(0);
  console.log(`\nInstructor feature verification (port ${server.address().port})\n`);

  try {
    await cleanup();

    // Seed test instructor and student
    const [instructor, student] = await User.create([
      { name: `${PREFIX}Instructor`, email: `${PREFIX}instr@test.local`, passwordHash: BCRYPT, role: 'instructor', isActive: true },
      { name: `${PREFIX}Student`,    email: `${PREFIX}student@test.local`, passwordHash: BCRYPT, role: 'student',    isActive: true },
    ]);
    await StudentProfile.create({ userId: student._id });
    await InstructorProfile.create({ userId: instructor._id, isAvailable: true, status: 'active' });

    // ── 1. Availability: GET /slots/mine ─────────────────────────────
    console.log('1. Availability — GET /slots/mine...');
    await expect('/slots/mine', 403, { user: student });         // student blocked ✓
    const slotsRes = await expect('/slots/mine', 200, { user: instructor });
    assert.ok(Array.isArray(slotsRes.body.data.slots), 'slots not an array');
    console.log(`   GET /slots/mine → 200 (${slotsRes.body.data.slots.length} slots) ✓`);

    // Create a slot
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().slice(0, 10);
    const created = await expect('/slots', 201, {
      method: 'POST', user: instructor,
      body: { date: dateStr, startTime: '09:00', endTime: '10:00' },
    });
    const slotId = created.body.data.slot._id;
    console.log(`   POST /slots → 201 (created ${dateStr} 09:00–10:00) ✓`);

    // Confirm it appears in /slots/mine
    const slotsAfter = await expect('/slots/mine', 200, { user: instructor });
    assert.ok(slotsAfter.body.data.slots.some(s => s._id === slotId), 'Created slot not in /slots/mine');
    console.log('   Slot appears in GET /slots/mine ✓');

    // Delete the slot
    await expect(`/slots/${slotId}`, 200, { method: 'DELETE', user: instructor });
    console.log('   DELETE /slots/:id → 200 ✓');

    // ── 2. Attendance: GET /attendance/sessions and /confirmed-sessions
    console.log('\n2. Attendance — sessions endpoints...');
    await expect('/attendance/sessions', 403, { user: student });        // student blocked ✓
    const sessRes = await expect('/attendance/sessions', 200, { user: instructor });
    assert.ok(Array.isArray(sessRes.body.data.attendance), 'attendance not array');
    console.log(`   GET /attendance/sessions → 200 (${sessRes.body.data.attendance.length} records) ✓`);

    const confRes = await expect('/attendance/confirmed-sessions', 200, { user: instructor });
    assert.ok(Array.isArray(confRes.body.data.sessions), 'confirmed sessions not array');
    console.log(`   GET /attendance/confirmed-sessions → 200 (${confRes.body.data.sessions.length} confirmed bookings) ✓`);

    // Create a confirmed booking to test marking attendance
    // Seed: instructor creates slot, student books it, instructor confirms
    const sA = await Slot.create({ instructorId: instructor._id, date: new Date(dateStr + 'T00:00:00Z'), startTime: '10:00', endTime: '11:00', status: 'available' });
    const sProf = await StudentProfile.findOne({ userId: student._id });
    const iProf = await InstructorProfile.findOne({ userId: instructor._id });
    const booking = await Booking.create({
      studentId: student._id, studentProfileId: sProf._id,
      instructorId: instructor._id, instructorProfileId: iProf._id,
      slotId: sA._id, status: 'confirmed', requestedAt: new Date(), approvedAt: new Date(),
    });
    await Slot.updateOne({ _id: sA._id }, { status: 'booked' });

    // Mark attendance
    const attRes = await expect('/attendance', 201, {
      method: 'POST', user: instructor,
      body: { bookingId: booking._id.toString(), status: 'present', remarks: 'Test' },
    });
    assert.equal(attRes.body.data.attendance.status, 'present');
    console.log('   POST /attendance (mark present) → 201 ✓');

    // Verify it appears in /attendance/sessions
    const sessAfter = await expect('/attendance/sessions', 200, { user: instructor });
    assert.ok(sessAfter.body.data.attendance.some(a => a.bookingId?._id?.toString() === booking._id.toString() || a.bookingId?.toString() === booking._id.toString()), 'Attendance not in sessions list');
    console.log('   Attendance appears in GET /attendance/sessions ✓');

    // Student cannot see instructor sessions
    await expect('/attendance/sessions', 403, { user: student });
    console.log('   GET /attendance/sessions blocked for student (403) ✓');

    // Student can see own attendance
    const myAtt = await expect('/attendance/mine', 200, { user: student });
    assert.ok(Array.isArray(myAtt.body.data.attendance));
    console.log('   GET /attendance/mine → 200 for student ✓');

    // ── 3. Assessments: GET /assessments/sessions ───────────────────
    console.log('\n3. Assessments...');
    await expect('/assessments/sessions', 403, { user: student });       // student blocked ✓
    const assRes = await expect('/assessments/sessions', 200, { user: instructor });
    assert.ok(Array.isArray(assRes.body.data.assessments), 'assessments not array');
    console.log(`   GET /assessments/sessions → 200 (${assRes.body.data.assessments.length} records) ✓`);

    // Create assessment (requires present attendance — booking already has it)
    const newAss = await expect('/assessments', 201, {
      method: 'POST', user: instructor,
      body: { bookingId: booking._id.toString(), category: 'Steering', score: 4, remarks: 'Good control' },
    });
    assert.equal(newAss.body.data.assessment.category, 'Steering');
    assert.equal(newAss.body.data.assessment.score, 4);
    console.log('   POST /assessments → 201 ✓');

    // Student cannot create assessments
    await expect('/assessments', 403, {
      method: 'POST', user: student,
      body: { bookingId: booking._id.toString(), category: 'Steering', score: 3 },
    });
    console.log('   POST /assessments blocked for student (403) ✓');

    // Student can see own assessments
    const myAss = await expect('/assessments/mine', 200, { user: student });
    assert.ok(Array.isArray(myAss.body.data.assessments));
    console.log('   GET /assessments/mine → 200 for student ✓');

    console.log('\nAll instructor feature checks passed. ✓');

  } finally {
    await cleanup();
    const rem = await User.countDocuments({ email: new RegExp(`^${PREFIX}`, 'i') });
    assert.equal(rem, 0, `${rem} INSTRTEST_ records remain`);
    console.log('Cleanup: 0 test records. ✓');
    if (server) await new Promise(r => server.close(r));
    await mongoose.disconnect();
  }
}

main().catch(err => { console.error('\n' + err.message + '\n' + err.stack); process.exitCode = 1; });
