const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');
const {
  getAllUsers,
  changeUserRole,
  deleteUser,
  getOpenTickets,
  resolveTicket
} = require('../controllers/adminController');

router.get('/users', verifyToken, requireAdmin, getAllUsers);
router.put('/users/:id/role', verifyToken, requireAdmin, changeUserRole);
router.delete('/users/:id', verifyToken, requireAdmin, deleteUser);
router.get('/tickets/open', verifyToken, requireAdmin, getOpenTickets);
router.put('/tickets/:id/resolve', verifyToken, requireAdmin, resolveTicket);

module.exports = router;
