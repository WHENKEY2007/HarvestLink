const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { getMe } = require('../controllers/userController');

router.get('/me', verifyToken, getMe);

module.exports = router;
