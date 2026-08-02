const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
  getSentEnquiries,
  getReceivedEnquiries,
  createEnquiry,
  updateEnquiryStatus,
  counterEnquiry
} = require('../controllers/enquiryController');

router.get('/sent', verifyToken, getSentEnquiries);
router.get('/received', verifyToken, getReceivedEnquiries);
router.post('/', verifyToken, createEnquiry);
router.patch('/:id/status', verifyToken, updateEnquiryStatus);
router.patch('/:id/counter', verifyToken, counterEnquiry);

module.exports = router;
