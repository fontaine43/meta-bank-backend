const express = require('express');
const router = express.Router();
const multer = require('multer');
const kycController = require('../controllers/kycController');
const { verifyToken } = require('../middleware/authMiddleware');

// ✅ Confirm multer is loaded
console.log('✅ multer loaded:', typeof multer); // should log 'function'

// ✅ Confirm controller functions are loaded
console.log('✅ kycController keys:', Object.keys(kycController));

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

// ✅ Upload KYC documents — using inline middleware to avoid undefined
const uploadMiddleware = upload.fields([
  { name: 'idFront', maxCount: 1 },
  { name: 'idBack', maxCount: 1 }
]);

router.post('/upload', verifyToken, uploadMiddleware, kycController.uploadKYC);

// ✅ Get all users with pending KYC
router.get('/pending', verifyToken, kycController.getPendingKYC);

// ✅ Approve KYC for a user
router.post('/approve/:id', verifyToken, kycController.approveKYC);

// ✅ Reject KYC for a user
router.post('/reject/:id', verifyToken, kycController.rejectKYC);

module.exports = router;
