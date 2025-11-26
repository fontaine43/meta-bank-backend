const express = require('express');
const multer = require('multer');
const path = require('path');
const { verifyToken, isAdmin } = require('./middleware');
const c = require('./controllers');

const router = express.Router();

// uploads
const uploadDir = path.join(__dirname, 'uploads');
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
    cb(null, Date.now() + '-' + safeName);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype) return cb(null, false);
    cb(null, true);
  }
});

// auth
router.post('/auth/register', c.register);
router.post('/auth/login', c.login);
router.get('/auth/verify', c.verifyUser);
router.get('/auth/profile', verifyToken, c.profile);

// user
router.get('/user/dashboard', verifyToken, c.dashboard);
router.get('/user/verification', verifyToken, c.getVerificationStatus);
router.post(
  '/user/kyc/upload',
  verifyToken,
  upload.fields([{ name: 'idFront', maxCount: 1 }, { name: 'idBack', maxCount: 1 }]),
  c.uploadKYC
);

router.post(
  '/user/business-account',
  verifyToken,
  upload.fields([{ name: 'einLetter', maxCount: 1 }, { name: 'certOrArticles', maxCount: 1 }]),
  c.registerBusinessAccount
);

// loans
router.post('/user/loan', verifyToken, c.applyLoan);
router.get('/user/loans', verifyToken, c.getLoans);

// transfers
router.post('/user/transfer', verifyToken, c.makeTransfer);
router.get('/user/transfers', verifyToken, c.getTransfers);
router.put('/user/transfer/:id/complete', verifyToken, isAdmin, c.completeTransfer);

// extra user features
router.get('/user/statements', verifyToken, c.getStatements);
router.get('/user/investments', verifyToken, c.getInvestments);
router.get('/user/external-accounts', verifyToken, c.getExternalAccounts);
router.get('/user/ira-accounts', verifyToken, c.getIraAccounts);

// admin
router.get('/admin/analytics', verifyToken, isAdmin, c.analytics);
router.get('/admin/users', verifyToken, isAdmin, c.getAllUsers);
router.put('/admin/users/:id/role', verifyToken, isAdmin, c.changeUserRole);
router.delete('/admin/users/:id', verifyToken, isAdmin, c.deleteUser);
router.get('/admin/tickets', verifyToken, isAdmin, c.getOpenTickets);
router.put('/admin/tickets/:id/resolve', verifyToken, isAdmin, c.resolveTicket);

// kyc admin
router.put('/admin/kyc/:id/approve', verifyToken, isAdmin, c.approveKYC);
router.put('/admin/kyc/:id/reject', verifyToken, isAdmin, c.rejectKYC);

module.exports = router;
