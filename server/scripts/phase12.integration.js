/**
 * Phase 12 — Live MongoDB integration test.
 *
 * Verifies notification API authentication, ownership, pagination, unread
 * state, and cleanup. It creates only TEST_PHASE12_ records.
 * Email delivery is intentionally not exercised here: it needs real SMTP
 * credentials and the application safely skips placeholder configurations.
 */
require('dotenv').config();
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const User = require('../src/models/User');
const Notification = require('../src/models/Notification');

const prefix = 'TEST_PHASE12_';
const passwordHash = '$2b$10$1S4ofapAwbQZF9Zdv0t5.O8N2Kx3.bT5xM3jLwqMdWzV65NTENKJ6';
let server;
let studentOne, studentTwo, instructor;

const request = async (path, { method = 'GET', user } = {}) => {
  const token = user
    ? jwt.sign({ id: user._id.toString(), role: user.role }, process.env.JWT_SECRET, { expiresIn: '5m' })
    : null;
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, {
    method,
    headers: token ? { Cookie: `accessToken=${token}` } : {},
  });
  return { status: response.status, body: await response.json() };
};

const expect = async (path, status, options = {}) => {
  const result = await request(path, options);
  assert.equal(result.status, status, `${options.method || 'GET'} ${path}: expected ${status}, got ${result.status}`);
  return result.body;
};

async function cleanup() {
  const users = await User.find({ email: new RegExp(`^${prefix}`, 'i') }).select('_id');
  const ids = users.map((user) => user._id);
  await Promise.all([
    Notification.deleteMany({ userId: { $in: ids } }),
    Notification.deleteMany({ title: new RegExp(`^${prefix}`, 'i') }),
    User.deleteMany({ _id: { $in: ids } }),
  ]);
}

async function main() {
  if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) throw new Error('MONGODB_URI and JWT_SECRET are required.');
  await mongoose.connect(process.env.MONGODB_URI);
  server = app.listen(0);
  try {
    await cleanup();
    [studentOne, studentTwo, instructor] = await User.create([
      { name: 'Phase12 Student One', email: `${prefix}student-one@example.test`, passwordHash, role: 'student' },
      { name: 'Phase12 Student Two', email: `${prefix}student-two@example.test`, passwordHash, role: 'student' },
      { name: 'Phase12 Instructor', email: `${prefix}instructor@example.test`, passwordHash, role: 'instructor' },
    ]);
    const [oldest, unread, read, otherUser] = await Notification.create([
      { userId: studentOne._id, type: 'system', title: `${prefix}Oldest`, message: 'Old notification.', isRead: false, createdAt: new Date('2031-01-01T00:00:00.000Z') },
      { userId: studentOne._id, type: 'booking_approved', title: `${prefix}Unread`, message: 'Unread notification.', isRead: false, createdAt: new Date('2031-01-03T00:00:00.000Z') },
      { userId: studentOne._id, type: 'assessment_recorded', title: `${prefix}Read`, message: 'Read notification.', isRead: true, createdAt: new Date('2031-01-02T00:00:00.000Z') },
      { userId: studentTwo._id, type: 'system', title: `${prefix}Private`, message: 'Other user notification.', isRead: false },
    ]);

    console.log('1. Authentication and role access...');
    await expect('/notifications', 401);
    await expect('/notifications/unread-count', 401);
    await expect('/notifications', 200, { user: instructor });

    console.log('2. Listing, ordering, filtering, and unread count...');
    const list = await expect('/notifications?limit=2', 200, { user: studentOne });
    assert.equal(list.data.total, 3);
    assert.equal(list.data.unreadCount, 2);
    assert.equal(list.data.notifications.length, 2);
    assert.equal(list.data.notifications[0]._id, unread._id.toString(), 'Notifications should be newest first.');
    assert.equal(list.data.totalPages, 2);
    const unreadOnly = await expect('/notifications?unreadOnly=true', 200, { user: studentOne });
    assert.equal(unreadOnly.data.notifications.length, 2);
    assert.ok(unreadOnly.data.notifications.every((item) => !item.isRead));
    const count = await expect('/notifications/unread-count', 200, { user: studentOne });
    assert.equal(count.data.unreadCount, 2);

    console.log('3. Ownership and read state transitions...');
    await expect(`/notifications/${otherUser._id}/read`, 404, { method: 'PATCH', user: studentOne });
    await expect(`/notifications/${oldest._id}/read`, 200, { method: 'PATCH', user: studentOne });
    const afterOne = await expect('/notifications/unread-count', 200, { user: studentOne });
    assert.equal(afterOne.data.unreadCount, 1);
    const allRead = await expect('/notifications/read-all', 200, { method: 'PATCH', user: studentOne });
    assert.equal(allRead.data.modifiedCount, 1);
    const afterAll = await expect('/notifications/unread-count', 200, { user: studentOne });
    assert.equal(afterAll.data.unreadCount, 0);
    await expect('/notifications?page=0', 400, { user: studentOne });
    await expect('/notifications?limit=101', 400, { user: studentOne });
    console.log('All Phase 12 backend integration tests passed.');
  } finally {
    await cleanup();
    const [userCount, notificationCount] = await Promise.all([
      User.countDocuments({ email: new RegExp(`^${prefix}`, 'i') }),
      Notification.countDocuments({ title: new RegExp(`^${prefix}`, 'i') }),
    ]);
    assert.equal(userCount, 0, `${userCount} temporary users remain.`);
    assert.equal(notificationCount, 0, `${notificationCount} temporary notifications remain.`);
    console.log('Temporary Phase 12 MongoDB records = 0. ✓');
    if (server) await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
