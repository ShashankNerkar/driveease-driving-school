/* Phase 10 — Live MongoDB integration test. Cleans up every TEST_PHASE10_ record. */
require('dotenv').config();
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../src/app');

const User        = require('../src/models/User');
const Quiz        = require('../src/models/Quiz');
const QuizAttempt = require('../src/models/QuizAttempt');

const prefix = 'TEST_PHASE10_';
const passwordHash = '$2b$10$1S4ofapAwbQZF9Zdv0t5.O8N2Kx3.bT5xM3jLwqMdWzV65NTENKJ6';
let server;
let adminUser, student1, student2;

const request = async (path, { method = 'GET', user, body } = {}) => {
  const token = user && jwt.sign({ id: user._id.toString(), role: user.role }, process.env.JWT_SECRET, { expiresIn: '5m' });
  const res = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Cookie: `accessToken=${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json() };
};

const expect = async (path, expectedStatus, options = {}) => {
  const result = await request(path, options);
  assert.equal(result.status, expectedStatus, `${options.method || 'GET'} ${path}: expected ${expectedStatus}, got ${result.status}\n${JSON.stringify(result.body)}`);
  return result.body;
};

const sampleQuizBody = (overrides = {}) => ({
  title: `${prefix}Sample Quiz`,
  description: 'Integration test quiz',
  quizType: 'quiz',
  category: 'road_rules',
  timeLimitMinutes: 10,
  passingScore: 60,
  questions: [
    {
      text: 'What does a red traffic light mean?',
      options: [{ text: 'Go' }, { text: 'Stop' }, { text: 'Slow down' }, { text: 'Yield' }],
      correctAnswer: 1,
      explanation: 'Red means stop.',
    },
    {
      text: 'What is the speed limit in a school zone?',
      options: [{ text: '20 km/h' }, { text: '40 km/h' }, { text: '60 km/h' }],
      correctAnswer: 0,
      explanation: '20 km/h near schools.',
    },
  ],
  ...overrides,
});

async function cleanup() {
  const users = await User.find({ email: new RegExp(`^${prefix}`, 'i') }).select('_id');
  const ids = users.map((u) => u._id);
  await Promise.all([
    QuizAttempt.deleteMany({ studentId: { $in: ids } }),
    Quiz.deleteMany({ title: new RegExp(`^${prefix}`, 'i') }),
    User.deleteMany({ _id: { $in: ids } }),
  ]);
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  server = app.listen(0);

  try {
    await cleanup();

    // ── Seed test users ────────────────────────────────────────────────
    [adminUser, student1, student2] = await User.create([
      { name: 'Phase Ten Admin',      email: `${prefix}admin@example.test`,    passwordHash, role: 'admin' },
      { name: 'Phase Ten Student One', email: `${prefix}student1@example.test`, passwordHash, role: 'student' },
      { name: 'Phase Ten Student Two', email: `${prefix}student2@example.test`, passwordHash, role: 'student' },
    ]);

    // ── 1. Unauthorized access (no auth) ───────────────────────────────
    console.log('1. Unauthorized access tests...');
    await expect('/quizzes', 401);
    await expect('/quizzes/attempts/mine', 401);

    // ── 2. Student cannot create a quiz ───────────────────────────────
    console.log('2. Student cannot create quiz...');
    await expect('/quizzes', 403, { method: 'POST', user: student1, body: sampleQuizBody() });

    // ── 3. Admin CRUD ─────────────────────────────────────────────────
    console.log('3. Admin CRUD...');
    const createRes = await expect('/quizzes', 201, {
      method: 'POST',
      user: adminUser,
      body: sampleQuizBody(),
    });
    const quizId = createRes.data.quiz._id;
    assert.ok(quizId, 'Quiz ID should be returned after creation.');
    assert.equal(createRes.data.quiz.title, `${prefix}Sample Quiz`);
    assert.equal(createRes.data.quiz.questions.length, 2);

    // Admin can read full quiz (with correctAnswer)
    const adminGetRes = await expect(`/quizzes/admin/${quizId}`, 200, { user: adminUser });
    assert.equal(adminGetRes.data.quiz.questions[0].correctAnswer, 1, 'Admin should see correctAnswer.');

    // Admin list
    const adminListRes = await expect('/quizzes/admin', 200, { user: adminUser });
    assert.ok(adminListRes.data.quizzes.length > 0, 'Admin list should return quizzes.');

    // Admin update
    await expect(`/quizzes/${quizId}`, 200, {
      method: 'PATCH',
      user: adminUser,
      body: { description: 'Updated description' },
    });

    // ── 4. Student list — correctAnswer must NOT be present ───────────
    console.log('4. Student list — no correctAnswer exposed...');
    const studentListRes = await expect('/quizzes', 200, { user: student1 });
    const listedQuiz = studentListRes.data.quizzes.find((q) => q._id === quizId);
    assert.ok(listedQuiz, 'Student should see the active quiz in list.');
    listedQuiz.questions.forEach((q) => {
      assert.equal(q.correctAnswer, undefined, 'correctAnswer must not be present before submission.');
      assert.equal(q.explanation, undefined, 'explanation must not be present before submission.');
    });

    // ── 5. Student get single quiz — correctAnswer must NOT be present ─
    console.log('5. Student get quiz — no correctAnswer exposed...');
    const studentGetRes = await expect(`/quizzes/${quizId}`, 200, { user: student1 });
    studentGetRes.data.quiz.questions.forEach((q) => {
      assert.equal(q.correctAnswer, undefined, 'correctAnswer must be hidden before submission.');
    });
    const q0Id = studentGetRes.data.quiz.questions[0]._id;
    const q1Id = studentGetRes.data.quiz.questions[1]._id;

    // ── 6. Score calculation — submit 1 correct, 1 wrong ──────────────
    console.log('6. Score calculation...');
    const submitRes = await expect(`/quizzes/${quizId}/attempt`, 201, {
      method: 'POST',
      user: student1,
      body: {
        answers: [
          { questionId: q0Id, chosen: 1 },   // correct (answer is 1)
          { questionId: q1Id, chosen: 2 },   // wrong (answer is 0)
        ],
      },
    });
    const attempt = submitRes.data.attempt;
    assert.equal(attempt.totalQuestions, 2);
    assert.equal(attempt.correctCount, 1);
    assert.equal(attempt.score, 50);
    assert.equal(attempt.passed, false, 'Score 50 < passingScore 60 should be fail.');

    // After submission, correctAnswer IS in the response
    assert.ok(submitRes.data.quiz.questions[0].correctAnswer !== undefined, 'correctAnswer revealed after submission.');

    // ── 7. Submit all correct — pass ──────────────────────────────────
    console.log('7. All correct submit...');
    const submitAllCorrect = await expect(`/quizzes/${quizId}/attempt`, 201, {
      method: 'POST',
      user: student1,
      body: {
        answers: [
          { questionId: q0Id, chosen: 1 },  // correct
          { questionId: q1Id, chosen: 0 },  // correct
        ],
      },
    });
    assert.equal(submitAllCorrect.data.attempt.score, 100);
    assert.equal(submitAllCorrect.data.attempt.passed, true);

    // ── 8. Cross-student protection — student2 cannot see student1 attempts ──
    console.log('8. Cross-student protection...');
    const s1AttemptRes = await expect(`/quizzes/${quizId}/attempts`, 200, { user: student1 });
    assert.ok(s1AttemptRes.data.attempts.length >= 2, 'Student1 should see their own attempts.');

    const s2AttemptRes = await expect(`/quizzes/${quizId}/attempts`, 200, { user: student2 });
    assert.equal(s2AttemptRes.data.attempts.length, 0, 'Student2 should see 0 attempts (none of theirs).');

    // ── 9. getAllMyAttempts for student1 ───────────────────────────────
    console.log('9. getAllMyAttempts...');
    const allMineRes = await expect('/quizzes/attempts/mine', 200, { user: student1 });
    assert.ok(allMineRes.data.attempts.length >= 2, 'Student1 should have at least 2 attempts total.');

    // ── 10. Mock test type ────────────────────────────────────────────
    console.log('10. Mock test type...');
    const mockRes = await expect('/quizzes', 201, {
      method: 'POST',
      user: adminUser,
      body: sampleQuizBody({ title: `${prefix}Mock Test`, quizType: 'mock_test', passingScore: 70 }),
    });
    const mockId = mockRes.data.quiz._id;
    assert.equal(mockRes.data.quiz.quizType, 'mock_test');

    // Student can list mock tests filtered by type
    const mockListRes = await expect('/quizzes?quizType=mock_test', 200, { user: student1 });
    assert.ok(mockListRes.data.quizzes.some((q) => q._id === mockId), 'Mock test should appear in filtered list.');

    // ── 11. Admin cannot attempt a quiz ──────────────────────────────
    console.log('11. Admin cannot attempt quiz...');
    await expect(`/quizzes/${quizId}/attempt`, 403, {
      method: 'POST',
      user: adminUser,
      body: { answers: [{ questionId: q0Id, chosen: 0 }, { questionId: q1Id, chosen: 0 }] },
    });

    // ── 12. Invalid answers rejected ─────────────────────────────────
    console.log('12. Invalid answers rejected...');
    await expect(`/quizzes/${quizId}/attempt`, 400, {
      method: 'POST',
      user: student2,
      body: { answers: [] },
    });

    // ── 13. Admin delete ──────────────────────────────────────────────
    console.log('13. Admin delete...');
    await expect(`/quizzes/${quizId}`, 200, { method: 'DELETE', user: adminUser });
    await expect(`/quizzes/${quizId}`, 404, { user: student1 });

    console.log('\nPHASE 10 integration tests passed.');

  } finally {
    await cleanup();

    // Verify no temporary records remain
    const [users, quizzes, attempts] = await Promise.all([
      User.countDocuments({ email: new RegExp(`^${prefix}`, 'i') }),
      Quiz.countDocuments({ title: new RegExp(`^${prefix}`, 'i') }),
      QuizAttempt.countDocuments(),
    ]);

    // attempts might be > 0 for other data — check only our test users' attempts
    const testUserIds = [adminUser?._id, student1?._id, student2?._id].filter(Boolean);
    const ownAttempts = await QuizAttempt.countDocuments({ studentId: { $in: testUserIds } });

    assert.equal(users, 0, `${users} temporary User records remain.`);
    assert.equal(quizzes, 0, `${quizzes} temporary Quiz records remain.`);
    assert.equal(ownAttempts, 0, `${ownAttempts} temporary QuizAttempt records remain.`);

    if (server) await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
