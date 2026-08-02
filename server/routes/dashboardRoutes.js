const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { getDashboardData } = require('../controllers/dashboardController');

router.get('/', verifyToken, getDashboardData);

module.exports = router;
