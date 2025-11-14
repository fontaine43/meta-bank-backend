const express = require('express');
const router = express.Router();
const multer = require('multer');
const kycController = require('../controllers/kycController');
const { verifyToken } = require('../middleware/authMiddleware');

// ✅ Log to confirm controller is loaded
console.log('✅ kycController loaded:', Object.keys(kycController));

// ✅ Multer setup — MUST come before route definitions
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

// ✅ Upload KYC documents
router.post(
  '/upload',
  verifyToken,
  upload.fields([
    { name: 'idFront', maxCount: 1 },
    { name: 'idBack', maxCount: 1 }
  ]),
  kycController.uploadKYC
);

// ✅ Get all users with pending KYC
router.get('/pending', verifyToken, kycController.getPendingKYC);

// ✅ Approve KYC for a user
router.post('/approve/:id', verifyToken, kycController.approveKYC);

// ✅ Reject KYC for a user
router.post('/reject/:id', verifyToken, kycController.rejectKYC);

module.exports = router;
