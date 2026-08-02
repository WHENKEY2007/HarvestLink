const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
  getListings,
  getMyListings,
  getListingById,
  createListing,
  updateListing,
  deleteListing,
  updateListingStatus
} = require('../controllers/listingController');

router.get('/', getListings);
router.get('/mine', verifyToken, getMyListings);
router.get('/:id', getListingById);
router.post('/', verifyToken, createListing);
router.put('/:id', verifyToken, updateListing);
router.delete('/:id', verifyToken, deleteListing);
router.patch('/:id/status', verifyToken, updateListingStatus);

module.exports = router;
