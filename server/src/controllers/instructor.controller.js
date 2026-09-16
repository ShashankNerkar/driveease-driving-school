const InstructorProfile = require('../models/InstructorProfile');
const User              = require('../models/User');
const ApiResponse       = require('../utils/ApiResponse');
const ApiError          = require('../utils/ApiError');
const Slot              = require('../models/Slot');

/**
 * GET /api/instructors
 * Public. Returns active instructors with their public profile data.
 */
const listInstructors = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [profiles, total] = await Promise.all([
      InstructorProfile.find({ isAvailable: true })
        .populate({ path: 'userId', select: 'name email', match: { isActive: true } })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      InstructorProfile.countDocuments({ isAvailable: true }),
    ]);

    // Filter out profiles whose user was not populated (inactive/deleted user)
    const instructors = profiles
      .filter(p => p.userId != null)
      .map(p => ({
        _id:            p._id,
        name:           p.userId.name,
        experience:     p.experience,
        specialization: p.specialization,
        profileImage:   p.profileImage,
        bio:            p.bio,
        isAvailable:    p.isAvailable,
        transmissionExpertise: p.transmissionExpertise,
      }));

    return res.status(200).json(
      new ApiResponse(200, {
        instructors,
        total,
        page:       parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
      }, 'Instructors fetched.')
    );
  } catch (err) { next(err); }
};

/**
 * GET /api/instructors/:id
 * Public. Returns a single instructor public profile.
 */
const getInstructor = async (req, res, next) => {
  try {
    const profile = await InstructorProfile.findById(req.params.id)
      .populate({ path: 'userId', select: 'name', match: { isActive: true } })
      .lean();

    if (!profile || !profile.userId) return next(new ApiError(404, 'Instructor not found.'));

    const instructor = {
      _id:            profile._id,
      name:           profile.userId.name,
      experience:     profile.experience,
      specialization: profile.specialization,
      profileImage:   profile.profileImage,
      bio:            profile.bio,
      transmissionExpertise: profile.transmissionExpertise,
    };

    return res.status(200).json(new ApiResponse(200, { instructor }, 'Instructor fetched.'));
  } catch (err) { next(err); }
};

const profilePayload = (user, profile) => ({
  user: user.toSafeObject(),
  profile: profile ? profile.toObject() : null,
});

const getOwnProfile = async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: req.user.id, role: 'instructor', isActive: true });
    if (!user) throw new ApiError(401, 'Instructor account not found or deactivated.');
    const profile = await InstructorProfile.findOne({ userId: user._id });
    res.json(new ApiResponse(200, profilePayload(user, profile), 'Instructor profile fetched.'));
  } catch (error) { next(error); }
};

const updateOwnProfile = async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: req.user.id, role: 'instructor', isActive: true });
    if (!user) throw new ApiError(401, 'Instructor account not found or deactivated.');
    if (req.body.name !== undefined) user.name = req.body.name;
    if (req.body.phone !== undefined) user.phone = req.body.phone || null;
    await user.save();
    const allowed = ['bio', 'experience', 'specialization', 'transmissionExpertise', 'profileImage', 'isAvailable', 'status'];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    const profile = await InstructorProfile.findOneAndUpdate({ userId: user._id }, { $set: updates, $setOnInsert: { userId: user._id } }, { returnDocument: 'after', upsert: true, runValidators: true, setDefaultsOnInsert: true });
    res.json(new ApiResponse(200, profilePayload(user, profile), 'Instructor profile updated.'));
  } catch (error) { next(error); }
};

const getDashboard = async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: req.user.id, role: 'instructor', isActive: true });
    if (!user) throw new ApiError(401, 'Instructor account not found or deactivated.');
    const [profile, totalAvailableSlots, upcomingSlots] = await Promise.all([
      InstructorProfile.findOne({ userId: user._id }),
      Slot.countDocuments({ instructorId: user._id, status: 'available', date: { $gte: new Date() } }),
      Slot.find({ instructorId: user._id, status: 'available', date: { $gte: new Date() } }).sort({ date: 1, startTime: 1 }).limit(5),
    ]);
    res.json(new ApiResponse(200, { ...profilePayload(user, profile), totalAvailableSlots, upcomingSlots }, 'Instructor dashboard fetched.'));
  } catch (error) { next(error); }
};

module.exports = { listInstructors, getInstructor, getOwnProfile, updateOwnProfile, getDashboard };
