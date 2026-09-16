const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { cloudinary } = require('../config/cloudinary');
const ApiError = require('../utils/ApiError');

/**
 * Build a Cloudinary-backed Multer storage instance.
 *
 * Files are streamed directly from memory to Cloudinary.
 * Nothing is written to the local filesystem.
 *
 * @param {string} folder      - Cloudinary folder name (e.g. 'documents', 'testimonials')
 * @param {string[]} formats   - Allowed file formats (e.g. ['jpg', 'png', 'pdf'])
 * @param {string} resourceType - 'image' | 'video' | 'raw' | 'auto'
 */
const buildCloudinaryStorage = (folder, formats, resourceType = 'auto') => {
  return new CloudinaryStorage({
    cloudinary,
    params: {
      folder: `driveease/${folder}`,
      allowed_formats: formats,
      resource_type: resourceType,
    },
  });
};

/**
 * Profile image upload middleware.
 * Accepts: jpg, jpeg, png, webp — max 2 MB.
 */
const uploadProfileImage = multer({
  storage: buildCloudinaryStorage('profiles', ['jpg', 'jpeg', 'png', 'webp'], 'image'),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new ApiError(400, 'Only image files are allowed for profile pictures.'));
    }
  },
}).single('profileImage');

/**
 * Student document upload middleware.
 * Accepts: jpg, jpeg, png, pdf — max 5 MB.
 */
const uploadDocument = multer({
  storage: new CloudinaryStorage({
    cloudinary,
    params: (req) => ({
      folder: `driveease/documents/${req.user.id}`,
      allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
      resource_type: 'auto',
    }),
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    const extension = file.originalname.split('.').pop()?.toLowerCase();
    const validExtensions = ['jpg', 'jpeg', 'png', 'pdf'];
    if (allowed.includes(file.mimetype) && validExtensions.includes(extension)) {
      cb(null, true);
    } else {
      cb(new ApiError(400, 'Only JPG, PNG, or PDF files are allowed for documents.'));
    }
  },
}).single('document');

/**
 * Testimonial video upload middleware.
 * Accepts: mp4, mov, webm — max 50 MB.
 */
const uploadTestimonialVideo = multer({
  storage: buildCloudinaryStorage('testimonials', ['mp4', 'mov', 'webm'], 'video'),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (req, file, cb) => {
    const extension = file.originalname.split('.').pop()?.toLowerCase();
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
    if (allowedTypes.includes(file.mimetype) && ['mp4', 'mov', 'webm'].includes(extension)) {
      cb(null, true);
    } else {
      cb(new ApiError(400, 'Only MP4, MOV, or WebM videos are allowed for testimonials.'));
    }
  },
}).single('video');

module.exports = {
  uploadProfileImage,
  uploadDocument,
  uploadTestimonialVideo,
};
