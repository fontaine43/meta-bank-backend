const express = require('express');
const router = express.Router();
const multer = require('multer');

// Middleware
const { verifyToken } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');

// Controller
const kycController = require('../controllers/kycController');

// ✅ Multer setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// ✅ Debug logs
console.log('DEBUG: kycController.uploadKYC =', typeof kycController.uploadKYC);
console.log('DEBUG: multer upload.fields =', typeof upload.fields);

// ✅ Route isolation test
const uploadMiddleware = upload.fields([
  { name: 'idFront', maxCount: 1 },
  { name: 'idBack', maxCount: 1 }
]);

router.post('/upload', verifyToken, uploadMiddleware, kycController.uploadKYC);
router.get('/pending', verifyToken, requireAdmin, kycController.getPendingKYC);
router.put('/approve/:id', verifyToken, requireAdmin, kycController.approveKYC);
router.put('/reject/:id', verifyToken, requireAdmin, kycController.rejectKYC);

module.exports = router;
