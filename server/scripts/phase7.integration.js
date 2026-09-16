/* Live MongoDB Phase 7 integration test. Creates only records tagged with TEST_PHASE7_. */
require('dotenv').config();
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const User = require('../src/models/User');
const StudentProfile = require('../src/models/StudentProfile');
const InstructorProfile = require('../src/models/InstructorProfile');
const Slot = require('../src/models/Slot');
const Booking = require('../src/models/Booking');

const prefix = 'TEST_PHASE7_';
const passwordHash = '$2b$10$1S4ofapAwbQZF9Zdv0t5.O8N2Kx3.bT5xM3jLwqMdWzV65NTENKJ6'; // test-only bcrypt hash
let server;
let testUserIds = [];
const future = new Date('2030-12-01T00:00:00.000Z');

const request = async (path, { method = 'GET', user, body } = {}) => {
  const token = user && jwt.sign({ id: user._id.toString(), role: user.role }, process.env.JWT_SECRET, { expiresIn: '5m' });
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Cookie: `accessToken=${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: response.status, body: await response.json() };
};
const expectStatus = async (path, expected, options) => { const result = await request(path, options); assert.equal(result.status, expected, `${options?.method || 'GET'} ${path}: ${JSON.stringify(result.body)}`); return result.body; };

async function cleanup() {
  const testEmail = new RegExp(`^${prefix}`, 'i');
  const users = await User.find({ email: testEmail }).select('_id');
  const ids = users.map((user) => user._id);
  await Promise.all([Booking.deleteMany({ $or: [{ studentId: { $in: ids } }, { instructorId: { $in: ids } }] }), Slot.deleteMany({ instructorId: { $in: ids } }), StudentProfile.deleteMany({ userId: { $in: ids } }), InstructorProfile.deleteMany({ userId: { $in: ids } }), User.deleteMany({ _id: { $in: ids } })]);
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  server = app.listen(0);
  try {
    await cleanup();
    const [studentOne, studentTwo, instructorOne, instructorTwo] = await User.create([
      { name: 'Test Student One', email: `${prefix}student1@example.test`, passwordHash, role: 'student' },
      { name: 'Test Student Two', email: `${prefix}student2@example.test`, passwordHash, role: 'student' },
      { name: 'Test Instructor One', email: `${prefix}instructor1@example.test`, passwordHash, role: 'instructor' },
      { name: 'Test Instructor Two', email: `${prefix}instructor2@example.test`, passwordHash, role: 'instructor' },
    ]);
    testUserIds = [studentOne._id, studentTwo._id, instructorOne._id, instructorTwo._id];
    await StudentProfile.create([{ userId: studentOne._id }, { userId: studentTwo._id }]);
    await InstructorProfile.create([{ userId: instructorOne._id }, { userId: instructorTwo._id }]);
    const [slotOne, slotTwo] = await Slot.create([
      { instructorId: instructorOne._id, date: future, startTime: '09:00', endTime: '10:00' },
      { instructorId: instructorTwo._id, date: future, startTime: '11:00', endTime: '12:00' },
    ]);

    await expectStatus('/bookings/available-slots', 401);
    await expectStatus('/bookings/requests', 403, { user: studentOne });
    await expectStatus('/bookings/not-an-id', 400, { user: studentOne });
    await expectStatus('/bookings', 404, { method: 'POST', user: studentOne, body: { slotId: new mongoose.Types.ObjectId().toString() } });
    await expectStatus('/bookings/available-slots', 200, { user: studentOne });

    const created = await expectStatus('/bookings', 201, { method: 'POST', user: studentOne, body: { slotId: slotOne._id.toString(), studentId: studentTwo._id.toString() } });
    const bookingOne = created.data.booking;
    await expectStatus('/bookings', 409, { method: 'POST', user: studentOne, body: { slotId: slotOne._id.toString() } });
    await expectStatus('/bookings', 409, { method: 'POST', user: studentTwo, body: { slotId: slotOne._id.toString() } });
    const mine = await expectStatus('/bookings/mine', 200, { user: studentOne }); assert.equal(mine.data.bookings.length, 1);
    await expectStatus(`/bookings/${bookingOne._id}`, 403, { user: studentTwo });
    await expectStatus(`/bookings/${bookingOne._id}/accept`, 403, { method: 'PATCH', user: instructorTwo });
    await expectStatus('/bookings/requests', 200, { user: instructorOne });
    await expectStatus(`/bookings/${bookingOne._id}/accept`, 200, { method: 'PATCH', user: instructorOne });
    assert.equal((await Slot.findById(slotOne._id)).status, 'booked');
    assert.equal((await Booking.findById(bookingOne._id)).status, 'confirmed');
    await expectStatus(`/bookings/${bookingOne._id}/reject`, 409, { method: 'PATCH', user: instructorOne });
    await expectStatus('/bookings', 409, { method: 'POST', user: studentTwo, body: { slotId: slotOne._id.toString() } });
    await expectStatus(`/bookings/${bookingOne._id}/cancel`, 200, { method: 'PATCH', user: studentOne, body: { reason: 'Test cancellation' } });
    assert.equal((await Slot.findById(slotOne._id)).status, 'available');
    assert.equal((await Booking.findById(bookingOne._id)).status, 'cancelled');

    const second = await expectStatus('/bookings', 201, { method: 'POST', user: studentTwo, body: { slotId: slotTwo._id.toString() } });
    await expectStatus(`/bookings/${second.data.booking._id}/reject`, 200, { method: 'PATCH', user: instructorTwo, body: { reason: 'Unavailable' } });
    assert.equal((await Slot.findById(slotTwo._id)).status, 'available');
    assert.equal((await Booking.findById(second.data.booking._id)).status, 'rejected');
    console.log('PHASE 7 integration tests passed.');
  } finally {
    await cleanup();
    const testEmail = new RegExp(`^${prefix}`, 'i');
    const [remainingUsers, remainingStudents, remainingInstructors, remainingSlots, remainingBookings] = await Promise.all([
      User.countDocuments({ email: testEmail }),
      StudentProfile.countDocuments({ userId: { $in: testUserIds } }),
      InstructorProfile.countDocuments({ userId: { $in: testUserIds } }),
      Slot.countDocuments({ instructorId: { $in: testUserIds } }),
      Booking.countDocuments({ $or: [{ studentId: { $in: testUserIds } }, { instructorId: { $in: testUserIds } }] }),
    ]);
    assert.equal(remainingUsers, 0, 'Temporary test users remain.');
    assert.equal(remainingStudents, 0, 'Temporary student profiles remain.');
    assert.equal(remainingInstructors, 0, 'Temporary instructor profiles remain.');
    assert.equal(remainingSlots, 0, 'Temporary slots remain.');
    assert.equal(remainingBookings, 0, 'Temporary bookings remain.');
    if (server) await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
