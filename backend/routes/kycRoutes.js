const express = require('express');
const router = express.Router();
const multer = require('multer');

const { verifyToken } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');
const kycController = require('../controllers/kycController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const upload = multer({ storage });

router.post(
  '/upload',
  verifyToken,
  upload.fields([{ name: 'idFront' }, { name: 'idBack' }]),
  kycController.uploadKYC
);

router.get(
  '/pending',
  verifyToken,
  requireAdmin,
  kycController.getPendingKYC
);

router.put(
  '/approve/:id',
  verifyToken,
  requireAdmin,
  kycController.approveKYC
);

router.put(
  '/reject/:id',
  verifyToken,
  requireAdmin,
  kycController.rejectKYC
);

module.exports = router;
