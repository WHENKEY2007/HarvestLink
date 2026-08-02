const express = require('express');
const router = express.Router();
const { getMarketTrends } = require('../controllers/marketController');

router.get('/trends', getMarketTrends);

module.exports = router;
