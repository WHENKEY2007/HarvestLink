const express = require('express');
const router = express.Router();
const {
  generateDescription,
  getRecommendation,
  askChat
} = require('../controllers/aiController');

router.post('/description', generateDescription);
router.post('/recommendation', getRecommendation);
router.post('/chat', askChat);

module.exports = router;
