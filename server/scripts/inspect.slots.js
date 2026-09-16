require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const InstructorProfile = require('../src/models/InstructorProfile');
const Slot = require('../src/models/Slot');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);

  const instructors = await User.find({ role: 'instructor', isActive: true }).select('_id name email').lean();
  console.log('\n=== ACTIVE INSTRUCTORS ===');
  for (const i of instructors) {
    const profile = await InstructorProfile.findOne({ userId: i._id }).select('isAvailable status experience').lean();
    console.log(JSON.stringify({ name: i.name, userId: i._id, isAvailable: profile?.isAvailable, profileStatus: profile?.status, experience: profile?.experience }));
  }

  const slots = await Slot.find({ status: 'available', date: { $gte: new Date() } })
    .populate('instructorId', 'name')
    .sort({ date: 1, startTime: 1 })
    .limit(10)
    .lean();

  console.log('\n=== UPCOMING AVAILABLE SLOTS ===');
  if (!slots.length) {
    console.log('  (none — no future available slots exist yet)');
  } else {
    for (const s of slots) {
      console.log(JSON.stringify({
        id: s._id,
        instructor: s.instructorId?.name,
        date: s.date?.toISOString()?.slice(0,10),
        time: s.startTime + '-' + s.endTime,
        status: s.status
      }));
    }
  }

  await mongoose.disconnect();
}
check().catch(e => { console.error(e); process.exitCode = 1; });
