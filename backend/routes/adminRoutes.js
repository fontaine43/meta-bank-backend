const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  changeUserRole,
  deleteUser,
  getOpenTickets,
  resolveTicket
} = require('../controllers/adminController');

router.get('/users', getAllUsers);
router.put('/users/:id/role', changeUserRole);
router.delete('/users/:id', deleteUser);
router.get('/tickets/open', getOpenTickets);
router.put('/tickets/:id/resolve', resolveTicket);

module.exports = router;
