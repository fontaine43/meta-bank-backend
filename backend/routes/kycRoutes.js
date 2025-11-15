const express = require('express');
const router = express.Router();
const multer = require('multer');
const kycController = require('../controllers/kycController');
const { verifyToken } = require('../middleware/authMiddleware');

// ✅ Confirm multer is loaded
console.log('✅ multer loaded:', typeof multer); // should log 'function'

// ✅ Multer setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'), false);
    }
    cb(null, true);
  }
});

// ✅ TEMPORARY: Use upload.single() to isolate issue
router.post(
  '/upload',
  verifyToken,
  upload.single('idFront'), // TEMP: just one field to test multer
  kycController.uploadKYC
);

// ✅ Get all users with pending KYC
router.get('/pending', verifyToken, kycController.getPendingKYC);

// ✅ Approve KYC for a user
router.post('/approve/:id', verifyToken, kycController.approveKYC);

// ✅ Reject KYC for a user
router.post('/reject/:id', verifyToken, kycController.rejectKYC);

module.exports = router;
