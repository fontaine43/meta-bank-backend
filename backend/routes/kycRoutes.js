const express = require('express');
const router = express.Router();
const multer = require('multer');
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

// ✅ Minimal route only
router.post(
  '/upload',
  upload.fields([{ name: 'idFront', maxCount: 1 }, { name: 'idBack', maxCount: 1 }]),
  kycController.uploadKYC
);

module.exports = router;
