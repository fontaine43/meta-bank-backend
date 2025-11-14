const express = require('express');
const router = express.Router();
const { verifyUser } = require('../controllers/verifyController');

router.get('/verify', verifyUser);

module.exports = router;
