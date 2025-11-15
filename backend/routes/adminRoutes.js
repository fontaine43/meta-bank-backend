// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');
const {
  getAllUsers,
  changeUserRole,
  deleteUser,
  getOpenTickets,
  resolveTicket,
  getStats,
  getPendingKYC,
  approveKYC,
  rejectKYC,
  promoteUser,
  suspendUser
} = require('../controllers/adminController');

// =======================
// Analytics & Stats
// =======================
router.get('/stats', verifyToken, isAdmin, getStats);

// =======================
// User Management
// =======================
router.get('/users', verifyToken, isAdmin, getAllUsers);
router.put('/users/:id/role', verifyToken, isAdmin, changeUserRole);
router.delete('/users/:id', verifyToken, isAdmin, deleteUser);

// Promote / Suspend (used in admin.html)
router.post('/users/:id/promote', verifyToken, isAdmin, promoteUser);
router.post('/users/:id/suspend', verifyToken, isAdmin, suspendUser);

// =======================
// KYC Approvals
// =======================
router.get('/kyc', verifyToken, isAdmin, getPendingKYC);
router.post('/kyc/:id/approve', verifyToken, isAdmin, approveKYC);
router.post('/kyc/:id/reject', verifyToken, isAdmin, rejectKYC);

// =======================
// Support Tickets
// =======================
router.get('/tickets', verifyToken, isAdmin, getOpenTickets);
router.put('/tickets/:id/resolve', verifyToken, isAdmin, resolveTicket);

module.exports = router;
